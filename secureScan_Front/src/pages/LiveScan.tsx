import React, { useEffect, useMemo, useRef, useState } from "react";
import { API_BASE } from "@/lib/api";
import type { ApiScan } from "@/types/api";

type LogLevel = "info" | "ok" | "warn" | "error";
type ScanPhase = "idle" | "starting" | "queued" | "running" | "completed" | "failed";

type LiveLog = {
  at: string;
  level: LogLevel;
  text: string;
};

function nowIso() {
  return new Date().toISOString();
}

function normalizeTarget(input: string): string {
  const s = input.trim();
  if (!s) return "";
  if (!/^https?:\/\//i.test(s)) return `https://${s}`;
  return s;
}

function safeUrlCheck(u: string) {
  // throws if invalid
  // eslint-disable-next-line no-new
  new URL(u);
}

function statusToPhase(status?: string | null): ScanPhase {
  const s = String(status || "").toLowerCase();
  if (s === "queued") return "queued";
  if (s === "running") return "running";
  if (s === "completed") return "completed";
  if (s === "failed") return "failed";
  return "idle";
}

function levelIcon(level: LogLevel) {
  if (level === "ok") return "✓";
  if (level === "warn") return "!";
  if (level === "error") return "✕";
  return ">";
}

function levelColor(level: LogLevel) {
  if (level === "ok") return "text-green-400";
  if (level === "warn") return "text-yellow-300";
  if (level === "error") return "text-red-400";
  return "text-gray-200";
}

function riskFromFindingsCount(n: number) {
  if (n >= 10) return { label: "High", cls: "text-red-300" };
  if (n >= 5) return { label: "Medium", cls: "text-yellow-200" };
  if (n >= 1) return { label: "Low", cls: "text-green-300" };
  return { label: "None", cls: "text-gray-300" };
}

export default function LiveScan() {
  // --- form ---
  const [target, setTarget] = useState("https://example.com");
  const [quickScan, setQuickScan] = useState(true);
  const [includeSubdomains, setIncludeSubdomains] = useState(false);
  const [techFingerprint, setTechFingerprint] = useState(true);
  const [depth, setDepth] = useState<number>(1);

  // --- state ---
  const [phase, setPhase] = useState<ScanPhase>("idle");
  const [scanId, setScanId] = useState<string | null>(null);
  const [current, setCurrent] = useState<ApiScan | null>(null);
  const [error, setError] = useState<string | null>(null);

  // --- logs ---
  const [logs, setLogs] = useState<LiveLog[]>([
    { at: nowIso(), level: "info", text: "Ready." },
  ]);
  const [paused, setPaused] = useState(false);

  const pollRef = useRef<number | null>(null);
  const logsBoxRef = useRef<HTMLDivElement | null>(null);

  const apiBaseText = useMemo(() => {
    const s = (API_BASE || "").toString().replace(/\/+$/, "");
    return s || "(missing VITE_API_BASE)";
  }, []);

  function addLog(level: LogLevel, text: string) {
    if (paused) return;
    setLogs((prev) => [...prev, { at: nowIso(), level, text }]);
  }

  function stopPolling() {
    if (pollRef.current) window.clearInterval(pollRef.current);
    pollRef.current = null;
  }

  async function fetchScanById(id: string): Promise<ApiScan | null> {
    try {
      const res = await fetch(`${apiBaseText}/api/scans/${id}`, {
        headers: { "Content-Type": "application/json" },
      });
      if (!res.ok) return null;
      return (await res.json()) as ApiScan;
    } catch {
      return null;
    }
  }

  async function pollOnce(id: string) {
    const s = await fetchScanById(id);
    if (!s) return;

    setCurrent(s);
    const nextPhase = statusToPhase(s.status);
    setPhase(nextPhase);

    if (nextPhase === "queued") addLog("info", "Queued: scan accepted by backend.");
    if (nextPhase === "running") addLog("info", "Running: collecting findings...");
    if (nextPhase === "completed") {
      addLog("ok", `Completed: ${(s as any).findings?.length ?? 0} findings.`);
      stopPolling();
    }
    if (nextPhase === "failed") {
      addLog("error", "Failed: scan ended with status=failed.");
      stopPolling();
    }
  }

  function startPolling(id: string) {
    stopPolling();
    pollRef.current = window.setInterval(() => {
      pollOnce(id);
    }, 1500);
  }

  async function startScan() {
    setError(null);
    setCurrent(null);
    setScanId(null);

    const normalized = normalizeTarget(target);

    try {
      addLog("info", "Initializing scan...");
      addLog("info", `Target: ${normalized || "(empty)"}`);

      if (!normalized) throw new Error("Target URL is required.");
      safeUrlCheck(normalized);

      // show options in logs (like screenshot)
      addLog(
        "info",
        `Options → quick=${quickScan}, subdomains=${includeSubdomains}, fingerprint=${techFingerprint}, depth=${depth}`
      );

      setPhase("starting");

      // Be tolerant: backend might accept url / target_url / targetUrl
      const payload = {
        url: normalized,
        target_url: normalized,
        targetUrl: normalized,
        options: {
          quick: quickScan,
          subdomains: includeSubdomains,
          fingerprint: techFingerprint,
          depth,
        },
      };

      const res = await fetch(`${apiBaseText}/api/scans`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const t = await res.text().catch(() => "");
        throw new Error(t || `Start failed: HTTP ${res.status}`);
      }

      const data: any = await res.json();
      const id = data?.id || data?.scan_id || null;
      if (!id) throw new Error("Backend did not return scan id.");

      setScanId(id);
      addLog("ok", `Scan started. ID: ${id}`);

      // Immediately fetch first state, then poll.
      await pollOnce(id);
      startPolling(id);
    } catch (e: any) {
      const msg = e?.message || "Start failed.";
      setPhase("failed");
      setError(msg);
      addLog("error", msg);
    }
  }

  function scrollLogsTop() {
    if (!logsBoxRef.current) return;
    logsBoxRef.current.scrollTop = 0;
  }

  useEffect(() => {
    return () => stopPolling();
  }, []);

  // auto-scroll logs to bottom while not paused
  useEffect(() => {
    if (paused) return;
    const el = logsBoxRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
  }, [logs, paused]);

  const findings: string[] = useMemo(() => {
    const f = (current as any)?.findings;
    return Array.isArray(f) ? f : [];
  }, [current]);

  const risk = useMemo(() => riskFromFindingsCount(findings.length), [findings.length]);

  const statusBadge = useMemo(() => {
    const s = phase;
    const cls =
      s === "completed"
        ? "bg-green-600/20 text-green-200 border-green-700/40"
        : s === "running"
        ? "bg-blue-600/20 text-blue-200 border-blue-700/40"
        : s === "queued"
        ? "bg-yellow-600/20 text-yellow-100 border-yellow-700/40"
        : s === "failed"
        ? "bg-red-600/20 text-red-200 border-red-700/40"
        : "bg-gray-700/30 text-gray-200 border-gray-600/40";
    return { cls, label: s };
  }, [phase]);

  return (
    <div className="min-h-[calc(100vh-64px)] px-6 py-10">
      <div className="mx-auto w-full max-w-6xl">
        {/* HERO */}
        <div className="rounded-3xl border border-gray-800 bg-gradient-to-b from-gray-950/70 to-gray-950/40 p-10 shadow-2xl">
          <h1 className="text-5xl font-bold tracking-tight text-white">Website Security Scanner</h1>
          <p className="mt-3 text-lg text-gray-400">
            Enter a website URL to run a quick security scan.
          </p>
        </div>

        {/* MAIN GRID */}
        <div className="mt-10 grid grid-cols-1 gap-8 lg:grid-cols-2">
          {/* LEFT: FORM */}
          <div className="rounded-3xl border border-gray-800 bg-gray-950/40 p-8 shadow-xl">
            <div className="text-sm font-semibold text-gray-200">Target URL</div>

            <input
              value={target}
              onChange={(e) => setTarget(e.target.value)}
              placeholder="https://example.com"
              className="mt-3 w-full rounded-2xl border border-gray-700 bg-gray-50 px-5 py-4 text-lg text-gray-900 placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-red-500/40"
            />

            <div className="mt-6 grid grid-cols-2 gap-6">
              <label className="flex items-center gap-3 text-gray-200">
                <input
                  type="checkbox"
                  checked={quickScan}
                  onChange={(e) => setQuickScan(e.target.checked)}
                  className="h-4 w-4"
                />
                <span className="text-base">Quick scan</span>
              </label>

              <label className="flex items-center gap-3 text-gray-200">
                <input
                  type="checkbox"
                  checked={includeSubdomains}
                  onChange={(e) => setIncludeSubdomains(e.target.checked)}
                  className="h-4 w-4"
                />
                <span className="text-base">Include subdomains</span>
              </label>

              <label className="flex items-center gap-3 text-gray-200">
                <input
                  type="checkbox"
                  checked={techFingerprint}
                  onChange={(e) => setTechFingerprint(e.target.checked)}
                  className="h-4 w-4"
                />
                <span className="text-base">Tech fingerprint</span>
              </label>

              <div className="flex items-center justify-between gap-4">
                <div className="text-base text-gray-200">
                  <div className="leading-tight">Crawler</div>
                  <div className="leading-tight">depth</div>
                </div>
                <input
                  type="number"
                  min={0}
                  max={10}
                  value={depth}
                  onChange={(e) => setDepth(Number(e.target.value))}
                  className="w-20 rounded-xl border border-gray-700 bg-gray-50 px-3 py-2 text-center text-gray-900"
                />
              </div>
            </div>

            <div className="mt-8 flex items-center justify-between gap-4">
              <button
                onClick={startScan}
                className="rounded-2xl bg-red-600 px-8 py-4 text-lg font-bold text-white shadow-lg hover:bg-red-500 active:bg-red-700"
              >
                Start Scan
              </button>

              <div className="text-right text-sm text-gray-400">
                <div>
                  API: <span className="font-mono text-gray-200">{apiBaseText}</span>
                </div>
                <div className={["mt-1 inline-flex items-center gap-2 rounded-full border px-3 py-1", statusBadge.cls].join(" ")}>
                  <span className="text-xs font-semibold uppercase tracking-wide">Status</span>
                  <span className="font-mono text-xs">{statusBadge.label}</span>
                </div>
              </div>
            </div>

            {error && (
              <div className="mt-6 rounded-2xl border border-red-900/40 bg-red-950/40 p-4 text-red-200">
                {error}
              </div>
            )}
          </div>

          {/* RIGHT: LIVE LOGS */}
          <div className="rounded-3xl border border-gray-800 bg-gray-950/40 p-8 shadow-xl">
            <div className="flex items-center justify-between gap-3">
              <div className="text-base font-semibold text-gray-200">Live logs</div>
              <div className="flex gap-3">
                <button
                  onClick={() => setPaused((p) => !p)}
                  className="rounded-xl border border-gray-700 bg-gray-900 px-4 py-2 text-sm text-gray-200 hover:bg-gray-800"
                >
                  {paused ? "Resume" : "Pause"}
                </button>
                <button
                  onClick={scrollLogsTop}
                  className="rounded-xl border border-gray-700 bg-gray-900 px-4 py-2 text-sm text-gray-200 hover:bg-gray-800"
                >
                  Top
                </button>
              </div>
            </div>

            <div
              ref={logsBoxRef}
              className="mt-4 h-[290px] overflow-auto rounded-2xl border border-gray-800 bg-black/30 p-4 font-mono text-sm text-gray-100"
            >
              {logs.map((l, i) => (
                <div key={`${l.at}-${i}`} className="flex gap-3 py-0.5">
                  <div className={["w-4 shrink-0", levelColor(l.level)].join(" ")}>
                    {levelIcon(l.level)}
                  </div>
                  <div className="min-w-0 flex-1 break-words">
                    <span className="text-gray-500">{l.at} </span>
                    <span>{l.text}</span>
                  </div>
                </div>
              ))}
            </div>

            {/* quick scan id line */}
            <div className="mt-4 text-xs text-gray-400">
              {scanId ? (
                <>
                  Active scan: <span className="font-mono text-gray-200">{scanId}</span>
                </>
              ) : (
                <>No active scan.</>
              )}
            </div>
          </div>
        </div>

        {/* SUMMARY */}
        <div className="mt-10 rounded-3xl border border-gray-800 bg-gray-950/40 p-8 shadow-xl">
          <div className="text-base font-semibold text-gray-200">Summary</div>

          <div className="mt-5 grid grid-cols-1 gap-6 md:grid-cols-3">
            <div className="rounded-2xl border border-gray-800 bg-black/20 p-5">
              <div className="text-sm text-gray-400">Links</div>
              <div className="mt-2 text-3xl font-bold text-white">0</div>
              <div className="mt-2 text-xs text-gray-500">
                (Placeholder) Enable crawler output to populate links.
              </div>
            </div>

            <div className="rounded-2xl border border-gray-800 bg-black/20 p-5">
              <div className="text-sm text-gray-400">Vulns</div>
              <div className="mt-2 text-3xl font-bold text-white">{findings.length}</div>
              <div className="mt-2 text-xs text-gray-500">Based on findings reported by the backend.</div>
            </div>

            <div className="rounded-2xl border border-gray-800 bg-black/20 p-5">
              <div className="text-sm text-gray-400">Risk</div>
              <div className={["mt-2 text-3xl font-bold", risk.cls].join(" ")}>{risk.label}</div>
              <div className="mt-2 text-xs text-gray-500">Heuristic based on number of findings.</div>
            </div>
          </div>

          <div className="mt-8 rounded-2xl border border-gray-800 bg-black/20 p-5">
            <div className="flex items-center justify-between gap-3">
              <div className="text-sm font-semibold text-gray-200">Findings</div>
              <div className="text-xs text-gray-500">
                {current ? `Status: ${String(current.status || "-")}` : "No scan selected."}
              </div>
            </div>

            {findings.length === 0 ? (
              <div className="mt-4 text-sm text-gray-400">
                Start a scan to see findings here.
              </div>
            ) : (
              <ul className="mt-4 space-y-2">
                {findings.map((f, idx) => (
                  <li
                    key={`${idx}-${f}`}
                    className="rounded-xl border border-gray-800 bg-gray-900/40 px-4 py-3 text-sm text-gray-100"
                  >
                    {f}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        <div className="mt-6 text-center text-xs text-gray-500">
          UI language: English-only (EU launch ready).
        </div>
      </div>
    </div>
  );
}
