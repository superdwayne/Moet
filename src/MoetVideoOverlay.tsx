import { useEffect, useRef, useState } from "react";
import { scrollState } from "./scrollState";

const MOET_VIDEO_URL =
  "https://www.moet.com/sites/default/files/2023-12/MAKING%20OF%2028%20OFFANG%20169%201100%20FL%20ANG%20NO-aem-rendition%202_0.mp4";

// Hard snap on the way IN, smooth fade on the way OUT.
//   - The instant scroll crosses SHOW_AT going forward → opacity jumps to 1
//     (no half-transparent state where the 3D bottle bleeds through).
//   - While shown and scrolling back below SHOW_AT, opacity fades from 1 → 0
//     across the [HIDE_AT, SHOW_AT] window.
//   - Once opacity reaches 0, the "shown" latch resets so the next forward
//     crossing snaps cleanly again.
// Phase timing in cameraFrames.json:
//   approach 0.61 → 0.78  (camera moving toward the bottle)
//   pierce   0.78 → 0.85  (camera passing through the wall)
//   ascend   0.85 → 1.00  (camera deep inside, rising up to the cork)
//
// LATCH + CSS-driven fade — the half-transparent state is time-bounded
// (FADE_MS) instead of being dragged out by slow scrolling. Cross SHOW_AT
// going forward → state flips to shown; CSS smoothly fades opacity to 1.
// Drop below HIDE_AT going back → state flips to hidden; CSS fades to 0.
const SHOW_AT = 0.92;
const HIDE_AT = 0.86;
const FADE_MS = 350;

export default function MoetVideoOverlay() {
  const wrapRef     = useRef<HTMLDivElement>(null);
  const videoRef    = useRef<HTMLVideoElement>(null);
  const dismissedRef = useRef(false);
  const [visible, setVisible] = useState(false);

  const close = () => {
    dismissedRef.current = true;
    if (wrapRef.current) wrapRef.current.style.opacity = "0";
    if (videoRef.current) videoRef.current.pause();
    setVisible(false);
    // Scroll back to the top of the experience
    const sc = document.querySelector(
      "[data-react-three-fiber-scroll], .scroll"
    ) as HTMLElement | null;
    if (sc) sc.scrollTop = 0;
    else window.scrollTo({ top: 0, behavior: "smooth" });
  };

  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    const onError  = () => console.warn("[MoetVideoOverlay] video error", v.error);
    const onLoaded = () => console.log("[MoetVideoOverlay] loadeddata · duration", v.duration);
    v.addEventListener("error", onError);
    v.addEventListener("loadeddata", onLoaded);
    // Don't auto-play on mount — the tick loop starts it only when the user
    // is actually inside the bottle.

    const onKey = (e: KeyboardEvent) => {
      // Esc closes any time the video is at all visible
      if (e.key === "Escape" && wrapRef.current && parseFloat(wrapRef.current.style.opacity || "0") > 0.02) {
        close();
      }
    };
    window.addEventListener("keydown", onKey);

    // Latched "shown" state — flips at the thresholds rather than tracking
    // scroll continuously, so CSS can drive the actual fade at a fixed pace.
    let shown = false;

    let raf = 0;
    const tick = () => {
      const o = scrollState.offset;

      // Auto-reset the close-button dismissal once the user scrolls back
      // below the hide threshold, so re-entry fades in normally.
      if (dismissedRef.current && o < HIDE_AT) {
        dismissedRef.current = false;
      }

      // Hysteresis: flip ON above SHOW_AT, flip OFF below HIDE_AT
      const desired =
        !dismissedRef.current &&
        ((shown && o >= HIDE_AT) || (!shown && o >= SHOW_AT));

      if (desired !== shown) {
        shown = desired;
        if (wrapRef.current) wrapRef.current.style.opacity = shown ? "1" : "0";
        if (shown) {
          if (v.paused) v.play().catch(() => {});
          if (!visible) setVisible(true);
        } else {
          // Pause + reset only after the CSS fade-out completes
          setTimeout(() => {
            if (!shown && !v.paused) { v.pause(); v.currentTime = 0; }
          }, FADE_MS + 30);
          if (visible) setVisible(false);
        }
      }

      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(raf);
      v.removeEventListener("error", onError);
      v.removeEventListener("loadeddata", onLoaded);
      window.removeEventListener("keydown", onKey);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div
      ref={wrapRef}
      style={{
        position: "fixed", inset: 0, zIndex: 22,
        opacity: 0, pointerEvents: visible ? "auto" : "none",
        background: "#0e0c0a",
        transition: `opacity ${FADE_MS}ms cubic-bezier(0.4, 0, 0.2, 1)`,
      }}
    >
      <video
        ref={videoRef}
        src={MOET_VIDEO_URL}
        muted
        loop
        playsInline
        autoPlay
        preload="auto"
        style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
      />
      <div
        style={{
          position: "absolute", inset: 0,
          background:
            "linear-gradient(180deg, rgba(0,0,0,0.20) 0%, rgba(0,0,0,0) 35%, rgba(0,0,0,0) 65%, rgba(0,0,0,0.55) 100%)",
          pointerEvents: "none",
        }}
      />

      {/* Close button — top-right */}
      <button
        onClick={close}
        aria-label="Close video"
        style={{
          position: "absolute", top: 28, right: 28, zIndex: 1,
          display: "inline-flex", alignItems: "center", gap: 12,
          padding: "10px 16px 10px 18px",
          background: "rgba(0,0,0,0.42)",
          color: "#fff",
          border: "1px solid rgba(255,255,255,0.55)",
          borderRadius: 999,
          fontFamily: '"Manrope", system-ui, sans-serif',
          fontSize: 10, fontWeight: 700,
          letterSpacing: "0.34em", textTransform: "uppercase",
          backdropFilter: "blur(6px)",
          cursor: "pointer",
          transition: "background 220ms cubic-bezier(0.2,0.7,0.1,1), color 220ms cubic-bezier(0.2,0.7,0.1,1), transform 220ms cubic-bezier(0.2,0.7,0.1,1)",
        }}
        onMouseEnter={(e) => {
          (e.currentTarget as HTMLButtonElement).style.background = "#fff";
          (e.currentTarget as HTMLButtonElement).style.color = "#0e0c0a";
        }}
        onMouseLeave={(e) => {
          (e.currentTarget as HTMLButtonElement).style.background = "rgba(0,0,0,0.42)";
          (e.currentTarget as HTMLButtonElement).style.color = "#fff";
        }}
      >
        Close
        <span
          style={{
            display: "inline-flex", width: 22, height: 22,
            alignItems: "center", justifyContent: "center",
            borderRadius: "50%",
            border: "1px solid currentColor",
            fontSize: 11, lineHeight: 1, fontWeight: 600,
            letterSpacing: 0,
          }}
        >×</span>
      </button>

      {/* ESC hint — bottom-center, only when video is visible */}
      <div
        style={{
          position: "absolute", left: "50%", bottom: 32,
          transform: "translateX(-50%)",
          fontFamily: '"Manrope", system-ui, sans-serif',
          fontSize: 9, fontWeight: 700, letterSpacing: "0.42em",
          textTransform: "uppercase", color: "rgba(255,255,255,0.7)",
          pointerEvents: "none",
        }}
      >
        Press <span style={{ color: "#fff" }}>Esc</span> to return
      </div>
    </div>
  );
}
