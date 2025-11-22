// ★修正: BrowserRouter に戻す
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { Admin } from "./pages/Admin";
import { Viewer } from "./pages/Viewer";

export default function App() {
  return (
    // ★重要: basename を設定 (/smash)
    <BrowserRouter basename="/smash">
      <Routes>
        <Route path="/" element={<Admin />} />
        <Route path="/viewer" element={<Viewer />} />
      </Routes>
    </BrowserRouter>
  );
}