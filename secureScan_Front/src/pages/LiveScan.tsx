import React, { useState } from "react";
import { apiUrl } from "../lib/api";

export default function LiveScan() {
  const [target, setTarget] = useState("");
  const [loading, setLoading] = useState(false);
  const [scanId, setScanId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const API_BASE = import.meta.env.VITE_API_BASE.replace(/\/+$/, "");

  async function startMockScan() {
    setLoading(true);
    setError(null);

    try {
      const res = await fetch(`${API_BASE}/scan`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ target }),
      });

      if (!res.ok) {
        throw new Error(`Failed to start mock scan: ${res.statusText}`);
      }

      const data = await res.json();
      setScanId(data.scan_id || data.id || null);
    } catch (err: any) {
      setError(err.message || "Unexpected error");
    } finally {
      setLoading(false);
    }
  }

  async function startRealScan() {
    setLoading(true);
    setError(null);

    try {
      const res = await fetch(`${API_BASE}/api/scans`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ target }),
      });

      if (!res.ok) {
        throw new Error(`Failed to start scan: ${res.statusText}`);
      }

      const data = await res.json();
      setScanId(data.id || data.scan_id || null);
    } catch (err: any) {
      setError(err.message || "Unexpected error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-xl mx-auto p-6">
      <h1 className="text-2xl font-semibold mb-4">Live Scan</h1>

      <input
        type="text"
        value={target}
        onChange={(e) => setTarget(e.target.value)}
        placeholder="Enter target domain"
        className="border p-2 w-full rounded mb-4"
      />

      <div className="flex gap-4">
        <button
          onClick={startMockScan}
          disabled={loading}
          className="bg-blue-600 text-white px-4 py-2 rounded"
        >
          Start Mock Scan
        </button>

        <button
          onClick={startRealScan}
          disabled={loading}
          className="bg-green-600 text-white px-4 py-2 rounded"
        >
          Start Real Scan
        </button>
      </div>

      {loading && <p className="mt-4 text-gray-600">Starting scan...</p>}
      {scanId && <p className="mt-4 text-green-700">Scan started! ID: {scanId}</p>}
      {error && <p className="mt-4 text-red-600">{error}</p>}
    </div>
  );
}
