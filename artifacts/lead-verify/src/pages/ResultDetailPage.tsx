import { useRoute, useLocation } from "wouter";
import { useGetResult } from "@workspace/api-client-react";
import { StatusBadge } from "@/components/StatusBadge";
import { InfoTooltip } from "@/components/InfoTooltip";
import { StatLabel } from "@/components/StatLabel";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { HELP } from "@/lib/field-help";
import { ArrowLeft, Phone, Building2, Clock, Brain, FileText, Star, User } from "lucide-react";

export function ResultDetailPage() {
  const [, params] = useRoute("/results/:id");
  const [, navigate] = useLocation();
  const id = Number(params?.id);

  const { data: result, isLoading } = useGetResult(id, { query: { enabled: !!id } });

  return (
    <div className="p-6 max-w-3xl space-y-5">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" onClick={() => navigate("/results")} className="gap-1.5 h-8">
          <ArrowLeft className="w-4 h-4" />
          Back
        </Button>
      </div>

      {isLoading ? (
        <div className="space-y-4">
          <Skeleton className="h-32 w-full rounded-xl" />
          <Skeleton className="h-48 w-full rounded-xl" />
        </div>
      ) : !result ? (
        <div className="text-center py-12 text-muted-foreground">Result not found</div>
      ) : (
        <>
          <div className="bg-card border border-border rounded-xl p-5">
            <div className="flex items-start justify-between gap-4 mb-5">
              <div>
                <h1 className="text-lg font-bold">{result.firstName} {result.lastName}</h1>
                <p className="text-sm text-muted-foreground">{result.company}</p>
              </div>
              <StatusBadge status={result.status} />
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              <InfoRow icon={User} label="Full Name" help={HELP.fullName} value={`${result.firstName} ${result.lastName}`} />
              <InfoRow icon={Building2} label="Company" help={HELP.company} value={result.company} />
              <InfoRow icon={Phone} label="Phone" help={HELP.phone} value={result.phoneNumber} mono />
              <InfoRow icon={Clock} label="Called At" help={HELP.calledAt} value={new Date(result.calledAt).toLocaleString()} />
              {result.campaignName && <InfoRow icon={Star} label="Campaign" help={HELP.campaign} value={result.campaignName} />}
            </div>
          </div>

          <div className="bg-card border border-border rounded-xl p-5 space-y-5">
            <h2 className="text-sm font-semibold inline-flex items-center gap-1">
              Call Summary
              <InfoTooltip content={HELP.callSummary} />
            </h2>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <StatCard label="Duration" help={HELP.duration} value={result.callDuration ? `${result.callDuration}s` : "—"} icon={Clock} />
              <StatCard label="Classification" help={HELP.classification} value={result.aiClassification ?? "—"} icon={Brain} />
              <StatCard label="Recording" help={HELP.recording} value={result.recordingUrl ? "Available" : "—"} icon={Phone} />
              <StatCard
                label="Confidence"
                help={HELP.confidence}
                value={result.confidenceScore !== null && result.confidenceScore !== undefined
                  ? `${Math.round(result.confidenceScore * 100)}%`
                  : "—"}
                icon={Star}
                highlight={result.confidenceScore !== null && result.confidenceScore !== undefined}
                score={result.confidenceScore ?? 0}
              />
            </div>

            {result.transcript && (
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <FileText className="w-4 h-4 text-muted-foreground" />
                  <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide inline-flex items-center gap-1">
                    Transcript
                    <InfoTooltip content={HELP.transcript} />
                  </span>
                </div>
                <div className="bg-muted/50 rounded-lg p-4 text-sm text-foreground whitespace-pre-line font-mono leading-relaxed border border-border">
                  {result.transcript}
                </div>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}

function InfoRow({ icon: Icon, label, help, value, mono }: { icon: React.ElementType; label: string; help: string; value: string; mono?: boolean }) {
  return (
    <div>
      <div className="flex items-center gap-1.5 mb-0.5">
        <Icon className="w-3 h-3 text-muted-foreground" />
        <span className="text-xs text-muted-foreground">{label}</span>
        <InfoTooltip content={help} />
      </div>
      <p className={`text-sm font-medium text-foreground ${mono ? "font-mono" : ""}`}>{value}</p>
    </div>
  );
}

function StatCard({ label, help, value, icon: Icon, highlight, score }: { label: string; help: string; value: string; icon: React.ElementType; highlight?: boolean; score?: number }) {
  return (
    <div className="bg-muted/40 rounded-lg p-3 border border-border">
      <StatLabel help={help} className="text-xs mb-2">
        <span className="inline-flex items-center gap-1.5">
          <Icon className="w-3.5 h-3.5 text-muted-foreground" />
          {label}
        </span>
      </StatLabel>
      <p className={`text-sm font-bold ${highlight ? "text-emerald-600 dark:text-emerald-400" : "text-foreground"}`}>{value}</p>
      {highlight && score !== undefined && (
        <div className="mt-2 h-1.5 bg-muted rounded-full overflow-hidden">
          <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${score * 100}%` }} />
        </div>
      )}
    </div>
  );
}
