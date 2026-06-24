import { useGetCampaignDashboardStats } from "@workspace/api-client-react";
import { BarChart3 } from "lucide-react";
import { InfoTooltip } from "@/components/InfoTooltip";
import { TableHeadWithHelp } from "@/components/TableHeadWithHelp";
import { TableSkeletonRows } from "@/components/TableSkeletonRows";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { HELP } from "@/lib/field-help";

const CAMPAIGN_STATUS_STYLE: Record<string, string> = {
  draft: "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400",
  active: "bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400",
  paused: "bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
  completed: "bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
};

function CampaignStatusBadge({ status }: { status: string }) {
  const style = CAMPAIGN_STATUS_STYLE[status] ?? CAMPAIGN_STATUS_STYLE.draft;
  return (
    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${style}`}>
      {status.replace(/_/g, " ")}
    </span>
  );
}

export function CampaignPerformanceTable() {
  const { data, isLoading } = useGetCampaignDashboardStats();

  return (
    <div className="bg-card border border-border rounded-xl overflow-hidden">
      <div className="px-5 py-4 border-b border-border flex items-center justify-between">
        <div>
          <div className="flex items-center gap-1">
            <h3 className="text-sm font-semibold text-foreground">Campaign Performance</h3>
            <InfoTooltip content={HELP.dashboardCampaignStats} />
          </div>
          <p className="text-xs text-muted-foreground">Compare outcomes across your campaigns</p>
        </div>
        <BarChart3 className="w-4 h-4 text-primary" />
      </div>

      <Table>
        <TableHeader>
          <TableRow className="hover:bg-transparent">
            <TableHeadWithHelp help={HELP.campaignName} className="text-xs font-semibold">Campaign</TableHeadWithHelp>
            <TableHeadWithHelp help={HELP.campaignStatus} className="text-xs font-semibold">Status</TableHeadWithHelp>
            <TableHeadWithHelp help={HELP.totalLeads} className="text-xs font-semibold text-right">Leads</TableHeadWithHelp>
            <TableHeadWithHelp help={HELP.dashboardCalled} className="text-xs font-semibold text-right">Called</TableHeadWithHelp>
            <TableHeadWithHelp help={HELP.realPersons} className="text-xs font-semibold text-right">Real Person</TableHeadWithHelp>
            <TableHeadWithHelp help={HELP.verifiedContacts} className="text-xs font-semibold text-right">Verified</TableHeadWithHelp>
            <TableHeadWithHelp help={HELP.successRate} className="text-xs font-semibold text-right">Success</TableHeadWithHelp>
          </TableRow>
        </TableHeader>
        <TableBody>
          {isLoading ? (
            <TableSkeletonRows columns={7} rows={4} />
          ) : !data?.length ? (
            <TableRow>
              <TableCell colSpan={7} className="text-center py-10 text-sm text-muted-foreground">
                No campaigns yet — create one to start tracking performance
              </TableCell>
            </TableRow>
          ) : (
            data.map((row) => (
              <TableRow key={row.id} className="hover:bg-muted/30">
                <TableCell className="font-medium text-sm">{row.name}</TableCell>
                <TableCell>
                  <CampaignStatusBadge status={row.status} />
                </TableCell>
                <TableCell className="text-right tabular-nums text-sm">{row.totalLeads}</TableCell>
                <TableCell className="text-right tabular-nums text-sm">{row.called}</TableCell>
                <TableCell className="text-right tabular-nums text-sm">{row.realPersons}</TableCell>
                <TableCell className="text-right tabular-nums text-sm text-emerald-600 dark:text-emerald-400 font-medium">
                  {row.verified}
                </TableCell>
                <TableCell className="text-right tabular-nums text-sm font-semibold">{row.successRate}%</TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
}
