import React from "react";
import ReactDOM from "react-dom/client";
import BottleSpiralScene from "./BottleScene";
import MoetVideoOverlay from "./MoetVideoOverlay";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <BottleSpiralScene modelUrl="/bottle.glb" />
    <MoetVideoOverlay />
  </React.StrictMode>
);
