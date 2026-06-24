import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { GlobalSearchQueryParams } from "@workspace/api-zod";
import { requireAuth, getCompanyId, type AuthenticatedRequest } from "../middleware/auth.js";

const router: IRouter = Router();

router.use(requireAuth);

function leadFieldSearch(query: string) {
  return {
    OR: [
      { firstName: { contains: query, mode: "insensitive" as const } },
      { lastName: { contains: query, mode: "insensitive" as const } },
      { company: { contains: query, mode: "insensitive" as const } },
      { phoneNumber: { contains: query } },
    ],
  };
}

function callTextSearch(query: string) {
  return {
    OR: [
      { callSummary: { contains: query, mode: "insensitive" as const } },
      { transcript: { contains: query, mode: "insensitive" as const } },
      { endedReason: { contains: query, mode: "insensitive" as const } },
      { aiClassification: { contains: query, mode: "insensitive" as const } },
    ],
  };
}

router.get("/search", async (req, res): Promise<void> => {
  const companyId = getCompanyId(req as AuthenticatedRequest);
  const parsed = GlobalSearchQueryParams.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { q, limit = 5 } = parsed.data;
  const trimmed = q.trim();
  if (!trimmed) {
    res.status(400).json({ error: "Search query is required" });
    return;
  }

  const leadWhere = { companyId, ...leadFieldSearch(trimmed) };

  const [leads, results, callLogs] = await Promise.all([
    db.lead.findMany({
      where: leadWhere,
      select: {
        id: true,
        firstName: true,
        lastName: true,
        company: true,
        phoneNumber: true,
        status: true,
      },
      orderBy: { createdAt: "asc" },
      take: limit,
    }),
    db.callResult.findMany({
      where: {
        companyId,
        OR: [
          { lead: leadFieldSearch(trimmed) },
          callTextSearch(trimmed),
        ],
      },
      select: {
        id: true,
        leadId: true,
        status: true,
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
      orderBy: { calledAt: "desc" },
      take: limit,
    }),
    db.callResult.findMany({
      where: {
        companyId,
        OR: [
          { lead: leadFieldSearch(trimmed) },
          callTextSearch(trimmed),
        ],
      },
      select: {
        id: true,
        leadId: true,
        status: true,
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
      orderBy: { calledAt: "desc" },
      take: limit,
    }),
  ]);

  const mapResult = (r: (typeof results)[number]) => ({
    id: r.id,
    leadId: r.leadId,
    firstName: r.lead.firstName,
    lastName: r.lead.lastName,
    company: r.lead.company,
    phoneNumber: r.lead.phoneNumber,
    status: r.status,
    calledAt: r.calledAt.toISOString(),
  });

  res.json({
    leads,
    results: results.map(mapResult),
    callLogs: callLogs.map(mapResult),
  });
});

export default router;
