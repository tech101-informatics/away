import { z } from "zod";

const ALLOWED_DOMAIN = process.env.ALLOWED_EMAIL_DOMAIN || "storepecker.me";

export const AddMemberSchema = z.object({
  slackUserId: z.string().default(""),
  slackEmail: z.string().default(""),
  slackDisplayName: z.string().min(1, "Name is required"),
  slackAvatar: z.string().optional(),
  workEmail: z
    .string()
    .email("Invalid work email")
    .refine((e) => e.endsWith(`@${ALLOWED_DOMAIN}`), {
      message: `Work email must end with @${ALLOWED_DOMAIN}`,
    })
    .optional(),
  role: z.enum(["employee", "manager"]),
  managerId: z.string().optional(),
  joiningDate: z.string().min(1, "Joining date is required"),
});

export const LinkSlackSchema = z.object({
  slackUserId: z.string().min(1, "Slack user ID is required"),
});

export type AddMemberInput = z.infer<typeof AddMemberSchema>;
export type LinkSlackInput = z.infer<typeof LinkSlackSchema>;
