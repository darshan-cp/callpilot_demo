import { useState } from "react";
import { Link } from "wouter";
import { useListResults, useExportResults, getListResultsQueryKey } from "@workspace/api-client-react";
import { PageHeader } from "@/components/PageHeader";
import { TableHeadWithHelp } from "@/components/TableHeadWithHelp";
import { TablePagination, DEFAULT_PAGE_SIZE } from "@/components/TablePagination";
import { TableSkeletonRows } from "@/components/TableSkeletonRows";
import { InfoTooltip } from "@/components/InfoTooltip";
import { StatusBadge } from "@/components/StatusBadge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { HELP } from "@/lib/field-help";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Download, Search, Eye, BarChart3 } from "lucide-react";
import { toast } from "sonner";
import { paginatedQueryOptions } from "@/lib/query-options";

export function ResultsPage() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const pageSize = DEFAULT_PAGE_SIZE;

  const params = {
    page,
    limit: pageSize,
    ...(search ? { search } : {}),
    ...(statusFilter !== "all" ? { status: statusFilter as "verified" } : {}),
  };

  const { data, isLoading } = useListResults(params, { query: paginatedQueryOptions });
  const { refetch: fetchExport } = useExportResults(
    { status: statusFilter !== "all" ? statusFilter : undefined, format: "csv" },
    { query: { enabled: false } }
  );

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
      toast.success(`Exported ${result.data.count} results`);
    }
  };

  const total = data?.total ?? 0;
  const hasActiveFilters = search.length > 0 || statusFilter !== "all";
  const showTableSkeleton = isLoading && !data;

  return (
    <div className="p-6 space-y-5 w-full">
      <PageHeader
        title="Results"
        description={`${total} verification results`}
        help={HELP.results}
        action={
          <Button variant="outline" onClick={handleExport} className="h-9 gap-2" title={HELP.exportCsv}>
            <Download className="w-4 h-4" />
            Export CSV
          </Button>
        }
      />

      <div className="flex gap-3 items-center">
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
          <Input
            placeholder="Search results..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            className="pl-8 h-9"
          />
        </div>
        <InfoTooltip content={HELP.searchResults} />
        <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setPage(1); }}>
          <SelectTrigger className="w-48 h-9">
            <SelectValue placeholder="All statuses" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            <SelectItem value="verified">Verified</SelectItem>
            <SelectItem value="voicemail">Voicemail</SelectItem>
            <SelectItem value="wrong_contact">Wrong Contact</SelectItem>
            <SelectItem value="company_mismatch">Company Mismatch</SelectItem>
            <SelectItem value="invalid_number">Invalid Number</SelectItem>
          </SelectContent>
        </Select>
        <InfoTooltip content={HELP.statusFilter} />
      </div>

      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHeadWithHelp help={HELP.lead} className="text-xs font-semibold">Lead</TableHeadWithHelp>
              <TableHeadWithHelp help={HELP.company} className="text-xs font-semibold">Company</TableHeadWithHelp>
              <TableHeadWithHelp help={HELP.phone} className="text-xs font-semibold">Phone</TableHeadWithHelp>
              <TableHeadWithHelp help={HELP.status} className="text-xs font-semibold">Status</TableHeadWithHelp>
              <TableHeadWithHelp help={HELP.confidence} className="text-xs font-semibold">Confidence</TableHeadWithHelp>
              <TableHeadWithHelp help={HELP.calledAt} className="text-xs font-semibold">Called At</TableHeadWithHelp>
              <TableHeadWithHelp help={HELP.callSummary} className="text-xs font-semibold text-right">Detail</TableHeadWithHelp>
            </TableRow>
          </TableHeader>
          <TableBody>
            {showTableSkeleton ? (
              <TableSkeletonRows columns={7} />
            ) : !data?.results.length ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-12">
                  <BarChart3 className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground">No results yet. Trigger calls to generate results.</p>
                </TableCell>
              </TableRow>
            ) : (
              data.results.map((r) => (
                <TableRow key={r.id} className="hover:bg-muted/30">
                  <TableCell className="font-medium text-sm">{r.firstName} {r.lastName}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{r.company}</TableCell>
                  <TableCell className="text-sm font-mono text-muted-foreground">{r.phoneNumber}</TableCell>
                  <TableCell><StatusBadge status={r.status} /></TableCell>
                  <TableCell>
                    {r.confidenceScore !== null && r.confidenceScore !== undefined ? (
                      <div className="flex items-center gap-2">
                        <div className="w-16 h-1.5 bg-muted rounded-full overflow-hidden">
                          <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${r.confidenceScore * 100}%` }} />
                        </div>
                        <span className="text-xs font-medium text-foreground">{Math.round(r.confidenceScore * 100)}%</span>
                      </div>
                    ) : (
                      <span className="text-xs text-muted-foreground">—</span>
                    )}
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {new Date(r.calledAt).toLocaleString()}
                  </TableCell>
                  <TableCell>
                    <div className="flex justify-end">
                      <Link href={`/results/${r.id}`}>
                        <Button variant="ghost" size="icon" className="h-7 w-7">
                          <Eye className="w-3.5 h-3.5" />
                        </Button>
                      </Link>
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
        itemLabel="result"
        filtered={hasActiveFilters}
        isLoading={showTableSkeleton}
        onPageChange={setPage}
      />
    </div>
  );
}
