import { useState, useRef } from "react";
import { Link } from "wouter";
import {
  useListCampaigns,
  useDeleteLead,
  useDeleteLeadsBulk,
  useTriggerLeadCall,
  useImportLeads,
  useRequeueLeads,
  useAssignLeadsCampaign,
  useExportLeads,
  useGetCurrentUser,
  getListLeadsQueryKey,
  getListLeadsQueryOptions,
  getGetLiveActivityQueryOptions,
} from "@workspace/api-client-react";
import type { LeadStatus } from "@workspace/api-client-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ConfirmDeleteDialog } from "@/components/ConfirmDeleteDialog";
import { StatusBadge } from "@/components/StatusBadge";
import { LabelWithHelp } from "@/components/LabelWithHelp";
import { PageHeader } from "@/components/PageHeader";
import { TableHeadWithHelp } from "@/components/TableHeadWithHelp";
import { TablePagination, DEFAULT_PAGE_SIZE } from "@/components/TablePagination";
import { TableSkeletonRows } from "@/components/TableSkeletonRows";
import { InfoTooltip } from "@/components/InfoTooltip";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { HELP } from "@/lib/field-help";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Upload, Search, Phone, Trash2, Eye,
  CloudUpload, FileSpreadsheet, X, Check, Download, RotateCcw, Megaphone,
} from "lucide-react";
import { toast } from "sonner";
import { canWriteLeads } from "@workspace/rbac";
import { isLiveActivityBusy } from "@/hooks/useLiveActivitySync";
import { paginatedQueryOptions } from "@/lib/query-options";

function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

interface ParsedLead {
  firstName: string;
  lastName: string;
  company: string;
  phoneNumber: string;
}

