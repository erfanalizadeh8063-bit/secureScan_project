// src/hooks/useScans.ts
import { useEffect, useState } from "react";
import { listScans, type ScanItem } from "@/lib/api";

export function useScans(pollMs = 3000) {
  const [rows, setRows] = useState<ScanItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string|null>(null);

  useEffect(() => {
    let mounted = true;
    let timer: any;

    const tick = async () => {
      try {
        const data = await listScans();
        if (mounted) {
          setRows(data);
          setError(null);
          setLoading(false);
        }
      } catch (e: any) {
        if (mounted) {
          setError(e?.message ?? "Fetch error");
          setLoading(false);
        }
      } finally {
        if (mounted) timer = setTimeout(tick, pollMs);
      }
    };

    tick();
    return () => { mounted = false; clearTimeout(timer); };
  }, [pollMs]);

  return { rows, loading, error };
}
