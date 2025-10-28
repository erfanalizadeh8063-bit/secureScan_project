import { useEffect, useState } from "react";
import { apiUrl } from "@/lib/api";

export default function Healthz() {
  const [msg, setMsg] = useState("…loading");
  useEffect(() => {
    fetch(apiUrl("/healthz"))
      .then(r => r.text())
      .then(setMsg)
      .catch(e => setMsg("error: " + String(e)));
  }, []);
  return (
    <main style={{maxWidth: 720, margin: "1rem auto", fontFamily: "system-ui"}}>
      <h1>Frontend ↔ Backend Health</h1>
      <pre data-testid="healthz">{msg}</pre>
    </main>
  );
}
