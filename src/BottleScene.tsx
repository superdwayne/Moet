import { useRef, useMemo, useEffect } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import {
  ScrollControls, Scroll, useScroll, useGLTF, Environment, ContactShadows,
} from "@react-three/drei";
import * as THREE from "three";
import cameraData from "./cameraFrames.json";
import { moet } from "./theme";
import { scrollState } from "./scrollState";

type Frame = {
  frame: number;
  phase?: "spiral" | "settle" | "enter";
  position: [number, number, number];
  lookAt: [number, number, number];
};
const FRAMES = cameraData.frames as Frame[];
const PHASES: Record<"spiral" | "settle" | "enter", [number, number]> = {
  spiral: [0.000, 0.555],
  settle: [0.556, 0.610],
  enter:  [0.611, 1.000],
};

/* ─────────────────────────────────────────────────────────────────────────
   3D — scroll-driven camera
   ─────────────────────────────────────────────────────────────────────── */
// Responsive camera FOV — keep the bottle fully framed on portrait phones
// (where the natural horizontal FOV would otherwise crop the scene). We
// widen FOV when the viewport is narrow.
function ResponsiveCamera() {
  const { camera, size } = useThree();
  useEffect(() => {
    if (!(camera as THREE.PerspectiveCamera).isPerspectiveCamera) return;
    const aspect = size.width / size.height;
    const pcam = camera as THREE.PerspectiveCamera;
    pcam.fov = aspect < 0.9 ? 60 : aspect < 1.3 ? 50 : 42;
    pcam.updateProjectionMatrix();
  }, [size.width, size.height, camera]);
  return null;
}

// Publish ScrollControls offset to a module-scoped ref so DOM siblings
// rendered outside the R3F Canvas (e.g. the video overlay) can react.
function ScrollPublisher() {
  const scroll = useScroll();
  useFrame(() => { scrollState.offset = scroll.offset; });
  return null;
}

function ScrollCamera() {
  const { camera } = useThree();
  const scroll = useScroll();
  const a = useMemo(() => new THREE.Vector3(), []);
  const b = useMemo(() => new THREE.Vector3(), []);
  const la = useMemo(() => new THREE.Vector3(), []);
  const lb = useMemo(() => new THREE.Vector3(), []);

  useFrame(() => {
    const last = FRAMES.length - 1;
    const i = THREE.MathUtils.clamp(scroll.offset, 0, 1) * last;
    const lo = Math.floor(i), hi = Math.min(lo + 1, last), k = i - lo;
    a.fromArray(FRAMES[lo].position);
    b.fromArray(FRAMES[hi].position);
    camera.position.lerpVectors(a, b, k);
    la.fromArray(FRAMES[lo].lookAt);
    lb.fromArray(FRAMES[hi].lookAt);
    camera.lookAt(la.lerp(lb, k));
  });
  return null;
}

/* ─────────────────────────────────────────────────────────────────────────
   3D — editorial studio lighting
   ─────────────────────────────────────────────────────────────────────── */
function StudioLights() {
  return (
    <>
      <ambientLight intensity={0.55} color="#ffffff" />
      <hemisphereLight args={["#ffffff", "#dfd4bf", 0.5]} />
      <directionalLight
        position={[5, 7, 3]} intensity={1.7} color="#fffaf0" castShadow
        shadow-mapSize-width={1024} shadow-mapSize-height={1024}
      />
      <directionalLight position={[-4, 3, -2]} intensity={0.6} color="#fff2dc" />
      <directionalLight position={[0, 2, -6]} intensity={0.35} color="#ffffff" />
    </>
  );
}

/* ─────────────────────────────────────────────────────────────────────────
   3D — invisible cursor light: soft fill light that follows the cursor
   ─────────────────────────────────────────────────────────────────────── */
function CursorLight() {
  const { camera, pointer } = useThree();
  const groupRef = useRef<THREE.Group>(null!);
  const ray = useMemo(() => new THREE.Vector3(), []);
  const worldPos = useMemo(() => new THREE.Vector3(), []);

  useFrame(() => {
    ray.set(pointer.x, pointer.y, 0.5).unproject(camera);
    const dir = ray.sub(camera.position).normalize();
    const dist = Math.max(camera.position.length() - 1.0, 1.0);
    worldPos.copy(camera.position).add(dir.multiplyScalar(dist));
    groupRef.current.position.copy(worldPos);
  });

  return (
    <group ref={groupRef}>
      <pointLight intensity={12} distance={4} decay={1.4} color="#ffffff" />
    </group>
  );
}

