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

const BASE = ""; // use relative; Vite proxies /api to backend

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
    const r = await fetch("/api/scans", { headers: { Accept: "application/json" } });
    if (!r.ok) {
      notify("Failed to fetch scans.");
      throw new Error("Bad status");
    }
    return await r.json();
  } catch (e) {
    notify("Network error.");
    throw e;
  }
}
