// Tiny shared ref so DOM elements rendered OUTSIDE the R3F Canvas
// can still react to ScrollControls' offset (which is only available
// inside the Canvas / useScroll() context).
//
// BottleScene writes to `.offset` every frame; sibling overlays read it
// in a requestAnimationFrame loop.

export const scrollState = { offset: 0 };
