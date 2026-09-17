import { z } from "zod";
import type { CallStatus } from "@/types/number";

export const callStatusSchema = z.enum(["accepted", "not_accepted", "unknown"]);

export const contactSchema = z.object({
  name: z.string().max(200, "Name is too long").optional(),
  place: z.string().max(200, "Place is too long").optional(),
  includedIn: z.string().max(200, "Value is too long").optional(),
  lastResponse: z.string().max(200, "Response is too long").optional(),
  notes: z.string().max(5000, "Notes are too long").optional(),
  lastContactedAt: z.string().optional(),
});

export const updateNumberSchema = contactSchema.extend({
  callStatus: callStatusSchema.optional(),
});

export const toggleStatusSchema = z.object({
  callStatus: callStatusSchema,
});

export type ContactFormValues = z.infer<typeof contactSchema>;
export type UpdateNumberValues = z.infer<typeof updateNumberSchema>;

export function toCallStatus(raw: unknown): CallStatus {
  if (raw === "accepted" || raw === "not_accepted" || raw === "unknown")
    return raw;
  return "unknown";
}

export const CALL_STATUSES: CallStatus[] = ["accepted", "not_accepted", "unknown"];