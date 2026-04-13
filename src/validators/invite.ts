import { z } from "zod";

export const createInviteSchema = z.object({
  email: z.string().email(),
  role: z.enum(["admin", "manager", "employee", "viewer"]),
});

export const acceptInviteSchema = z.object({
  inviteId: z.string().uuid(),
  userName: z.string().min(2).max(100),
});
