import { z } from "zod";

export const apiKeyCreateSchema = z.object({
  name: z.string().trim().min(1, "Pon un nombre para identificar la clave").max(60),
  scopes: z
    .array(z.enum(["notes:read", "notes:write"]))
    .min(1)
    .default(["notes:write"]),
});

export const externalNoteCreateSchema = z.object({
  title: z.string().trim().min(1).max(200),
  content: z.string().max(200_000).default(""),
  folderId: z.string().cuid().nullable().optional(),
  folder: z.string().trim().min(1).max(80).optional(), // create-or-find by name
  tagNames: z.array(z.string().trim().min(1).max(40)).max(20).optional(),
  pinned: z.boolean().optional(),
});

export const externalNoteUpdateSchema = externalNoteCreateSchema.partial();

export const externalNoteListQuerySchema = z.object({
  q: z.string().trim().optional(),
  folderId: z.string().cuid().optional(),
  tag: z.string().trim().optional(),
  limit: z.coerce.number().int().min(1).max(100).default(50),
});

export type ExternalNoteCreateInput = z.infer<typeof externalNoteCreateSchema>;