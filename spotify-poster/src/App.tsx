import { Routes, Route } from "react-router-dom";

import Login from "./pages/Login";
import Callback from "./pages/callback";
import Poster from "./pages/Poster";

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Login />} />
      <Route path="/callback" element={<Callback />} />
      <Route path="/poster" element={<Poster />} />
    </Routes>
  );
}