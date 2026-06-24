import { Router, type IRouter } from "express";
import { db, Prisma } from "@workspace/db";
import { GetDailyCallsQueryParams } from "@workspace/api-zod";
import { requireAuth, getCompanyId, type AuthenticatedRequest } from "../middleware/auth.js";
import { getLiveActivity } from "../services/live-activity.js";

const router: IRouter = Router();

router.use(requireAuth);

router.get("/dashboard/stats", async (req, res): Promise<void> => {
  const companyId = getCompanyId(req as AuthenticatedRequest);

  const [
    totalLeads,
    pendingCalls,
    verifiedContacts,
    voicemail,
    wrongContacts,
    companyMismatch,
    invalidNumbers,
    activeCampaigns,
    realPersons,
  ] = await Promise.all([
    db.lead.count({ where: { companyId } }),
    db.lead.count({ where: { companyId, status: "pending" } }),
    db.lead.count({ where: { companyId, status: "verified" } }),
    db.lead.count({ where: { companyId, status: "voicemail" } }),
    db.lead.count({ where: { companyId, status: "wrong_contact" } }),
    db.lead.count({ where: { companyId, status: "company_mismatch" } }),
    db.lead.count({ where: { companyId, status: "invalid_number" } }),
    db.campaign.count({ where: { companyId, status: "active" } }),
    db.callResult.count({ where: { companyId, humanDetected: true } }),
  ]);

  const successRate = totalLeads > 0 ? (verifiedContacts / totalLeads) * 100 : 0;

  res.json({
    totalLeads,
    pendingCalls,
    verifiedContacts,
    realPersons,
    voicemail,
    wrongContacts,
    companyMismatch,
    invalidNumbers,
    successRate: Math.round(successRate * 10) / 10,
    activeCampaigns,
  });
});

router.get("/dashboard/daily-calls", async (req, res): Promise<void> => {
  const companyId = getCompanyId(req as AuthenticatedRequest);
  const parsed = GetDailyCallsQueryParams.safeParse(req.query);
  const days = parsed.success ? (parsed.data.days ?? 30) : 30;

  const results = await db.$queryRaw<
    Array<{ date: string; calls: number; verified: number; failed: number }>
  >`
    SELECT
      DATE(called_at)::text AS date,
      COUNT(*)::int AS calls,
      COUNT(CASE WHEN status = 'verified' THEN 1 END)::int AS verified,
      COUNT(CASE WHEN status NOT IN ('verified', 'voicemail') THEN 1 END)::int AS failed
    FROM call_results
    WHERE company_id = ${companyId}
      AND called_at >= NOW() - ${Prisma.raw(`INTERVAL '${days} days'`)}
    GROUP BY DATE(called_at)
    ORDER BY DATE(called_at)
  `;

  res.json(results.map((r) => ({ date: r.date, calls: r.calls, verified: r.verified, failed: r.failed })));
});

router.get("/dashboard/status-breakdown", async (req, res): Promise<void> => {
  const companyId = getCompanyId(req as AuthenticatedRequest);
  const total = await db.callResult.count({ where: { companyId } });
  const totalForPct = total > 0 ? total : 1;

  const statuses = ["verified", "voicemail", "wrong_contact", "company_mismatch", "invalid_number"];

  const breakdown = await Promise.all(
    statuses.map(async (status) => {
      const cnt = await db.callResult.count({
        where: { companyId, status },
      });
      return {
        status,
        count: cnt,
        percentage: total > 0 ? Math.round((cnt / totalForPct) * 1000) / 10 : 0,
      };
    }),
  );

  res.json(breakdown);
});

router.get("/dashboard/live-activity", async (req, res): Promise<void> => {
  const companyId = getCompanyId(req as AuthenticatedRequest);
  const activity = await getLiveActivity(companyId);
  res.json(activity);
});

router.get("/dashboard/funnel", async (req, res): Promise<void> => {
  const companyId = getCompanyId(req as AuthenticatedRequest);

  const [totalLeads, called, verified, realPersons] = await Promise.all([
    db.lead.count({ where: { companyId } }),
    db.lead.count({ where: { companyId, status: { not: "pending" } } }),
    db.lead.count({ where: { companyId, status: "verified" } }),
    db.callResult.count({ where: { companyId, humanDetected: true } }),
  ]);

  res.json({
    totalLeads,
    called,
    realPersons,
    verified,
  });
});

router.get("/dashboard/campaign-stats", async (req, res): Promise<void> => {
  const companyId = getCompanyId(req as AuthenticatedRequest);

  const rows = await db.$queryRaw<
    Array<{
      id: number;
      name: string;
      status: string;
      totalLeads: number;
      called: number;
      verified: number;
      realPersons: number;
    }>
  >`
    SELECT
      c.id,
      c.name,
      c.status,
      COUNT(DISTINCT l.id)::int AS "totalLeads",
      COUNT(DISTINCT CASE WHEN l.status != 'pending' THEN l.id END)::int AS called,
      COUNT(DISTINCT CASE WHEN l.status = 'verified' THEN l.id END)::int AS verified,
      (
        SELECT COUNT(*)::int FROM call_results
        WHERE campaign_id = c.id
          AND company_id = ${companyId}
          AND human_detected = true
      ) AS "realPersons"
    FROM campaigns c
    LEFT JOIN leads l ON l.campaign_id = c.id
    WHERE c.company_id = ${companyId}
    GROUP BY c.id, c.name, c.status
    ORDER BY c.name
  `;

  res.json(
    rows.map((row) => {
      const totalLeads = row.totalLeads ?? 0;
      const verified = row.verified ?? 0;
      const successRate = totalLeads > 0 ? Math.round((verified / totalLeads) * 1000) / 10 : 0;
      return {
        id: row.id,
        name: row.name,
        status: row.status,
        totalLeads,
        called: row.called ?? 0,
        verified,
        realPersons: row.realPersons ?? 0,
        successRate,
      };
    }),
  );
});

export default router;
