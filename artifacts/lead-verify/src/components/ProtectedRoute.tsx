import { Redirect } from "wouter";
import { useGetCurrentUser } from "@workspace/api-client-react";
import { hasMinRole, type UserRole } from "@workspace/rbac";
import { isAuthenticated, clearToken } from "@/lib/auth";
import { AppShell } from "./AppShell";

interface ProtectedRouteProps {
  children: React.ReactNode;
  minRole?: UserRole;
}

export function ProtectedRoute({ children, minRole = "agent" }: ProtectedRouteProps) {
  if (!isAuthenticated()) {
    return <Redirect to="/login" />;
  }

  return (
    <ProtectedRouteInner minRole={minRole}>
      {children}
    </ProtectedRouteInner>
  );
}

function ProtectedRouteInner({ children, minRole }: { children: React.ReactNode; minRole: UserRole }) {
  const { data: user, isLoading, isError } = useGetCurrentUser();

  if (isError || (!isLoading && !user)) {
    clearToken();
    return <Redirect to="/login" />;
  }

  if (!isLoading && user && !hasMinRole(user.role, minRole)) {
    return <Redirect to="/dashboard" />;
  }

  return (
    <AppShell userLoading={isLoading}>
      {children}
    </AppShell>
  );
}
