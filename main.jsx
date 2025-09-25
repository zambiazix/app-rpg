import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App.jsx";
import "./index.css";
import AudioProvider from "./context/AudioProvider.jsx";  // <- Agora existe!
import VoiceProvider from "./context/VoiceProvider";

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <AudioProvider>
      <VoiceProvider>
        <App />
      </VoiceProvider>
    </AudioProvider>
  </React.StrictMode>
);
