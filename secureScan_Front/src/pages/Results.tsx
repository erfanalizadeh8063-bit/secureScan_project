import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import Card from "@/components/Card";
import StatusBadge from "@/components/StatusBadge";
import SeverityBadge from "@/components/SeverityBadge";
import { Api, ApiScan } from "@/lib/api";

// derive top severity from findings
function topSeverity(findings: any[]): string | null {
  if (!Array.isArray(findings) || findings.length === 0) return null;
  const order = ["critical", "high", "medium", "low", "info"];
  const set = new Set(
    findings.map((f) => String(f?.severity || "info").toLowerCase())
  );
  for (const s of order) if (set.has(s)) return s;
  return "info";
}

// human date
function fmtDate(x: string | number | null | undefined) {
  if (!x && x !== 0) return "-";
  let d: Date;
  if (typeof x === "number") d = new Date(x);
  else {
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

const SEVERITIES = ["ALL", "critical", "high", "medium", "low", "info"] as const;
type SeverityFilter = (typeof SEVERITIES)[number];

export default function Results() {
  const [rows, setRows] = useState<ApiScan[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  // filters
  const [q, setQ] = useState("");
  const [sev, setSev] = useState<SeverityFilter>("ALL");
  const [onlyCompleted, setOnlyCompleted] = useState(true);

  // simple pagination (client-side)
  const [page, setPage] = useState(1);
  const pageSize = 12;

  async function load() {
    try {
      setLoading(true);
      const data = await Api.listScans();
      setRows(Array.isArray(data) ? data : []);
      setErr(null);
    } catch (e: any) {
      setErr(e?.message || "Failed to load results");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    return rows
      .filter((r) =>
        onlyCompleted
          ? String(r.status).toLowerCase() === "completed"
          : true
      )
      .filter((r) => {
        if (!term) return true;
        const target = (
          r.target_url || (r as any).url || ""
        ).toLowerCase();
        const id = String(r.id).toLowerCase();
        return target.includes(term) || id.includes(term);
      })
      .filter((r) => {
        if (sev === "ALL") return true;
        const s = Array.isArray(r.findings) ? r.findings : [];
        return s.some(
          (f: any) => String(f?.severity || "").toLowerCase() === sev
        );
      })
      .sort(
        (a, b) =>
          Number(b.finished_at || b.created_at || 0) -
          Number(a.finished_at || a.created_at || 0)
      );
  }, [rows, q, sev, onlyCompleted]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const pageSafe = Math.min(page, totalPages);
  const slice = filtered.slice((pageSafe - 1) * pageSize, pageSafe * pageSize);

  useEffect(() => {
    // reset to first page when filters change
    setPage(1);
  }, [q, sev, onlyCompleted]);

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-2xl font-semibold text-neutral-100">Results</h1>
        <button
          onClick={load}
          className="rounded-xl px-4 py-2 bg-neutral-800 text-neutral-200 hover:bg-neutral-700"
        >
          Refresh
        </button>
      </div>

      <Card className="p-4">
        <div className="flex flex-col lg:flex-row gap-3 items-stretch lg:items-center">
          <input
            placeholder="Search by URL or ID…"
            className="rounded-xl bg-neutral-900 text-neutral-100 px-4 py-2 outline-none border border-neutral-700 focus:border-neutral-500 w-full lg:w-80"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />

          <select
            className="rounded-xl bg-neutral-900 text-neutral-100 px-3 py-2 border border-neutral-700 w-full lg:w-44"
            value={sev}
            onChange={(e) => setSev(e.target.value as SeverityFilter)}
          >
            {SEVERITIES.map((s) => (
              <option key={s} value={s}>
                Severity: {s.toUpperCase()}
              </option>
            ))}
          </select>

          <label className="inline-flex items-center gap-2 text-sm text-neutral-300">
            <input
              type="checkbox"
              checked={onlyCompleted}
              onChange={(e) => setOnlyCompleted(e.target.checked)}
            />
            only completed
          </label>

          <div className="flex-1" />

          <div className="text-sm text-neutral-400">
            {filtered.length} result(s)
          </div>
        </div>
      </Card>

      {err && <div className="text-red-400">{err}</div>}

      {loading ? (
        <div className="text-neutral-400">Loading…</div>
      ) : slice.length === 0 ? (
        <div className="text-neutral-500">No results match your filters.</div>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {slice.map((r) => {
            const findings = Array.isArray(r.findings) ? r.findings : [];
            const top = topSeverity(findings);
            const targetLabel = r.target_url || (r as any).url || r.id;

            return (
              <Card
                key={r.id}
                className="p-0"
                title={
                  <div className="flex items-center justify-between gap-3">
                    <div className="truncate">{targetLabel}</div>
                    <StatusBadge status={r.status} />
                  </div>
                }
                subtitle={
                  <div className="flex items-center gap-3 text-sm text-neutral-400">
                    <span>Created: {fmtDate(r.created_at)}</span>
                    <span>•</span>
                    <span>Finished: {fmtDate(r.finished_at)}</span>
                  </div>
                }
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-neutral-400">Findings:</span>
                    <span className="font-mono">{findings.length}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-neutral-400">Top:</span>
                    {top ? (
                      <SeverityBadge severity={top} />
                    ) : (
                      <span className="text-neutral-400">-</span>
                    )}
                  </div>
                </div>

                <div className="mt-3 flex items-center justify-between">
                  <Link
                    to={`/dashboard/${r.id}`}
                    className="text-indigo-400 hover:text-indigo-300 underline"
                  >
                    View details
                  </Link>
                  <button
                    className="text-xs text-neutral-400 hover:text-neutral-200"
                    onClick={() => navigator.clipboard.writeText(r.id)}
                    title="Copy ID"
                  >
                    Copy ID
                  </button>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <button
            className="px-3 py-1 rounded-lg bg-neutral-900 text-neutral-200 disabled:opacity-50 border border-neutral-800"
            disabled={pageSafe <= 1}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
          >
            Prev
          </button>
          <div className="text-sm text-neutral-400">
            Page {pageSafe} / {totalPages}
          </div>
          <button
            className="px-3 py-1 rounded-lg bg-neutral-900 text-neutral-200 disabled:opacity-50 border border-neutral-800"
            disabled={pageSafe >= totalPages}
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}
