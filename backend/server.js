// server.js
const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const cors = require("cors");

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: "*" } });

// Habilita CORS para todas rotas (incluindo upload e arquivos estáticos)
app.use(cors());

// Pasta uploads
const uploadsDir = path.join(__dirname, "uploads");
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir);

// multer (preserva extensão do arquivo)
const upload = multer({
  storage: multer.diskStorage({
    destination: (req, file, cb) => cb(null, uploadsDir),
    filename: (req, file, cb) => {
      const ext = path.extname(file.originalname);
      cb(null, `${Date.now()}${ext}`);
    },
  }),
});

// Servir arquivos estáticos e garantir header CORS para imagens
app.use("/uploads", express.static(uploadsDir, {
  setHeaders: (res /*, path, stat */) => {
    res.setHeader("Access-Control-Allow-Origin", "*");
  }
}));

// arquivo persistente para tokens
const TOKENS_FILE = path.join(__dirname, "tokens.json");
function loadTokens() {
  try {
    const raw = fs.readFileSync(TOKENS_FILE, "utf8");
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed;
  } catch {
    return [];
  }
}
function saveTokens(tokens) {
  try {
    fs.writeFileSync(TOKENS_FILE, JSON.stringify(tokens, null, 2), "utf8");
  } catch (e) {
    console.error("Erro salvando tokens:", e);
  }
}
let tokens = loadTokens();

// util simples de validação
function isValidToken(t) {
  return t && (typeof t.id !== "undefined") && typeof t.src === "string" && t.src.length > 0;
}

// upload endpoint
app.post("/upload", upload.single("file"), (req, res) => {
  if (!req.file) return res.status(400).json({ error: "Nenhum arquivo enviado" });

  const fileUrl = `${req.protocol}://${req.get("host")}/uploads/${req.file.filename}`;
  return res.json({ url: fileUrl });
});

// socket.io
io.on("connection", (socket) => {
  console.log("Novo jogador conectado:", socket.id);
  // envia tokens atuais ao conectar
  socket.emit("init", tokens);

  socket.on("addToken", (token) => {
    if (!isValidToken(token)) {
      console.warn("addToken: token inválido recebido", token);
      return;
    }
    // evita duplicata
    if (tokens.find(t => t.id === token.id)) return;
    tokens.push(token);
    saveTokens(tokens);
    io.emit("addToken", token);
  });

  socket.on("updateToken", (token) => {
    if (!isValidToken(token)) {
      console.warn("updateToken: token inválido recebido", token);
      return;
    }
    tokens = tokens.map((t) => (t.id === token.id ? token : t));
    saveTokens(tokens);
    io.emit("updateToken", token);
  });

  socket.on("reorder", (newTokens) => {
    if (!Array.isArray(newTokens) || !newTokens.every(isValidToken)) {
      console.warn("reorder: payload inválido, ignorando");
      return;
    }
    tokens = newTokens;
    saveTokens(tokens);
    io.emit("reorder", tokens);
  });

  socket.on("deleteToken", (id) => {
    tokens = tokens.filter((t) => t.id !== id);
    saveTokens(tokens);
    io.emit("deleteToken", id);
  });

  // Recebe o sinal de voz e repassa para todos os outros
socket.on("voice-signal", (data) => {
  socket.broadcast.emit("voice-signal", data);
  });

// Recebe o comando de música e envia para todos
socket.on("play-music", (url) => {
  io.emit("play-music", url);
  });
  socket.on("disconnect", () => console.log("Jogador saiu:", socket.id));
});

server.listen(5000, () => console.log("Servidor rodando em http://localhost:5000"));
