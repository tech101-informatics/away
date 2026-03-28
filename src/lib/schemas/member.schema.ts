import { z } from "zod";

const ALLOWED_DOMAINS = (process.env.ALLOWED_EMAIL_DOMAIN || "storepecker.me")
  .split(",")
  .map((d) => d.trim().toLowerCase())
  .filter(Boolean);

export const AddMemberSchema = z.object({
  slackUserId: z.string().default(""),
  slackEmail: z.string().default(""),
  slackDisplayName: z.string().min(1, "Name is required"),
  slackAvatar: z.string().optional(),
  workEmail: z
    .string()
    .email("Invalid work email")
    .refine((e) => {
      const domain = e.split("@")[1]?.toLowerCase();
      return ALLOWED_DOMAINS.includes(domain);
    }, {
      message: `Work email must end with @${ALLOWED_DOMAINS.join(" or @")}`,
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