/* ─────────────────────────────────────────────────────────────────────────
   3D — MOËT gobo projector. A SpotLight whose `.map` is a canvas-rendered
   "MOËT & CHANDON" image, so the text is projected onto whatever surface
   the spotlight hits. Fades in during the "inside" phase.
   ─────────────────────────────────────────────────────────────────────── */
function MoetProjector() {
  const { camera } = useThree();
  const scroll = useScroll();
  const lightRef  = useRef<THREE.SpotLight>(null!);
  const targetRef = useRef<THREE.Object3D>(null!);
  const dir = useMemo(() => new THREE.Vector3(), []);

  const projectionMap = useMemo(() => {
    const W = 1024, H = 1024;
    const canvas = document.createElement("canvas");
    canvas.width = W; canvas.height = H;
    const ctx = canvas.getContext("2d")!;

    // Dimmer panel — the spotlight multiplies this, so a medium-gray panel
    // produces a much softer projection than full white.
    ctx.fillStyle = "#000";
    ctx.fillRect(0, 0, W, H);

    ctx.fillStyle = "#d0c8b8";   // soft warm cream — bright enough to actually project
    ctx.fillRect(60, 60, W - 120, H - 120);

    ctx.strokeStyle = "rgba(0,0,0,0.35)";
    ctx.lineWidth = 2;
    ctx.strokeRect(96, 96, W - 192, H - 192);

    // Solid black text reads as deep shadow inside the projected panel
    ctx.fillStyle = "#000";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";

    ctx.font = 'italic 320px "Fraunces", "Cormorant Garamond", Georgia, serif';
    ctx.fillText("Moët", W / 2, H / 2 - 60);

    ctx.fillRect(W / 2 - 90, H / 2 + 70, 180, 1);

    ctx.font = 'bold 64px "Manrope", system-ui, sans-serif';
    ctx.fillText("& C H A N D O N", W / 2, H / 2 + 130);

    ctx.font = '500 36px "Manrope", system-ui, sans-serif';
    ctx.fillText("É P E R N A Y · 1 8 6 9", W / 2, H / 2 + 230);

    const tex = new THREE.CanvasTexture(canvas);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.needsUpdate = true;
    return tex;
  }, []);

  useEffect(() => {
    if (lightRef.current && targetRef.current) {
      lightRef.current.target = targetRef.current;
      lightRef.current.map = projectionMap;
    }
  }, [projectionMap]);

  useFrame(() => {
    const o = scroll.offset;
    // Project from a point slightly above + behind the camera, aimed forward
    camera.getWorldDirection(dir);
    lightRef.current.position.copy(camera.position).addScaledVector(dir, -0.05);
    targetRef.current.position.copy(camera.position).addScaledVector(dir, 1.4);
    targetRef.current.updateMatrixWorld();

    // Fade in across the approach + inside phases — bright enough to read,
    // softened by the muted panel colour above so it stays cinematic, not harsh.
    const t = THREE.MathUtils.clamp((o - 0.62) / (0.95 - 0.62), 0, 1);
    const eased = t * t;
    lightRef.current.intensity = eased * 65;
  });

  return (
    <>
      <spotLight
        ref={lightRef}
        intensity={0}
        distance={5}
        angle={0.55}
        penumbra={0.35}
        decay={1.2}
        color="#fff5d8"
      />
      <object3D ref={targetRef} />
    </>
  );
}

/* ─────────────────────────────────────────────────────────────────────────
   3D — Bottle
   ─────────────────────────────────────────────────────────────────────── */
function Bottle({ url }: { url: string }) {
  const { scene } = useGLTF(url);
  useMemo(() => {
    scene.traverse((o: THREE.Object3D) => {
      const m = o as THREE.Mesh;
      if ((m as any).isMesh) { m.castShadow = true; m.receiveShadow = true; }
    });
  }, [scene]);
  return <primitive object={scene} />;
}

/* ─────────────────────────────────────────────────────────────────────────
   DOM overlays — caption cards + chapter index + timecode + portal
   ─────────────────────────────────────────────────────────────────────── */
