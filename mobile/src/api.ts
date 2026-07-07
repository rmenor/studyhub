// API base URL.
// On iOS Simulator the host machine is reachable as `localhost`.
// On Android Emulator the host is `10.0.2.2` (special alias from Android).
// For a physical device, pass `EXPO_PUBLIC_API_URL=http://<your-mac-LAN-ip>:3000`.
import { Platform } from "react-native";

const DEFAULT_API_URL =
  Platform.OS === "ios" ? "http://localhost:3000" : "http://10.0.2.2:3000";

export const API_BASE_URL =
  process.env.EXPO_PUBLIC_API_URL ?? DEFAULT_API_URL;

export type Note = {
  id: string;
  title: string;
  content: string;
  pinned: boolean;
  archived: boolean;
  folder: { id: string; name: string } | null;
  tags: { tag: { id: string; name: string } }[];
  createdAt: string;
  updatedAt: string;
};

export type Folder = {
  id: string;
  name: string;
  parentId: string | null;
  _count?: { notes: number; children: number };
};

export type Tag = {
  id: string;
  name: string;
  noteCount: number;
};

export type ListNotesOpts = {
  q?: string;
  folderId?: string;
  tag?: string;
};

export class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

async function request<T>(
  path: string,
  init: RequestInit & { token?: string | null } = {},
): Promise<T> {
  const { token, headers, ...rest } = init;
  const res = await fetch(`${API_BASE_URL}${path}`, {
    ...rest,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...headers,
    },
  });

  if (!res.ok) {
    let msg = `HTTP ${res.status}`;
    try {
      const data = await res.json();
      if (data?.error) msg = data.error;
    } catch {
      /* ignore */
    }
    throw new ApiError(res.status, msg);
  }
  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
}

export const api = {
  health: () => request<{ ok: true }>("/api/health"),

  login: (email: string, password: string) =>
    request<{
      token: string;
      user: { id: string; email: string; name?: string | null };
    }>("/api/mobile/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    }),

  register: (email: string, password: string, name?: string) =>
    request<{ user: { id: string; email: string; name?: string | null } }>(
      "/api/register",
      {
        method: "POST",
        body: JSON.stringify({ email, password, name }),
      },
    ),

  listNotes: (token: string, opts: ListNotesOpts | string = {}) => {
    // Back-compat: accept a plain string (legacy `q`) as well.
    const o: ListNotesOpts =
      typeof opts === "string" ? { q: opts } : opts;
    const params = new URLSearchParams();
    if (o.q) params.set("q", o.q);
    if (o.folderId) params.set("folderId", o.folderId);
    if (o.tag) params.set("tag", o.tag);
    const qs = params.toString();
    return request<{ notes: Note[] }>(`/api/notes${qs ? `?${qs}` : ""}`, {
      token,
    });
  },

  createNote: (
    token: string,
    payload: {
      title: string;
      content: string;
      tagNames?: string[];
      folderId?: string | null;
      pinned?: boolean;
    },
  ) =>
    request<{ note: Note }>("/api/notes", {
      method: "POST",
      body: JSON.stringify(payload),
      token,
    }),

  updateNote: (
    token: string,
    id: string,
    payload: {
      title?: string;
      content?: string;
      tagNames?: string[];
      folderId?: string | null;
      pinned?: boolean;
      archived?: boolean;
    },
  ) =>
    request<{ note: Note }>(`/api/notes/${id}`, {
      method: "PATCH",
      body: JSON.stringify(payload),
      token,
    }),

  deleteNote: (token: string, id: string) =>
    request<void>(`/api/notes/${id}`, { method: "DELETE", token }),

  listFolders: (token: string) =>
    request<{ folders: Folder[] }>("/api/folders", { token }),

  createFolder: (token: string, name: string, parentId?: string | null) =>
    request<{ folder: Folder }>("/api/folders", {
      method: "POST",
      body: JSON.stringify({ name, parentId: parentId ?? null }),
      token,
    }),

  deleteFolder: (token: string, id: string) =>
    request<void>(`/api/folders/${id}`, { method: "DELETE", token }),

  listTags: (token: string) => request<{ tags: Tag[] }>("/api/tags", { token }),
};
