import { Router, type IRouter } from "express";
import { db, type Campaign, type Prisma } from "@workspace/db";
import {
  CreateCampaignBody,
  UpdateCampaignBody,
  GetCampaignParams,
  UpdateCampaignParams,
  DeleteCampaignParams,
  StartCampaignParams,
  PauseCampaignParams,
} from "@workspace/api-zod";
import { parseRetryStrategy, strategyToLegacyFields } from "@workspace/retry-strategy";
import { requireAuth, getCompanyId, type AuthenticatedRequest } from "../middleware/auth.js";
import { requireMinRole } from "../middleware/rbac.js";
import { countProcessedLeads } from "../services/campaign-scheduler.js";

const router: IRouter = Router();

router.use(requireAuth);
router.use(requireMinRole("manager"));

function serializeCampaign(
  campaign: Campaign,
  counts: { totalLeads: number; processedLeads: number },
) {
  const retryStrategy = parseRetryStrategy(campaign.retryStrategy);
  return {
    ...campaign,
    ...counts,
    retryStrategy,
    createdAt: campaign.createdAt.toISOString(),
    updatedAt: campaign.updatedAt.toISOString(),
  };
}

function normalizeCampaignInput(data: Record<string, unknown>) {
  if (data.retryStrategy) {
    const strategy = parseRetryStrategy(data.retryStrategy);
    const legacy = strategyToLegacyFields(strategy);
    return { ...data, retryStrategy: strategy, ...legacy };
  }
  return data;
}

async function getCampaignWithCounts(id: number, companyId: number) {
  const campaign = await db.campaign.findFirst({
    where: { id, companyId },
  });

  if (!campaign) return null;

  const totalLeads = await db.lead.count({
    where: { campaignId: id, companyId },
  });

  const processedLeads = await countProcessedLeads(id, companyId);

  return serializeCampaign(campaign, {
    totalLeads,
    processedLeads,
  });
}

router.get("/campaigns", async (req, res): Promise<void> => {
  const companyId = getCompanyId(req as AuthenticatedRequest);
  const campaigns = await db.campaign.findMany({
    where: { companyId },
    orderBy: { createdAt: "asc" },
  });

  const result = await Promise.all(
    campaigns.map(async (c) => {
      const totalLeads = await db.lead.count({
        where: { campaignId: c.id, companyId },
      });

      const processedLeads = await countProcessedLeads(c.id, companyId);

      return serializeCampaign(c, {
        totalLeads,
        processedLeads,
      });
    }),
  );

  res.json(result);
});

router.post("/campaigns", async (req, res): Promise<void> => {
  const companyId = getCompanyId(req as AuthenticatedRequest);
  const parsed = CreateCampaignBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const campaign = await db.campaign.create({
    data: { ...normalizeCampaignInput(parsed.data), companyId } as Prisma.CampaignUncheckedCreateInput,
  });

  res.status(201).json(
    serializeCampaign(campaign, {
      totalLeads: 0,
      processedLeads: 0,
    }),
  );
});

router.get("/campaigns/:id", async (req, res): Promise<void> => {
  const companyId = getCompanyId(req as AuthenticatedRequest);
  const params = GetCampaignParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const campaign = await getCampaignWithCounts(params.data.id, companyId);
  if (!campaign) {
    res.status(404).json({ error: "Campaign not found" });
    return;
  }

  res.json(campaign);
});

router.patch("/campaigns/:id", async (req, res): Promise<void> => {
  const companyId = getCompanyId(req as AuthenticatedRequest);
  const params = UpdateCampaignParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const parsed = UpdateCampaignBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const existing = await db.campaign.findFirst({
    where: { id: params.data.id, companyId },
  });

  if (!existing) {
    res.status(404).json({ error: "Campaign not found" });
    return;
  }

  await db.campaign.update({
    where: { id: params.data.id },
    data: { ...normalizeCampaignInput(parsed.data), updatedAt: new Date() },
  });

  const campaign = await getCampaignWithCounts(params.data.id, companyId);
  res.json(campaign);
});

router.delete("/campaigns/:id", async (req, res): Promise<void> => {
  const companyId = getCompanyId(req as AuthenticatedRequest);
  const params = DeleteCampaignParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const deleted = await db.$transaction(async (tx) => {
    const campaign = await tx.campaign.findFirst({
      where: { id: params.data.id, companyId },
    });

    if (!campaign) return null;

    const campaignLeads = await tx.lead.findMany({
      where: { campaignId: params.data.id, companyId },
      select: { id: true },
    });

    const leadIds = campaignLeads.map((lead) => lead.id);

    if (leadIds.length > 0) {
      await tx.callResult.deleteMany({
        where: { leadId: { in: leadIds }, companyId },
      });
    }

    await tx.callResult.deleteMany({
      where: { campaignId: params.data.id, companyId },
    });

    await tx.lead.updateMany({
      where: { campaignId: params.data.id, companyId },
      data: { campaignId: null },
    });

    await tx.campaign.delete({
      where: { id: params.data.id },
    });

    return campaign;
  });

  if (!deleted) {
    res.status(404).json({ error: "Campaign not found" });
    return;
  }

  res.sendStatus(204);
});

router.post("/campaigns/:id/start", async (req, res): Promise<void> => {
  const companyId = getCompanyId(req as AuthenticatedRequest);
  const params = StartCampaignParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const updated = await db.campaign.updateMany({
    where: { id: params.data.id, companyId },
    data: { status: "active", updatedAt: new Date() },
  });

  if (updated.count === 0) {
    res.status(404).json({ error: "Campaign not found" });
    return;
  }

  res.json({ success: true, message: "Campaign started — scheduler will dial pending leads automatically" });
});

router.post("/campaigns/:id/pause", async (req, res): Promise<void> => {
  const companyId = getCompanyId(req as AuthenticatedRequest);
  const params = PauseCampaignParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const updated = await db.campaign.updateMany({
    where: { id: params.data.id, companyId },
    data: { status: "paused", updatedAt: new Date() },
  });

  if (updated.count === 0) {
    res.status(404).json({ error: "Campaign not found" });
    return;
  }

  res.json({ success: true, message: "Campaign paused" });
});

export default router;
