// Simple API client (relative base to work with Vite proxy)
export type ApiScan = {
  id: string;
  target_url?: string;
  status: "queued" | "running" | "completed" | "failed" | "canceled" | string;
  findings?: Array<any>;
  created_at?: string | number | null;
  finished_at?: string | number | null;
  [k: string]: any;
};

// Determine API base at build time via Vite env VITE_API_URL.
// In development, leave it blank so Vite proxy (configured in vite.config.ts)
// can forward `/api` to the local backend. In production the static site
// must be built with VITE_API_URL set to the full backend origin.
const VITE_API_URL = (import.meta as any).env?.VITE_API_URL ?? "";
const BASE = VITE_API_URL && VITE_API_URL.length > 0 ? VITE_API_URL.replace(/\/$/, "") : "";

async function http<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    headers: { "Content-Type": "application/json" },
    ...init,
  });
  if (!res.ok) {
    let msg = `HTTP ${res.status}`;
    try {
      const t = await res.text();
      msg = t || msg;
    } catch {}
    throw new Error(msg);
  }
  return res.json();
}

export const Api = {
  health: () => http<{ status: string }>("/api/health"),
  listScans: (params?: { limit?: number; offset?: number }) => {
    const q = new URLSearchParams();
    if (params?.limit) q.set("limit", String(params.limit));
    if (params?.offset) q.set("offset", String(params.offset));
    const qs = q.toString();
    return http<ApiScan[]>(`/api/scans${qs ? `?${qs}` : ""}`);
  },
  getScan: (id: string) => http<ApiScan>(`/api/scans/${id}`),
  startScan: (target_url: string) =>
    http<{ scan_id: string; status: string }>("/api/scans", {
      method: "POST",
      body: JSON.stringify({ target_url }),
    }),
};

export type ScanItem = {
  id: string;
  target_url?: string;
  status: "queued"|"running"|"completed"|"failed"|"canceled"|string;
  findings?: any[];
  created_at?: string;
  finished_at?: string;
};


import { notify } from "@/components/Toast";

export async function listScans() {
  try {
    // Use the shared Api client so base URL logic is consistent.
    return await Api.listScans();
  } catch (e) {
    notify("Network error.");
    throw e;
  }
}
