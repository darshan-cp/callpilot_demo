import { useGetVerificationFunnel } from "@workspace/api-client-react";
import { ArrowRight, Filter } from "lucide-react";
import { InfoTooltip } from "@/components/InfoTooltip";
import { Skeleton } from "@/components/ui/skeleton";
import { HELP } from "@/lib/field-help";

const STAGES = [
  { key: "totalLeads", label: "Total Leads", bar: "bg-primary", text: "text-primary" },
  { key: "called", label: "Called", bar: "bg-violet-500", text: "text-violet-600 dark:text-violet-400" },
  { key: "realPersons", label: "Real Person", bar: "bg-teal-500", text: "text-teal-600 dark:text-teal-400" },
  { key: "verified", label: "Verified", bar: "bg-emerald-500", text: "text-emerald-600 dark:text-emerald-400" },
] as const;

function pct(value: number, base: number) {
  if (base <= 0) return 0;
  return Math.round((value / base) * 1000) / 10;
}

export function VerificationFunnel() {
  const { data, isLoading } = useGetVerificationFunnel();

  return (
    <div className="bg-card border border-border rounded-xl p-5 h-full min-h-[320px]">
      <div className="flex items-center justify-between mb-4">
        <div>
          <div className="flex items-center gap-1">
            <h3 className="text-sm font-semibold text-foreground">Verification Funnel</h3>
            <InfoTooltip content={HELP.dashboardFunnel} />
          </div>
          <p className="text-xs text-muted-foreground">Where leads drop off from upload to verified</p>
        </div>
        <Filter className="w-4 h-4 text-primary" />
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {STAGES.map((stage) => (
            <div key={stage.key} className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Skeleton className="h-3 w-24" />
                <Skeleton className="h-4 w-10" />
              </div>
              <Skeleton className="h-2 w-full rounded-full" />
              {stage.key !== "verified" && <Skeleton className="h-3 w-3 mx-auto rounded-full" />}
            </div>
          ))}
          <Skeleton className="h-8 w-full mt-2" />
        </div>
      ) : !data ? (
        <div className="h-48 flex items-center justify-center text-sm text-muted-foreground">No lead data yet</div>
      ) : (
        <div className="space-y-3">
          {STAGES.map((stage, index) => {
            const value = data[stage.key];
            const max = data.totalLeads || 1;
            const width = Math.max(8, (value / max) * 100);
            const prevValue = index > 0 ? data[STAGES[index - 1].key] : null;
            const stepRate = prevValue != null ? pct(value, prevValue) : null;

            return (
              <div key={stage.key}>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-xs font-medium text-foreground">{stage.label}</span>
                  <div className="flex items-center gap-2">
                    {stepRate != null && prevValue! > 0 && (
                      <span className="text-[10px] text-muted-foreground">{stepRate}% of prev</span>
                    )}
                    <span className={`text-sm font-bold tabular-nums ${stage.text}`}>{value}</span>
                  </div>
                </div>
                <div className="h-2 rounded-full bg-muted/60 overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all ${stage.bar}`}
                    style={{ width: `${width}%` }}
                  />
                </div>
                {index < STAGES.length - 1 && (
                  <div className="flex justify-center py-0.5">
                    <ArrowRight className="w-3 h-3 text-muted-foreground/50 rotate-90" />
                  </div>
                )}
              </div>
            );
          })}

          <div className="pt-2 border-t border-border flex items-center justify-between text-xs">
            <span className="text-muted-foreground">Overall conversion</span>
            <span className="font-semibold text-emerald-600 dark:text-emerald-400">
              {pct(data.verified, data.totalLeads)}%
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
