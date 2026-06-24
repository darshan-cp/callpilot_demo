import { useState } from "react";
import { Link, useLocation } from "wouter";
import {
  LayoutDashboard,
  Upload,
  Megaphone,
  BarChart3,
  PhoneCall,
  Settings,
  LogOut,
  Bell,
  Moon,
  Sun,
  ChevronLeft,
  ChevronRight,
  Building2,
} from "lucide-react";
import { useGetCurrentUser, useLogout } from "@workspace/api-client-react";
import { hasMinRole, ROUTE_MIN_ROLES, formatRole } from "@workspace/rbac";
import { clearToken } from "@/lib/auth";
import { GlobalSearch } from "@/components/GlobalSearch";
import { LiveActivityIndicator } from "@/components/LiveActivityIndicator";
import { useLiveActivitySync } from "@/hooks/useLiveActivitySync";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { useTheme } from "next-themes";
import { toast } from "sonner";

const NAV_ITEMS = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/leads", label: "Leads", icon: Upload },
  { href: "/campaigns", label: "Campaigns", icon: Megaphone },
  { href: "/results", label: "Results", icon: BarChart3 },
  { href: "/call-logs", label: "Call Logs", icon: PhoneCall },
  { href: "/settings", label: "Settings", icon: Settings },
];

interface NavItemProps {
  href: string;
  label: string;
  icon: React.ElementType;
  collapsed: boolean;
}

function NavItem({ href, label, icon: Icon, collapsed }: NavItemProps) {
  const [location] = useLocation();
  const isActive = location === href || location.startsWith(href + "/");

  return (
    <Link href={href}>
      <div
        className={`flex items-center gap-3 px-2.5 py-2 rounded-lg text-sm font-medium transition-colors cursor-pointer ${
          isActive
            ? "bg-sidebar-accent text-white"
            : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-white"
        } ${collapsed ? "justify-center" : ""}`}
        title={collapsed ? label : undefined}
      >
        <Icon className="w-4 h-4 flex-shrink-0" />
        {!collapsed && <span>{label}</span>}
        {isActive && !collapsed && (
          <div className="ml-auto w-1.5 h-1.5 rounded-full bg-primary" />
        )}
      </div>
    </Link>
  );
}

interface AppShellProps {
  children: React.ReactNode;
  userLoading?: boolean;
}

