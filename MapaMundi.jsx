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
import { getAuth } from "firebase/auth"; // Firebase Auth

const MESTRE_EMAIL = "mestre@reqviemrpg.com";

export default function MapaMundi() {
  const [svgContent, setSvgContent] = useState(localStorage.getItem("map_svg") || null);
  const [chapters, setChapters] = useState(JSON.parse(localStorage.getItem("map_chapters")) || []);
  const [openDialog, setOpenDialog] = useState(false);
  const [editIndex, setEditIndex] = useState(null);
  const [chapterTitle, setChapterTitle] = useState("");
  const [chapterText, setChapterText] = useState("");
  const [isMestre, setIsMestre] = useState(false);
  const svgHostRef = useRef(null);
  const panZoomRef = useRef(null);
  const navigate = useNavigate();

  // Verifica se o usuário logado é o mestre
  useEffect(() => {
    const auth = getAuth();
    const unsubscribe = auth.onAuthStateChanged((user) => {
      if (user?.email === MESTRE_EMAIL) {
        setIsMestre(true);
      } else {
        setIsMestre(false);
      }
    });
    return () => unsubscribe();
  }, []);

  // Renderiza o SVG com zoom/pan
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

  // Salva capítulos no localStorage
  useEffect(() => {
    localStorage.setItem("map_chapters", JSON.stringify(chapters));
  }, [chapters]);

  // Upload do mapa (somente mestre)
  const handleFileUpload = (e) => {
    if (!isMestre) return;
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (evt) => {
      setSvgContent(evt.target.result);
      localStorage.setItem("map_svg", evt.target.result);
    };
    reader.readAsText(file);
  };

  // Modal para adicionar/editar capítulos
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

  // Salvar capítulo novo ou editado
  const handleSaveChapter = () => {
    const newChapters = [...chapters];
    if (editIndex !== null) {
      newChapters[editIndex] = { title: chapterTitle, text: chapterText };
    } else {
      newChapters.push({ title: chapterTitle, text: chapterText });
    }
    setChapters(newChapters);
    setOpenDialog(false);
    setEditIndex(null);
  };

  // Excluir capítulo
  const handleDeleteChapter = (index) => {
    if (!isMestre) return;
    const newChapters = chapters.filter((_, i) => i !== index);
    setChapters(newChapters);
  };

  return (
    <Box sx={{ bgcolor: "#1e1e1e", minHeight: "100vh", color: "#fff", display: "flex", flexDirection: "column" }}>
      {/* Botões topo */}
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

      {/* Área do mapa */}
      <Box sx={{ bgcolor: "#2b2b2b", flex: 1, borderRadius: 1, overflow: "hidden", mx: 2 }}>
        {!svgContent && <Typography sx={{ color: "#bbb", p: 2 }}>Carregando mapa...</Typography>}
        <div ref={svgHostRef} style={{ width: "100%", height: "100%" }} />
      </Box>

      {/* Área da crônica */}
      <Box sx={{ bgcolor: "#2a2a2a", p: 2, mt: 2, borderRadius: 1, mx: 2, mb: 2, maxHeight: "300px", overflowY: "auto" }}>
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
              <Typography>{ch.text}</Typography>
            </AccordionDetails>
          </Accordion>
        ))}
      </Box>

      {/* Modal de capítulo */}
      <Dialog open={openDialog} onClose={() => setOpenDialog(false)} fullWidth maxWidth="sm">
        <DialogTitle>{editIndex !== null ? "Editar Capítulo" : "Novo Capítulo"}</DialogTitle>
        <DialogContent>
          <TextField
            label="Título"
            fullWidth
            value={chapterTitle}
            onChange={(e) => setChapterTitle(e.target.value)}
            sx={{ mb: 2 }}
          />
          <TextField
            label="Texto"
            fullWidth
            multiline
            minRows={4}
            value={chapterText}
            onChange={(e) => setChapterText(e.target.value)}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenDialog(false)}>Cancelar</Button>
          <Button variant="contained" onClick={handleSaveChapter}>
            Salvar
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
