// Central API client (single source of truth for API base)
import type { ApiScan, ScanItem } from "@/types/api";
import { notify } from "@/components/Toast";

// Build-time canonical API base (Vite)
const baked = (import.meta as any)?.env?.VITE_API_BASE?.toString?.() ?? "";

function normalizeBase(base: string): string {
  return String(base || "").trim().replace(/\/+$/, "");
}

export const API_BASE = normalizeBase(baked);

// If a runtime injection exists, warn but do NOT use it (avoid conflicting sources)
if ((globalThis as any)?.__CONFIG__?.API_BASE) {
  // eslint-disable-next-line no-console
  console.warn(
    "window.__CONFIG__.API_BASE is present but will be ignored — use VITE_API_BASE at build time to configure the API base."
  );
}

// Fail loudly in production if missing
if (!API_BASE) {
  const msg =
    "VITE_API_BASE is missing — set it at build-time (Render env or build arg).";
  if ((import.meta as any).env?.PROD) throw new Error(msg);
  // eslint-disable-next-line no-console
  console.warn(msg);
}

export function apiUrl(path: string): string {
  let p = String(path || "");
  if (!p.startsWith("/")) p = `/${p}`;
  return `${API_BASE}${p}`;
}

type HttpError = Error & { status?: number; bodyText?: string };

async function http<T>(path: string, init?: RequestInit): Promise<T> {
  const headers: HeadersInit = {
    "Content-Type": "application/json",
    ...(init?.headers ?? {}),
  };

  const res = await fetch(apiUrl(path), {
    ...init,
    headers,
  });

  if (!res.ok) {
    const err: HttpError = new Error(`HTTP ${res.status} ${res.statusText}`);
    err.status = res.status;

    // Try to read a useful message from server
    try {
      const text = await res.text();
      err.bodyText = text;
      if (text) err.message = text;
    } catch {
      // ignore
    }

    throw err;
  }

  // Some endpoints may return no body
  const ct = res.headers.get("content-type") || "";
  if (!ct.includes("application/json")) {
    
    return (await res.text()) as T;
  }
  return res.json();
}

export const Api = {
  health: () => http<{ status: string }>("/api/health"),

  listScans: (params?: { limit?: number; offset?: number }) => {
    const q = new URLSearchParams();
    if (params?.limit != null) q.set("limit", String(params.limit));
    if (params?.offset != null) q.set("offset", String(params.offset));
    const qs = q.toString();
    return http<ApiScan[]>(`/api/scans${qs ? `?${qs}` : ""}`);
  },

  getScan: (id: string) => http<ApiScan>(`/api/scans/${id}`),

  startScan: (url: string) =>
    http<{ id?: string; scan_id?: string; status?: string }>("/api/scans", {
      method: "POST",
      // backend currently accepts {url}; keep compatibility by sending both
      body: JSON.stringify({ url, target_url: url }),
    }),
};

export async function listScans(): Promise<ApiScan[]> {
  try {
    return await Api.listScans();
  } catch (e) {
    notify("Network error.");
    throw e;
  }
}

// Re-export types for backwards compatibility
export type { ApiScan, ScanItem };