export function AppShell({ children, userLoading = false }: AppShellProps) {
  const [collapsed, setCollapsed] = useState(false);
  const [, navigate] = useLocation();
  const { theme, setTheme } = useTheme();
  const { data: user } = useGetCurrentUser();
  const logout = useLogout();
  useLiveActivitySync(!!user);

  const handleLogout = () => {
    logout.mutate(undefined, {
      onSettled: () => {
        clearToken();
        navigate("/login");
        toast.success("Logged out successfully");
      },
    });
  };

  const initials = user
    ? `${user.name.split(" ")[0]?.[0] ?? ""}${user.name.split(" ")[1]?.[0] ?? ""}`.toUpperCase()
    : "U";

  const companyName = user?.companyName ?? "Your Organization";
  const companyInitials = userLoading
    ? "··"
    : companyName
      .split(/\s+/)
      .slice(0, 2)
      .map((part) => part[0] ?? "")
      .join("")
      .toUpperCase() || "OR";

  const visibleNavItems = NAV_ITEMS.filter(
    (item) => !user || hasMinRole(user.role, ROUTE_MIN_ROLES[item.href] ?? "agent"),
  );

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      {/* Sidebar */}
      <aside
        className={`flex flex-col bg-sidebar border-r border-sidebar-border transition-all duration-200 flex-shrink-0 ${
          collapsed ? "w-[60px]" : "w-[220px]"
        }`}
      >
        {/* Tenant identity */}
        <div className="flex items-center gap-3 px-4 py-4 border-b border-sidebar-border min-h-[57px]">
          <div className="flex-shrink-0 w-7 h-7 rounded-lg bg-primary flex items-center justify-center">
            <span className="text-[10px] font-bold text-white">{companyInitials}</span>
          </div>
          {!collapsed && (
            userLoading ? (
              <div className="min-w-0 flex-1 space-y-1.5">
                <Skeleton className="h-3.5 w-28" />
                <Skeleton className="h-2.5 w-36" />
              </div>
            ) : (
              <div className="min-w-0 flex-1">
                <span className="text-sm font-semibold text-white tracking-tight truncate block">
                  {companyName}
                </span>
                <span className="text-[10px] text-sidebar-foreground/50 truncate block">
                  Powered by CallReady AI
                </span>
              </div>
            )
          )}
          <button
            onClick={() => setCollapsed(!collapsed)}
            className={`p-1 rounded-md text-sidebar-foreground/50 hover:text-sidebar-foreground hover:bg-sidebar-accent transition-colors ${collapsed ? "mx-auto" : "ml-auto"}`}
          >
            {collapsed ? <ChevronRight className="w-3.5 h-3.5" /> : <ChevronLeft className="w-3.5 h-3.5" />}
          </button>
        </div>

        {/* Nav */}
        <nav className="flex-1 py-3 px-2 space-y-0.5 overflow-y-auto">
          {visibleNavItems.map((item) => (
            <NavItem key={item.href} {...item} collapsed={collapsed} />
          ))}
        </nav>

        {/* User / Logout */}
        <div className="border-t border-sidebar-border p-3 space-y-1">
          {!collapsed && (userLoading ? (
            <div className="flex items-center gap-2.5 px-2 py-1.5 mb-1">
              <Skeleton className="h-7 w-7 rounded-full flex-shrink-0" />
              <div className="min-w-0 flex-1 space-y-1.5">
                <Skeleton className="h-3 w-24" />
                <Skeleton className="h-2.5 w-16" />
              </div>
            </div>
          ) : user && (
            <div className="flex items-center gap-2.5 px-2 py-1.5 mb-1">
              <Avatar className="w-7 h-7 flex-shrink-0">
                <AvatarFallback className="bg-primary text-white text-xs font-bold">
                  {initials}
                </AvatarFallback>
              </Avatar>
              <div className="min-w-0">
                <p className="text-xs font-semibold text-white truncate">{user.name}</p>
                <p className="text-xs text-sidebar-foreground/60 truncate capitalize">
                  {formatRole(user.role)}
                </p>
              </div>
            </div>
          ))}
          <button
            onClick={handleLogout}
            className={`flex items-center gap-3 w-full px-2.5 py-2 rounded-lg text-sm font-medium text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-red-400 transition-colors ${
              collapsed ? "justify-center" : ""
            }`}
            title={collapsed ? "Logout" : undefined}
          >
            <LogOut className="w-4 h-4 flex-shrink-0" />
            {!collapsed && <span>Logout</span>}
          </button>
        </div>
      </aside>

      {/* Main */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Header */}
        <header className="flex items-center gap-4 px-6 py-3 border-b border-border bg-card min-h-[57px]">
          <GlobalSearch />
          <div className="flex items-center gap-2 ml-auto">
            {userLoading ? (
              <>
                <Skeleton className="hidden md:block h-7 w-40 rounded-md" />
                <Skeleton className="h-8 w-8 rounded-md" />
                <Skeleton className="h-8 w-8 rounded-md" />
                <Skeleton className="h-8 w-8 rounded-md" />
                <div className="flex items-center gap-2 pl-2 border-l border-border">
                  <Skeleton className="h-7 w-7 rounded-full" />
                  <Skeleton className="hidden sm:block h-4 w-24" />
                </div>
              </>
            ) : (
              <>
                {user?.companyName && (
                  <div className="hidden md:flex items-center gap-2 px-2.5 py-1 rounded-md bg-muted/60 border border-border">
                    <Building2 className="w-3.5 h-3.5 text-muted-foreground" />
                    <span className="text-xs font-medium text-foreground">{user.companyName}</span>
                    <span className="text-xs text-muted-foreground capitalize">· {formatRole(user.role)}</span>
                  </div>
                )}
                <LiveActivityIndicator />
                <Button variant="ghost" size="icon" className="h-8 w-8 relative">
                  <Bell className="w-4 h-4" />
                  <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full bg-primary" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
                >
                  {theme === "dark" ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
                </Button>
                {user && (
                  <div className="flex items-center gap-2 pl-2 border-l border-border">
                    <Avatar className="w-7 h-7">
                      <AvatarFallback className="bg-primary text-white text-xs font-bold">
                        {initials}
                      </AvatarFallback>
                    </Avatar>
                    <span className="text-sm font-medium hidden sm:block">{user.name}</span>
                  </div>
                )}
              </>
            )}
          </div>
        </header>

        {/* Content */}
        <main className="flex-1 overflow-y-auto">{children}</main>
      </div>
    </div>
  );
}
