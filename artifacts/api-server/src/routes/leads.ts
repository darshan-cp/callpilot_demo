import { Router, type IRouter } from "express";
import { db, type Prisma } from "@workspace/db";
import {
  ListLeadsQueryParams,
  ExportLeadsQueryParams,
  CreateLeadBody,
  ImportLeadsBody,
  RequeueLeadsBody,
  AssignLeadsCampaignBody,
  DeleteLeadsBulkBody,
  GetLeadParams,
  DeleteLeadParams,
  TriggerLeadCallParams,
} from "@workspace/api-zod";
import { requireAuth, getCompanyId, type AuthenticatedRequest } from "../middleware/auth.js";
import { requireMinRole } from "../middleware/rbac.js";
import { initiateLeadCall } from "../services/call-service.js";
import { phoneKey } from "../lib/phone.js";
import { buildLeadOrderBy } from "../lib/sort.js";

const router: IRouter = Router();

router.use(requireAuth);

function buildLeadWhere(
  companyId: number,
  filters: { search?: string; status?: string; campaignId?: number },
): Prisma.LeadWhereInput {
  const { search, status, campaignId } = filters;
  const where: Prisma.LeadWhereInput = { companyId };

  if (search) {
    where.OR = [
      { firstName: { contains: search, mode: "insensitive" } },
      { lastName: { contains: search, mode: "insensitive" } },
      { company: { contains: search, mode: "insensitive" } },
      { phoneNumber: { contains: search } },
    ];
  }
  if (status) where.status = status;
  if (campaignId) where.campaignId = campaignId;

  return where;
}

async function getExistingPhoneKeys(companyId: number): Promise<Set<string>> {
  const existing = await db.lead.findMany({
    where: { companyId },
    select: { phoneNumber: true },
  });
  return new Set(existing.map((row) => phoneKey(row.phoneNumber)).filter(Boolean));
}

router.get("/leads", async (req, res): Promise<void> => {
  const companyId = getCompanyId(req as AuthenticatedRequest);
  const parsed = ListLeadsQueryParams.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { page = 1, limit = 20, search, status, campaignId, sortBy = "createdAt", sortOrder = "desc" } = parsed.data;
  const offset = (page - 1) * limit;
  const where = buildLeadWhere(companyId, { search, status, campaignId });

  const [leads, total] = await Promise.all([
    db.lead.findMany({
      where,
      select: {
        id: true,
        firstName: true,
        lastName: true,
        company: true,
        phoneNumber: true,
        status: true,
        campaignId: true,
        createdAt: true,
        campaign: { select: { name: true } },
      },
      orderBy: buildLeadOrderBy(sortBy, sortOrder),
      skip: offset,
      take: limit,
    }),
    db.lead.count({ where }),
  ]);

  res.json({
    leads: leads.map((l) => ({
      id: l.id,
      firstName: l.firstName,
      lastName: l.lastName,
      company: l.company,
      phoneNumber: l.phoneNumber,
      status: l.status,
      campaignId: l.campaignId,
      createdAt: l.createdAt.toISOString(),
      campaignName: l.campaign?.name ?? null,
    })),
    total,
    page,
    limit,
  });
});

