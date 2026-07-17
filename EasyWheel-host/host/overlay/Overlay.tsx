import React from "react";
import "./Overlay.css";


/**
 * Overlay
 *
 * Transparent, full-viewport overlay window rendered when the activation
 * key is held. Phase 3 renders only the centred label for system verification.
 *
 * # Design constraints
 *
 * - Background must be transparent at every DOM level (enforced in Overlay.css).
 * - No pointer events — the overlay must never capture mouse input from the
 *   application running beneath it.
 * - No state, no hooks, no animations. Pure render only.
 */
function Overlay(): React.JSX.Element {
  return (
    <div className="overlay-root">
      <span className="overlay-label">EasyWheel Overlay</span>
    </div>
  );
}

export default Overlay;
