import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App";
import Tracker from "kpi-tracker-vandiem";


Tracker.init({
  apiKey: "kpi_0a60d682d45f4131a2a6c21fa5355eb6",
  serverUrl: "https://api-analytics-backend.onrender.com" // Endpoint backend API
});

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>
);
