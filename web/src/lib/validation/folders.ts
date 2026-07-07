import { z } from "zod";

export const folderCreateSchema = z.object({
  name: z.string().trim().min(1, "El nombre es obligatorio").max(80),
  parentId: z.string().cuid().nullable().optional(),
});

export const folderUpdateSchema = z.object({
  name: z.string().trim().min(1).max(80).optional(),
  parentId: z.string().cuid().nullable().optional(),
});

export type FolderCreateInput = z.infer<typeof folderCreateSchema>;
export type FolderUpdateInput = z.infer<typeof folderUpdateSchema>;