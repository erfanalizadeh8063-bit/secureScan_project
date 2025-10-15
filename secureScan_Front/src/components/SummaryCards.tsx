type Props = { links:number; counts: Record<string,number>; risk:string }
const pretty = (n:number)=> new Intl.NumberFormat().format(n)
const riskColor: Record<string,string> = {
  "LOW":"text-green-300",
  "MEDIUM":"text-yellow-200",
  "HIGH":"text-orange-200",
  "CRITICAL":"text-red-200"
}
export default function SummaryCards({ links, counts, risk }:Props){
  const totalVulns = Object.values(counts||{}).reduce((a,b)=>a+b,0)
  const riskCls = riskColor[(risk||'').toUpperCase()] || "text-neutral-200"
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
      <CardMini label="Links Crawled" value={pretty(links)} />
      <CardMini label="Total Vulns" value={pretty(totalVulns)} />
      <CardMini label="High/Critical" value={pretty((counts['HIGH']||0)+(counts['CRITICAL']||0))} />
      <CardMini label="Risk Level" value={(risk||'INFO').toUpperCase()} className={riskCls} />
    </div>
  )
}
function CardMini({label, value, className}:{label:string; value:string|number; className?:string}){
  return (
    <div className="rounded-xl border border-neutral-800 dark:border-neutral-800 bg-neutral-100/60 dark:bg-neutral-900/50 p-3">
      <div className="text-xs text-neutral-600 dark:text-neutral-400">{label}</div>
      <div className={"mt-1 text-xl font-mono leading-tight whitespace-nowrap overflow-hidden text-ellipsis "+(className||"")}>{value}</div>
    </div>
  )
}
