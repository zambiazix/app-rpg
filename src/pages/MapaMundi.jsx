import React, { useState, useRef, useEffect } from "react";
import svgPanZoom from "svg-pan-zoom";
import {
  Box,
  Button,
  Typography,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  TextField,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  IconButton,
} from "@mui/material";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import AddIcon from "@mui/icons-material/Add";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";
import { useNavigate } from "react-router-dom";
import { getAuth } from "firebase/auth";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { db } from "../firebaseConfig";
import { doc, getDoc, setDoc, onSnapshot } from "firebase/firestore";
import LZString from "lz-string";

const MESTRE_EMAIL = "mestre@reqviemrpg.com";
const CHUNK_SIZE = 800000; // 800KB por parte

export default function MapaMundi() {
  const [svgContent, setSvgContent] = useState(null);
  const [chapters, setChapters] = useState([]);
  const [openDialog, setOpenDialog] = useState(false);
  const [editIndex, setEditIndex] = useState(null);
  const [chapterTitle, setChapterTitle] = useState("");
  const [chapterText, setChapterText] = useState("");
  const [isMestre, setIsMestre] = useState(false);

  const svgHostRef = useRef(null);
  const panZoomRef = useRef(null);
  const navigate = useNavigate();

  // 🔹 Verifica se o usuário logado é o mestre
  useEffect(() => {
    const auth = getAuth();
    const unsub = auth.onAuthStateChanged((user) => {
      setIsMestre(user?.email === MESTRE_EMAIL);
    });
    return () => unsub();
  }, []);

  // 🔹 Ouve atualizações do mapa (partes)
  useEffect(() => {
    const unsub = onSnapshot(doc(db, "world", "MapaMundi"), async (docSnap) => {
      if (!docSnap.exists()) return;

      const data = docSnap.data();
      const parts = Object.keys(data)
        .filter((k) => k.startsWith("part_"))
        .sort((a, b) => parseInt(a.split("_")[1]) - parseInt(b.split("_")[1]))
        .map((k) => data[k]);

      const compressed = parts.join("");
      try {
        const decompressed = LZString.decompressFromUTF16(compressed);
        setSvgContent(decompressed);
      } catch (err) {
        console.error("Erro ao descompactar mapa:", err);
      }
    });
    return () => unsub();
  }, []);

  // 🔹 Ouve capítulos em tempo real
  useEffect(() => {
    const unsub = onSnapshot(doc(db, "world", "Chapters"), (docSnap) => {
      if (docSnap.exists()) {
        setChapters(docSnap.data().list || []);
      }
    });
    return () => unsub();
  }, []);

  // 🔹 Renderiza o SVG com zoom/pan
  useEffect(() => {
    if (panZoomRef.current) {
      panZoomRef.current.destroy();
      panZoomRef.current = null;
    }

    const host = svgHostRef.current;
    if (!host || !svgContent) return;

    host.innerHTML = svgContent;
    const svgEl = host.querySelector("svg");
    if (!svgEl) return;

    panZoomRef.current = svgPanZoom(svgEl, {
      zoomEnabled: true,
      controlIconsEnabled: true,
      fit: true,
      center: true,
      minZoom: 0.2,
      maxZoom: 40,
    });
  }, [svgContent]);

  // 🔹 Upload do mapa (compactado e dividido)
  const handleFileUpload = async (e) => {
    if (!isMestre) return;
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (evt) => {
      const svgData = evt.target.result.trim();

      try {
        const compressed = LZString.compressToUTF16(svgData);
        const chunks = [];

        for (let i = 0; i < compressed.length; i += CHUNK_SIZE) {
          chunks.push(compressed.substring(i, i + CHUNK_SIZE));
        }

        const docData = {};
        chunks.forEach((chunk, idx) => {
          docData[`part_${idx + 1}`] = chunk;
        });

        await setDoc(doc(db, "world", "MapaMundi"), docData);

        console.log(`Mapa salvo com ${chunks.length} partes compactadas.`);
      } catch (err) {
        console.error("Erro ao salvar mapa:", err);
      }
    };

    reader.readAsText(file);
  };

  // 🔹 Modal de capítulos
  const handleOpenDialog = (index = null) => {
    if (!isMestre) return;
    setEditIndex(index);
    if (index !== null) {
      setChapterTitle(chapters[index].title);
      setChapterText(chapters[index].text);
    } else {
      setChapterTitle("");
      setChapterText("");
    }
    setOpenDialog(true);
  };

  // 🔹 Salvar ou editar capítulo
  const handleSaveChapter = async () => {
    const newChapters = [...chapters];
    if (editIndex !== null) {
      newChapters[editIndex] = { title: chapterTitle, text: chapterText };
    } else {
      newChapters.push({ title: chapterTitle, text: chapterText });
    }
    setChapters(newChapters);
    await setDoc(doc(db, "world", "Chapters"), { list: newChapters });
    setOpenDialog(false);
    setEditIndex(null);
  };

  // 🔹 Deletar capítulo
  const handleDeleteChapter = async (index) => {
    if (!isMestre) return;
    const newChapters = chapters.filter((_, i) => i !== index);
    setChapters(newChapters);
    await setDoc(doc(db, "world", "Chapters"), { list: newChapters });
  };

  return (
    <Box sx={{ bgcolor: "#1e1e1e", minHeight: "100vh", color: "#fff", display: "flex", flexDirection: "column" }}>
      {/* 🔹 Botões topo */}
      <Box sx={{ p: 2, textAlign: "center" }}>
        <Button variant="contained" color="secondary" onClick={() => navigate("/")}>
          Voltar para Início
        </Button>

        {isMestre && (
          <Button component="label" variant="contained" color="primary" sx={{ ml: 2 }}>
            Upload Mapa
            <input type="file" hidden onChange={handleFileUpload} />
          </Button>
        )}
      </Box>

      {/* 🔹 Área do mapa */}
      <Box sx={{ bgcolor: "#2b2b2b", flex: 1, borderRadius: 1, overflow: "hidden", mx: 2 }}>
        {!svgContent && (
          <Typography sx={{ color: "#bbb", p: 2 }}>Nenhum mapa carregado.</Typography>
        )}
        <div ref={svgHostRef} style={{ width: "100%", height: "100%" }} />
      </Box>

      {/* 🔹 Crônica */}
      <Box sx={{ bgcolor: "#2a2a2a", p: 2, mt: 2, borderRadius: 1, mx: 2, mb: 2, maxHeight: "350px", overflowY: "auto" }}>
        <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 2 }}>
          <Typography variant="h6">Crônica</Typography>
          {isMestre && (
            <IconButton color="success" onClick={() => handleOpenDialog()}>
              <AddIcon />
            </IconButton>
          )}
        </Box>

        {chapters.map((ch, i) => (
          <Accordion key={i} sx={{ bgcolor: "#333", color: "#fff", mb: 1 }}>
            <AccordionSummary expandIcon={<ExpandMoreIcon sx={{ color: "#fff" }} />}>
              <Typography sx={{ flex: 1 }}>{ch.title}</Typography>
              {isMestre && (
                <>
                  <IconButton size="small" color="info" onClick={() => handleOpenDialog(i)}>
                    <EditIcon />
                  </IconButton>
                  <IconButton size="small" color="error" onClick={() => handleDeleteChapter(i)}>
                    <DeleteIcon />
                  </IconButton>
                </>
              )}
            </AccordionSummary>
            <AccordionDetails>
              <Box sx={{ whiteSpace: "pre-wrap", wordBreak: "break-word" }}>
                <ReactMarkdown
                  children={ch.text}
                  remarkPlugins={[remarkGfm]}
                  components={{
                    img: ({ ...props }) => (
                      <img {...props} style={{ maxWidth: "100%", borderRadius: "8px", marginTop: "8px" }} />
                    ),
                    video: ({ ...props }) => (
                      <video {...props} controls style={{ maxWidth: "100%", borderRadius: "8px" }} />
                    ),
                  }}
                />
              </Box>
            </AccordionDetails>
          </Accordion>
        ))}
      </Box>

      {/* 🔹 Modal de capítulo */}
      <Dialog open={openDialog} onClose={() => setOpenDialog(false)} fullWidth maxWidth="sm">
        <DialogTitle>{editIndex !== null ? "Editar Capítulo" : "Novo Capítulo"}</DialogTitle>
        <DialogContent>
          <TextField label="Título" fullWidth value={chapterTitle} onChange={(e) => setChapterTitle(e.target.value)} sx={{ mb: 2 }} />
          <TextField
            label="Texto (Markdown, emojis, imagens e vídeos suportados)"
            fullWidth
            multiline
            minRows={6}
            value={chapterText}
            onChange={(e) => setChapterText(e.target.value)}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenDialog(false)}>Cancelar</Button>
          <Button variant="contained" onClick={handleSaveChapter}>Salvar</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
