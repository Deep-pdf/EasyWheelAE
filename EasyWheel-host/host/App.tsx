/**
 * App — Root application component.
 *
 * Renders the top-level shell of EasyWheel Host. In Phase 1 this displays
 * only the product name centred on screen as a structural sanity check.
 * Subsequent phases will introduce the tray lifecycle, hotkey listener,
 * and overlay window from this root.
 */
function App(): React.JSX.Element {
  return (
    <main
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        width: "100%",
        height: "100%",
      }}
    >
      <h1>EasyWheel Host</h1>
    </main>
  );
}

export default App;
