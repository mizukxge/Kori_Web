import React, { useEffect, useState } from "react";

export function App() {
  const [status, setStatus] = useState<string>("Loading...");

  useEffect(() => {
    fetch("http://localhost:4000/healthz")
      .then(r => r.json())
      .then(data => setStatus(data?.ok ? "API OK" : "API DOWN"))
      .catch(() => setStatus("API DOWN"));
  }, []);

  return (
    <div style={{ fontFamily: 'ui-sans-serif, system-ui', padding: 24 }}>
      <h1 style={{ marginBottom: 8 }}>Kori</h1>
      <p>Backend status: <strong>{status}</strong></p>
    </div>
  );
}