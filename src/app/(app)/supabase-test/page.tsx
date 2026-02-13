"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

type LogLine = { label: string; value: string };

export default function SupabaseTestPage() {
  const [logs, setLogs] = useState<LogLine[]>([]);
  const [loading, setLoading] = useState(true);
  const [email, setEmail] = useState("");

  const addLog = (label: string, value: unknown) => {
    setLogs((prev) => [
      ...prev,
      {
        label,
        value: typeof value === "string" ? value : JSON.stringify(value, null, 2),
      },
    ]);
  };

  const handleMagicLink = async () => {
    if (!email) return addLog("Validation", "Please enter an email address");
    
    addLog("Action", `Sending Magic Link to ${email}...`);
    const { data, error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: "http://localhost:3001/supabase-test",
      },
    });

    if (error) {
      addLog("Magic Link Error", error);
    } else {
      addLog("Magic Link Success", data);
    }
  };

  const handleSignOut = async () => {
    addLog("Action", "Signing out...");
    const { error } = await supabase.auth.signOut();
    if (error) {
      addLog("Sign Out Error", error);
    } else {
      addLog("Sign Out", "Success");
    }
  };

  useEffect(() => {
    (async () => {
      try {
        addLog("NEXT_PUBLIC_SUPABASE_URL", process.env.NEXT_PUBLIC_SUPABASE_URL ?? "(missing)");
        addLog(
          "NEXT_PUBLIC_SUPABASE_ANON_KEY",
          (process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "(missing)").slice(0, 20) + "..."
        );

        // 1) Basic: Auth Session
        const sessionRes = await supabase.auth.getSession();
        addLog("auth.getSession()", sessionRes);

        // 2) Basic: Current user
        const userRes = await supabase.auth.getUser();
        addLog("auth.getUser()", userRes);

        // 3) Optional: Simple DB read (nur wenn du eine Tabelle hast)
        // Beispiel: profiles (wenn vorhanden)
        // const dbRes = await supabase.from("profiles").select("*").limit(1);
        // addLog("db select profiles limit 1", dbRes);
      } catch (e) {
        addLog("ERROR", e);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  return (
    <main style={{ padding: 24, fontFamily: "ui-sans-serif, system-ui" }}>
      <h1 style={{ fontSize: 24, fontWeight: 700 }}>Supabase Test</h1>
      <p style={{ opacity: 0.8 }}>
        Check ENV + Auth. Wenn hier Errors stehen, stimmt meist URL/Key oder CORS/Netz nicht.
      </p>

      <div style={{ margin: "24px 0", padding: 20, border: "1px solid #ccc", borderRadius: 8 }}>
        <h2 style={{ fontSize: 18, fontWeight: 600, marginBottom: 12 }}>Magic Link Auth</h2>
        <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
          <input
            type="email"
            placeholder="name@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            style={{ padding: "8px 12px", border: "1px solid #ddd", borderRadius: 4, minWidth: 250 }}
          />
          <button
            onClick={handleMagicLink}
            style={{ padding: "8px 16px", background: "#000", color: "#fff", border: "none", borderRadius: 4, cursor: "pointer" }}
          >
            Send Magic Link
          </button>
          <button
            onClick={handleSignOut}
            style={{ padding: "8px 16px", background: "#fff", color: "#d00", border: "1px solid #d00", borderRadius: 4, cursor: "pointer" }}
          >
            Sign Out
          </button>
        </div>
      </div>

      {loading ? <p>Loading…</p> : null}

      <div style={{ marginTop: 16, display: "grid", gap: 12 }}>
        {logs.map((l, idx) => (
          <section key={idx} style={{ border: "1px solid #333", borderRadius: 12, padding: 12 }}>
            <div style={{ fontWeight: 700, marginBottom: 8 }}>{l.label}</div>
            <pre style={{ whiteSpace: "pre-wrap", margin: 0, fontSize: 12 }}>{l.value}</pre>
          </section>
        ))}
      </div>
    </main>
  );
}
