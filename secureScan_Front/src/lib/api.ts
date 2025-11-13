// Simple API client (relative base to work with Vite proxy)
import type { ApiScan, ScanItem } from "@/types/api";

// Canonical API base: VITE_API_BASE at build-time.
// Use of a runtime-injected `window.__CONFIG__` is intentionally ignored in
// production to avoid conflicting settings where a stale or local value could
// be baked into the bundle. This enforces a single canonical source for the
// backend origin: VITE_API_BASE.
const baked = (import.meta as any)?.env?.VITE_API_BASE?.toString() || "";
// If a runtime injection exists, log a warning (do not use it).
if ((globalThis as any)?.__CONFIG__?.API_BASE) {
  // eslint-disable-next-line no-console
  console.warn("window.__CONFIG__.API_BASE is present but will be ignored — use VITE_API_BASE at build time to configure the API base.");
}

export const API_BASE = baked;

// Fail loudly in production if baked value is missing.
if (!API_BASE) {
  const msg = "VITE_API_BASE is missing — set it at build-time (Render env or build arg).";
  if ((import.meta as any).env?.PROD) throw new Error(msg);
  // In dev, warn so local iteration still works when developers forget to set it.
  // eslint-disable-next-line no-console
  console.warn(msg);
}

export function apiUrl(path: string) {
  if (!path.startsWith("/")) path = `/${path}`;
  return `${API_BASE}${path}`;
}

async function http<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(apiUrl(path), {
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

import { notify } from "@/components/Toast";

export async function listScans(): Promise<ApiScan[]> {
  try {
    // Use the shared Api client so base URL logic is consistent.
    return await Api.listScans();
  } catch (e) {
    notify("Network error.");
    throw e;
  }
}

// Re-export types from central types file for backwards compatibility
export type { ApiScan, ScanItem } from "@/types/api";
