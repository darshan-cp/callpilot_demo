import { useState } from "react";
import { useListCallLogs } from "@workspace/api-client-react";
import { PageHeader } from "@/components/PageHeader";
import { TableHeadWithHelp } from "@/components/TableHeadWithHelp";
import { TablePagination, DEFAULT_PAGE_SIZE } from "@/components/TablePagination";
import { TableSkeletonRows } from "@/components/TableSkeletonRows";
import { StatusBadge } from "@/components/StatusBadge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { HELP } from "@/lib/field-help";
import { PhoneCall, UserCheck, UserX } from "lucide-react";
import { paginatedQueryOptions } from "@/lib/query-options";

function formatDuration(seconds?: number | null) {
  if (!seconds) return "—";
  if (seconds < 60) return `${seconds}s`;
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}m ${secs}s`;
}

export function CallLogsPage() {
  const [page, setPage] = useState(1);
  const pageSize = DEFAULT_PAGE_SIZE;
  const { data, isLoading } = useListCallLogs(
    { page, limit: pageSize },
    { query: paginatedQueryOptions },
  );
  const total = data?.total ?? 0;
  const showTableSkeleton = isLoading && !data;

  return (
    <div className="p-6 space-y-5 w-full">
      <PageHeader
        title="Call Logs"
        description={`${total} calls — track real person detection and outcomes from your lead files`}
        help={HELP.callLogs}
      />

      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHeadWithHelp help={HELP.lead} className="text-xs font-semibold">Lead</TableHeadWithHelp>
              <TableHeadWithHelp help={HELP.phone} className="text-xs font-semibold">Phone</TableHeadWithHelp>
              <TableHeadWithHelp help={HELP.realPerson} className="text-xs font-semibold">Real Person</TableHeadWithHelp>
              <TableHeadWithHelp help={HELP.status} className="text-xs font-semibold">Status</TableHeadWithHelp>
              <TableHeadWithHelp help={HELP.duration} className="text-xs font-semibold">Duration</TableHeadWithHelp>
              <TableHeadWithHelp help={HELP.endReason} className="text-xs font-semibold">End Reason</TableHeadWithHelp>
              <TableHeadWithHelp help={HELP.campaign} className="text-xs font-semibold">Campaign</TableHeadWithHelp>
              <TableHeadWithHelp help={HELP.calledAt} className="text-xs font-semibold">Called At</TableHeadWithHelp>
            </TableRow>
          </TableHeader>
          <TableBody>
            {showTableSkeleton ? (
              <TableSkeletonRows columns={8} />
            ) : !data?.logs.length ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-12">
                  <PhoneCall className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground">No call logs yet</p>
                  <p className="text-xs text-muted-foreground mt-1">Start a campaign to dial pending leads automatically</p>
                </TableCell>
              </TableRow>
            ) : (
              data.logs.map((log) => (
                <TableRow key={log.id} className="hover:bg-muted/30">
                  <TableCell>
                    <div className="font-medium text-sm">{log.firstName} {log.lastName}</div>
                    <div className="text-xs text-muted-foreground">{log.company}</div>
                  </TableCell>
                  <TableCell className="text-sm font-mono text-muted-foreground">{log.phoneNumber}</TableCell>
                  <TableCell>
                    {log.humanDetected === true ? (
                      <Badge variant="outline" className="gap-1 text-emerald-600 border-emerald-200 bg-emerald-50 dark:bg-emerald-900/20">
                        <UserCheck className="w-3 h-3" /> Yes
                      </Badge>
                    ) : log.humanDetected === false ? (
                      <Badge variant="outline" className="gap-1 text-amber-600 border-amber-200 bg-amber-50 dark:bg-amber-900/20">
                        <UserX className="w-3 h-3" /> No
                      </Badge>
                    ) : (
                      <span className="text-xs text-muted-foreground">—</span>
                    )}
                  </TableCell>
                  <TableCell><StatusBadge status={log.status} size="sm" /></TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {formatDuration(log.callDuration)}
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground max-w-[140px] truncate" title={log.endedReason ?? undefined}>
                    {log.endedReason?.replace(/-/g, " ") ?? "—"}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">{log.campaignName ?? "—"}</TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {new Date(log.calledAt).toLocaleString()}
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
        itemLabel="call"
        isLoading={showTableSkeleton}
        onPageChange={setPage}
      />
    </div>
  );
}
