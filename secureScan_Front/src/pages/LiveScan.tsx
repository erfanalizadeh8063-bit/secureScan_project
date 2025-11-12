import React, { useState } from "react";

const getApiBase = () => {
  // build-time or runtime fallback
  const build = (import.meta as any).env?.VITE_API_BASE;
  const runtime = (window as any).__CONFIG__?.API_BASE;
  return (build || runtime || "").replace(/\/$/, "");
};

export default function LiveScan(): JSX.Element {
  const [url, setUrl] = useState("https://example.com");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<any | null>(null);

  const apiBase = getApiBase();

  const tryPost = async (endpoint: string, body: any) => {
    const res = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    return res;
  };

  const handleScan = async (e?: React.FormEvent) => {
    e?.preventDefault();
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      if (!apiBase) {
        throw new Error("API base not configured (VITE_API_BASE)");
      }

      const base = apiBase;
      const ep1 = `${base}/scan`;
      const ep2 = `${base}/api/scans`;

      // try first endpoint
      let res = await tryPost(ep1, { url });
      if (res.status === 404) {
        // fallback
        res = await tryPost(ep2, { target: url });
      }

      if (!res.ok) {
        const text = await res.text().catch(() => "");
        throw new Error(`Request failed: ${res.status} ${res.statusText} ${text}`);
      }

      const json = await res.json().catch(() => null);
      setResult(json);
    } catch (err: any) {
      setError(err?.message || String(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <h1 className="text-2xl font-semibold mb-4">Live Scan (Beta)</h1>
      <form onSubmit={handleScan} className="space-y-4">
        <input
          type="url"
          className="w-full p-2 rounded bg-neutral-900 border border-neutral-800"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="https://example.com"
        />
        <div>
          <button
            type="submit"
            disabled={loading}
            className="px-4 py-2 bg-indigo-600 rounded disabled:opacity-50"
          >
            {loading ? "Scanning…" : "Scan"}
          </button>
        </div>
      </form>

      {error && (
        <div className="mt-4 p-3 bg-red-900 text-red-100 rounded">Error: {error}</div>
      )}

      {result && (
        <div className="mt-6">
          <h2 className="text-xl font-medium mb-2">Result</h2>
          <pre className="bg-neutral-900 p-3 rounded overflow-auto">{JSON.stringify(result, null, 2)}</pre>

          {Array.isArray(result?.findings) && (
            <div className="mt-4">
              <h3 className="font-semibold mb-2">Findings</h3>
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b"><th className="py-1">Type</th><th className="py-1">Location</th></tr>
                </thead>
                <tbody>
                  {result.findings.map((f: any, i: number) => (
                    <tr key={i} className="border-b even:bg-neutral-950">
                     <td className="py-1 align-top">{f.type || (f["r#type"]) || f.t || "-"}</td>
                      <td className="py-1 align-top">{f.location || f.loc || "-"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
