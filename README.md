# Bottle Spiral — R3F

Scroll-driven spiral camera around the Moët bottle with a mouse-following spotlight that reveals parts of the model.

## Files
- `src/cameraFrames.json` — 240 baked camera positions + lookAt targets (three.js Y-up), exported from Blender.
- `src/BottleScene.tsx` — drop-in component. Usage:

```tsx
import BottleSpiralScene from "./BottleScene";
<BottleSpiralScene modelUrl="/bottle.glb" />
```

## Install
```
npm i three @react-three/fiber @react-three/drei
```

## How it works
- `<ScrollControls pages={6}>` from drei provides scroll state.
- `ScrollCamera` lerps camera `position` + `lookAt` between adjacent baked frames using `scroll.offset` (0→1).
- `MouseSpotlight` parents a spotlight to the camera and unprojects the mouse into world space to aim the light — the dark scene + tight spot reveals only what the cursor hovers.

## Tuning
- Speed of spiral per scroll → change `pages` (more = slower).
- Spotlight reveal → `intensity`, `angle`, `penumbra`, `distance` on the `<spotLight>`.
- Ambient floor → `ambientLight intensity` (keep low so the spot does the work).

## Re-baking the camera
The spiral is generated in Blender. To change radius / turns / Z range, edit the script you ran via the Blender MCP and the JSON will be overwritten in place. Copy it into `src/cameraFrames.json` after re-export.
