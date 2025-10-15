import { useEffect, useState } from "react"
export default function ThemeToggle(){
  const [dark, setDark] = useState(true)
  useEffect(()=>{
    const root = document.documentElement
    if(dark){ root.classList.add('dark') } else { root.classList.remove('dark') }
  },[dark])
  return (
    <button onClick={()=>setDark(d=>!d)} className="px-2 py-1 rounded-lg border border-neutral-300 dark:border-neutral-800 bg-white/70 dark:bg-neutral-900/60 hover:bg-white/90 dark:hover:bg-neutral-800 text-sm">
      {dark? 'Dark' : 'Light'}
    </button>
  )
}
