// src/socket.js
import { io } from "socket.io-client";

const URL =
  import.meta.env.MODE === "production"
    ? import.meta.env.VITE_SERVER_URL_PROD || "https://app-rpg.onrender.com"
    : import.meta.env.VITE_SERVER_URL || "http://localhost:5000";

const socket = io(URL, {
  transports: ["websocket"],
  withCredentials: true,
});

export default socket;