const phaseOf = (o: number): "spiral" | "settle" | "enter" => {
  if (o <= PHASES.spiral[1]) return "spiral";
  if (o <= PHASES.settle[1]) return "settle";
  return "enter";
};
const mmss = (totalSec: number) => {
  const m = Math.floor(totalSec / 60);
  const s = Math.floor(totalSec % 60);
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
};

function ChapterIndex() {
  const scroll = useScroll();
  const wrapRef = useRef<HTMLDivElement>(null);
  const tcRef = useRef<HTMLSpanElement>(null);
  const frameRef = useRef<HTMLSpanElement>(null);
  const chRefs = {
    spiral: useRef<HTMLDivElement>(null),
    settle: useRef<HTMLDivElement>(null),
    enter:  useRef<HTMLDivElement>(null),
  };
  const barRef = useRef<HTMLDivElement>(null);

  const lastPhase = useRef<string>("");
  useFrame(() => {
    const o = scroll.offset;
    const p = phaseOf(o);
    if (p !== lastPhase.current) {
      lastPhase.current = p;
      (Object.keys(chRefs) as (keyof typeof chRefs)[]).forEach((k) => {
        const el = chRefs[k].current;
        if (el) {
          el.dataset.active = String(k === p);
        }
      });
    }
    // timecode 00:00 → 06:00 ; frame counter 1 → 360
    if (tcRef.current) tcRef.current.textContent = mmss(o * 6 * 60);
    if (frameRef.current) {
      const f = Math.max(1, Math.round(o * (FRAMES.length - 1)) + 1);
      frameRef.current.textContent = `${String(f).padStart(3, "0")} / ${FRAMES.length}`;
    }
    if (barRef.current) barRef.current.style.transform = `scaleX(${o})`;
  });

  const wrap: React.CSSProperties = {
    position: "fixed",
    top: 138,
    right: 48,
    zIndex: 26,
    display: "grid",
    rowGap: 14,
    minWidth: 260,
    pointerEvents: "none",
    fontFamily: moet.font.sans,
    color: moet.color.ink,
  };
  const head: React.CSSProperties = {
    fontSize: 9.5, fontWeight: 700, letterSpacing: "0.42em",
    textTransform: "uppercase", color: moet.color.inkMute,
    display: "flex", justifyContent: "space-between",
    borderBottom: `1px solid ${moet.color.rule}`, paddingBottom: 10,
  };
  const item: React.CSSProperties = {
    display: "grid", gridTemplateColumns: "auto 1fr auto",
    columnGap: 14, alignItems: "center",
    fontSize: 10, fontWeight: 600, letterSpacing: "0.28em",
    textTransform: "uppercase", color: moet.color.inkMute,
    transition: `color ${moet.motion.base} ${moet.motion.ease}`,
  };
  const itemActive: React.CSSProperties = { color: moet.color.ink };
  const num: React.CSSProperties = {
    fontFamily: moet.font.display, color: moet.color.gold,
    fontSize: 10, letterSpacing: 0,
  };
  const rule: React.CSSProperties = {
    height: 1, background: moet.color.rule, width: "100%",
  };

  return (
    <div ref={wrapRef} style={wrap}>
      <div style={head}>
        <span>Chapters</span>
        <span ref={frameRef} style={{ fontVariantNumeric: "tabular-nums", color: moet.color.ink }}>
          001 / {FRAMES.length}
        </span>
      </div>
      {(["spiral", "settle", "enter"] as const).map((k, i) => {
        const labels = { spiral: "Circle", settle: "Settle", enter: "Enter" } as const;
        const subs   = { spiral: "Around the Cuvée", settle: "At the Base", enter: "Inside the Maison" } as const;
        return (
          <div
            key={k}
            ref={chRefs[k]}
            style={item}
            data-active={false}
          >
            <span style={num}>{`0${i + 1}`}</span>
            <div style={{ display: "grid", rowGap: 4 }}>
              <span className="ch-label" style={{ letterSpacing: "0.34em" }}>{labels[k]}</span>
              <span
                style={{
                  fontSize: 9, fontWeight: 500, letterSpacing: "0.22em",
                  color: moet.color.inkMute,
                  fontFamily: moet.font.display, fontStyle: "italic",
                  textTransform: "none",
                }}
              >{subs[k]}</span>
            </div>
            <span className="ch-tick" style={{
              width: 18, height: 1, background: moet.color.rule,
              transition: `background ${moet.motion.base} ${moet.motion.ease}`,
            }} />
          </div>
        );
      })}

      {/* Timecode footer of the index */}
      <div style={{ ...rule, marginTop: 4 }} />
      <div style={{
        display: "flex", justifyContent: "space-between",
        fontSize: 10, fontWeight: 700, letterSpacing: "0.34em",
        textTransform: "uppercase", color: moet.color.ink,
        fontVariantNumeric: "tabular-nums",
      }}>
        <span style={{ color: moet.color.inkMute, fontWeight: 600 }}>Timecode</span>
        <span><span ref={tcRef}>00:00</span> <span style={{ color: moet.color.inkMute }}>/ 06:00</span></span>
      </div>

      {/* Scrub bar */}
      <div style={{ height: 2, background: moet.color.rule, overflow: "hidden" }}>
        <div ref={barRef} style={{
          height: "100%", width: "100%", background: moet.color.red,
          transformOrigin: "left center", transform: "scaleX(0)",
        }} />
      </div>

      <style>{`
        [data-active="true"] .ch-label { color: ${moet.color.ink}; }
        [data-active="true"] .ch-tick  { background: ${moet.color.red} !important; width: 42px !important; }
      `}</style>
    </div>
  );
}

