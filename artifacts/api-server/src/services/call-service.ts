import { db } from "@workspace/db";
import type { Lead, Campaign } from "@workspace/db";
import { logger } from "../lib/logger.js";
import {
  initiateMockCall,
  registerMockCompletionHandler,
} from "./call-provider/mock-provider.js";
import { initiateVapiCall } from "./call-provider/vapi-provider.js";
import type {
  CallCompletionPayload,
  InitiateCallInput,
  TelephonyConfig,
} from "./call-provider/types.js";

export function isRealCallsEnabled(): boolean {
  return process.env.ENABLE_REAL_CALLS === "true";
}

export async function resolveTelephonyConfig(companyId: number): Promise<TelephonyConfig> {
  const company = await db.company.findUnique({
    where: { id: companyId },
  });

  const assistantId =
    company?.telephonyAssistantId ?? process.env.TELEPHONY_ASSISTANT_ID ?? "";
  const phoneNumberId =
    company?.telephonyPhoneNumberId ?? process.env.TELEPHONY_PHONE_NUMBER_ID ?? "";
  const apiKey = company?.telephonyApiKey ?? process.env.TELEPHONY_API_KEY ?? "";

  if (!assistantId || !phoneNumberId || !apiKey) {
    throw new Error(
      "Telephony credentials not configured for this company. Set TELEPHONY_* env vars or company config.",
    );
  }

  return { assistantId, phoneNumberId, apiKey };
}

export async function completeCall(payload: CallCompletionPayload): Promise<void> {
  await db.callResult.create({
    data: {
      companyId: payload.companyId,
      leadId: payload.leadId,
      campaignId: payload.campaignId,
      externalCallId: payload.externalCallId,
      status: payload.status,
      humanDetected: payload.humanDetected,
      endedReason: payload.endedReason,
      callSummary: payload.callSummary,
      callDuration: payload.callDuration,
      callCost: payload.callCost,
      aiClassification: payload.aiClassification,
      transcript: payload.transcript,
      recordingUrl: payload.recordingUrl ?? null,
      confidenceScore: payload.confidenceScore,
      calledAt: new Date(),
    },
  });

  await db.lead.update({
    where: { id: payload.leadId },
    data: {
      status: payload.status,
      externalCallId: payload.externalCallId,
      updatedAt: new Date(),
    },
  });

  logger.info(
    {
      leadId: payload.leadId,
      externalCallId: payload.externalCallId,
      status: payload.status,
      humanDetected: payload.humanDetected,
    },
    "Call completed",
  );
}

export async function initiateLeadCall(
  lead: Lead,
  campaign: Campaign | null,
): Promise<{ externalCallId: string }> {
  const input: InitiateCallInput = {
    leadId: lead.id,
    companyId: lead.companyId,
    campaignId: lead.campaignId,
    customerName: `${lead.firstName} ${lead.lastName}`.trim(),
    phoneNumber: lead.phoneNumber,
    companyName: lead.company,
    service: lead.service ?? campaign?.service ?? null,
  };

  await db.lead.update({
    where: { id: lead.id },
    data: { status: "calling", updatedAt: new Date() },
  });

  let result;
  if (isRealCallsEnabled()) {
    const config = await resolveTelephonyConfig(lead.companyId);
    result = await initiateVapiCall(input, config);
  } else {
    result = await initiateMockCall(input, {
      assistantId: "mock",
      phoneNumberId: "mock",
      apiKey: "mock",
    });
  }

  await db.lead.update({
    where: { id: lead.id },
    data: { externalCallId: result.externalCallId, updatedAt: new Date() },
  });

  logger.info(
    {
      leadId: lead.id,
      externalCallId: result.externalCallId,
      mode: isRealCallsEnabled() ? "live" : "mock",
    },
    "Call initiated",
  );

  return { externalCallId: result.externalCallId };
}

registerMockCompletionHandler(completeCall);
