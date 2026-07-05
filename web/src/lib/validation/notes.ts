import { z } from "zod";

export const noteCreateSchema = z.object({
  title: z.string().trim().min(1, "El título es obligatorio").max(200),
  content: z.string().max(100_000).default(""),
  folderId: z.string().cuid().nullable().optional(),
  tagNames: z.array(z.string().trim().min(1).max(40)).max(20).optional(),
  pinned: z.boolean().optional(),
});

export const noteUpdateSchema = noteCreateSchema.partial().extend({
  archived: z.boolean().optional(),
});

export type NoteCreateInput = z.infer<typeof noteCreateSchema>;
export type NoteUpdateInput = z.infer<typeof noteUpdateSchema>;
