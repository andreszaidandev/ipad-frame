import { Routes, Route } from "react-router-dom";

import Login from "./pages/Login";
import Callback from "./pages/Callback";
import Frame from "./pages/Frame";

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Login />} />
      <Route path="/callback" element={<Callback />} />
      <Route path="/poster" element={<Frame />} />
    </Routes>
  );
}