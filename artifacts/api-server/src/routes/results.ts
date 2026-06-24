import { Router, type IRouter } from "express";
import { db, type Prisma } from "@workspace/db";
import {
  ListResultsQueryParams,
  ExportResultsQueryParams,
  GetResultParams,
  ListCallLogsQueryParams,
} from "@workspace/api-zod";
import { requireAuth, getCompanyId, type AuthenticatedRequest } from "../middleware/auth.js";
import { buildResultOrderBy, buildCallLogOrderBy } from "../lib/sort.js";

const router: IRouter = Router();

router.use(requireAuth);

function buildResultWhere(
  companyId: number,
  filters: { search?: string; status?: string; campaignId?: number },
): Prisma.CallResultWhereInput {
  const { search, status, campaignId } = filters;
  const where: Prisma.CallResultWhereInput = { companyId };

  if (status) where.status = status;
  if (campaignId) where.campaignId = campaignId;
  if (search) {
    where.OR = [
      { lead: { firstName: { contains: search, mode: "insensitive" } } },
      { lead: { lastName: { contains: search, mode: "insensitive" } } },
      { lead: { company: { contains: search, mode: "insensitive" } } },
      { lead: { phoneNumber: { contains: search } } },
    ];
  }

  return where;
}

router.get("/results", async (req, res): Promise<void> => {
  const companyId = getCompanyId(req as AuthenticatedRequest);
  const parsed = ListResultsQueryParams.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { page = 1, limit = 20, search, status, campaignId, sortBy = "calledAt", sortOrder = "desc" } = parsed.data;
  const offset = (page - 1) * limit;
  const where = buildResultWhere(companyId, { search, status, campaignId });

  const [results, total] = await Promise.all([
    db.callResult.findMany({
      where,
      select: {
        id: true,
        leadId: true,
        status: true,
        humanDetected: true,
        callDuration: true,
        aiClassification: true,
        callSummary: true,
        transcript: true,
        recordingUrl: true,
        confidenceScore: true,
        calledAt: true,
        campaignId: true,
        lead: {
          select: {
            firstName: true,
            lastName: true,
            company: true,
            phoneNumber: true,
          },
        },
        campaign: { select: { name: true } },
      },
      orderBy: buildResultOrderBy(sortBy, sortOrder),
      skip: offset,
      take: limit,
    }),
    db.callResult.count({ where }),
  ]);

  res.json({
    results: results.map((r) => ({
      id: r.id,
      leadId: r.leadId,
      firstName: r.lead.firstName,
      lastName: r.lead.lastName,
      company: r.lead.company,
      phoneNumber: r.lead.phoneNumber,
      status: r.status,
      humanDetected: r.humanDetected,
      callDuration: r.callDuration,
      aiClassification: r.aiClassification,
      callSummary: r.callSummary,
      transcript: r.transcript,
      recordingUrl: r.recordingUrl,
      confidenceScore: r.confidenceScore,
      calledAt: r.calledAt.toISOString(),
      campaignId: r.campaignId,
      campaignName: r.campaign?.name ?? null,
    })),
    total,
    page,
    limit,
  });
});

router.get("/results/export", async (req, res): Promise<void> => {
  const companyId = getCompanyId(req as AuthenticatedRequest);
  const parsed = ExportResultsQueryParams.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { status, campaignId, format = "csv" } = parsed.data;
  const where = buildResultWhere(companyId, { status, campaignId });

  const results = await db.callResult.findMany({
    where,
    select: {
      id: true,
      leadId: true,
      status: true,
      humanDetected: true,
      callDuration: true,
      confidenceScore: true,
      calledAt: true,
      lead: {
        select: {
          firstName: true,
          lastName: true,
          company: true,
          phoneNumber: true,
        },
      },
    },
    orderBy: { calledAt: "asc" },
  });

  let data: string;
  const filename = `results_export_${Date.now()}.${format}`;

  if (format === "json") {
    data = JSON.stringify(
      results.map((r) => ({
        id: r.id,
        leadId: r.leadId,
        firstName: r.lead.firstName,
        lastName: r.lead.lastName,
        company: r.lead.company,
        phoneNumber: r.lead.phoneNumber,
        status: r.status,
        humanDetected: r.humanDetected,
        callDuration: r.callDuration,
        confidenceScore: r.confidenceScore,
        calledAt: r.calledAt.toISOString(),
      })),
      null,
      2,
    );
  } else {
    const headers =
      "ID,First Name,Last Name,Company,Phone,Status,Real Person,Call Duration,Confidence Score,Called At\n";
    const rows = results
      .map(
        (r) =>
          `${r.id},"${r.lead.firstName}","${r.lead.lastName}","${r.lead.company}","${r.lead.phoneNumber}",${r.status},${r.humanDetected ? "Yes" : "No"},${r.callDuration ?? ""},${r.confidenceScore?.toFixed(2) ?? ""},"${r.calledAt.toISOString()}"`,
      )
      .join("\n");
    data = headers + rows;
  }

  res.json({ data, filename, count: results.length });
});

