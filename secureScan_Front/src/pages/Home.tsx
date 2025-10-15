import { useEffect, useState, ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import Card from "@/components/Card";
import TerminalLog from "@/components/TerminalLog";
import { Api } from "../lib/api";

type Summary = { links: number; vulns: number; risk: string };

export default function Home() {
  const [url, setUrl] = useState("https://example.com");
  const [opts, setOpts] = useState({ quick: true, sub: false, fp: true, depth: 1 });
  const [logs, setLogs] = useState<string[]>([]);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [running, setRunning] = useState(false);
  const [scanId, setScanId] = useState<string | null>(null);
  const [status, setStatus] = useState<string>("");
  const nav = useNavigate();

  const start = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!url.trim()) return;

    setRunning(true);
    setLogs([]);
    setSummary(null);
    setStatus("");

    // log initial config (opts are UI-only for now; wire to backend later if supported)
    setLogs((p) => [
      ...p,
      "Initializing scan…",
      `Target: ${url}`,
      `Options → quick=${opts.quick}, subdomains=${opts.sub}, fingerprint=${opts.fp}, depth=${opts.depth}`,
    ]);

    try {
      const r = await Api.startScan(url); // expect: { scan_id, status }
      const sid = r.scan_id;
      setScanId(sid);
      setStatus(r.status || "queued");
      setLogs((p) => [...p, `Scan enqueued (${sid})`, "Waiting for worker…"]);
    } catch (err: any) {
      setLogs((p) => [...p, `❌ Start failed: ${err?.message || String(err)}`]);
      setRunning(false);
    }
  };

  // Poll scan status until terminal state
  useEffect(() => {
    if (!scanId) return;
    let canceled = false;

    const tick = async () => {
      try {
        const s = await Api.getScan(scanId); // expect: { id, target_url, status, findings: [...] }
        if (canceled) return;
        setStatus(s.status);

        if (s.status === "running") {
          setLogs((p) => (p[p.length - 1]?.includes("Running…") ? p : [...p, "Running…"]));
        }

        if (["completed", "failed", "canceled"].includes(String(s.status))) {
          setLogs((p) => [...p, `Scan ${s.status}.`]);

          const findings = Array.isArray(s.findings) ? s.findings : [];
          const vulns = findings.length;

          const sevSet = new Set(
            findings.map((f: any) => String(f?.severity || "").toLowerCase())
          );
          const risk =
            sevSet.has("critical") || sevSet.has("high")
              ? "High"
              : vulns > 0 || sevSet.has("medium")
              ? "Medium"
              : "Low";

          setSummary({ links: 0, vulns, risk });
          setRunning(false);
          return true; // terminal
        }
        return false; // keep polling
      } catch (err: any) {
        if (!canceled) {
          setLogs((p) => [...p, `❌ Status failed: ${err?.message || String(err)}`]);
          setRunning(false);
        }
        return true; // stop on error
      }
    };

    // simple interval poller
    const interval = setInterval(async () => {
      const done = await tick();
      if (done) clearInterval(interval);
    }, 1000);

    // do an immediate first tick
    tick().then((done) => {
      if (done) clearInterval(interval);
    });

    return () => {
      canceled = true;
      clearInterval(interval);
    };
  }, [scanId]);

  return (
    <div className="space-y-6">
      <Card>
        <h1 className="text-3xl md:text-4xl font-bold">Website Security Scanner</h1>
        <p className="opacity-80">Enter a website URL to run a quick security scan.</p>
      </Card>

      <form onSubmit={start} className="grid md:grid-cols-3 gap-6 items-start">
        {/* left: target & options */}
        <Card>
          <div className="mb-2 text-sm opacity-80">Target URL</div>
          <input
            type="url"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://example.com"
            className="mt-1 w-full rounded-xl border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-950 p-2 text-neutral-900 dark:text-neutral-100 outline-none"
          />

          <div className="grid grid-cols-2 gap-3 mt-3">
            <label className="inline-flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={opts.quick}
                onChange={(e) => setOpts({ ...opts, quick: e.target.checked })}
              />
              Quick scan
            </label>

            <label className="inline-flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={opts.sub}
                onChange={(e) => setOpts({ ...opts, sub: e.target.checked })}
              />
              Include subdomains
            </label>

            <label className="inline-flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={opts.fp}
                onChange={(e) => setOpts({ ...opts, fp: e.target.checked })}
              />
              Tech fingerprint
            </label>

            <label className="inline-flex items-center gap-2 text-sm">
              <span>Crawler depth</span>
              <input
                type="number"
                min={1}
                max={10}
                value={opts.depth}
                onChange={(e) => setOpts({ ...opts, depth: Number(e.target.value || 1) })}
                className="w-16 rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-950 p-1 text-center"
              />
            </label>
          </div>

          <button
            type="submit"
            disabled={running}
            className="mt-4 inline-flex items-center justify-center rounded-xl bg-red-600 hover:bg-red-700 disabled:opacity-60 px-4 py-2 font-semibold"
          >
            {running ? "Running…" : "Start Scan"}
          </button>

          {scanId && (
            <div className="mt-3 text-sm space-y-1 opacity-80">
              <div>
                <span className="opacity-70">Scan ID:</span>{" "}
                <span className="font-mono break-all">{scanId}</span>
              </div>
              <div>
                <span className="opacity-70">Status:</span>{" "}
                <b className="text-neutral-200">{status || "-"}</b>
              </div>
            </div>
          )}
        </Card>

        {/* right: live logs */}
        <div className="md:col-span-2">
          <Card>
            <div className="mb-2 text-sm opacity-80">Live logs</div>
            <TerminalLog lines={logs} />
          </Card>
        </div>
      </form>

      {/* summary: compact numbers + wide risk */}
      <Card>
        <div className="mb-2 text-sm opacity-80">Summary</div>
        <div className="grid grid-cols-4 md:grid-cols-6 gap-3">
          <div className="col-span-1">
            <Metric label="Links" value={summary?.links ?? 0} size="compact" />
          </div>
          <div className="col-span-1">
            <Metric label="Vulns" value={summary?.vulns ?? 0} size="compact" />
          </div>
          <div className="col-span-2 md:col-span-4">
            <Metric label="Risk" value={summary?.risk ?? "-"} />
          </div>
        </div>
      </Card>
    </div>
  );
}

/* ───────── Metric ───────── */
function Metric({
  label,
  value,
  size = "normal",
}: {
  label: string;
  value: ReactNode | string | number;
  size?: "compact" | "normal";
}) {
  const isCompact = size === "compact";
  return (
    <div
      className={`rounded-xl border border-neutral-800 bg-neutral-900/60 ${
        isCompact ? "p-2" : "p-3"
      } text-center`}
    >
      <div className="text-xs text-neutral-400">{label}</div>
      <div
        className={`mt-1 ${isCompact ? "text-base" : "text-lg"} font-mono ${
          isCompact ? "" : "leading-tight whitespace-normal break-words"
        }`}
      >
        {value as any}
      </div>
    </div>
  );
}
