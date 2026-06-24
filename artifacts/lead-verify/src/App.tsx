import { Switch, Route, Router as WouterRouter, Redirect } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ThemeProvider } from "next-themes";
import { Toaster } from "sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { LoginPage } from "@/pages/LoginPage";
import { DashboardPage } from "@/pages/DashboardPage";
import { LeadsPage } from "@/pages/LeadsPage";
import { LeadDetailPage } from "@/pages/LeadDetailPage";
import { CampaignsPage } from "@/pages/CampaignsPage";
import { ResultsPage } from "@/pages/ResultsPage";
import { ResultDetailPage } from "@/pages/ResultDetailPage";
import { CallLogsPage } from "@/pages/CallLogsPage";
import { SettingsPage } from "@/pages/SettingsPage";
import { isAuthenticated } from "@/lib/auth";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 30_000,
    },
  },
});

function Router() {
  return (
    <Switch>
      <Route path="/login" component={LoginPage} />
      <Route path="/dashboard">
        <ProtectedRoute><DashboardPage /></ProtectedRoute>
      </Route>
      <Route path="/leads/:id">
        <ProtectedRoute><LeadDetailPage /></ProtectedRoute>
      </Route>
      <Route path="/leads">
        <ProtectedRoute><LeadsPage /></ProtectedRoute>
      </Route>
      <Route path="/campaigns">
        <ProtectedRoute minRole="manager"><CampaignsPage /></ProtectedRoute>
      </Route>
      <Route path="/results/:id">
        <ProtectedRoute><ResultDetailPage /></ProtectedRoute>
      </Route>
      <Route path="/results">
        <ProtectedRoute><ResultsPage /></ProtectedRoute>
      </Route>
      <Route path="/call-logs">
        <ProtectedRoute><CallLogsPage /></ProtectedRoute>
      </Route>
      <Route path="/settings">
        <ProtectedRoute><SettingsPage /></ProtectedRoute>
      </Route>
      <Route path="/">
        {isAuthenticated() ? <Redirect to="/dashboard" /> : <Redirect to="/login" />}
      </Route>
      <Route>
        {isAuthenticated() ? <Redirect to="/dashboard" /> : <Redirect to="/login" />}
      </Route>
    </Switch>
  );
}

export default function App() {
  return (
    <ThemeProvider attribute="class" defaultTheme="dark" enableSystem={false}>
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
            <Router />
          </WouterRouter>
          <Toaster richColors position="top-right" />
        </TooltipProvider>
      </QueryClientProvider>
    </ThemeProvider>
  );
}