function csvCell(value: string | number | null | undefined): string {
  if (value === null || value === undefined) return "";
  const text = String(value);
  if (/[",\n\r]/.test(text)) return `"${text.replace(/"/g, '""')}"`;
  return text;
}

router.get("/leads/export", async (req, res): Promise<void> => {
  const companyId = getCompanyId(req as AuthenticatedRequest);
  const parsed = ExportLeadsQueryParams.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { search, status, campaignId, format = "csv" } = parsed.data;
  const where = buildLeadWhere(companyId, { search, status, campaignId });

  const leads = await db.lead.findMany({
    where,
    select: {
      id: true,
      firstName: true,
      lastName: true,
      company: true,
      phoneNumber: true,
      status: true,
      retryCount: true,
      campaignId: true,
      createdAt: true,
      updatedAt: true,
      campaign: { select: { name: true } },
    },
    orderBy: { createdAt: "asc" },
  });

  const filename = `leads_export_${Date.now()}.${format}`;
  let data: string;

  if (format === "json") {
    data = JSON.stringify(
      leads.map((lead) => ({
        id: lead.id,
        firstName: lead.firstName,
        lastName: lead.lastName,
        company: lead.company,
        phoneNumber: lead.phoneNumber,
        status: lead.status,
        retryCount: lead.retryCount,
        campaignId: lead.campaignId,
        campaignName: lead.campaign?.name ?? null,
        createdAt: lead.createdAt.toISOString(),
        updatedAt: lead.updatedAt.toISOString(),
      })),
      null,
      2,
    );
  } else {
    const headers = [
      "First Name",
      "Last Name",
      "Company",
      "Phone Number",
      "ID",
      "Status",
      "Campaign",
      "Retry Count",
      "Added",
      "Updated",
    ].join(",");
    const rows = leads
      .map((lead) =>
        [
          csvCell(lead.firstName),
          csvCell(lead.lastName),
          csvCell(lead.company),
          csvCell(lead.phoneNumber),
          lead.id,
          lead.status,
          csvCell(lead.campaign?.name ?? ""),
          lead.retryCount,
          csvCell(lead.createdAt.toISOString()),
          csvCell(lead.updatedAt.toISOString()),
        ].join(","),
      )
      .join("\n");
    data = `${headers}\n${rows}`;
  }

  res.json({ data, filename, count: leads.length });
});

router.post("/leads", requireMinRole("manager"), async (req, res): Promise<void> => {
  const companyId = getCompanyId(req as AuthenticatedRequest);
  const parsed = CreateLeadBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const existingPhones = await getExistingPhoneKeys(companyId);
  const key = phoneKey(parsed.data.phoneNumber);
  if (key && existingPhones.has(key)) {
    res.status(409).json({ error: "A lead with this phone number already exists" });
    return;
  }

  const lead = await db.lead.create({
    data: { ...parsed.data, companyId },
  });

  res.status(201).json({ ...lead, createdAt: lead.createdAt.toISOString(), campaignName: null });
});

router.post("/leads/import", requireMinRole("manager"), async (req, res): Promise<void> => {
  const companyId = getCompanyId(req as AuthenticatedRequest);
  const parsed = ImportLeadsBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { leads, campaignId } = parsed.data;
  let imported = 0;
  let skipped = 0;
  const errors: string[] = [];
  const existingPhones = await getExistingPhoneKeys(companyId);
  const batchPhones = new Set<string>();

  for (const lead of leads) {
    const key = phoneKey(lead.phoneNumber);
    if (key && (existingPhones.has(key) || batchPhones.has(key))) {
      skipped++;
      continue;
    }

    try {
      await db.lead.create({
        data: {
          firstName: lead.firstName,
          lastName: lead.lastName,
          company: lead.company,
          phoneNumber: lead.phoneNumber,
          companyId,
          campaignId: campaignId ?? lead.campaignId ?? null,
        },
      });
      if (key) {
        existingPhones.add(key);
        batchPhones.add(key);
      }
      imported++;
    } catch (err) {
      errors.push(`Row ${imported + skipped + errors.length + 1}: ${String(err)}`);
    }
  }

  res.status(201).json({ imported, failed: errors.length, skipped, total: leads.length, errors });
});

router.post("/leads/requeue", requireMinRole("manager"), async (req, res): Promise<void> => {
  const companyId = getCompanyId(req as AuthenticatedRequest);
  const parsed = RequeueLeadsBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { leadIds, allFiltered, search, status, campaignId } = parsed.data;

  if (!allFiltered && (!leadIds || leadIds.length === 0)) {
    res.status(400).json({ error: "Provide leadIds or set allFiltered with filter criteria" });
    return;
  }

  let targetIds: number[];

  if (allFiltered) {
    const rows = await db.lead.findMany({
      where: buildLeadWhere(companyId, { search, status, campaignId }),
      select: { id: true },
    });
    targetIds = rows.map((row) => row.id);
  } else {
    targetIds = leadIds!;
  }

  if (targetIds.length === 0) {
    res.json({ requeued: 0, skipped: 0, total: 0 });
    return;
  }

  const eligible = await db.lead.findMany({
    where: {
      companyId,
      id: { in: targetIds },
      status: { not: "calling" },
    },
    select: { id: true },
  });

  const eligibleIds = eligible.map((row) => row.id);
  const skipped = targetIds.length - eligibleIds.length;

  if (eligibleIds.length > 0) {
    await db.lead.updateMany({
      where: { companyId, id: { in: eligibleIds } },
      data: {
        status: "pending",
        retryCount: 0,
        externalCallId: null,
        updatedAt: new Date(),
      },
    });
  }

  res.json({ requeued: eligibleIds.length, skipped, total: targetIds.length });
});

router.post("/leads/assign-campaign", requireMinRole("manager"), async (req, res): Promise<void> => {
  const companyId = getCompanyId(req as AuthenticatedRequest);
  const parsed = AssignLeadsCampaignBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { targetCampaignId, leadIds, allFiltered, search, status, campaignId } = parsed.data;

  const campaign = await db.campaign.findFirst({
    where: { id: targetCampaignId, companyId },
    select: { id: true },
  });

  if (!campaign) {
    res.status(400).json({ error: "Campaign not found" });
    return;
  }

  if (!allFiltered && (!leadIds || leadIds.length === 0)) {
    res.status(400).json({ error: "Provide leadIds or set allFiltered with filter criteria" });
    return;
  }

  let targetIds: number[];

  if (allFiltered) {
    const rows = await db.lead.findMany({
      where: buildLeadWhere(companyId, { search, status, campaignId }),
      select: { id: true },
    });
    targetIds = rows.map((row) => row.id);
  } else {
    targetIds = leadIds!;
  }

  if (targetIds.length === 0) {
    res.json({ assigned: 0, skipped: 0, total: 0 });
    return;
  }

  const eligible = await db.lead.findMany({
    where: {
      companyId,
      id: { in: targetIds },
      status: { not: "calling" },
    },
    select: { id: true },
  });

  const eligibleIds = eligible.map((row) => row.id);
  const skipped = targetIds.length - eligibleIds.length;

  if (eligibleIds.length > 0) {
    await db.lead.updateMany({
      where: { companyId, id: { in: eligibleIds } },
      data: {
        campaignId: targetCampaignId,
        updatedAt: new Date(),
      },
    });
  }

  res.json({ assigned: eligibleIds.length, skipped, total: targetIds.length });
});

router.post("/leads/delete-bulk", requireMinRole("manager"), async (req, res): Promise<void> => {
  const companyId = getCompanyId(req as AuthenticatedRequest);
  const parsed = DeleteLeadsBulkBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { leadIds, allFiltered, search, status, campaignId } = parsed.data;

  if (!allFiltered && (!leadIds || leadIds.length === 0)) {
    res.status(400).json({ error: "Provide leadIds or set allFiltered with filter criteria" });
    return;
  }

  let targetIds: number[];

  if (allFiltered) {
    const rows = await db.lead.findMany({
      where: buildLeadWhere(companyId, { search, status, campaignId }),
      select: { id: true },
    });
    targetIds = rows.map((row) => row.id);
  } else {
    targetIds = leadIds!;
  }

  if (targetIds.length === 0) {
    res.json({ deleted: 0, skipped: 0, total: 0 });
    return;
  }

  const eligible = await db.lead.findMany({
    where: {
      companyId,
      id: { in: targetIds },
      status: { not: "calling" },
    },
    select: { id: true },
  });

  const eligibleIds = eligible.map((row) => row.id);
  const skipped = targetIds.length - eligibleIds.length;

  if (eligibleIds.length > 0) {
    await db.$transaction([
      db.callResult.deleteMany({
        where: { companyId, leadId: { in: eligibleIds } },
      }),
      db.lead.deleteMany({
        where: { companyId, id: { in: eligibleIds } },
      }),
    ]);
  }

  res.json({ deleted: eligibleIds.length, skipped, total: targetIds.length });
});

router.get("/leads/:id", async (req, res): Promise<void> => {
  const companyId = getCompanyId(req as AuthenticatedRequest);
  const params = GetLeadParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const lead = await db.lead.findFirst({
    where: { id: params.data.id, companyId },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      company: true,
      phoneNumber: true,
      status: true,
      campaignId: true,
      createdAt: true,
      campaign: { select: { name: true } },
    },
  });

  if (!lead) {
    res.status(404).json({ error: "Lead not found" });
    return;
  }

  const callResult = await db.callResult.findFirst({
    where: { leadId: params.data.id, companyId },
    orderBy: { calledAt: "asc" },
  });

  res.json({
    id: lead.id,
    firstName: lead.firstName,
    lastName: lead.lastName,
    company: lead.company,
    phoneNumber: lead.phoneNumber,
    status: lead.status,
    campaignId: lead.campaignId,
    createdAt: lead.createdAt.toISOString(),
    campaignName: lead.campaign?.name ?? null,
    callResult: callResult
      ? {
          id: callResult.id,
          callDuration: callResult.callDuration ?? null,
          humanDetected: callResult.humanDetected ?? null,
          endedReason: callResult.endedReason ?? null,
          callSummary: callResult.callSummary ?? null,
          aiClassification: callResult.aiClassification ?? null,
          transcript: callResult.transcript ?? null,
          recordingUrl: callResult.recordingUrl ?? null,
          confidenceScore: callResult.confidenceScore ?? null,
          calledAt: callResult.calledAt?.toISOString() ?? null,
        }
      : null,
  });
});

router.delete("/leads/:id", requireMinRole("manager"), async (req, res): Promise<void> => {
  const companyId = getCompanyId(req as AuthenticatedRequest);
  const params = DeleteLeadParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const lead = await db.lead.findFirst({
    where: { id: params.data.id, companyId },
  });

  if (!lead) {
    res.status(404).json({ error: "Lead not found" });
    return;
  }

  await db.$transaction([
    db.callResult.deleteMany({
      where: { leadId: params.data.id, companyId },
    }),
    db.lead.delete({
      where: { id: params.data.id },
    }),
  ]);

  res.sendStatus(204);
});

router.post("/leads/:id/call", requireMinRole("manager"), async (req, res): Promise<void> => {
  const companyId = getCompanyId(req as AuthenticatedRequest);
  const params = TriggerLeadCallParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const lead = await db.lead.findFirst({
    where: { id: params.data.id, companyId },
  });

  if (!lead) {
    res.status(404).json({ error: "Lead not found" });
    return;
  }

  if (lead.status !== "pending") {
    res.status(400).json({ error: "Only pending leads can be called" });
    return;
  }

  let campaign = null;
  if (lead.campaignId) {
    campaign = await db.campaign.findFirst({
      where: { id: lead.campaignId, companyId },
    });
  }

  try {
    const { externalCallId } = await initiateLeadCall(lead, campaign);
    res.json({ success: true, message: "Call initiated", externalCallId });
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

export default router;
