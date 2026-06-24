import {
  useGetDashboardStats,
  useGetDailyCalls,
  useGetStatusBreakdown,
  useGetCurrentUser,
  type DashboardStats,
} from "@workspace/api-client-react";
import type { LucideIcon } from "lucide-react";
import {
  Users, Clock, CheckCircle2, Voicemail, UserX, Building2, PhoneOff,
  TrendingUp, Zap, UserCheck, Megaphone,
} from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
} from "recharts";
import { PageHeader } from "@/components/PageHeader";
import { InfoTooltip } from "@/components/InfoTooltip";
import { StatLabel } from "@/components/StatLabel";
import { Skeleton } from "@/components/ui/skeleton";
import { VerificationFunnel } from "@/components/dashboard/VerificationFunnel";
import { LiveOperationsPanel } from "@/components/dashboard/LiveOperationsPanel";
import { CampaignPerformanceTable } from "@/components/dashboard/CampaignPerformanceTable";
import { HELP } from "@/lib/field-help";

const PIE_COLORS = ["#22c55e", "#f59e0b", "#f97316", "#3b82f6", "#ef4444"];

const STAT_CARDS: Array<{
  key: keyof DashboardStats;
  label: string;
  help: string;
  icon: LucideIcon;
  color: string;
  bg: string;
  suffix?: string;
}> = [
  { key: "totalLeads", label: "Total Leads", help: HELP.totalLeads, icon: Users, color: "text-primary", bg: "bg-primary/10" },
  { key: "pendingCalls", label: "Pending Calls", help: HELP.pendingCalls, icon: Clock, color: "text-amber-600 dark:text-amber-400", bg: "bg-amber-50 dark:bg-amber-900/20" },
  { key: "verifiedContacts", label: "Verified Contacts", help: HELP.verifiedContacts, icon: CheckCircle2, color: "text-emerald-600 dark:text-emerald-400", bg: "bg-emerald-50 dark:bg-emerald-900/20" },
  { key: "realPersons", label: "Real Persons", help: HELP.realPersons, icon: UserCheck, color: "text-teal-600 dark:text-teal-400", bg: "bg-teal-50 dark:bg-teal-900/20" },
  { key: "voicemail", label: "Voicemail", help: HELP.voicemail, icon: Voicemail, color: "text-amber-600 dark:text-amber-400", bg: "bg-amber-50 dark:bg-amber-900/20" },
  { key: "wrongContacts", label: "Wrong Contacts", help: HELP.wrongContacts, icon: UserX, color: "text-orange-600 dark:text-orange-400", bg: "bg-orange-50 dark:bg-orange-900/20" },
  { key: "companyMismatch", label: "Company Mismatch", help: HELP.companyMismatch, icon: Building2, color: "text-blue-600 dark:text-blue-400", bg: "bg-blue-50 dark:bg-blue-900/20" },
  { key: "invalidNumbers", label: "Invalid Numbers", help: HELP.invalidNumbers, icon: PhoneOff, color: "text-red-600 dark:text-red-400", bg: "bg-red-50 dark:bg-red-900/20" },
  { key: "successRate", label: "Success Rate", help: HELP.successRate, icon: TrendingUp, color: "text-primary", bg: "bg-primary/10", suffix: "%" },
  { key: "activeCampaigns", label: "Active Campaigns", help: HELP.activeCampaigns, icon: Megaphone, color: "text-violet-600 dark:text-violet-400", bg: "bg-violet-50 dark:bg-violet-900/20" },
];

