import { useEffect, useMemo, useState } from "react";
import { Api } from "@/lib/api";
import { useNavigate } from "react-router-dom";
import Card from "@/components/Card";

type ScanItem = {
  id: string;
  target_url?: string;
  status: "queued" | "running" | "completed" | "failed" | "canceled" | string;
  findings?: Array<any>;
  created_at?: string | number;
  finished_at?: string | number;
  [k: string]: any;
};

const STATUSES = ["queued", "running", "completed", "failed", "canceled"] as const;
type StatusFilter = (typeof STATUSES)[number] | "ALL";

export default function History() {
  const nav = useNavigate();

  const [rows, setRows] = useState<ScanItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  const [q, setQ] = useState("");
  const [status, setStatus] = useState<StatusFilter>("ALL");

  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        setErr(null);
  const list = await Api.listScans({ limit: 200 });
  setRows(normalizeScans(Array.isArray(list) ? list : (list as any)?.items || []));
      } catch (e: any) {
        // fallback نمایش برای زمانی که بک‌اند آماده نیست
        setRows(
          normalizeScans([
            {
              id: "demo-1",
              target_url: "https://example.com/",
              status: "completed",
              findings: [{}, {}, {}],
              created_at: Date.now() - 1000 * 60 * 60,
              finished_at: Date.now() - 1000 * 30,
            },
            {
              id: "demo-2",
              target_url: "https://example.org/",
              status: "running",
              findings: [],
              created_at: Date.now() - 1000 * 60 * 10,
            },
            {
              id: "demo-3",
              target_url: "https://foo.bar/",
              status: "failed",
              findings: [],
              created_at: Date.now() - 1000 * 60 * 50,
              finished_at: Date.now() - 1000 * 60 * 45,
            },
          ])
        );
        setErr(e?.message || String(e));
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const counts = useMemo(() => {
    const c: Record<string, number> = { ALL: rows.length };
    for (const s of STATUSES) c[s] = 0;
    for (const r of rows) c[(r.status || "").toLowerCase()] = (c[(r.status || "").toLowerCase()] ?? 0) + 1;
    return c;
  }, [rows]);

  const filtered = useMemo(() => {
    const ss = status.toLowerCase();
    const txt = q.trim().toLowerCase();
    return rows.filter((r) => {
      const statusOk = ss === "all" ? true : (r.status || "").toLowerCase() === ss;
      if (!statusOk) return false;
      if (!txt) return true;
      const hay = `${r.id} ${r.target_url ?? ""}`.toLowerCase();
      return hay.includes(txt);
    });
  }, [rows, status, q]);

  return (
    <div className="space-y-6">
      {/* عنوان و کنترل‌ها */}
      <Card>
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold">Scan History</h1>
            <p className="opacity-80">Previous scans, status and navigation to results.</p>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <StatusFilterBar active={status} counts={counts} onChange={setStatus} />
            <input
              type="text"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search by ID or URL…"
              className="rounded-xl border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-950 px-3 py-2 text-sm outline-none"
            />
            <button
              onClick={() => exportHistoryCSV(filtered)}
              className="rounded-xl border border-neutral-700 bg-neutral-900/60 hover:bg-neutral-800 px-3 py-2 text-sm"
              disabled={filtered.length === 0}
              title="Export table to CSV"
            >
              Export CSV
            </button>
          </div>
        </div>
      </Card>

      {/* نوار خلاصهٔ وضعیت‌ها */}
      <Card>
        <div className="flex flex-wrap items-center gap-2">
          {(["ALL", ...STATUSES] as const).map((s) => (
            <span
              key={s}
              className="rounded-lg border border-neutral-800 bg-neutral-900/40 px-2 py-1 text-xs"
            >
              {s.toUpperCase()}: <b>{counts[s.toLowerCase?.() ? s.toLowerCase() : s] ?? 0}</b>
            </span>
          ))}
        </div>
      </Card>

      {/* جدول تاریخچه */}
      <Card>
        {loading && <div className="text-sm opacity-80">Loading…</div>}
        {err && <div className="text-sm text-red-300">Error: {err}</div>}

        {!loading && (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-left opacity-70">
                <tr>
                  <th className="py-2 pr-3 whitespace-nowrap">Status</th>
                  <th className="py-2 pr-3">Scan ID</th>
                  <th className="py-2 pr-3">Target</th>
                  <th className="py-2 pr-3">Vulns</th>
                  <th className="py-2 pr-3">Started</th>
                  <th className="py-2 pr-3">Finished</th>
                  <th className="py-2 pr-0 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((r) => (
                  <tr key={r.id} className="border-t border-neutral-800">
                    <td className="py-2 pr-3 whitespace-nowrap">
                      <StatusPill status={r.status} />
                    </td>
                    <td className="py-2 pr-3 font-mono break-all">{r.id}</td>
                    <td className="py-2 pr-3 break-all">{r.target_url ?? "-"}</td>
                    <td className="py-2 pr-3">{Array.isArray(r.findings) ? r.findings.length : 0}</td>
                    <td className="py-2 pr-3 whitespace-nowrap">{fmtTime(r.created_at)}</td>
                    <td className="py-2 pr-3 whitespace-nowrap">{fmtTime(r.finished_at)}</td>
                    <td className="py-2 pr-0 text-right">
                      <div className="flex items-center gap-2 justify-end">
                        <button
                          onClick={() => nav("/results", { state: { scanId: r.id } })}
                          className="px-3 py-1 rounded-lg bg-neutral-800 hover:bg-neutral-700"
                          title="Open Results"
                        >
                          Open Results
                        </button>
                        <button
                          onClick={() => copyText(r.id)}
                          className="px-3 py-1 rounded-lg bg-neutral-800 hover:bg-neutral-700"
                          title="Copy Scan ID"
                        >
                          Copy ID
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {filtered.length === 0 && !loading && (
                  <tr>
                    <td colSpan={7} className="py-6 text-center opacity-70">
                      No scans match your filters.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}

/* ───────── Components ───────── */

function StatusFilterBar({
  active,
  counts,
  onChange,
}: {
  active: StatusFilter;
  counts: Record<string, number>;
  onChange: (s: StatusFilter) => void;
}) {
  const items: StatusFilter[] = ["ALL", ...STATUSES];
  return (
    <div className="flex items-center gap-1 rounded-xl border border-neutral-800 bg-neutral-900/50 p-1">
      {items.map((it) => {
        const act = active === it;
        const key = typeof (counts as any)[it] !== "undefined" ? it : it.toLowerCase();
        return (
          <button
            key={it}
            onClick={() => onChange(it)}
            className={`px-2 py-1 rounded-lg text-xs font-semibold ${
              act ? "bg-neutral-800" : "hover:bg-neutral-800/60"
            }`}
            title={`${it} (${counts[key] ?? 0})`}
          >
            {String(it).toUpperCase()} <span className="opacity-70">({counts[key] ?? 0})</span>
          </button>
        );
      })}
    </div>
  );
}

function StatusPill({ status }: { status: string }) {
  const s = String(status || "").toLowerCase();
  const map: Record<string, string> = {
    queued: "text-yellow-300 border-yellow-600/50 bg-yellow-900/20",
    running: "text-blue-300 border-blue-600/50 bg-blue-900/20",
    completed: "text-green-300 border-green-600/50 bg-green-900/20",
    failed: "text-red-300 border-red-600/50 bg-red-900/20",
    canceled: "text-neutral-300 border-neutral-600/50 bg-neutral-900/20",
  };
  const cls = map[s] || "text-neutral-300 border-neutral-600/50 bg-neutral-900/20";
  return (
    <span className={`inline-block rounded-full border px-2 py-0.5 text-xs font-semibold ${cls}`}>
      {s.toUpperCase()}
    </span>
  );
}

/* ───────── Helpers ───────── */

function normalizeScans(list: any[]): ScanItem[] {
  return (list || []).map((x) => ({
    id: String(x.id ?? x.scan_id ?? ""),
    target_url: x.target_url ?? x.target ?? "",
    status: String(x.status ?? "queued").toLowerCase(),
    findings: Array.isArray(x.findings) ? x.findings : [],
    created_at: x.created_at ?? x.started_at ?? x.createdAt ?? null,
    finished_at: x.finished_at ?? x.ended_at ?? x.finishedAt ?? null,
    ...x,
  }));
}

function fmtTime(v: any) {
  if (!v) return "—";
  try {
    const d = typeof v === "number" ? new Date(v) : new Date(String(v));
    if (isNaN(d.getTime())) return "—";
    // yyyy-mm-dd HH:MM
    const pad = (n: number) => String(n).padStart(2, "0");
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(
      d.getMinutes()
    )}`;
  } catch {
    return "—";
  }
}

function exportHistoryCSV(rows: ScanItem[]) {
  const headers = ["id", "status", "target_url", "vulns", "created_at", "finished_at"];
  const csvRows = [
    headers.join(","),
    ...rows.map((r) =>
      [
        r.id,
        r.status,
        r.target_url ?? "",
        Array.isArray(r.findings) ? r.findings.length : 0,
        String(r.created_at ?? ""),
        String(r.finished_at ?? ""),
      ]
        .map((x) => JSON.stringify(String(x)).replace(/\u2028|\u2029/g, ""))
        .join(",")
    ),
  ];
  const blob = new Blob([csvRows.join("\n")], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "scan-history.csv";
  a.click();
  URL.revokeObjectURL(url);
}

function copyText(text: string) {
  navigator.clipboard.writeText(String(text ?? "")).catch(() => {
    const ta = document.createElement("textarea");
    ta.value = String(text ?? "");
    document.body.appendChild(ta);
    ta.select();
    document.execCommand("copy");
    document.body.removeChild(ta);
  });
}
