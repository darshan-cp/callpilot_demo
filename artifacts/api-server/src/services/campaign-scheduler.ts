import { db, type Campaign } from "@workspace/db";
import { logger } from "../lib/logger.js";
import { initiateLeadCall } from "./call-service.js";

const ACTIVE_LEAD_STATUSES = ["pending"] as const;
const IN_FLIGHT_STATUSES = ["calling"] as const;
const TERMINAL_STATUSES = [
  "verified",
  "voicemail",
  "wrong_contact",
  "company_mismatch",
  "invalid_number",
] as const;

function parseIntervalMs(): number {
  const raw = process.env.SCHEDULER_INTERVAL_MS ?? "60000";
  const parsed = Number(raw);
  return Number.isFinite(parsed) && parsed >= 5000 ? parsed : 60000;
}

export function isWithinCallingWindow(campaign: {
  timezone: string;
  startTime: string;
  endTime: string;
}): boolean {
  try {
    const now = new Date();
    const formatter = new Intl.DateTimeFormat("en-US", {
      timeZone: campaign.timezone,
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    });
    const parts = formatter.formatToParts(now);
    const hour = Number(parts.find((p) => p.type === "hour")?.value ?? "0");
    const minute = Number(parts.find((p) => p.type === "minute")?.value ?? "0");
    const currentMinutes = hour * 60 + minute;

    const [startH, startM] = campaign.startTime.split(":").map(Number);
    const [endH, endM] = campaign.endTime.split(":").map(Number);
    const startMinutes = startH * 60 + startM;
    const endMinutes = endH * 60 + endM;

    return currentMinutes >= startMinutes && currentMinutes <= endMinutes;
  } catch {
    return true;
  }
}

async function processCampaign(campaign: Campaign): Promise<void> {
  if (campaign.status !== "active") return;
  if (!isWithinCallingWindow(campaign)) return;

  const inFlightCount = await db.lead.count({
    where: {
      campaignId: campaign.id,
      companyId: campaign.companyId,
      status: { in: [...IN_FLIGHT_STATUSES] },
    },
  });

  const maxConcurrent = Math.max(1, campaign.concurrentCallLimit);
  const availableSlots = Math.max(0, maxConcurrent - inFlightCount);
  if (availableSlots === 0) return;

  const pendingLeads = await db.lead.findMany({
    where: {
      campaignId: campaign.id,
      companyId: campaign.companyId,
      status: { in: [...ACTIVE_LEAD_STATUSES] },
    },
    orderBy: { createdAt: "asc" },
    take: availableSlots,
  });

  for (const lead of pendingLeads) {
    try {
      await initiateLeadCall(lead, campaign);
    } catch (err) {
      logger.error({ err, leadId: lead.id, campaignId: campaign.id }, "Scheduler call failed");
      if (lead.retryCount < campaign.retryAttempts) {
        await db.lead.update({
          where: { id: lead.id },
          data: {
            status: "pending",
            retryCount: lead.retryCount + 1,
            updatedAt: new Date(),
          },
        });
      } else {
        await db.lead.update({
          where: { id: lead.id },
          data: { status: "invalid_number", updatedAt: new Date() },
        });
      }
    }
  }
}

function getLocalMinutes(campaign: { timezone: string }): number {
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone: campaign.timezone,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
  const parts = formatter.formatToParts(new Date());
  const hour = Number(parts.find((p) => p.type === "hour")?.value ?? "0");
  const minute = Number(parts.find((p) => p.type === "minute")?.value ?? "0");
  return hour * 60 + minute;
}

export function getMsUntilCallingWindow(campaign: {
  timezone: string;
  startTime: string;
  endTime: string;
}): number | null {
  if (isWithinCallingWindow(campaign)) return null;

  const [startH, startM] = campaign.startTime.split(":").map(Number);
  const startMinutes = startH * 60 + startM;
  const currentMinutes = getLocalMinutes(campaign);
  let minutesUntil = startMinutes - currentMinutes;
  if (minutesUntil <= 0) minutesUntil += 24 * 60;
  return minutesUntil * 60 * 1000;
}

async function tick(): Promise<void> {
  lastTickAt = new Date();
  const campaigns = await db.campaign.findMany({
    where: { status: "active" },
  });

  for (const campaign of campaigns) {
    await processCampaign(campaign);
  }
}

let intervalHandle: ReturnType<typeof setInterval> | null = null;
let lastTickAt: Date | null = null;
let schedulerIntervalMs = parseIntervalMs();

export function getSchedulerMeta(): {
  running: boolean;
  intervalMs: number;
  lastTickAt: string | null;
  nextTickAt: string | null;
} {
  const nextTickAt =
    lastTickAt != null
      ? new Date(lastTickAt.getTime() + schedulerIntervalMs).toISOString()
      : intervalHandle
        ? new Date(Date.now() + schedulerIntervalMs).toISOString()
        : null;

  return {
    running: intervalHandle != null,
    intervalMs: schedulerIntervalMs,
    lastTickAt: lastTickAt?.toISOString() ?? null,
    nextTickAt,
  };
}

export function startCampaignScheduler(): void {
  if (intervalHandle) return;

  schedulerIntervalMs = parseIntervalMs();
  logger.info({ intervalMs: schedulerIntervalMs, realCalls: process.env.ENABLE_REAL_CALLS === "true" }, "Campaign scheduler started");

  void tick();
  intervalHandle = setInterval(() => {
    void tick();
  }, schedulerIntervalMs);
}

export function stopCampaignScheduler(): void {
  if (intervalHandle) {
    clearInterval(intervalHandle);
    intervalHandle = null;
  }
}

export async function countProcessedLeads(campaignId: number, companyId: number): Promise<number> {
  return db.lead.count({
    where: {
      campaignId,
      companyId,
      status: { notIn: ["pending", "calling"] },
    },
  });
}

export { TERMINAL_STATUSES };
