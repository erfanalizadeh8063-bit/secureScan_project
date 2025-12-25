import { useEffect, useMemo, useState } from "react";
import { useParams, Link } from "react-router-dom";
import Card from "@/components/Card";
import StatusBadge from "@/components/StatusBadge";
import SeverityBadge from "@/components/SeverityBadge";
import { Api, ApiScan } from "@/lib/api";

type Finding = {
  type?: string;
  severity?: string;
  message?: string;
  [key: string]: any;
};

// very simple risk score: 10 points per finding, max 100
function computeRiskScore(findings: Finding[] | null | undefined): number {
  if (!Array.isArray(findings) || findings.length === 0) return 0;
  const score = findings.length * 10;
  return score > 100 ? 100 : score;
}

// human-readable date
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

// Convert mixed findings (string | object) into a Finding array
function normalizeFindings(raw: any): Finding[] {
  if (!Array.isArray(raw)) return [];
  return raw.map((f) => {
    if (typeof f === "string") {
      return {
        type: "check",
        severity: "info",
        message: f,
      } as Finding;
    }
    // If it is already an object, return it as-is
    return f as Finding;
  });
}

export default function ScanDetails() {
  const { id } = useParams();
  const [scan, setScan] = useState<ApiScan | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  async function load() {
    if (!id) return;
    try {
      setLoading(true);
      const data = await Api.getScan(id);
      setScan(data);
      setError(null);
    } catch (e: any) {
      setError(e?.message || "Failed to load scan");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    const interval = setInterval(async () => {
      if (!scan) return load();
      const status = String(scan.status).toLowerCase();
      if (!["completed", "failed", "canceled"].includes(status)) {
        await load();
      }
    }, 2000);
    return () => clearInterval(interval);
    // Only listen to id and status changes
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, scan?.status]);

  // normalized view model
  const view = useMemo(() => {
    if (!scan) return null;

    const target_url =
      (scan as any).target_url ?? (scan as any).url ?? "";
    const finished_at =
      (scan as any).finished_at ??
      (scan as any).completed_at ??
      null;

    const findings = normalizeFindings((scan as any).findings);
    const risk_score = computeRiskScore(findings);

    return {
      ...scan,
      target_url,
      finished_at,
      findings,
      risk_score,
    } as ApiScan & {
      target_url: string;
      finished_at: any;
      findings: Finding[];
      risk_score: number;
    };
  }, [scan]);

  const findings: Finding[] = view?.findings ?? [];

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center gap-3">
        <Link
          to="/dashboard"
          className="text-neutral-400 hover:text-neutral-200"
        >
          ← Back
        </Link>
        <h1 className="text-2xl font-semibold text-neutral-100">
          Scan Details
        </h1>
      </div>

      {error && <div className="text-red-400">{error}</div>}
      {loading && !view && (
        <div className="text-neutral-400">Loading…</div>
      )}
      {!loading && !view && (
        <div className="text-neutral-500">No data found.</div>
      )}

      {view && (
        <>
          {/* header card */}
          <Card className="p-4 space-y-3">
            <div className="flex items-center justify-between gap-3">
              <div>
                <div className="text-neutral-200 font-medium break-all">
                  {view.target_url || view.id}
                </div>
                <div className="text-xs text-neutral-500 break-all">
                  ID: {view.id}
                </div>
              </div>
              <StatusBadge status={view.status} />
            </div>

            <div className="grid md:grid-cols-4 gap-3 text-sm text-neutral-300">
              <div>
                <span className="text-neutral-500">Created:</span>{" "}
                {fmtDate(view.created_at as any)}
              </div>
              <div>
                <span className="text-neutral-500">Finished:</span>{" "}
                {fmtDate(view.finished_at as any)}
              </div>
              <div>
                <span className="text-neutral-500">Findings:</span>{" "}
                {findings.length}
              </div>
              <div>
                <span className="text-neutral-500">Risk score:</span>{" "}
                <span className="font-mono">
                  {view.risk_score}
                </span>
                <span className="text-xs text-neutral-500">
                  {" "}
                  / 100
                </span>
              </div>
            </div>
          </Card>

          {/* findings list */}
          <Card className="p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="text-neutral-400 text-sm">
                Findings / Checks
              </div>
              {findings.length > 0 && (
                <div className="text-xs text-neutral-500">
                  Showing {findings.length} finding(s)
                </div>
              )}
            </div>

            {findings.length === 0 ? (
              <div className="text-neutral-500 text-sm">
                No findings yet.
              </div>
            ) : (
              <ul className="space-y-2">
                {findings.map((f, i) => {
                  const sev = (f.severity || "").toLowerCase();
                  const sevClass =
                    sev === "critical"
                      ? "text-red-300"
                      : sev === "high"
                      ? "text-red-200"
                      : sev === "medium"
                      ? "text-yellow-200"
                      : sev === "low"
                      ? "text-green-200"
                      : "text-neutral-300";

                  return (
                    <li
                      key={i}
                      className="border border-gray-800 rounded-lg p-3"
                    >
                      <div className="flex items-center justify-between mb-1">
                        <div className={`text-sm ${sevClass}`}>
                          {(f.type || "check")} •{" "}
                          {(f.severity || "info").toString()}
                        </div>
                        {sev && (
                          <SeverityBadge severity={sev} />
                        )}
                      </div>
                      <div className="break-words text-sm text-neutral-200">
                        {f.message || f.title || ""}
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}

            {/* raw JSON for debugging */}
            <pre className="bg-neutral-950 text-neutral-200 rounded-xl p-3 overflow-auto text-xs mt-3">
              {JSON.stringify(view, null, 2)}
            </pre>
          </Card>
        </>
      )}
    </div>
  );
}
