import React from "react";
import ReactDOM from "react-dom/client";
import BottleSpiralScene from "./BottleScene";
import MoetVideoOverlay from "./MoetVideoOverlay";
import PasswordGate from "./PasswordGate";
import Loader from "./Loader";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <PasswordGate>
      <Loader />
      <BottleSpiralScene modelUrl="/bottle.glb" />
      <MoetVideoOverlay />
    </PasswordGate>
  </React.StrictMode>
);
