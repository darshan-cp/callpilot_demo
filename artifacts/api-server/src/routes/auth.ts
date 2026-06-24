import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { ChangePasswordBody, LoginBody, UpdateCurrentUserBody } from "@workspace/api-zod";
import * as crypto from "crypto";
import type { AuthenticatedRequest } from "../middleware/auth.js";
import { requireAuth } from "../middleware/auth.js";

const router: IRouter = Router();

function hashPassword(password: string): string {
  return crypto.createHash("sha256").update(password + "salt_lead_verify").digest("hex");
}

async function getUserWithCompany(userId: number) {
  const user = await db.user.findUnique({
    where: { id: userId },
  });

  if (!user) return null;

  const company = await db.company.findUnique({
    where: { id: user.companyId },
    select: { name: true, isActive: true },
  });

  if (!company?.isActive) {
    return null;
  }

  return {
    id: user.id,
    username: user.username,
    name: user.name,
    email: user.email,
    role: user.role,
    avatarUrl: user.avatarUrl ?? null,
    companyId: user.companyId,
    companyName: company?.name ?? null,
  };
}

function generateToken(userId: number): string {
  const payload = { userId, iat: Date.now() };
  return Buffer.from(JSON.stringify(payload)).toString("base64");
}

export function verifyToken(token: string): { userId: number } | null {
  try {
    const payload = JSON.parse(Buffer.from(token, "base64").toString("utf8"));
    if (!payload.userId) return null;
    return { userId: payload.userId };
  } catch {
    return null;
  }
}

router.post("/auth/login", async (req, res): Promise<void> => {
  const parsed = LoginBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { username, password } = parsed.data;

  const user = await db.user.findUnique({
    where: { username },
  });

  if (!user || user.passwordHash !== hashPassword(password)) {
    res.status(401).json({ error: "Invalid username or password" });
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

  const token = generateToken(user.id);

  res.json({
    token,
    user: {
      id: user.id,
      username: user.username,
      name: user.name,
      email: user.email,
      role: user.role,
      avatarUrl: user.avatarUrl ?? null,
      companyId: user.companyId,
      companyName: company?.name ?? null,
    },
  });
});

router.post("/auth/logout", async (_req, res): Promise<void> => {
  res.json({ success: true, message: "Logged out" });
});

router.get("/auth/me", async (req, res): Promise<void> => {
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

  const profile = await getUserWithCompany(user.id);
  if (!profile) {
    res.status(403).json({ error: "Organization account is deactivated" });
    return;
  }

  res.json(profile);
});

router.patch("/auth/me", requireAuth, async (req: AuthenticatedRequest, res): Promise<void> => {
  const parsed = UpdateCurrentUserBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const user = req.user;
  if (!user) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  const { name, username, email } = parsed.data;
  if (!name && !username && !email) {
    res.status(400).json({ error: "At least one field is required" });
    return;
  }

  if (username && username !== user.username) {
    const existing = await db.user.findFirst({
      where: { username, NOT: { id: user.id } },
      select: { id: true },
    });
    if (existing) {
      res.status(409).json({ error: "Username already in use" });
      return;
    }
  }

  if (email && email !== user.email) {
    const existing = await db.user.findFirst({
      where: { email, NOT: { id: user.id } },
      select: { id: true },
    });
    if (existing) {
      res.status(409).json({ error: "Email already in use" });
      return;
    }
  }

  const updates: { name?: string; username?: string; email?: string } = {};
  if (name) updates.name = name.trim();
  if (username) updates.username = username.trim();
  if (email) updates.email = email.trim();

  await db.user.update({
    where: { id: user.id },
    data: updates,
  });

  const profile = await getUserWithCompany(user.id);
  if (!profile) {
    res.status(401).json({ error: "User not found" });
    return;
  }

  res.json(profile);
});

router.post("/auth/change-password", requireAuth, async (req: AuthenticatedRequest, res): Promise<void> => {
  const parsed = ChangePasswordBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const user = req.user;
  if (!user) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  const { currentPassword, newPassword } = parsed.data;

  if (user.passwordHash !== hashPassword(currentPassword)) {
    res.status(401).json({ error: "Current password is incorrect" });
    return;
  }

  if (currentPassword === newPassword) {
    res.status(400).json({ error: "New password must be different from current password" });
    return;
  }

  await db.user.update({
    where: { id: user.id },
    data: { passwordHash: hashPassword(newPassword) },
  });

  res.json({ success: true, message: "Password changed successfully" });
});

export default router;
