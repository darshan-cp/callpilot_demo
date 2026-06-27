import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  getGetLiveActivityQueryOptions,
  type CampaignLiveStatus,
  type LiveActivity,
} from "@workspace/api-client-react";
import { Activity, Clock, PauseCircle, PhoneCall, Zap } from "lucide-react";
import { InfoTooltip } from "@/components/InfoTooltip";
import { Skeleton } from "@/components/ui/skeleton";
import { formatCountdown } from "@/lib/formatCountdown";
import { HELP } from "@/lib/field-help";
import { isLiveActivityBusy } from "@/hooks/useLiveActivitySync";

const STATE_LABEL: Record<CampaignLiveStatus["state"], string> = {
  dialing: "Dialing",
  waiting: "Queued",
  paused: "Paused",
  idle: "Idle",
  stopped: "Stopped",
};

const STATE_STYLE: Record<CampaignLiveStatus["state"], string> = {
  dialing: "text-emerald-600 dark:text-emerald-400",
  waiting: "text-amber-600 dark:text-amber-400",
  paused: "text-amber-600 dark:text-amber-400",
  idle: "text-muted-foreground",
  stopped: "text-muted-foreground",
};

function useTick(active: boolean) {
  const [, setTick] = useState(0);
  useEffect(() => {
    if (!active) return;
    const id = window.setInterval(() => setTick((t) => t + 1), 1000);
    return () => window.clearInterval(id);
  }, [active]);
}

function getHeadline(activity: LiveActivity | undefined) {
  if (!activity) return { label: "Loading…", detail: null, live: false };

  if (activity.activeCalls > 0) {
    return {
      label: `${activity.activeCalls} call${activity.activeCalls === 1 ? "" : "s"} live`,
      detail: `${activity.pendingLeads} leads queued`,
      live: true,
    };
  }

  if (activity.activeCampaigns === 0) {
    return { label: "Dialer idle", detail: "No active campaigns", live: false };
  }

  const paused = activity.campaigns.find((c) => c.state === "paused");
  if (paused?.nextResumeAt) {
    return {
      label: "Outside calling hours",
      detail: `Resumes in ${formatCountdown(paused.nextResumeAt) ?? "soon"}`,
      live: false,
    };
  }

  if (activity.pendingLeads > 0) {
    const nextTick = formatCountdown(activity.nextSchedulerTickAt);
    return {
      label: `${activity.pendingLeads} leads queued`,
      detail: nextTick ? `Next dial in ${nextTick}` : "Scheduler running",
      live: false,
    };
  }

  return {
    label: "Dialer ready",
    detail: `${activity.activeCampaigns} active campaign${activity.activeCampaigns === 1 ? "" : "s"}`,
    live: false,
  };
}

export function LiveOperationsPanel() {
  const { data: activity, isLoading, isFetching } = useQuery({
    ...getGetLiveActivityQueryOptions(),
    refetchInterval: (query) => (isLiveActivityBusy(query.state.data) ? 5_000 : 30_000),
  });

  const headline = useMemo(() => getHeadline(activity), [activity]);
  useTick(isLiveActivityBusy(activity));

  return (
    <div className="bg-card border border-border rounded-xl p-5 h-full min-h-[320px] flex flex-col">
      <div className="flex items-center justify-between mb-4">
        <div>
          <div className="flex items-center gap-1">
            <h3 className="text-sm font-semibold text-foreground">Live Operations</h3>
            <InfoTooltip content={HELP.dashboardLiveOps} />
          </div>
          <p className="text-xs text-muted-foreground">Real-time dialer and campaign status</p>
        </div>
        <div className="flex items-center gap-1.5">
          {isFetching && <Activity className="w-3.5 h-3.5 text-muted-foreground animate-pulse" />}
          <Zap className={`w-4 h-4 ${headline.live ? "text-emerald-500" : "text-primary"}`} />
        </div>
      </div>

      {isLoading ? (
        <div className="flex flex-1 flex-col min-h-[240px]">
          <Skeleton className="h-[52px] w-full rounded-lg mb-3" />
          <div className="grid grid-cols-3 gap-2 mb-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-[68px] w-full rounded-lg" />
            ))}
          </div>
          <Skeleton className="h-3 w-40 mb-2" />
          <div className="flex-1 space-y-1.5">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-[52px] w-full rounded-lg" />
            ))}
          </div>
        </div>
      ) : (
        <> 
          <div className="rounded-lg border border-border/70 bg-muted/30 px-3 py-2.5 mb-3">
            <div className="flex items-center gap-2">
              <span
                className={`w-2 h-2 rounded-full flex-shrink-0 ${
                  headline.live ? "bg-emerald-500 animate-pulse" : "bg-muted-foreground/50"
                }`}
              />
              <div>
                <p className="text-sm font-semibold">{headline.label}</p>
                {headline.detail && <p className="text-xs text-muted-foreground">{headline.detail}</p>}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2 mb-3">
            <MiniStat icon={PhoneCall} label="Live" value={activity?.activeCalls ?? 0} />
            <MiniStat icon={Clock} label="Queued" value={activity?.pendingLeads ?? 0} />
            <MiniStat icon={PauseCircle} label="Active" value={activity?.activeCampaigns ?? 0} />
          </div>

          <div className="text-[11px] text-muted-foreground mb-2">
            Scheduler: {activity?.schedulerRunning ? "running" : "stopped"}
            {activity?.nextSchedulerTickAt
              ? ` · next tick in ${formatCountdown(activity.nextSchedulerTickAt) ?? "soon"}`
              : ""}
          </div>

          <div className="flex-1 min-h-0 overflow-y-auto space-y-1.5 -mx-1 px-1">
            {!activity?.campaigns.length ? (
              <p className="text-xs text-muted-foreground text-center py-4">No campaigns yet</p>
            ) : (
              activity.campaigns.slice(0, 5).map((campaign) => (
                <CampaignRow key={campaign.id} campaign={campaign} />
              ))
            )}
          </div>
        </>
      )}
    </div>
  );
}

function MiniStat({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ElementType;
  label: string;
  value: number;
}) {
  return (
    <div className="rounded-lg bg-muted/40 px-2 py-2 text-center">
      <Icon className="w-3.5 h-3.5 mx-auto mb-1 text-muted-foreground" />
      <p className="text-base font-semibold leading-none tabular-nums">{value}</p>
      <p className="text-[10px] text-muted-foreground mt-1">{label}</p>
    </div>
  );
}

function CampaignRow({ campaign }: { campaign: CampaignLiveStatus }) {
  const resumeIn = formatCountdown(campaign.nextResumeAt);

  return (
    <div className="rounded-lg border border-border/60 px-2.5 py-2">
      <div className="flex items-start justify-between gap-2">
        <p className="text-xs font-medium truncate">{campaign.name}</p>
        <span className={`text-[10px] font-semibold uppercase tracking-wide ${STATE_STYLE[campaign.state]}`}>
          {STATE_LABEL[campaign.state]}
        </span>
      </div>
      <p className="text-[11px] text-muted-foreground mt-1">
        {campaign.activeCalls}/{campaign.concurrentLimit} live · {campaign.pendingLeads} pending
      </p>
      {campaign.state === "paused" && resumeIn && (
        <p className="text-[11px] text-amber-600 dark:text-amber-400 mt-0.5">Resumes in {resumeIn}</p>
      )}
    </div>
  );
}