router.get("/results/:id", async (req, res): Promise<void> => {
  const companyId = getCompanyId(req as AuthenticatedRequest);
  const params = GetResultParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const result = await db.callResult.findFirst({
    where: { id: params.data.id, companyId },
    select: {
      id: true,
      leadId: true,
      status: true,
      humanDetected: true,
      endedReason: true,
      callSummary: true,
      callDuration: true,
      callCost: true,
      aiClassification: true,
      transcript: true,
      recordingUrl: true,
      confidenceScore: true,
      calledAt: true,
      campaignId: true,
      lead: {
        select: {
          firstName: true,
          lastName: true,
          company: true,
          phoneNumber: true,
        },
      },
      campaign: { select: { name: true } },
    },
  });

  if (!result) {
    res.status(404).json({ error: "Result not found" });
    return;
  }

  res.json({
    id: result.id,
    leadId: result.leadId,
    firstName: result.lead.firstName,
    lastName: result.lead.lastName,
    company: result.lead.company,
    phoneNumber: result.lead.phoneNumber,
    status: result.status,
    humanDetected: result.humanDetected,
    endedReason: result.endedReason,
    callSummary: result.callSummary,
    callDuration: result.callDuration,
    callCost: result.callCost,
    aiClassification: result.aiClassification,
    transcript: result.transcript,
    recordingUrl: result.recordingUrl,
    confidenceScore: result.confidenceScore,
    calledAt: result.calledAt.toISOString(),
    campaignId: result.campaignId,
    campaignName: result.campaign?.name ?? null,
  });
});

router.get("/call-logs", async (req, res): Promise<void> => {
  const companyId = getCompanyId(req as AuthenticatedRequest);
  const parsed = ListCallLogsQueryParams.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { page = 1, limit = 20, leadId, campaignId, sortBy = "calledAt", sortOrder = "desc" } = parsed.data;
  const offset = (page - 1) * limit;

  const where: Prisma.CallResultWhereInput = { companyId };
  if (leadId) where.leadId = leadId;
  if (campaignId) where.campaignId = campaignId;

  const [logs, total] = await Promise.all([
    db.callResult.findMany({
      where,
      select: {
        id: true,
        leadId: true,
        status: true,
        humanDetected: true,
        endedReason: true,
        callSummary: true,
        callDuration: true,
        callCost: true,
        confidenceScore: true,
        calledAt: true,
        lead: {
          select: {
            firstName: true,
            lastName: true,
            company: true,
            phoneNumber: true,
          },
        },
        campaign: { select: { name: true } },
      },
      orderBy: buildCallLogOrderBy(sortBy, sortOrder),
      skip: offset,
      take: limit,
    }),
    db.callResult.count({ where }),
  ]);

  res.json({
    logs: logs.map((l) => ({
      id: l.id,
      leadId: l.leadId,
      firstName: l.lead.firstName,
      lastName: l.lead.lastName,
      company: l.lead.company,
      phoneNumber: l.lead.phoneNumber,
      status: l.status,
      humanDetected: l.humanDetected,
      endedReason: l.endedReason,
      callSummary: l.callSummary,
      callDuration: l.callDuration,
      callCost: l.callCost,
      confidenceScore: l.confidenceScore,
      calledAt: l.calledAt.toISOString(),
      campaignName: l.campaign?.name ?? null,
    })),
    total,
    page,
    limit,
  });
});

export default router;