export function LeadsPage() {
  const qc = useQueryClient();
  const { data: user } = useGetCurrentUser();
  const canWrite = user ? canWriteLeads(user.role) : false;
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [campaignFilter, setCampaignFilter] = useState<string>("all");
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [showUpload, setShowUpload] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [parsedLeads, setParsedLeads] = useState<ParsedLead[]>([]);
  const [fileName, setFileName] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<{ id: number; name: string } | null>(null);
  const [bulkDeleteMode, setBulkDeleteMode] = useState<"selected" | "filtered" | null>(null);
  const [selectedCampaignId, setSelectedCampaignId] = useState("");
  const [bulkCampaignId, setBulkCampaignId] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);
  const pageSize = DEFAULT_PAGE_SIZE;

  const { data: campaigns, isLoading: campaignsLoading } = useListCampaigns();
  const importLeads = useImportLeads();
  const requeueLeads = useRequeueLeads();
  const assignLeadsCampaign = useAssignLeadsCampaign();
  const hasCampaigns = (campaigns?.length ?? 0) > 0;
  const campaignRequired = hasCampaigns;
  const deleteLead = useDeleteLead();
  const deleteLeadsBulk = useDeleteLeadsBulk();
  const triggerCall = useTriggerLeadCall();

  const { data: liveActivity } = useQuery(getGetLiveActivityQueryOptions());

  const filterPayload = {
    ...(search ? { search } : {}),
    ...(statusFilter !== "all" ? { status: statusFilter as LeadStatus } : {}),
    ...(campaignFilter !== "all" ? { campaignId: Number(campaignFilter) } : {}),
  };

  const params = {
    page,
    limit: pageSize,
    ...filterPayload,
  };

  const { data, isLoading } = useQuery({
    ...getListLeadsQueryOptions(params),
    ...paginatedQueryOptions,
    refetchInterval: isLiveActivityBusy(liveActivity) ? 5_000 : false,
    refetchIntervalInBackground: true,
  });

  const { refetch: fetchExport } = useExportLeads(
    { format: "csv", ...filterPayload },
    { query: { enabled: false } },
  );

  const parseFile = async (file: File) => {
    const name = file.name.toLowerCase();
    setFileName(file.name);

    if (name.endsWith(".csv")) {
      const text = await file.text();
      const lines = text.trim().split("\n");
      const headers = lines[0].split(",").map((h) => h.trim().toLowerCase().replace(/\s+/g, "_").replace(/['"]/g, ""));
      const leads: ParsedLead[] = lines.slice(1).map((line) => {
        const vals = line.split(",").map((v) => v.trim().replace(/['"]/g, ""));
        const row: Record<string, string> = {};
        headers.forEach((h, i) => { row[h] = vals[i] ?? ""; });
        return {
          firstName: row["first_name"] || row["firstname"] || row["first"] || "",
          lastName: row["last_name"] || row["lastname"] || row["last"] || "",
          company: row["company"] || row["company_name"] || "",
          phoneNumber: row["phone_number"] || row["phone"] || row["phonenumber"] || "",
        };
      }).filter((l) => l.firstName && l.lastName && l.company && l.phoneNumber);
      setParsedLeads(leads);
    } else {
      toast.error("Please upload a CSV file. XLSX parsing requires a library — upload CSV for now.");
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) parseFile(file);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) parseFile(file);
  };

  const resetUploadState = () => {
    setParsedLeads([]);
    setFileName("");
    setSelectedCampaignId("");
  };

  const handleImport = () => {
    if (campaignRequired && !selectedCampaignId) {
      toast.error("Select a campaign before importing leads");
      return;
    }

    importLeads.mutate(
      {
        data: {
          leads: parsedLeads,
          ...(selectedCampaignId ? { campaignId: Number(selectedCampaignId) } : {}),
        },
      },
      {
        onSuccess: (result) => {
          const parts = [`Imported ${result.imported} lead${result.imported === 1 ? "" : "s"}`];
          if (result.skipped > 0) {
            parts.push(`${result.skipped} skipped (phone already exists)`);
          }
          if (result.failed > 0) {
            parts.push(`${result.failed} failed`);
          }
          toast.success(parts.join(" · "));
          qc.invalidateQueries({ queryKey: getListLeadsQueryKey() });
          setShowUpload(false);
          resetUploadState();
        },
        onError: () => toast.error("Import failed"),
      }
    );
  };

  const confirmDelete = () => {
    if (!deleteTarget) return;
    deleteLead.mutate(
      { id: deleteTarget.id },
      {
        onSuccess: () => {
          toast.success("Lead deleted");
          qc.invalidateQueries({ queryKey: getListLeadsQueryKey() });
          setDeleteTarget(null);
        },
        onError: () => toast.error("Failed to delete lead"),
      }
    );
  };

  const confirmBulkDelete = () => {
    if (!bulkDeleteMode) return;

    const payload =
      bulkDeleteMode === "selected"
        ? { leadIds: Array.from(selectedIds) }
        : { allFiltered: true, ...filterPayload };

    deleteLeadsBulk.mutate(
      { data: payload },
      {
        onSuccess: (result) => {
          const parts = [`Deleted ${result.deleted} lead${result.deleted === 1 ? "" : "s"}`];
          if (result.skipped > 0) {
            parts.push(`${result.skipped} skipped (on call)`);
          }
          toast.success(parts.join(" · "));
          qc.invalidateQueries({ queryKey: getListLeadsQueryKey() });
          setBulkDeleteMode(null);
          clearSelection();
        },
        onError: () => toast.error("Failed to delete leads"),
      },
    );
  };

  const handleCall = (id: number) => {
    triggerCall.mutate(
      { id },
      {
        onSuccess: () => {
          toast.success("AI call initiated");
          qc.invalidateQueries({ queryKey: getListLeadsQueryKey() });
        },
      }
    );
  };

  const hasActiveFilters = search.length > 0 || statusFilter !== "all" || campaignFilter !== "all";

  const handleExport = async () => {
    const result = await fetchExport();
    if (result.data) {
      const blob = new Blob([result.data.data], { type: "text/csv" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = result.data.filename;
      a.click();
      URL.revokeObjectURL(url);
      const scope = hasActiveFilters ? "filtered" : "all";
      toast.success(`Exported ${result.data.count} ${scope} lead${result.data.count === 1 ? "" : "s"}`);
    } else {
      toast.error("Export failed");
    }
  };

  const selectableLeads = data?.leads.filter((lead) => lead.status !== "calling") ?? [];
  const selectableIds = selectableLeads.map((lead) => lead.id);
  const allPageSelected = selectableIds.length > 0 && selectableIds.every((id) => selectedIds.has(id));
  const somePageSelected = selectableIds.some((id) => selectedIds.has(id));

  const toggleSelectAllPage = (checked: boolean) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (checked) {
        selectableIds.forEach((id) => next.add(id));
      } else {
        selectableIds.forEach((id) => next.delete(id));
      }
      return next;
    });
  };

  const toggleSelectLead = (id: number, checked: boolean) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (checked) next.add(id);
      else next.delete(id);
      return next;
    });
  };

  const clearSelection = () => setSelectedIds(new Set());

  const handleRequeueSelected = () => {
    const leadIds = Array.from(selectedIds);
    if (!leadIds.length) return;

    requeueLeads.mutate(
      { data: { leadIds } },
      {
        onSuccess: (result) => {
          const parts = [`Requeued ${result.requeued} lead${result.requeued === 1 ? "" : "s"}`];
          if (result.skipped > 0) {
            parts.push(`${result.skipped} skipped (on call)`);
          }
          toast.success(parts.join(" · "));
          qc.invalidateQueries({ queryKey: getListLeadsQueryKey() });
          clearSelection();
        },
        onError: () => toast.error("Failed to requeue leads"),
      },
    );
  };

  const handleRequeueAllFiltered = () => {
    requeueLeads.mutate(
      { data: { allFiltered: true, ...filterPayload } },
      {
        onSuccess: (result) => {
          const parts = [`Requeued ${result.requeued} lead${result.requeued === 1 ? "" : "s"}`];
          if (result.skipped > 0) {
            parts.push(`${result.skipped} skipped (on call)`);
          }
          toast.success(parts.join(" · "));
          qc.invalidateQueries({ queryKey: getListLeadsQueryKey() });
          clearSelection();
        },
        onError: () => toast.error("Failed to requeue leads"),
      },
    );
  };

  const handleAssignCampaign = (allFiltered: boolean) => {
    if (!bulkCampaignId) {
      toast.error("Select a campaign first");
      return;
    }

    assignLeadsCampaign.mutate(
      {
        data: {
          targetCampaignId: Number(bulkCampaignId),
          ...(allFiltered
            ? { allFiltered: true, ...filterPayload }
            : { leadIds: Array.from(selectedIds) }),
        },
      },
      {
        onSuccess: (result) => {
          const parts = [`Moved ${result.assigned} lead${result.assigned === 1 ? "" : "s"}`];
          if (result.skipped > 0) {
            parts.push(`${result.skipped} skipped (on call)`);
          }
          toast.success(parts.join(" · "));
          qc.invalidateQueries({ queryKey: getListLeadsQueryKey() });
          clearSelection();
        },
        onError: () => toast.error("Failed to change campaign"),
      },
    );
  };

  const total = data?.total ?? 0;

  const bulkDeleteCount =
    bulkDeleteMode === "selected"
      ? selectedIds.size
      : total;

  const bulkDeleteDescription =
    bulkDeleteMode === "selected"
      ? `Are you sure you want to delete ${selectedIds.size} selected lead${selectedIds.size === 1 ? "" : "s"}? This action cannot be undone.`
      : bulkDeleteMode === "filtered"
        ? `Are you sure you want to delete all ${total} leads matching the current filters? This action cannot be undone.`
        : "";

  const bulkActionPending = requeueLeads.isPending || assignLeadsCampaign.isPending || deleteLeadsBulk.isPending;
  const showTableSkeleton = isLoading && !data;

  return (
    <div className="p-6 space-y-5 w-full">
      <PageHeader
        title="Leads"
        description={`${total} total leads`}
        help={HELP.leads}
        action={
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              onClick={handleExport}
              className="h-9 gap-2"
              title={HELP.exportCsv}
              disabled={total === 0}
            >
              <Download className="w-4 h-4" />
              Export CSV
            </Button>
            {canWrite && (
              <>
                <Button variant="outline" asChild className="h-9 gap-2" title={HELP.sampleFile}>
                  <a href="/sample-leads.csv" download="sample-leads.csv">
                    <Download className="w-4 h-4" />
                    Sample File
                  </a>
                </Button>
                <Button onClick={() => setShowUpload(true)} className="h-9 gap-2">
                  <Upload className="w-4 h-4" />
                  Upload Leads
                </Button>
              </>
            )}
          </div>
        }
      />

      {/* Filters */}
      <div className="flex flex-wrap gap-3 items-center">
        <div className="relative flex-1 max-w-xs min-w-[180px]">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
          <Input
            placeholder="Search leads..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); clearSelection(); }}
            className="pl-8 h-9"
          />
        </div>
        <InfoTooltip content={HELP.searchLeads} />
        <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setPage(1); clearSelection(); }}>
          <SelectTrigger className="w-44 h-9">
            <SelectValue placeholder="All statuses" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="calling">Calling</SelectItem>
            <SelectItem value="verified">Verified</SelectItem>
            <SelectItem value="voicemail">Voicemail</SelectItem>
            <SelectItem value="wrong_contact">Wrong Contact</SelectItem>
            <SelectItem value="company_mismatch">Company Mismatch</SelectItem>
            <SelectItem value="invalid_number">Invalid Number</SelectItem>
          </SelectContent>
        </Select>
        <InfoTooltip content={HELP.statusFilter} />
        {hasCampaigns && (
          <Select value={campaignFilter} onValueChange={(v) => { setCampaignFilter(v); setPage(1); clearSelection(); }}>
            <SelectTrigger className="w-52 h-9">
              <SelectValue placeholder="All campaigns" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All campaigns</SelectItem>
              {campaigns?.map((campaign) => (
                <SelectItem key={campaign.id} value={String(campaign.id)}>
                  {campaign.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </div>

      {canWrite && (selectedIds.size > 0 || (hasActiveFilters && total > 0)) && (
        <div className="flex flex-wrap items-center gap-3 rounded-lg border border-border bg-muted/30 px-4 py-3">
          {selectedIds.size > 0 && (
            <span className="text-sm text-foreground">
              {selectedIds.size} selected
            </span>
          )}
          {hasCampaigns && (selectedIds.size > 0 || (hasActiveFilters && total > 0)) && (
            <>
              <Select value={bulkCampaignId} onValueChange={setBulkCampaignId}>
                <SelectTrigger className="w-48 h-8 text-xs">
                  <SelectValue placeholder="Move to campaign..." />
                </SelectTrigger>
                <SelectContent>
                  {campaigns?.map((campaign) => (
                    <SelectItem key={campaign.id} value={String(campaign.id)}>
                      {campaign.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {selectedIds.size > 0 && (
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 gap-2"
                  onClick={() => handleAssignCampaign(false)}
                  disabled={!bulkCampaignId || bulkActionPending}
                >
                  <Megaphone className="w-3.5 h-3.5" />
                  {assignLeadsCampaign.isPending ? "Moving..." : "Move Selected"}
                </Button>
              )}
              {hasActiveFilters && total > 0 && (
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 gap-2"
                  onClick={() => handleAssignCampaign(true)}
                  disabled={!bulkCampaignId || bulkActionPending}
                >
                  <Megaphone className="w-3.5 h-3.5" />
                  Move All Filtered ({total})
                </Button>
              )}
            </>
          )}
          <Button
            size="sm"
            className="h-8 gap-2"
            onClick={handleRequeueSelected}
            disabled={selectedIds.size === 0 || bulkActionPending}
          >
            <RotateCcw className="w-3.5 h-3.5" />
            {requeueLeads.isPending ? "Requeueing..." : "Requeue Selected"}
          </Button>
          {hasActiveFilters && total > 0 && (
            <Button
              variant="outline"
              size="sm"
              className="h-8 gap-2"
              onClick={handleRequeueAllFiltered}
              disabled={bulkActionPending}
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Requeue All Filtered ({total})
            </Button>
          )}
          {selectedIds.size > 0 && (
            <Button
              variant="outline"
              size="sm"
              className="h-8 gap-2 text-destructive hover:text-destructive"
              onClick={() => setBulkDeleteMode("selected")}
              disabled={bulkActionPending}
            >
              <Trash2 className="w-3.5 h-3.5" />
              Delete Selected
            </Button>
          )}
          {hasActiveFilters && total > 0 && (
            <Button
              variant="outline"
              size="sm"
              className="h-8 gap-2 text-destructive hover:text-destructive"
              onClick={() => setBulkDeleteMode("filtered")}
              disabled={bulkActionPending}
            >
              <Trash2 className="w-3.5 h-3.5" />
              Delete All Filtered ({total})
            </Button>
          )}
          {selectedIds.size > 0 && (
            <Button variant="ghost" size="sm" className="h-8" onClick={clearSelection}>
              Clear selection
            </Button>
          )}
        </div>
      )}

      {/* Table */}
      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              {canWrite && (
                <TableHead className="w-10">
                  <Checkbox
                    checked={allPageSelected ? true : somePageSelected ? "indeterminate" : false}
                    onCheckedChange={(checked) => toggleSelectAllPage(checked === true)}
                    aria-label="Select all on page"
                    disabled={!selectableIds.length}
                  />
                </TableHead>
              )}
              <TableHeadWithHelp help={HELP.lead} className="text-xs font-semibold">Lead</TableHeadWithHelp>
              <TableHeadWithHelp help={HELP.company} className="text-xs font-semibold">Company</TableHeadWithHelp>
              <TableHeadWithHelp help={HELP.phone} className="text-xs font-semibold">Phone</TableHeadWithHelp>
              <TableHeadWithHelp help={HELP.status} className="text-xs font-semibold">Status</TableHeadWithHelp>
              <TableHeadWithHelp help={HELP.campaign} className="text-xs font-semibold">Campaign</TableHeadWithHelp>
              <TableHeadWithHelp help={HELP.added} className="text-xs font-semibold">Added</TableHeadWithHelp>
              <TableHeadWithHelp help={HELP.actions} className="text-xs font-semibold text-right">Actions</TableHeadWithHelp>
            </TableRow>
          </TableHeader>
          <TableBody>
            {showTableSkeleton ? (
              <TableSkeletonRows columns={canWrite ? 8 : 7} />
            ) : !data?.leads.length ? (
              <TableRow>
                <TableCell colSpan={canWrite ? 8 : 7} className="text-center py-12 text-sm text-muted-foreground">
                  No leads found. Upload a CSV file to get started.
                </TableCell>
              </TableRow>
            ) : (
              data.leads.map((lead) => (
                <TableRow key={lead.id} className="hover:bg-muted/30" data-state={selectedIds.has(lead.id) ? "selected" : undefined}>
                  {canWrite && (
                    <TableCell>
                      <Checkbox
                        checked={selectedIds.has(lead.id)}
                        onCheckedChange={(checked) => toggleSelectLead(lead.id, checked === true)}
                        aria-label={`Select ${lead.firstName} ${lead.lastName}`}
                        disabled={lead.status === "calling"}
                      />
                    </TableCell>
                  )}
                  <TableCell>
                    <div className="font-medium text-sm text-foreground">{lead.firstName} {lead.lastName}</div>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">{lead.company}</TableCell>
                  <TableCell className="text-sm font-mono text-muted-foreground">{lead.phoneNumber}</TableCell>
                  <TableCell><StatusBadge status={lead.status} /></TableCell>
                  <TableCell className="text-sm text-muted-foreground">{lead.campaignName ?? "—"}</TableCell>
                  <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
                    {formatDateTime(lead.createdAt)}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1 justify-end">
                      <Link href={`/leads/${lead.id}`}>
                        <Button variant="ghost" size="icon" className="h-7 w-7">
                          <Eye className="w-3.5 h-3.5" />
                        </Button>
                      </Link>
                      {canWrite && (
                        <>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-primary hover:text-primary"
                            onClick={() => handleCall(lead.id)}
                            disabled={lead.status === "calling"}
                            title="Trigger AI call"
                          >
                            <Phone className="w-3.5 h-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-destructive hover:text-destructive"
                            onClick={() => setDeleteTarget({ id: lead.id, name: `${lead.firstName} ${lead.lastName}` })}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <TablePagination
        page={page}
        pageSize={pageSize}
        total={total}
        itemLabel="lead"
        filtered={hasActiveFilters}
        isLoading={showTableSkeleton}
        onPageChange={setPage}
      />

      <ConfirmDeleteDialog
        open={!!deleteTarget}
        onOpenChange={(open) => { if (!open) setDeleteTarget(null); }}
        title="Delete lead?"
        description={`Are you sure you want to delete ${deleteTarget?.name ?? "this lead"}? This action cannot be undone.`}
        onConfirm={confirmDelete}
        isDeleting={deleteLead.isPending}
      />

      <ConfirmDeleteDialog
        open={!!bulkDeleteMode}
        onOpenChange={(open) => { if (!open) setBulkDeleteMode(null); }}
        title={
          bulkDeleteMode === "selected"
            ? `Delete ${bulkDeleteCount} selected lead${bulkDeleteCount === 1 ? "" : "s"}?`
            : `Delete all ${bulkDeleteCount} filtered leads?`
        }
        description={bulkDeleteDescription}
        onConfirm={confirmBulkDelete}
        isDeleting={deleteLeadsBulk.isPending}
      />

      {/* Upload Dialog */}
      <Dialog open={showUpload} onOpenChange={(v) => { setShowUpload(v); if (!v) resetUploadState(); }}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Upload Leads</DialogTitle>
          </DialogHeader>

          {hasCampaigns && (
            <div className="space-y-2">
              <LabelWithHelp htmlFor="upload-campaign" help={HELP.uploadCampaign}>Campaign</LabelWithHelp>
              {campaignsLoading ? (
                <Skeleton className="h-9 w-full" />
              ) : (
                <Select value={selectedCampaignId} onValueChange={setSelectedCampaignId}>
                  <SelectTrigger id="upload-campaign" className="h-9">
                    <SelectValue placeholder="Select a campaign" />
                  </SelectTrigger>
                  <SelectContent>
                    {campaigns?.map((campaign) => (
                      <SelectItem key={campaign.id} value={String(campaign.id)}>
                        {campaign.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
              <p className="text-xs text-muted-foreground">
                All imported leads will be assigned to the selected campaign.
              </p>
            </div>
          )}

          {!parsedLeads.length ? (
            <div
              className={`border-2 border-dashed rounded-xl p-10 text-center transition-colors cursor-pointer ${
                dragging ? "border-primary bg-primary/5" : "border-border hover:border-primary/50"
              }`}
              onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
              onDragLeave={() => setDragging(false)}
              onDrop={handleDrop}
              onClick={() => fileRef.current?.click()}
            >
              <input ref={fileRef} type="file" accept=".csv,.xlsx,.xls" className="hidden" onChange={handleFileChange} />
              <CloudUpload className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
              <p className="text-sm font-medium text-foreground">Drop your file here or click to browse</p>
              <p className="text-xs text-muted-foreground mt-1">Supports CSV, XLSX, XLS</p>
              <p className="text-xs text-muted-foreground mt-3 font-mono bg-muted rounded px-2 py-1 inline-block">
                Columns: First Name, Last Name, Company, Phone Number
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-sm text-foreground">
                <FileSpreadsheet className="w-4 h-4 text-primary" />
                <span className="font-medium">{fileName}</span>
                <span className="text-muted-foreground">— {parsedLeads.length} leads found</span>
                <button onClick={() => { setParsedLeads([]); setFileName(""); }} className="ml-auto text-muted-foreground hover:text-foreground">
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="border border-border rounded-lg overflow-hidden max-h-60 overflow-y-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHeadWithHelp help={HELP.firstName} className="text-xs">First Name</TableHeadWithHelp>
                      <TableHeadWithHelp help={HELP.lastName} className="text-xs">Last Name</TableHeadWithHelp>
                      <TableHeadWithHelp help={HELP.company} className="text-xs">Company</TableHeadWithHelp>
                      <TableHeadWithHelp help={HELP.phone} className="text-xs">Phone</TableHeadWithHelp>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {parsedLeads.slice(0, 20).map((lead, i) => (
                      <TableRow key={i}>
                        <TableCell className="text-xs">{lead.firstName}</TableCell>
                        <TableCell className="text-xs">{lead.lastName}</TableCell>
                        <TableCell className="text-xs">{lead.company}</TableCell>
                        <TableCell className="text-xs font-mono">{lead.phoneNumber}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
              {parsedLeads.length > 20 && (
                <p className="text-xs text-muted-foreground text-center">Showing 20 of {parsedLeads.length} rows</p>
              )}

              <div className="flex gap-2 justify-end">
                <Button variant="outline" onClick={() => { setParsedLeads([]); setFileName(""); }}>
                  Change File
                </Button>
                <Button
                  onClick={handleImport}
                  disabled={importLeads.isPending || (campaignRequired && !selectedCampaignId)}
                  className="gap-2"
                >
                  <Check className="w-4 h-4" />
                  {importLeads.isPending ? "Importing..." : `Import ${parsedLeads.length} Leads`}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
