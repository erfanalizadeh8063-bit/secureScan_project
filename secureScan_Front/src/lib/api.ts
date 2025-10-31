// Simple API client (relative base to work with Vite proxy)
import type { ApiScan, ScanItem } from "@/types/api";

// Centralized API base helper; export so other modules can use it
// prefer VITE_API_BASE; fallback to localhost backend for dev
export const API_BASE = (import.meta as any)?.env?.VITE_API_BASE?.toString() ?? "http://localhost:8080";

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
