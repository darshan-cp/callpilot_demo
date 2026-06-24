import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { getGetLiveActivityQueryOptions, type CampaignLiveStatus } from "@workspace/api-client-react";
import { formatCountdown } from "@/lib/formatCountdown";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Clock, PauseCircle, PhoneCall, Zap } from "lucide-react";
import type { LiveActivity } from "@workspace/api-client-react";

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

function getSummary(activity: LiveActivity | undefined): {
  tone: "live" | "waiting" | "paused" | "idle";
  label: string;
  detail: string | null;
} {
  if (!activity) {
    return { tone: "idle", label: "Loading…", detail: null };
  }

  if (activity.activeCalls > 0) {
    return {
      tone: "live",
      label: `${activity.activeCalls} live`,
      detail: `${activity.pendingLeads} queued`,
    };
  }

  if (activity.activeCampaigns === 0) {
    return {
      tone: "idle",
      label: "Dialer idle",
      detail: "No active campaigns",
    };
  }

  const pausedCampaign = activity.campaigns.find((c) => c.state === "paused");
  if (pausedCampaign?.nextResumeAt) {
    return {
      tone: "paused",
      label: "Outside hours",
      detail: `Resumes in ${formatCountdown(pausedCampaign.nextResumeAt) ?? "soon"}`,
    };
  }

  if (activity.pendingLeads > 0) {
    const nextTick = formatCountdown(activity.nextSchedulerTickAt);
    return {
      tone: "waiting",
      label: `${activity.pendingLeads} queued`,
      detail: nextTick ? `Next dial in ${nextTick}` : "Scheduler running",
    };
  }

  return {
    tone: "idle",
    label: "Dialer ready",
    detail: `${activity.activeCampaigns} active campaign${activity.activeCampaigns === 1 ? "" : "s"}`,
  };
}

const TONE_STYLE = {
  live: {
    pill: "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
    dot: "bg-emerald-500 animate-pulse",
  },
  waiting: {
    pill: "border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300",
    dot: "bg-amber-500",
  },
  paused: {
    pill: "border-amber-500/20 bg-muted/60 text-muted-foreground",
    dot: "bg-amber-500/70",
  },
  idle: {
    pill: "border-border bg-muted/40 text-muted-foreground",
    dot: "bg-muted-foreground/50",
  },
} as const;

export function LiveActivityIndicator() {
  const [open, setOpen] = useState(false);
  const { data: activity } = useQuery({
    ...getGetLiveActivityQueryOptions(),
    placeholderData: (previousData) => previousData,
  });
  const summary = useMemo(() => getSummary(activity), [activity]);

  useTick(open || summary.tone === "live" || summary.tone === "waiting" || summary.tone === "paused");

  const toneStyle = TONE_STYLE[summary.tone];

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className={`h-8 w-[7.75rem] sm:w-[8.75rem] shrink-0 gap-2 px-2.5 text-xs font-medium transition-[background-color,border-color,color,box-shadow] duration-300 ease-in-out ${toneStyle.pill}`}
          title="Live dialer activity"
        >
          <span
            className={`w-1.5 h-1.5 rounded-full shrink-0 transition-colors duration-300 ease-in-out ${toneStyle.dot}`}
          />
          <span className="min-w-0 flex-1 truncate text-left">{summary.label}</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 p-0">
        <div className="px-4 py-3 border-b border-border">
          <div className="flex items-center gap-2">
            <Zap className="w-4 h-4 text-primary" />
            <div>
              <p className="text-sm font-semibold">Live dialer</p>
              <p className="text-xs text-muted-foreground">
                {summary.detail ?? "Background call processing status"}
              </p>
            </div>
          </div>
        </div>

        <div className="px-4 py-3 grid grid-cols-3 gap-2 border-b border-border">
          <Stat icon={PhoneCall} label="Live" value={activity?.activeCalls ?? 0} />
          <Stat icon={Clock} label="Queued" value={activity?.pendingLeads ?? 0} />
          <Stat icon={PauseCircle} label="Campaigns" value={activity?.activeCampaigns ?? 0} />
        </div>

        <div className="px-4 py-2 text-[11px] text-muted-foreground border-b border-border space-y-0.5">
          <p>
            Scheduler: {activity?.schedulerRunning ? "running" : "stopped"}
            {activity?.nextSchedulerTickAt
              ? ` · next tick in ${formatCountdown(activity.nextSchedulerTickAt) ?? "soon"}`
              : ""}
          </p>
        </div>

        <div className="max-h-52 overflow-y-auto p-2 space-y-1">
          {!activity?.campaigns.length ? (
            <p className="text-xs text-muted-foreground px-2 py-3 text-center">No campaigns yet</p>
          ) : (
            activity.campaigns.map((campaign) => (
              <CampaignRow key={campaign.id} campaign={campaign} />
            ))
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}

function Stat({
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
      <p className="text-base font-semibold leading-none">{value}</p>
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
        <p className="text-[11px] text-amber-600 dark:text-amber-400 mt-0.5">
          Resumes in {resumeIn}
        </p>
      )}
      {campaign.state === "waiting" && campaign.pendingLeads > 0 && (
        <p className="text-[11px] text-muted-foreground mt-0.5">Waiting for next scheduler tick</p>
      )}
    </div>
  );
}
