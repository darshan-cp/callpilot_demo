import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { completeCall } from "../services/call-service.js";
import { parseVapiEndOfCallReport, phonesMatch } from "../services/vapi-webhook-parser.js";
import { logger } from "../lib/logger.js";

const router: IRouter = Router();

function splitFullName(fullName: string): { firstName: string; lastName: string } {
  const parts = fullName.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return { firstName: "", lastName: "" };
  if (parts.length === 1) return { firstName: parts[0], lastName: "" };
  return { firstName: parts[0], lastName: parts.slice(1).join(" ") };
}

async function findLeadByCallOrPhone(externalCallId: string, customerPhone: string) {
  const byCallId = await db.lead.findFirst({
    where: { externalCallId },
  });

  if (byCallId) return byCallId;

  const digits = customerPhone.replace(/\D/g, "");
  const candidates = await db.lead.findMany({
    where: {
      OR: [
        { phoneNumber: digits },
        { phoneNumber: customerPhone },
        { phoneNumber: digits.replace(/^1/, "") },
        { phoneNumber: `+${digits}` },
      ],
    },
  });

  return candidates.find((lead) => phonesMatch(lead.phoneNumber, customerPhone)) ?? null;
}

router.post("/webhooks/call-completed", async (req, res): Promise<void> => {
  try {
    const body = req.body as Record<string, unknown>;
    const parsed = parseVapiEndOfCallReport(body);

    if (!parsed) {
      res.status(400).json({ error: "Invalid or incomplete webhook payload" });
      return;
    }

    if (parsed.eventType !== "end-of-call-report") {
      logger.info({ eventType: parsed.eventType }, "Ignoring non end-of-call-report webhook");
      res.json({ success: true, ignored: true });
      return;
    }

    const existingResult = await db.callResult.findFirst({
      where: { externalCallId: parsed.externalCallId },
      select: { id: true },
    });

    if (existingResult) {
      logger.info({ externalCallId: parsed.externalCallId }, "Duplicate webhook ignored");
      res.json({ success: true, duplicate: true });
      return;
    }

    const lead = await findLeadByCallOrPhone(parsed.externalCallId, parsed.customerPhone);

    if (!lead) {
      logger.warn(
        { externalCallId: parsed.externalCallId, phone: parsed.customerPhone },
        "Webhook received for unknown lead",
      );
      res.status(404).json({ error: "Lead not found for call or phone" });
      return;
    }

    await completeCall({
      externalCallId: parsed.externalCallId,
      leadId: lead.id,
      companyId: lead.companyId,
      campaignId: lead.campaignId,
      status: parsed.status,
      humanDetected: parsed.humanDetected,
      endedReason: parsed.endedReason,
      callDuration: parsed.callDuration,
      callSummary: parsed.callSummary,
      transcript: parsed.transcript,
      recordingUrl: parsed.recordingUrl,
      confidenceScore: parsed.confidenceScore,
      callCost: parsed.callCost,
      aiClassification: parsed.aiClassification,
    });

    const leadUpdates: { firstName?: string; lastName?: string; company?: string } = {};
    if (parsed.verifiedName) {
      const { firstName, lastName } = splitFullName(parsed.verifiedName);
      if (firstName) {
        leadUpdates.firstName = firstName;
        leadUpdates.lastName = lastName;
      }
    }
    if (parsed.verifiedCompany) {
      leadUpdates.company = parsed.verifiedCompany;
    }
    if (Object.keys(leadUpdates).length > 0) {
      await db.lead.update({
        where: { id: lead.id },
        data: { ...leadUpdates, updatedAt: new Date() },
      });
    }

    logger.info(
      {
        leadId: lead.id,
        externalCallId: parsed.externalCallId,
        status: parsed.status,
        humanDetected: parsed.humanDetected,
        endedReason: parsed.endedReason,
      },
      "Vapi end-of-call-report processed",
    );

    res.json({
      success: true,
      leadId: lead.id,
      status: parsed.status,
      humanDetected: parsed.humanDetected,
    });
  } catch (err) {
    logger.error({ err }, "Webhook processing failed");
    res.status(500).json({ error: "Webhook processing failed" });
  }
});

export default router;