function Captions() {
  const scroll = useScroll();
  const ch1 = useRef<HTMLDivElement>(null);
  const ch2 = useRef<HTMLDivElement>(null);
  const ch3 = useRef<HTMLDivElement>(null);
  const ch4 = useRef<HTMLDivElement>(null);
  const portal = useRef<HTMLDivElement>(null);

  const fade = (el: HTMLDivElement | null, start: number, peak: number, end: number, o: number) => {
    if (!el) return;
    let alpha = 0;
    if (o >= start && o <= end) {
      if (o < peak) alpha = (o - start) / (peak - start);
      else alpha = 1 - (o - peak) / (end - peak);
      alpha = Math.max(0, Math.min(1, alpha));
    }
    el.style.opacity = alpha.toFixed(3);
    el.style.transform = `translate(-50%, ${(1 - alpha) * 14}px)`;
  };

  useFrame(() => {
    const o = scroll.offset;
    fade(ch1.current, 0.00, 0.06, 0.22, o);
    fade(ch2.current, 0.30, 0.40, 0.52, o);
    fade(ch3.current, 0.56, 0.60, 0.66, o);
    fade(ch4.current, 0.84, 0.95, 1.00, o);
    if (portal.current) {
      const t = Math.max(0, Math.min(1, (o - 0.62) / (1.0 - 0.62)));
      portal.current.style.opacity = (t * t * 0.6).toFixed(3);
    }
  });

  /* Pharrell-style hero block: centered, bottom-third of viewport */
  const heroBase: React.CSSProperties = {
    position: "fixed",
    left: "50%",
    top: "auto",
    bottom: "16vh",
    transform: "translate(-50%, 0)",
    width: "min(720px, 86vw)",
    color: moet.color.ink,
    fontFamily: moet.font.sans,
    textAlign: "center",
    zIndex: 18,
    pointerEvents: "none",
    transition: "opacity 220ms linear, transform 480ms cubic-bezier(0.2,0.7,0.1,1)",
  };
  const eyebrow: React.CSSProperties = {
    fontSize: 10.5, fontWeight: 700, letterSpacing: "0.34em",
    textTransform: "uppercase", color: moet.color.ink, marginBottom: 18,
  };
  const headline: React.CSSProperties = {
    fontFamily: moet.font.display, fontWeight: 400,
    fontSize: "clamp(28px, 3.4vw, 44px)",
    lineHeight: 1.15, letterSpacing: "-0.005em",
    fontVariationSettings: '"opsz" 144, "SOFT" 50, "WONK" 0',
    color: moet.color.ink, margin: 0,
  };

  return (
    <>
      {/* ─── 01 — Pharrell hero (start of spiral) ────────────────────── */}
      <div ref={ch1} style={{ ...heroBase, opacity: 0 }}>
        <div style={eyebrow}>Limited Edition</div>
        <p style={headline}>
          Moët &amp; Chandon &amp; Pharrell Williams
          <br />
          <span style={{ fontStyle: "italic" }}>A Shared Art of Celebration.</span>
        </p>
        <a href="#" className="btn-pill" style={{ marginTop: 26, pointerEvents: "auto" }}>
          Explore the Collection <span className="arrow">→</span>
        </a>
      </div>

      {/* ─── 02 — editorial line mid-spiral ─────────────────────────── */}
      <div ref={ch2} style={{ ...heroBase, opacity: 0 }}>
        <div style={eyebrow}>The Cuvée</div>
        <p style={{ ...headline, fontSize: "clamp(24px, 2.6vw, 34px)" }}>
          Born to celebrate —
          <br />
          <span style={{ fontStyle: "italic" }}>a vivid champagne for shared moments.</span>
        </p>
      </div>

      {/* ─── 03 — threshold cue at base ─────────────────────────────── */}
      <div ref={ch3} style={{ ...heroBase, opacity: 0 }}>
        <div style={eyebrow}>Keep Scrolling</div>
        <p style={{ ...headline, fontSize: "clamp(24px, 2.4vw, 30px)" }}>
          Step <span style={{ fontStyle: "italic" }}>inside.</span>
        </p>
      </div>

      {/* ─── 04 — inside the bottle, hero on the label ──────────────── */}
      <div
        ref={ch4}
        style={{ ...heroBase, opacity: 0, color: moet.color.bone }}
      >
        <div style={{ ...eyebrow, color: moet.color.bone }}>Welcome To</div>
        <p style={{ ...headline, color: moet.color.bone, fontSize: "clamp(36px, 4.2vw, 56px)" }}>
          The Maison of Moët &amp;
          <br />
          <span style={{ fontStyle: "italic" }}>Chandon.</span>
        </p>
        <a href="#" className="btn-pill on-dark" style={{ marginTop: 26, pointerEvents: "auto" }}>
          Enter the Maison <span className="arrow">→</span>
        </a>
      </div>

      {/* soft white flash during entry (kept subtle now that letterbox does the work) */}
      <div
        ref={portal}
        style={{
          position: "fixed", inset: 0, zIndex: 14, pointerEvents: "none",
          opacity: 0,
          background:
            "radial-gradient(ellipse at 50% 50%, #ffffff 0%, #fff7e7 35%, rgba(255,247,231,0) 78%)",
        }}
      />
    </>
  );
}

