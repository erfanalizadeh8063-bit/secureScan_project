import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import Card from "@/components/Card";
import StatusBadge from "@/components/StatusBadge";
import { Api, ApiScan } from "@/lib/api";

type Finding = {
  type?: string;
  severity?: string;
  message?: string;
  [key: string]: any;
};

export default function ScanDetails() {
  const { id } = useParams();
  const [scan, setScan] = useState<ApiScan | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  async function load() {
    if (!id) return;
    try {
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
  }, [id, scan?.status]);

  const findings: Finding[] = Array.isArray(scan?.findings)
    ? (scan!.findings as Finding[])
    : [];

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
      {loading && !scan && <div className="text-neutral-400">Loading…</div>}
      {!loading && !scan && (
        <div className="text-neutral-500">No data found.</div>
      )}

      {scan && (
        <>
          <Card className="p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-neutral-200 font-medium">
                  {scan.target_url || scan.id}
                </div>
                <div className="text-xs text-neutral-500 break-all">
                  ID: {scan.id}
                </div>
              </div>
              <StatusBadge status={scan.status} />
            </div>

            <div className="grid md:grid-cols-3 gap-3 text-sm text-neutral-300">
              <div>
                <span className="text-neutral-500">Created:</span>{" "}
                {String(scan.created_at ?? "-")}
              </div>
              <div>
                <span className="text-neutral-500">Finished:</span>{" "}
                {String(scan.finished_at ?? "-")}
              </div>
              <div>
                <span className="text-neutral-500">Findings:</span>{" "}
                {findings.length}
              </div>
            </div>
          </Card>

          <Card className="p-4">
            <div className="text-neutral-400 text-sm mb-2">
              Findings / Logs
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
                      <div className={`text-sm ${sevClass}`}>
                        {(f.type || "check")} • {(f.severity || "info")}
                      </div>
                      <div className="break-words">
                        {f.message || f.title || ""}
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
            <pre className="bg-neutral-950 text-neutral-200 rounded-xl p-3 overflow-auto text-xs mt-3">
              {JSON.stringify(scan, null, 2)}
            </pre>
          </Card>
        </>
      )}
    </div>
  );
}
