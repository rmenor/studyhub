// API base URL.
// In dev, the Android emulator reaches the host via 10.0.2.2; iOS sim uses localhost.
// For a physical device, replace with your machine's LAN IP.
export const API_BASE_URL =
  process.env.EXPO_PUBLIC_API_URL ?? "http://10.0.2.2:3000";

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

export type Folder = { id: string; name: string };

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

  listNotes: (token: string, q?: string) => {
    const params = new URLSearchParams();
    if (q) params.set("q", q);
    const qs = params.toString();
    return request<{ notes: Note[] }>(`/api/notes${qs ? `?${qs}` : ""}`, {
      token,
    });
  },

  createNote: (
    token: string,
    payload: { title: string; content: string; tagNames?: string[] },
  ) =>
    request<{ note: Note }>("/api/notes", {
      method: "POST",
      body: JSON.stringify(payload),
      token,
    }),

  deleteNote: (token: string, id: string) =>
    request<void>(`/api/notes/${id}`, { method: "DELETE", token }),
};