/* ─────────────────────────────────────────────────────────────────────────
   Scene root
   ─────────────────────────────────────────────────────────────────────── */
export default function BottleSpiralScene({ modelUrl }: { modelUrl: string }) {
  // Less scrollable height on touch devices so each swipe covers a meaningful
  // chunk of the animation. Tighter damping feels snappier on phones.
  const { pages, damping } = useMemo(() => {
    if (typeof window === "undefined") return { pages: 9, damping: 0.18 };
    const touch = window.matchMedia("(hover: none), (pointer: coarse)").matches;
    const narrow = window.innerWidth < 820;
    return touch || narrow
      ? { pages: 4, damping: 0.10 }
      : { pages: 9, damping: 0.18 };
  }, []);

  return (
    <Canvas
      shadows
      gl={{ alpha: true, antialias: true, powerPreference: "high-performance" }}
      dpr={[1, 1.75]}
      camera={{ fov: 42, position: [3, 2.5, 0], near: 0.1, far: 50 }}
      style={{ background: "transparent", height: "100dvh", width: "100vw", touchAction: "none" }}
    >
      <StudioLights />
      <ResponsiveCamera />
      <ScrollControls pages={pages} damping={damping}>
        <ScrollPublisher />
        <ScrollCamera />
        <CursorLight />
        <MoetProjector />
        <Bottle url={modelUrl} />
        <ContactShadows
          position={[0, -0.02, 0]}
          opacity={0.55}
          scale={6}
          blur={2.4}
          far={3}
          color="#1a2630"
        />
        <Environment preset="studio" />
        <Scroll html style={{ width: "100%", height: "100%" }}>
          <Captions />
        </Scroll>
      </ScrollControls>
    </Canvas>
  );
}

useGLTF.preload("/bottle.glb");
