import React from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import App from "./App"; // Your existing App component
import Admin from "./Admin"; // Your Admin component
import "./styles.css"; // Assuming global styles

const rootElement = document.getElementById("root");
const root = createRoot(rootElement);

root.render(
  <BrowserRouter>
    <Routes>
      {/* Main App routes */}
      <Route path="/" element={<App />} />
      <Route path="/feedback" element={<App />} />{" "}
      {/* Assuming App handles this */}
      {/* Admin route */}
      <Route path="/admin" element={<Admin />} />
    </Routes>
  </BrowserRouter>
);
