import { useState } from "react";
import {
  useListCampaigns,
  useCreateCampaign,
  useUpdateCampaign,
  useDeleteCampaign,
  useStartCampaign,
  usePauseCampaign,
  getListCampaignsQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import {
  DEFAULT_RETRY_STRATEGY,
  formatStrategySummary,
  legacyToStrategy,
  parseRetryStrategy,
  strategyToLegacyFields,
  type RetryStrategy,
} from "@workspace/retry-strategy";
import { ConfirmDeleteDialog } from "@/components/ConfirmDeleteDialog";
import { LabelWithHelp } from "@/components/LabelWithHelp";
import { PageHeader } from "@/components/PageHeader";
import { InfoTooltip } from "@/components/InfoTooltip";
import { RetryStrategyBuilder } from "@/components/RetryStrategyBuilder";
import { StatLabel } from "@/components/StatLabel";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { HELP } from "@/lib/field-help";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { Plus, Play, Pause, Trash2, Megaphone, Clock } from "lucide-react";
import { toast } from "sonner";

const TIMEZONES = [
  "America/New_York", "America/Chicago", "America/Denver", "America/Los_Angeles",
  "America/Phoenix", "Europe/London", "Europe/Paris", "Asia/Kolkata", "Asia/Tokyo",
];

const STATUS_STYLE: Record<string, string> = {
  draft: "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400",
  active: "bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400",
  paused: "bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
  completed: "bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
};

interface CampaignFormData {
  name: string;
  timezone: string;
  startTime: string;
  endTime: string;
  callsPerMinute: number;
  concurrentCallLimit: number;
  retryStrategy: RetryStrategy;
}

const MAX_CONCURRENT_CALL_LIMIT = 10;

const DEFAULT_FORM: CampaignFormData = {
  name: "",
  timezone: "America/New_York",
  startTime: "09:00",
  endTime: "17:00",
  callsPerMinute: 10,
  concurrentCallLimit: 3,
  retryStrategy: DEFAULT_RETRY_STRATEGY,
};

function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

function formToPayload(form: CampaignFormData) {
  const legacy = strategyToLegacyFields(form.retryStrategy);
  return {
    ...form,
    ...legacy,
  };
}

export function CampaignsPage() {
  const qc = useQueryClient();
  const [showModal, setShowModal] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [form, setForm] = useState<CampaignFormData>(DEFAULT_FORM);
  const [editMeta, setEditMeta] = useState<{ createdAt: string; updatedAt: string } | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<{ id: number; name: string } | null>(null);

  const { data: campaigns, isLoading } = useListCampaigns();
  const createCampaign = useCreateCampaign();
  const updateCampaign = useUpdateCampaign();
  const deleteCampaign = useDeleteCampaign();
  const startCampaign = useStartCampaign();
  const pauseCampaign = usePauseCampaign();

  const invalidate = () => qc.invalidateQueries({ queryKey: getListCampaignsQueryKey() });

  const openCreate = () => {
    setEditId(null);
    setEditMeta(null);
    setForm(DEFAULT_FORM);
    setShowModal(true);
  };

  const openEdit = (c: NonNullable<typeof campaigns>[number]) => {
    setEditId(c.id);
    setEditMeta({ createdAt: c.createdAt, updatedAt: c.updatedAt });
    setForm({
      name: c.name,
      timezone: c.timezone,
      startTime: c.startTime,
      endTime: c.endTime,
      callsPerMinute: c.callsPerMinute,
      concurrentCallLimit: Math.min(MAX_CONCURRENT_CALL_LIMIT, c.concurrentCallLimit),
      retryStrategy: c.retryStrategy
        ? parseRetryStrategy(c.retryStrategy)
        : legacyToStrategy(c.retryAttempts, c.retryDelay),
    });
    setShowModal(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const payload = formToPayload(form);
    if (editId) {
      updateCampaign.mutate(
        { id: editId, data: payload },
        { onSuccess: () => { toast.success("Campaign updated"); invalidate(); setShowModal(false); } }
      );
    } else {
      createCampaign.mutate(
        { data: payload },
        { onSuccess: () => { toast.success("Campaign created"); invalidate(); setShowModal(false); } }
      );
    }
  };

  const confirmDelete = () => {
    if (!deleteTarget) return;
    deleteCampaign.mutate(
      { id: deleteTarget.id },
      {
        onSuccess: () => {
          toast.success("Campaign deleted");
          invalidate();
          setDeleteTarget(null);
        },
        onError: () => toast.error("Failed to delete campaign"),
      }
    );
  };

  const handleStart = (id: number) => {
    startCampaign.mutate({ id }, { onSuccess: () => { toast.success("Campaign started — pending leads will be dialed automatically"); invalidate(); } });
  };

  const handlePause = (id: number) => {
    pauseCampaign.mutate({ id }, { onSuccess: () => { toast.success("Campaign paused"); invalidate(); } });
  };

  const field = (key: "name" | "startTime" | "endTime") => ({
    value: String(form[key]),
    onChange: (e: React.ChangeEvent<HTMLInputElement>) =>
      setForm((f) => ({ ...f, [key]: e.target.value })),
  });

  const numberField = (key: "callsPerMinute" | "concurrentCallLimit", max?: number) => ({
    value: String(form[key]),
    onChange: (e: React.ChangeEvent<HTMLInputElement>) => {
      const raw = Number(e.target.value);
      const value = max != null ? Math.min(max, Math.max(1, raw)) : raw;
      setForm((f) => ({ ...f, [key]: value }));
    },
  });

  return (
    <div className="p-6 w-full space-y-5">
      <PageHeader
        title="Campaigns"
        description="Configure AI calling campaigns"
        help={HELP.campaigns}
        action={
          <Button onClick={openCreate} className="h-9 gap-2">
            <Plus className="w-4 h-4" />
            New Campaign
          </Button>
        }
      />

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="bg-card border border-border rounded-xl p-5 space-y-4 min-h-[320px]">
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-3 w-24" />
                </div>
                <Skeleton className="h-5 w-14 rounded-full" />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <Skeleton className="h-14 rounded-lg col-span-1" />
                <Skeleton className="h-14 rounded-lg col-span-1" />
                <Skeleton className="h-14 rounded-lg col-span-2" />
                <Skeleton className="h-14 rounded-lg col-span-2" />
              </div>
              <Skeleton className="h-1.5 w-full rounded-full" />
              <div className="space-y-2 border-t border-border pt-3">
                <Skeleton className="h-3 w-full" />
                <Skeleton className="h-3 w-3/4" />
              </div>
              <div className="flex gap-2 pt-1">
                <Skeleton className="h-8 flex-1 rounded-md" />
                <Skeleton className="h-8 w-14 rounded-md" />
                <Skeleton className="h-8 w-8 rounded-md" />
              </div>
            </div>
          ))}
        </div>
      ) : !campaigns?.length ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <Megaphone className="w-10 h-10 text-muted-foreground mb-3" />
          <p className="text-sm font-medium text-foreground">No campaigns yet</p>
          <p className="text-sm text-muted-foreground mt-1">Create a campaign to start verifying leads</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {campaigns.map((c) => {
            const totalLeads = c.totalLeads ?? 0;
            const processedLeads = c.processedLeads ?? 0;
            const progress = totalLeads > 0 ? (processedLeads / totalLeads) * 100 : 0;
            const strategy = c.retryStrategy
              ? parseRetryStrategy(c.retryStrategy)
              : legacyToStrategy(c.retryAttempts, c.retryDelay);
            return (
              <div key={c.id} className="bg-card border border-border rounded-xl p-5 space-y-4 min-h-[320px]">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <h3 className="font-semibold text-sm text-foreground truncate">{c.name}</h3>
                    <p className="text-xs text-muted-foreground mt-0.5">{c.timezone}</p>
                  </div>
                  <span className={`text-xs font-medium px-2 py-0.5 rounded-full flex-shrink-0 capitalize inline-flex items-center gap-0.5 ${STATUS_STYLE[c.status] ?? ""}`}>
                    {c.status}
                    <InfoTooltip content={HELP.campaignStatus} className="opacity-70" />
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="bg-muted/40 rounded-lg p-2.5">
                    <StatLabel help={HELP.callingWindow}>Calling Window</StatLabel>
                    <p className="font-medium text-foreground">{c.startTime} – {c.endTime}</p>
                  </div>
                  <div className="bg-muted/40 rounded-lg p-2.5">
                    <StatLabel help={HELP.rate}>Rate</StatLabel>
                    <p className="font-medium text-foreground">{c.callsPerMinute}/min · {c.concurrentCallLimit} concurrent</p>
                  </div>
                  <div className="bg-muted/40 rounded-lg p-2.5 col-span-2">
                    <StatLabel help={HELP.retries}>Retry Strategy</StatLabel>
                    <p className="font-medium text-foreground leading-snug">{formatStrategySummary(strategy)}</p>
                  </div>
                  <div className="bg-muted/40 rounded-lg p-2.5 col-span-2">
                    <StatLabel help={HELP.progress}>Progress</StatLabel>
                    <p className="font-medium text-foreground">{processedLeads}/{totalLeads} leads</p>
                  </div>
                </div>

                {totalLeads > 0 && (
                  <div>
                    <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                      <div className="h-full bg-primary rounded-full transition-all" style={{ width: `${progress}%` }} />
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">{Math.round(progress)}% complete</p>
                  </div>
                )}

                <div className="flex flex-col gap-0.5 text-[11px] text-muted-foreground border-t border-border pt-3">
                  <p>
                    <span className="font-medium text-foreground/70 inline-flex items-center gap-0.5">
                      Created <InfoTooltip content={HELP.created} />
                    </span>
                    {": "}{formatDateTime(c.createdAt)}
                  </p>
                  <p>
                    <span className="font-medium text-foreground/70 inline-flex items-center gap-0.5">
                      Updated <InfoTooltip content={HELP.updated} />
                    </span>
                    {": "}{formatDateTime(c.updatedAt)}
                  </p>
                </div>

                <div className="flex gap-2 pt-1">
                  {c.status === "active" ? (
                    <Button size="sm" variant="outline" className="flex-1 h-8 gap-1.5" onClick={() => handlePause(c.id)}>
                      <Pause className="w-3.5 h-3.5" /> Pause
                    </Button>
                  ) : (
                    <Button size="sm" className="flex-1 h-8 gap-1.5" onClick={() => handleStart(c.id)}>
                      <Play className="w-3.5 h-3.5" /> Start
                    </Button>
                  )}
                  <Button size="sm" variant="outline" className="h-8" onClick={() => openEdit(c)}>
                    Edit
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-8 text-destructive hover:text-destructive"
                    onClick={() => setDeleteTarget({ id: c.id, name: c.name })}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <ConfirmDeleteDialog
        open={!!deleteTarget}
        onOpenChange={(open) => { if (!open) setDeleteTarget(null); }}
        title="Delete campaign?"
        description={`Are you sure you want to delete "${deleteTarget?.name ?? "this campaign"}"? This action cannot be undone.`}
        onConfirm={confirmDelete}
        isDeleting={deleteCampaign.isPending}
      />

      <Dialog open={showModal} onOpenChange={setShowModal}>
        <DialogContent className="max-w-4xl w-[min(96vw,56rem)] h-[92vh] max-h-[92vh] flex flex-col gap-0 p-0 overflow-hidden sm:rounded-xl">
          <DialogHeader className="shrink-0 border-b border-border px-6 py-5">
            <DialogTitle>{editId ? "Edit Campaign" : "New Campaign"}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="flex min-h-0 flex-1 flex-col">
            <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-6 py-4">
              <div className="space-y-1.5">
                <LabelWithHelp help={HELP.campaignName}>Campaign Name</LabelWithHelp>
                <Input placeholder="e.g. Q2 Lead Verification" {...field("name")} />
              </div>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <LabelWithHelp help={HELP.timezone}>Timezone</LabelWithHelp>
                  <Select value={form.timezone} onValueChange={(v) => setForm((f) => ({ ...f, timezone: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {TIMEZONES.map((tz) => <SelectItem key={tz} value={tz}>{tz}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <LabelWithHelp help={HELP.startTime} className="flex items-center gap-1.5">
                      <Clock className="w-3 h-3" />Start Time
                    </LabelWithHelp>
                    <Input type="time" {...field("startTime")} />
                  </div>
                  <div className="space-y-1.5">
                    <LabelWithHelp help={HELP.endTime} className="flex items-center gap-1.5">
                      <Clock className="w-3 h-3" />End Time
                    </LabelWithHelp>
                    <Input type="time" {...field("endTime")} />
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <LabelWithHelp help={HELP.callsPerMinute}>Calls/Min</LabelWithHelp>
                  <Input type="number" min={1} max={60} {...numberField("callsPerMinute")} />
                </div>
                <div className="space-y-1.5">
                  <LabelWithHelp help={HELP.concurrentLimit}>Concurrent Limit</LabelWithHelp>
                  <Input type="number" min={1} max={MAX_CONCURRENT_CALL_LIMIT} {...numberField("concurrentCallLimit", MAX_CONCURRENT_CALL_LIMIT)} />
                </div>
              </div>

              <RetryStrategyBuilder
                value={form.retryStrategy}
                onChange={(retryStrategy) => setForm((f) => ({ ...f, retryStrategy }))}
                startTime={form.startTime}
                endTime={form.endTime}
              />

              {editMeta && (
                <div className="grid grid-cols-2 gap-3 rounded-lg bg-muted/40 p-3 text-xs">
                  <div>
                    <StatLabel help={HELP.created}>Created</StatLabel>
                    <p className="font-medium text-foreground">{formatDateTime(editMeta.createdAt)}</p>
                  </div>
                  <div>
                    <StatLabel help={HELP.updated}>Updated</StatLabel>
                    <p className="font-medium text-foreground">{formatDateTime(editMeta.updatedAt)}</p>
                  </div>
                </div>
              )}
            </div>

            <div className="flex shrink-0 justify-end gap-2 border-t border-border bg-background px-6 py-4">
              <Button type="button" variant="outline" onClick={() => setShowModal(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={createCampaign.isPending || updateCampaign.isPending}>
                {editId ? "Save Changes" : "Create Campaign"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
