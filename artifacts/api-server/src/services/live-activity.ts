import { db } from "@workspace/db";
import {
  getMsUntilCallingWindow,
  getSchedulerMeta,
  isWithinCallingWindow,
} from "./campaign-scheduler.js";

export type CampaignLiveState = "dialing" | "waiting" | "paused" | "idle" | "stopped";

export type CampaignLiveStatus = {
  id: number;
  name: string;
  status: string;
  inCallingWindow: boolean;
  activeCalls: number;
  concurrentLimit: number;
  pendingLeads: number;
  state: CampaignLiveState;
  nextResumeAt: string | null;
};

export type LiveActivity = {
  activeCalls: number;
  pendingLeads: number;
  activeCampaigns: number;
  schedulerRunning: boolean;
  schedulerIntervalMs: number;
  lastSchedulerTickAt: string | null;
  nextSchedulerTickAt: string | null;
  campaigns: CampaignLiveStatus[];
};

function resolveCampaignState(input: {
  status: string;
  inCallingWindow: boolean;
  activeCalls: number;
  concurrentLimit: number;
  pendingLeads: number;
}): CampaignLiveState {
  if (input.status !== "active") return "stopped";
  if (!input.inCallingWindow) return "paused";
  if (input.activeCalls > 0) return "dialing";
  if (input.pendingLeads > 0) return "waiting";
  return "idle";
}

export async function getLiveActivity(companyId: number): Promise<LiveActivity> {
  const scheduler = getSchedulerMeta();

  const activeCalls = await db.lead.count({
    where: { companyId, status: "calling" },
  });

  const campaigns = await db.campaign.findMany({
    where: { companyId },
  });

  const activeCampaignRows = campaigns.filter((c) => c.status === "active");
  const activeCampaignIds = activeCampaignRows.map((c) => c.id);

  let pendingLeads = 0;
  if (activeCampaignIds.length > 0) {
    pendingLeads = await db.lead.count({
      where: {
        companyId,
        status: "pending",
        campaignId: { in: activeCampaignIds },
      },
    });
  }

  const campaignStatuses: CampaignLiveStatus[] = await Promise.all(
    campaigns.map(async (campaign) => {
      const [campaignActiveCalls, campaignPendingLeads] = await Promise.all([
        db.lead.count({
          where: {
            companyId,
            campaignId: campaign.id,
            status: "calling",
          },
        }),
        db.lead.count({
          where: {
            companyId,
            campaignId: campaign.id,
            status: "pending",
          },
        }),
      ]);

      const inCallingWindow = isWithinCallingWindow(campaign);
      const msUntilWindow = getMsUntilCallingWindow(campaign);

      return {
        id: campaign.id,
        name: campaign.name,
        status: campaign.status,
        inCallingWindow,
        activeCalls: campaignActiveCalls,
        concurrentLimit: campaign.concurrentCallLimit,
        pendingLeads: campaignPendingLeads,
        state: resolveCampaignState({
          status: campaign.status,
          inCallingWindow,
          activeCalls: campaignActiveCalls,
          concurrentLimit: campaign.concurrentCallLimit,
          pendingLeads: campaignPendingLeads,
        }),
        nextResumeAt:
          msUntilWindow != null ? new Date(Date.now() + msUntilWindow).toISOString() : null,
      };
    }),
  );

  return {
    activeCalls,
    pendingLeads,
    activeCampaigns: activeCampaignRows.length,
    schedulerRunning: scheduler.running,
    schedulerIntervalMs: scheduler.intervalMs,
    lastSchedulerTickAt: scheduler.lastTickAt,
    nextSchedulerTickAt: scheduler.nextTickAt,
    campaigns: campaignStatuses,
  };
}
