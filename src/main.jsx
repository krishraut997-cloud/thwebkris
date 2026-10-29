import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App.jsx";
import "./index.css";

if (import.meta.env.DEV && window.location.hostname === "127.0.0.1") {
  const localhostUrl = new URL(window.location.href);
  localhostUrl.hostname = "localhost";
  window.location.replace(localhostUrl.toString());
} else {
  ReactDOM.createRoot(document.getElementById("root")).render(
    <React.StrictMode>
      <App />
    </React.StrictMode>,
  );
}
