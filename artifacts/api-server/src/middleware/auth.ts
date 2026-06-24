import type { Request, Response, NextFunction } from "express";
import { db, type User } from "@workspace/db";
import { verifyToken } from "../routes/auth.js";

export interface AuthenticatedRequest extends Request {
  user?: User;
  companyId?: number;
  companyName?: string;
}

export async function requireAuth(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
): Promise<void> {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith("Bearer ")) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  const token = authHeader.slice(7);
  const payload = verifyToken(token);
  if (!payload) {
    res.status(401).json({ error: "Invalid token" });
    return;
  }

  const user = await db.user.findUnique({
    where: { id: payload.userId },
  });

  if (!user) {
    res.status(401).json({ error: "User not found" });
    return;
  }

  const company = await db.company.findUnique({
    where: { id: user.companyId },
    select: { name: true, isActive: true },
  });

  if (!company?.isActive) {
    res.status(403).json({ error: "Organization account is deactivated" });
    return;
  }

  req.user = user;
  req.companyId = user.companyId;
  req.companyName = company.name;
  next();
}

export function getCompanyId(req: AuthenticatedRequest): number {
  if (!req.companyId) {
    throw new Error("Company context missing — auth middleware required");
  }
  return req.companyId;
}
