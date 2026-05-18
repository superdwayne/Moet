import { useState, useEffect } from "react";

const PASSWORD = "moet2026";
const SESSION_KEY = "moet_unlocked";

export default function PasswordGate({ children }: { children: React.ReactNode }) {
  const [unlocked, setUnlocked] = useState(false);
  const [value, setValue] = useState("");
  const [error, setError] = useState(false);

  useEffect(() => {
    if (sessionStorage.getItem(SESSION_KEY) === "yes") setUnlocked(true);
  }, []);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (value.trim().toLowerCase() === PASSWORD) {
      sessionStorage.setItem(SESSION_KEY, "yes");
      setUnlocked(true);
    } else {
      setError(true);
      setValue("");
    }
  };

  if (unlocked) return <>{children}</>;

  return (
    <div
      style={{
        position: "fixed", inset: 0, zIndex: 9999,
        display: "flex", alignItems: "center", justifyContent: "center",
        background:
          "radial-gradient(ellipse 78% 60% at 50% 50%, #e7f0f6 0%, #c8d9e6 50%, #a4becf 100%)",
        fontFamily: '"Manrope", system-ui, sans-serif',
        color: "#0e0c0a",
      }}
    >
      <form
        onSubmit={submit}
        style={{
          width: "min(420px, 86vw)",
          textAlign: "center",
          padding: "44px 36px",
          background: "rgba(255,255,255,0.78)",
          border: "1px solid rgba(14,12,10,0.12)",
          boxShadow: "0 18px 60px -24px rgba(14,12,10,0.32)",
          backdropFilter: "blur(8px)",
        }}
      >
        <div
          style={{
            fontFamily: '"Fraunces", "Cormorant Garamond", Georgia, serif',
            fontStyle: "italic", fontWeight: 500,
            fontVariationSettings: '"opsz" 96, "SOFT" 50, "WONK" 0',
            fontSize: 28, letterSpacing: "0.04em",
            lineHeight: 1,
          }}
        >
          Moët <span style={{ color: "#c00016" }}>&amp;</span> Chandon
        </div>
        <div
          style={{
            marginTop: 10, fontSize: 9, fontWeight: 700,
            letterSpacing: "0.42em", textTransform: "uppercase",
            color: "rgba(14,12,10,0.55)",
          }}
        >
          Private Preview
        </div>

        <div
          style={{
            margin: "26px auto 22px",
            width: 32, height: 1, background: "rgba(14,12,10,0.25)",
          }}
        />

        <p
          style={{
            margin: "0 0 22px", fontSize: 13, lineHeight: 1.55,
            color: "rgba(14,12,10,0.7)",
          }}
        >
          Enter the password to access the experience.
        </p>

        <input
          type="password"
          autoFocus
          value={value}
          onChange={(e) => { setValue(e.target.value); setError(false); }}
          placeholder="••••••••"
          aria-label="Password"
          style={{
            width: "100%", boxSizing: "border-box",
            padding: "14px 14px",
            background: "#fff",
            border: error ? "1px solid #c00016" : "1px solid rgba(14,12,10,0.18)",
            color: "#0e0c0a",
            fontFamily: '"Manrope", system-ui, sans-serif',
            fontSize: 16,                       /* 16+ avoids iOS zoom-on-focus */
            letterSpacing: "0.18em",
            textAlign: "center",
            outline: "none",
            WebkitAppearance: "none",
          }}
        />

        <div
          style={{
            minHeight: 18, marginTop: 8,
            fontSize: 10, fontWeight: 600,
            letterSpacing: "0.28em", textTransform: "uppercase",
            color: "#c00016",
            opacity: error ? 1 : 0,
            transition: "opacity 240ms cubic-bezier(0.2,0.7,0.1,1)",
          }}
        >
          Incorrect — try again
        </div>

        <button
          type="submit"
          style={{
            marginTop: 14,
            display: "inline-flex", alignItems: "center", gap: 12,
            padding: "14px 30px",
            background: "#0e0c0a", color: "#fff",
            border: "none", cursor: "pointer",
            fontFamily: '"Manrope", system-ui, sans-serif',
            fontSize: 10, fontWeight: 700,
            letterSpacing: "0.42em", textTransform: "uppercase",
          }}
        >
          Enter <span style={{ fontSize: 12, letterSpacing: 0 }}>→</span>
        </button>
      </form>
    </div>
  );
}
