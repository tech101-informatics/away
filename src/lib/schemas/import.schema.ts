import { z } from "zod";

export const ImportRowSchema = z.object({
  employeeName: z.string().min(1).max(100),
  leaveDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Must be YYYY-MM-DD"),
  leaveType: z.enum(["casual", "sick", "personal", "annual", "optional", "unpaid", "wfh"]),
  duration: z.union([z.number(), z.string().transform(Number)]).pipe(
    z.number().refine((v) => v === 0.5 || v === 1.0, "Duration must be 0.5 or 1.0")
  ),
  isHalfDay: z.union([
    z.boolean(),
    z.string().transform((v) => v === "True" || v === "true"),
  ]),
  status: z.literal("approved"),
  source: z.literal("import"),
  originalType: z.string().min(1),
  submittedOn: z.string().min(1),
});

export type ImportRow = z.infer<typeof ImportRowSchema>;
