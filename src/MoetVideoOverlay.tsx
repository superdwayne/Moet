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
    document.body.classList.remove("video-on");
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
        document.body.classList.toggle("video-on", shown);
        if (shown) {
          if (v.paused) {
            // Try with sound first; if the browser blocks it, fall back to
            // muted so the video still plays.
            v.play().catch(() => {
              v.muted = true;
              v.play().catch(() => {});
            });
          }
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
        loop
        playsInline
        preload="auto"
        style={{
          width: "100%", height: "100%",
          /* "contain" so the whole video frame is visible on any aspect ratio
             — phones in portrait will letterbox top/bottom against the black
             background instead of cropping the sides of the footage. */
          objectFit: "contain",
          display: "block",
        }}
      />
      <div
        style={{
          position: "absolute", inset: 0,
          background:
            "linear-gradient(180deg, rgba(0,0,0,0.20) 0%, rgba(0,0,0,0) 35%, rgba(0,0,0,0) 65%, rgba(0,0,0,0.55) 100%)",
          pointerEvents: "none",
        }}
      />

      {/* Close button — top-right. Big, always visible while the overlay is
          on screen, comfortably tappable on phones. */}
      <button
        onClick={close}
        aria-label="Close video"
        className="video-close"
        style={{
          position: "absolute",
          /* Push well below the top nav on mobile so they don't crowd
             each other and the tap target stays comfortably reachable. */
          top: "calc(env(safe-area-inset-top, 0px) + 80px)",
          right: "calc(env(safe-area-inset-right, 0px) + 16px)",
          zIndex: 2,
          width: 56, height: 56,
          minWidth: 56, minHeight: 56,
          display: "inline-flex", alignItems: "center", justifyContent: "center",
          background: "rgba(0,0,0,0.55)",
          color: "#fff",
          border: "1px solid rgba(255,255,255,0.7)",
          borderRadius: "50%",
          fontFamily: '"Manrope", system-ui, sans-serif',
          fontSize: 26, lineHeight: 1, fontWeight: 300,
          backdropFilter: "blur(8px)",
          WebkitBackdropFilter: "blur(8px)",
          cursor: "pointer",
          touchAction: "manipulation",
          transition: "background 200ms cubic-bezier(0.2,0.7,0.1,1), transform 200ms cubic-bezier(0.2,0.7,0.1,1)",
        }}
        onTouchStart={(e) => {
          (e.currentTarget as HTMLButtonElement).style.background = "#fff";
          (e.currentTarget as HTMLButtonElement).style.color = "#0e0c0a";
        }}
        onTouchEnd={(e) => {
          (e.currentTarget as HTMLButtonElement).style.background = "rgba(0,0,0,0.55)";
          (e.currentTarget as HTMLButtonElement).style.color = "#fff";
        }}
        onMouseEnter={(e) => {
          (e.currentTarget as HTMLButtonElement).style.background = "#fff";
          (e.currentTarget as HTMLButtonElement).style.color = "#0e0c0a";
        }}
        onMouseLeave={(e) => {
          (e.currentTarget as HTMLButtonElement).style.background = "rgba(0,0,0,0.55)";
          (e.currentTarget as HTMLButtonElement).style.color = "#fff";
        }}
      >
        ×
      </button>

      {/* ESC hint — bottom-center, only when video is visible */}
      <div
        style={{
          position: "absolute", left: "50%",
          bottom: "calc(env(safe-area-inset-bottom, 0px) + 24px)",
          transform: "translateX(-50%)",
          fontFamily: '"Manrope", system-ui, sans-serif',
          fontSize: 9, fontWeight: 700, letterSpacing: "0.42em",
          textTransform: "uppercase", color: "rgba(255,255,255,0.7)",
          pointerEvents: "none",
        }}
      >
        <span className="esc-hint">Press <span style={{ color: "#fff" }}>Esc</span> to return</span>
        <span className="tap-hint" style={{ display: "none" }}>Tap <span style={{ color: "#fff" }}>Close</span> to return</span>
      </div>
    </div>
  );
}
