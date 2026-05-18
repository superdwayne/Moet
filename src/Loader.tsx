import { useEffect, useState } from "react";
import { useProgress } from "@react-three/drei";

// Full-screen loading overlay driven by three.js's default loading manager.
// Sits outside the Canvas so it can keep showing while the GLB + textures
// resolve, then fades out cleanly once everything's loaded.
export default function Loader() {
  const { progress, active } = useProgress();
  const [hidden, setHidden] = useState(false);

  useEffect(() => {
    if (!active && progress >= 100) {
      const t = setTimeout(() => setHidden(true), 700);
      return () => clearTimeout(t);
    }
  }, [active, progress]);

  if (hidden) return null;

  const showing = active || progress < 100;
  const p = Math.min(100, Math.max(0, Math.round(progress)));

  return (
    <div
      style={{
        position: "fixed", inset: 0, zIndex: 200,
        display: "flex", flexDirection: "column",
        alignItems: "center", justifyContent: "center",
        background:
          "radial-gradient(ellipse 78% 60% at 50% 50%, #e7f0f6 0%, #c8d9e6 50%, #a4becf 100%)",
        color: "#0e0c0a",
        fontFamily: '"Manrope", system-ui, sans-serif',
        opacity: showing ? 1 : 0,
        pointerEvents: showing ? "auto" : "none",
        transition: "opacity 600ms cubic-bezier(0.2, 0.7, 0.1, 1)",
      }}
    >
      <div
        style={{
          fontFamily: '"Fraunces", "Cormorant Garamond", Georgia, serif',
          fontStyle: "italic", fontWeight: 500,
          fontVariationSettings: '"opsz" 96, "SOFT" 50, "WONK" 0',
          fontSize: 30, letterSpacing: "0.04em", lineHeight: 1,
        }}
      >
        Moët <span style={{ color: "#c00016" }}>&amp;</span> Chandon
      </div>

      <div
        style={{
          marginTop: 12, fontSize: 9, fontWeight: 700,
          letterSpacing: "0.42em", textTransform: "uppercase",
          color: "rgba(14,12,10,0.55)",
        }}
      >
        Preparing the Experience
      </div>

      <div
        style={{
          marginTop: 36,
          width: "min(280px, 60vw)", height: 1,
          background: "rgba(14,12,10,0.18)",
          position: "relative", overflow: "hidden",
        }}
      >
        <div
          style={{
            position: "absolute", left: 0, top: 0, bottom: 0,
            width: `${p}%`,
            background: "#0e0c0a",
            transition: "width 220ms cubic-bezier(0.2, 0.7, 0.1, 1)",
          }}
        />
      </div>

      <div
        style={{
          marginTop: 14,
          fontSize: 10, fontWeight: 600,
          letterSpacing: "0.34em", textTransform: "uppercase",
          color: "rgba(14,12,10,0.7)",
          fontVariantNumeric: "tabular-nums",
        }}
      >
        {p.toString().padStart(2, "0")} <span style={{ opacity: 0.5 }}>· 100</span>
      </div>
    </div>
  );
}
