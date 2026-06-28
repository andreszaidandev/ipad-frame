import { Routes, Route } from "react-router-dom";

import Callback from "./pages/Callback";
import Frame from "./pages/Frame";

export default function App() {
  return (
    <Routes>
      {/* The frame (poster + whiteboard) is the app. Login isn't a gate — the
          poster page prompts for Spotify itself, so the whiteboard is usable
          without ever signing in. */}
      <Route path="/" element={<Frame />} />
      <Route path="/poster" element={<Frame />} />
      <Route path="/callback" element={<Callback />} />
    </Routes>
  );
}