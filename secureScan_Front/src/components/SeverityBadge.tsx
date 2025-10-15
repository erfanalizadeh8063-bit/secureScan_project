type Props = { severity: string }
const map: Record<string,string> = {
  "INFO":"bg-blue-800 text-blue-100",
  "LOW":"bg-green-800 text-green-100",
  "MEDIUM":"bg-yellow-700 text-yellow-100",
  "HIGH":"bg-orange-700 text-orange-100",
  "CRITICAL":"bg-red-800 text-red-100",
  "SAFE":"bg-green-900 text-green-200"
}
export default function SeverityBadge({ severity }:Props){
  const sev = (severity||'').toUpperCase()
  const cls = map[sev] || "bg-neutral-700 text-neutral-100"
  return <span className={"px-2 py-0.5 rounded-md text-xs font-semibold inline-block " + cls}>{sev}</span>
}
