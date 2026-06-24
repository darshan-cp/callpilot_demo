import type { Response, NextFunction } from "express";
import { hasMinRole, type UserRole } from "@workspace/rbac";
import type { AuthenticatedRequest } from "./auth.js";

export function requireMinRole(minRole: UserRole) {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
    const user = req.user;
    if (!user) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }
    if (!hasMinRole(user.role, minRole)) {
      res.status(403).json({ error: "Insufficient permissions" });
      return;
    }
    next();
  };
}
