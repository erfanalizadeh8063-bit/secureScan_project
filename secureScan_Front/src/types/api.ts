export type ApiScan = {
  id: string;
  created_at?: string | number | null;
  [k: string]: any;
};

export type ScanItem = {
  id: string;
  created_at?: string; // normalized to string or undefined
  [k: string]: any;
};

export function toScanItem(s: ApiScan): ScanItem {
  return {
    ...s,
    created_at: s.created_at == null ? undefined : String(s.created_at),
  };
}
