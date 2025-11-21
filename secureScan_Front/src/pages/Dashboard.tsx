import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import Card from "@/components/Card";
import StatusBadge from "@/components/StatusBadge";
import { Api, ApiScan } from "@/lib/api";

// Status filter options
const STATUSES = ["queued", "running", "completed", "failed", "canceled"] as const;
type StatusFilter = (typeof STATUSES)[number] | "ALL";

// Simple date formatter (handles number/iso/string)
function fmtDate(x: string | number | null | undefined) {
  if (!x && x !== 0) return "-";
  let d: Date;
  if (typeof x === "number") {
    d = new Date(x);
  } else {
    const n = Number(x);
    d = Number.isFinite(n) ? new Date(n) : new Date(String(x));
  }
  if (isNaN(d.getTime())) return String(x);
  return new Intl.DateTimeFormat(undefined, {
    year: "2-digit",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(d);
}

// Very simple risk score: 10 points per finding, max 100
function computeRiskScore(findings: any[] | null | undefined): number {
  if (!Array.isArray(findings) || findings.length === 0) return 0;
  const score = findings.length * 10;
  return score > 100 ? 100 : score;
}

export default function Dashboard() {
  const nav = useNavigate();

  // Data state
  const [rows, setRows] = useState<ApiScan[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // UI state
  const [status, setStatus] = useState<StatusFilter>("ALL");
  const [q, setQ] = useState("");

  // New scan form state
  const [newUrl, setNewUrl] = useState("");
  const [creating, setCreating] = useState(false);

  async function load() {
    try {
      setLoading(true);
      const data = await Api.listScans();
      setRows(Array.isArray(data) ? data : []);
      setError(null);
    } catch (e: any) {
      setError(e?.message || "Failed to load scans");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function createScan(e: React.FormEvent) {
    e.preventDefault();
    const url = newUrl.trim();
    if (!url) return;
    try {
      setCreating(true);
      const r = await Api.startScan(url);
      // Prepend a placeholder item for instant feedback
      setRows((prev) => [
        {
          id: r.scan_id,
          target_url: url,
          status: r.status || "queued",
          created_at: Date.now(),
          finished_at: null,
        } as any,
        ...prev,
      ]);
      setNewUrl("");
      setError(null);
    } catch (e: any) {
      setError(e?.message || "Failed to start scan");
    } finally {
      setCreating(false);
    }
  }

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    return rows
      .map((r) => {
        // ensure we have target_url + finished_at normalized
        const target_url = (r as any).target_url ?? (r as any).url ?? "";
        const finished_at =
          (r as any).finished_at ?? (r as any).completed_at ?? null;
        const findings = Array.isArray((r as any).findings)
          ? (r as any).findings
          : [];
        const risk_score = computeRiskScore(findings);

        return {
          ...r,
          target_url,
          finished_at,
          findings,
          risk_score,
        } as ApiScan & {
          target_url: string;
          finished_at: any;
          findings: any[];
          risk_score: number;
        };
      })
      .filter((r) =>
        status === "ALL"
          ? true
          : String(r.status).toLowerCase() === status
      )
      .filter((r) =>
        term
          ? (r.target_url || "").toLowerCase().includes(term) ||
            String(r.id).toLowerCase().includes(term)
          : true
      )
      .sort(
        (a, b) => Number(b.created_at || 0) - Number(a.created_at || 0)
      );
  }, [rows, status, q]);

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-2xl font-semibold text-neutral-100">Dashboard</h1>
        <button
          onClick={load}
          className="rounded-xl px-4 py-2 bg-neutral-800 text-neutral-200 hover:bg-neutral-700"
        >
          Refresh
        </button>
      </div>

      {/* New Scan */}
      <Card className="p-4">
        <form
          onSubmit={createScan}
          className="flex flex-col md:flex-row gap-3 items-stretch md:items-center"
        >
          <input
            type="url"
            inputMode="url"
            placeholder="https://example.com"
            className="flex-1 rounded-xl bg-neutral-900 text-neutral-100 px-4 py-2 outline-none border border-neutral-700 focus:border-neutral-500"
            value={newUrl}
            onChange={(e) => setNewUrl(e.target.value)}
          />
          <button
            disabled={creating}
            className="rounded-xl px-4 py-2 bg-indigo-600 text-white hover:bg-indigo-500 disabled:opacity-60"
          >
            {creating ? "Starting…" : "Start Scan"}
          </button>

          <div className="flex-1" />

          <input
            placeholder="Search by URL or ID…"
            className="rounded-xl bg-neutral-900 text-neutral-100 px-4 py-2 outline-none border border-neutral-700 focus:border-neutral-500 w-full md:w-72"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />

          <select
            className="rounded-xl bg-neutral-900 text-neutral-100 px-3 py-2 border border-neutral-700"
            value={status}
            onChange={(e) => setStatus(e.target.value as StatusFilter)}
          >
            <option value="ALL">All</option>
            {STATUSES.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </form>
      </Card>

      {/* Errors */}
      {error && <div className="text-red-400">{error}</div>}

      {/* Content */}
      {loading ? (
        <div className="text-neutral-400">Loading…</div>
      ) : filtered.length === 0 ? (
        <div className="text-neutral-500">No scans yet.</div>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((r) => {
            const findings = Array.isArray((r as any).findings)
              ? (r as any).findings
              : [];
            const risk_score = computeRiskScore(findings);

            return (
              <Card
                key={r.id}
                className="p-4 cursor-pointer hover:bg-neutral-900 transition"
                onClick={() => nav(`/dashboard/${r.id}`)}
                title={r.target_url || (r as any).url || r.id}
                subtitle={
                  <span className="text-sm text-neutral-400">
                    {fmtDate(r.created_at as any)}
                  </span>
                }
              >
                <div className="flex items-center justify-between">
                  <StatusBadge status={r.status} />
                  <div className="text-xs text-neutral-400">
                    {r.finished_at
                      ? `done: ${fmtDate(r.finished_at as any)}`
                      : String(r.status).toLowerCase() === "running"
                      ? "in progress…"
                      : ""}
                  </div>
                </div>

                <div className="mt-3 flex items-center justify-between text-sm text-neutral-300">
                  <div>
                    Findings:{" "}
                    <span className="font-mono">{findings.length}</span>
                  </div>
                  <div>
                    Risk score:{" "}
                    <span className="font-mono">{risk_score}</span>/100
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
