import { useEffect, useRef, useState } from 'react'

const lineClass = (l:string)=>{
  const s = l.toUpperCase()
  if(s.includes('[CRITICAL]') || s.includes('[ERROR]') || s.includes('ERROR')) return 'text-red-300'
  if(s.includes('[WARN]') || s.includes('WARN')) return 'text-yellow-200'
  if(s.includes('[INFO]')) return 'text-blue-200'
  if(s.includes('[OK]') || s.includes('SUCCESS') || s.includes('COMPLETED')) return 'text-green-200'
  return 'text-neutral-200'
}

export default function TerminalLog({ lines }:{ lines:string[] }){
  const ref = useRef<HTMLDivElement>(null)
  const [paused, setPaused] = useState(false)
  useEffect(()=>{
    if(ref.current && !paused){
      ref.current.scrollTop = ref.current.scrollHeight
    }
  },[lines, paused])
  return (
    <div className="relative">
      <div className="absolute right-2 -top-8 flex gap-2">
        <button onClick={()=>setPaused(p=>!p)} className="text-xs px-2 py-1 rounded bg-neutral-800 border border-neutral-700 hover:bg-neutral-700">{paused?'Resume':'Pause'}</button>
        <button onClick={()=>{ if(ref.current) ref.current.scrollTop=0 }} className="text-xs px-2 py-1 rounded bg-neutral-800 border border-neutral-700 hover:bg-neutral-700">Top</button>
      </div>
      <div ref={ref} className="font-mono text-sm bg-black/60 border border-neutral-800 rounded-xl p-3 h-56 overflow-y-auto">
        {lines.map((l,i)=>(<div key={i} className={lineClass(l)}>&gt; {l}</div>))}
      </div>
    </div>
  )
}
