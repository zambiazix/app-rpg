// Chat.jsx
import React, { useEffect, useRef, useState } from "react";
import {
  Box,
  Button,
  IconButton,
  Input,
  TextField,
  List,
  ListItem,
  ListItemText,
  Typography,
  Paper,
} from "@mui/material";
import ImageIcon from "@mui/icons-material/Image";
import SendIcon from "@mui/icons-material/Send";
import GifBoxIcon from "@mui/icons-material/GifBox";
import { db } from "../firebaseConfig";
import {
  collection,
  addDoc,
  serverTimestamp,
  query,
  orderBy,
  onSnapshot,
} from "firebase/firestore";

const GIPHY_API_KEY = "PBsoFISvy4OFVTNfZbpB5yF79ODJyTsc"; // substitua aqui

export default function Chat({ userNick, userEmail }) {
  const [text, setText] = useState("");
  const [messages, setMessages] = useState([]);
  const [filePreview, setFilePreview] = useState(null);
  const [gifs, setGifs] = useState([]);
  const [gifQuery, setGifQuery] = useState("");
  const [showGifPanel, setShowGifPanel] = useState(false);
  const endRef = useRef(null);
  const chatCol = collection(db, "chat");

  useEffect(() => {
    const q = query(chatCol, orderBy("timestamp", "asc"));
    const unsub = onSnapshot(q, (snap) => {
      setMessages(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  function tryParseDice(cmd) {
    const m = cmd.trim().match(/^(\d*)d(\d+)([+-]\d+)?$/i);
    if (!m) return null;
    const num = m[1] === "" ? 1 : parseInt(m[1], 10);
    const sides = parseInt(m[2], 10);
    const mod = m[3] ? parseInt(m[3], 10) : 0;
    const rolls = [];
    let total = 0;
    for (let i = 0; i < Math.max(1, num); i++) {
      const r = Math.floor(Math.random() * sides) + 1;
      rolls.push(r);
      total += r;
    }
    total += mod;
    const expr = `${num}d${sides}${mod ? (mod > 0 ? `+${mod}` : `${mod}`) : ""}`;
    return { expr, rolls, total };
  }

  // === Função para redimensionar e comprimir imagem ===
  async function compressImage(file, maxSize = 800, quality = 0.7) {
    return new Promise((resolve) => {
      const img = new Image();
      const reader = new FileReader();
      reader.onload = (e) => {
        img.src = e.target.result;
      };
      img.onload = () => {
        const canvas = document.createElement("canvas");
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > maxSize) {
            height = (height * maxSize) / width;
            width = maxSize;
          }
        } else {
          if (height > maxSize) {
            width = (width * maxSize) / height;
            height = maxSize;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        ctx.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL("image/jpeg", quality));
      };
      reader.readAsDataURL(file);
    });
  }

  async function sendMessage(e) {
    e?.preventDefault();
    if (!text && !filePreview) return;

    // rolagem de dados
    const dice = tryParseDice(text);
    if (dice) {
      await addDoc(chatCol, {
        userNick,
        userEmail,
        type: "dice",
        text: `${dice.expr} => [${dice.rolls.join(", ")}] = ${dice.total}`,
        timestamp: serverTimestamp(),
      });
      setText("");
      setFilePreview(null);
      return;
    }

    // imagem enviada do PC
    if (filePreview) {
      await addDoc(chatCol, {
        userNick,
        userEmail,
        type: "image",
        text: filePreview,
        timestamp: serverTimestamp(),
      });
      setFilePreview(null);
      return;
    }

    // links e conteúdo
    let type = "text";
    if (text.startsWith("http")) {
      if (text.match(/\.(mp4|webm|ogg)$/i)) {
        type = "video";
      } else if (text.match(/\.(jpg|jpeg|png|gif|bmp|webp|avif|tiff)$/i)) {
        type = "image";
      } else if (text.includes("youtube.com") || text.includes("youtu.be")) {
        type = "youtube";
      } else {
        try {
          const head = await fetch(text, { method: "HEAD" });
          const ct = head.headers.get("Content-Type") || "";
          if (ct.startsWith("image/")) {
            type = "image";
          } else {
            type = "link";
          }
        } catch {
          type = "link";
        }
      }
    }

    await addDoc(chatCol, {
      userNick,
      userEmail,
      type,
      text,
      timestamp: serverTimestamp(),
    });
    setText("");
  }

  async function handleFileChange(e) {
    const f = e.target.files && e.target.files[0];
    if (!f) return;
    const compressed = await compressImage(f); // Compressão antes do preview
    setFilePreview(compressed);
    e.target.value = null;
  }

  async function searchGifs(qs) {
    if (!qs || GIPHY_API_KEY === "YOUR_GIPHY_API_KEY") {
      setGifs([]);
      return;
    }
    try {
      const res = await fetch(
        `https://api.giphy.com/v1/gifs/search?api_key=${GIPHY_API_KEY}&q=${encodeURIComponent(qs)}&limit=12&rating=pg-13&lang=pt`
      );
      const j = await res.json();
      setGifs(j.data || []);
    } catch (err) {
      console.error("Giphy erro", err);
      setGifs([]);
    }
  }

  async function sendGif(url) {
    await addDoc(chatCol, {
      userNick,
      userEmail,
      type: "gif",
      text: url,
      timestamp: serverTimestamp(),
    });
    setShowGifPanel(false);
    setGifs([]);
    setGifQuery("");
  }

  async function quickRoll(sides) {
    const r = Math.floor(Math.random() * sides) + 1;
    await addDoc(chatCol, {
      userNick,
      userEmail,
      type: "dice",
      text: `1d${sides} => [${r}] = ${r}`,
      timestamp: serverTimestamp(),
    });
  }

  return (
    <Paper elevation={2} sx={{ height: "100%", display: "flex", flexDirection: "column", p: 1 }}>
      <Typography variant="h6" sx={{ mb: 1 }}>Chat</Typography>

      <Box sx={{ flex: 1, overflowY: "auto", mb: 1 }}>
        <List>
          {messages.map((m) => (
            <ListItem key={m.id} alignItems="flex-start">
              <ListItemText
                primary={<strong>{m.userNick}</strong>}
                secondary={
                  <>
                    {m.type === "image" && <img src={m.text} alt="img" style={{ maxWidth: 240 }} />}
                    {m.type === "gif" && <img src={m.text} alt="gif" style={{ maxWidth: 240 }} />}
                    {m.type === "video" && <video controls src={m.text} style={{ maxWidth: 240 }} />}
                    {m.type === "youtube" && (
                      <iframe
                        width="240"
                        height="135"
                        src={m.text.replace("watch?v=", "embed/")}
                        frameBorder="0"
                        allowFullScreen
                        title="YouTube"
                      ></iframe>
                    )}
                    {m.type === "link" && <a href={m.text} target="_blank" rel="noreferrer">{m.text}</a>}
                    {m.type === "dice" && <Typography>{m.text}</Typography>}
                    {m.type === "text" && <Typography>{m.text}</Typography>}
                  </>
                }
              />
            </ListItem>
          ))}
          <div ref={endRef} />
        </List>
      </Box>

      {filePreview && (
        <Box sx={{ mb: 1 }}>
          <Typography variant="caption">Pré-visualização</Typography>
          <Box>
            <img src={filePreview} alt="preview" style={{ maxWidth: 200 }} />
            <Button onClick={() => setFilePreview(null)} color="error">Remover</Button>
          </Box>
        </Box>
      )}

      <Box component="form" onSubmit={sendMessage} sx={{ display: "flex", gap: 1 }}>
        <TextField
          placeholder='Mensagem ou "1d20+3"'
          value={text}
          onChange={(e) => setText(e.target.value)}
          size="small"
          fullWidth
        />
        <IconButton component="label">
          <ImageIcon />
          <input hidden type="file" accept="image/*" onChange={handleFileChange} />
        </IconButton>
        <IconButton color={showGifPanel ? "primary" : "default"} onClick={() => setShowGifPanel((s) => !s)}>
          <GifBoxIcon />
        </IconButton>
        <Button type="submit" variant="contained" endIcon={<SendIcon />}>Enviar</Button>
      </Box>

      <Box sx={{ mt: 1, display: "flex", gap: 1 }}>
        <Button variant="outlined" onClick={() => quickRoll(10)}>D10</Button>
      </Box>

      {showGifPanel && (
        <Paper elevation={1} sx={{ mt: 1, p: 1 }}>
          <Box sx={{ display: "flex", gap: 1, mb: 1 }}>
            <Input placeholder="Buscar GIFs" value={gifQuery} onChange={(e) => setGifQuery(e.target.value)} />
            <Button onClick={() => searchGifs(gifQuery)}>Buscar</Button>
          </Box>
          <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1 }}>
            {gifs.map((g) => {
              const url = g.images?.downsized_medium?.url || g.images?.fixed_width?.url;
              return <img key={g.id} src={url} alt={g.title} style={{ width: 110, cursor: "pointer" }} onClick={() => sendGif(url)} />;
            })}
            {gifs.length === 0 && <Typography variant="caption">Digite algo e clique em "Buscar".</Typography>}
          </Box>
        </Paper>
      )}
    </Paper>
  );
}
