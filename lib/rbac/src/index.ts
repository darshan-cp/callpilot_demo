export type UserRole = "admin" | "manager" | "agent";

const ROLE_LEVEL: Record<UserRole, number> = {
  agent: 1,
  manager: 2,
  admin: 3,
};

export function hasMinRole(userRole: string, minRole: UserRole): boolean {
  const level = ROLE_LEVEL[userRole as UserRole] ?? 0;
  return level >= ROLE_LEVEL[minRole];
}

export function canWriteLeads(userRole: string): boolean {
  return hasMinRole(userRole, "manager");
}

export function canWriteCampaigns(userRole: string): boolean {
  return hasMinRole(userRole, "manager");
}

export const ROUTE_MIN_ROLES: Record<string, UserRole> = {
  "/dashboard": "agent",
  "/leads": "agent",
  "/campaigns": "manager",
  "/results": "agent",
  "/call-logs": "agent",
  "/settings": "agent",
};

export function formatRole(role: string): string {
  return role.replace(/_/g, " ");
}
