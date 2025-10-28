import { useEffect, useState } from "react";

export default function Healthz() {
  const [msg, setMsg] = useState("…loading");
  useEffect(() => {
    fetch("/api/healthz")
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
