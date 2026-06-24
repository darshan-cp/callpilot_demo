import { useRoute, useLocation } from "wouter";
import { useGetLead, useTriggerLeadCall, useGetCurrentUser, getGetLeadQueryKey } from "@workspace/api-client-react";
import { canWriteLeads } from "@workspace/rbac";
import { useQueryClient } from "@tanstack/react-query";
import { StatusBadge } from "@/components/StatusBadge";
import { InfoTooltip } from "@/components/InfoTooltip";
import { StatLabel } from "@/components/StatLabel";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { HELP } from "@/lib/field-help";
import { ArrowLeft, Phone, User, Building2, Clock, Brain, Mic, FileText, Star } from "lucide-react";
import { toast } from "sonner";

export function LeadDetailPage() {
  const [, params] = useRoute("/leads/:id");
  const [, navigate] = useLocation();
  const qc = useQueryClient();
  const id = Number(params?.id);

  const { data: lead, isLoading } = useGetLead(id, { query: { enabled: !!id } });
  const { data: user } = useGetCurrentUser();
  const canWrite = user ? canWriteLeads(user.role) : false;
  const triggerCall = useTriggerLeadCall();

  const handleCall = () => {
    triggerCall.mutate(
      { id },
      {
        onSuccess: () => {
          toast.success("AI call initiated");
          setTimeout(() => qc.invalidateQueries({ queryKey: getGetLeadQueryKey(id) }), 3500);
        },
      }
    );
  };

  const callResult = lead?.callResult;

  return (
    <div className="p-6 max-w-3xl space-y-5">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" onClick={() => navigate("/leads")} className="gap-1.5 h-8">
          <ArrowLeft className="w-4 h-4" />
          Back
        </Button>
      </div>

      {isLoading ? (
        <div className="space-y-4">
          <Skeleton className="h-32 w-full rounded-xl" />
          <Skeleton className="h-48 w-full rounded-xl" />
        </div>
      ) : !lead ? (
        <div className="text-center py-12 text-muted-foreground">Lead not found</div>
      ) : (
        <>
          {/* Lead Info Card */}
          <div className="bg-card border border-border rounded-xl p-5">
            <div className="flex items-start justify-between gap-4 mb-5">
              <div>
                <h1 className="text-lg font-bold text-foreground">{lead.firstName} {lead.lastName}</h1>
                <p className="text-sm text-muted-foreground mt-0.5">{lead.company}</p>
              </div>
              <div className="flex items-center gap-2">
                <StatusBadge status={lead.status} />
                {canWrite && (
                  <Button
                    size="sm"
                    onClick={handleCall}
                    disabled={lead.status === "calling" || triggerCall.isPending}
                    className="h-8 gap-1.5"
                  >
                    <Phone className="w-3.5 h-3.5" />
                    {lead.status === "calling" ? "Calling..." : "Trigger Call"}
                  </Button>
                )}
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              <InfoRow icon={User} label="Full Name" help={HELP.fullName} value={`${lead.firstName} ${lead.lastName}`} />
              <InfoRow icon={Building2} label="Company" help={HELP.company} value={lead.company} />
              <InfoRow icon={Phone} label="Phone" help={HELP.phone} value={lead.phoneNumber} mono />
              <InfoRow icon={Clock} label="Added" help={HELP.added} value={new Date(lead.createdAt).toLocaleDateString()} />
              {lead.campaignName && <InfoRow icon={Star} label="Campaign" help={HELP.campaign} value={lead.campaignName} />}
            </div>
          </div>

          {/* Call Result Card */}
          {callResult ? (
            <div className="bg-card border border-border rounded-xl p-5 space-y-5">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-semibold text-foreground inline-flex items-center gap-1">
                  Call Summary
                  <InfoTooltip content={HELP.callSummary} />
                </h2>
                <StatusBadge status={callResult.aiClassification?.toLowerCase().replace(/\s+/g, "_") ?? lead.status} />
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <StatCard label="Duration" help={HELP.duration} value={callResult.callDuration ? `${callResult.callDuration}s` : "—"} icon={Clock} />
                <StatCard label="Classification" help={HELP.classification} value={callResult.aiClassification ?? "—"} icon={Brain} />
                <StatCard label="Recording" help={HELP.recording} value={callResult.recordingUrl ? "Available" : "—"} icon={Mic} />
                <StatCard
                  label="Confidence"
                  help={HELP.confidence}
                  value={callResult.confidenceScore !== null && callResult.confidenceScore !== undefined
                    ? `${Math.round(callResult.confidenceScore * 100)}%`
                    : "—"}
                  icon={Star}
                  highlight={callResult.confidenceScore !== null && callResult.confidenceScore !== undefined}
                  score={callResult.confidenceScore ?? 0}
                />
              </div>

              {callResult.transcript && (
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <FileText className="w-4 h-4 text-muted-foreground" />
                    <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide inline-flex items-center gap-1">
                      Transcript
                      <InfoTooltip content={HELP.transcript} />
                    </span>
                  </div>
                  <div className="bg-muted/50 rounded-lg p-4 text-sm text-foreground whitespace-pre-line font-mono leading-relaxed border border-border">
                    {callResult.transcript}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="bg-card border border-border rounded-xl p-8 text-center">
              <Phone className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">No call result yet. Trigger a call to start verification.</p>
            </div>
          )}
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
      <p className={`text-sm text-foreground font-medium ${mono ? "font-mono" : ""}`}>{value}</p>
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
          <div className="h-full bg-emerald-500 rounded-full transition-all" style={{ width: `${score * 100}%` }} />
        </div>
      )}
    </div>
  );
}