export function DashboardPage() {
  const { data: user } = useGetCurrentUser();
  const { data: stats, isLoading: statsLoading } = useGetDashboardStats();
  const { data: daily, isLoading: dailyLoading } = useGetDailyCalls();
  const { data: breakdown, isLoading: breakdownLoading } = useGetStatusBreakdown();

  return (
    <div className="p-6 space-y-6 w-full">
      <PageHeader
        title="Dashboard"
        description={
          user?.companyName
            ? `Overview for ${user.companyName}`
            : "Overview of your lead verification activity"
        }
        help={HELP.dashboard}
      />

      {/* Stat cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {STAT_CARDS.map(({ key, label, help, icon: Icon, color, bg, suffix }) => (
          <div key={key} className="bg-card border border-border rounded-xl p-4 space-y-3 min-h-[120px]">
            <div className={`w-9 h-9 rounded-lg ${bg} flex items-center justify-center`}>
              <Icon className={`w-4.5 h-4.5 ${color}`} />
            </div>
            <div className="min-h-8">
              {statsLoading ? (
                <Skeleton className="h-7 w-16" />
              ) : (
                <div className="text-2xl font-bold text-foreground">
                  {stats ? (stats[key] ?? 0) : 0}
                  {suffix}
                </div>
              )}
            </div>
            <StatLabel help={help} className="text-xs font-medium">{label}</StatLabel>
          </div>
        ))}
      </div>

      {/* Funnel + live ops */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 items-stretch">
        <div className="lg:col-span-2 min-h-[320px]">
          <VerificationFunnel />
        </div>
        <div className="min-h-[320px]">
          <LiveOperationsPanel />
        </div>
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Daily calls chart */}
        <div className="lg:col-span-2 bg-card border border-border rounded-xl p-5 min-h-[280px]">
          <div className="flex items-center justify-between mb-4">
            <div>
              <div className="flex items-center gap-1">
                <h3 className="text-sm font-semibold text-foreground">Daily Calls</h3>
                <InfoTooltip content={HELP.dashboardDailyCalls} />
              </div>
              <p className="text-xs text-muted-foreground">Last 30 days</p>
            </div>
            <Zap className="w-4 h-4 text-primary" />
          </div>
          {dailyLoading ? (
            <Skeleton className="h-48 w-full" />
          ) : !daily?.length ? (
            <div className="h-48 flex items-center justify-center text-sm text-muted-foreground">No call data yet</div>
          ) : (
            <ResponsiveContainer width="100%" height={192}>
              <BarChart data={daily} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="date" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} tickLine={false} axisLine={false} />
                <YAxis tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} tickLine={false} axisLine={false} />
                <Tooltip
                  contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 }}
                  labelStyle={{ color: "hsl(var(--foreground))" }}
                />
                <Bar dataKey="calls" fill="hsl(var(--chart-1))" radius={[3, 3, 0, 0]} name="Total Calls" />
                <Bar dataKey="verified" fill="hsl(var(--chart-2))" radius={[3, 3, 0, 0]} name="Verified" />
                <Bar dataKey="failed" fill="hsl(var(--chart-3))" radius={[3, 3, 0, 0]} name="Other outcomes" />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Status breakdown pie */}
        <div className="bg-card border border-border rounded-xl p-5 min-h-[280px]">
          <div className="mb-4">
            <div className="flex items-center gap-1">
              <h3 className="text-sm font-semibold text-foreground">Verification Status</h3>
              <InfoTooltip content={HELP.dashboardStatusBreakdown} />
            </div>
            <p className="text-xs text-muted-foreground">Distribution breakdown</p>
          </div>
          {breakdownLoading ? (
            <Skeleton className="h-48 w-full" />
          ) : !breakdown?.length || breakdown.every((b) => b.count === 0) ? (
            <div className="h-48 flex items-center justify-center text-sm text-muted-foreground">No results yet</div>
          ) : (
            <ResponsiveContainer width="100%" height={192}>
              <PieChart>
                <Pie
                  data={breakdown}
                  dataKey="count"
                  nameKey="status"
                  cx="50%"
                  cy="45%"
                  innerRadius={50}
                  outerRadius={75}
                  paddingAngle={2}
                >
                  {breakdown.map((_, i) => (
                    <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 11 }}
                  formatter={(value, name) => [value, (name as string).replace(/_/g, " ")]}
                />
                <Legend
                  formatter={(value) => <span style={{ fontSize: 11, color: "hsl(var(--muted-foreground))" }}>{value.replace(/_/g, " ")}</span>}
                />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      <CampaignPerformanceTable />
    </div>
  );
}
