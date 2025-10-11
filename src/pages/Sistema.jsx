import React, { useState, useEffect } from "react";
import {
  Box,
  Button,
  Typography,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  IconButton,
} from "@mui/material";
import { useNavigate } from "react-router-dom";
import AddIcon from "@mui/icons-material/Add";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import { getAuth } from "firebase/auth";
import { db } from "../firebaseConfig";
import { doc, onSnapshot, setDoc, getDoc } from "firebase/firestore";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

const MESTRE_EMAIL = "mestre@reqviemrpg.com";

export default function Sistema() {
  const navigate = useNavigate();
  const auth = getAuth();
  const currentUser = auth.currentUser;
  const isMaster = currentUser?.email === MESTRE_EMAIL;

  // estados
  const [topicsLeft, setTopicsLeft] = useState([]);
  const [topicsRight, setTopicsRight] = useState([]);
  const [openDialog, setOpenDialog] = useState(false);
  const [editIndex, setEditIndex] = useState(null);
  const [side, setSide] = useState("left");
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");

  // 🔹 Carrega tópicos do Firestore e ouve atualizações em tempo real
  useEffect(() => {
    const unsub = onSnapshot(doc(db, "world", "Sistema"), (snap) => {
      if (snap.exists()) {
        const data = snap.data();
        setTopicsLeft(data.left || []);
        setTopicsRight(data.right || []);
      }
    });
    return () => unsub();
  }, []);

  // 🔹 Abre o modal
  const handleOpenDialog = (sideSel, index = null) => {
    setSide(sideSel);
    setEditIndex(index);
    if (index !== null) {
      const topic = sideSel === "left" ? topicsLeft[index] : topicsRight[index];
      setTitle(topic.title);
      setContent(topic.content);
    } else {
      setTitle("");
      setContent("");
    }
    setOpenDialog(true);
  };

  // 🔹 Salvar ou editar tópico (mestre)
  const handleSave = async () => {
    const newLeft = [...topicsLeft];
    const newRight = [...topicsRight];

    if (side === "left") {
      if (editIndex !== null) newLeft[editIndex] = { title, content };
      else newLeft.push({ title, content });
    } else {
      if (editIndex !== null) newRight[editIndex] = { title, content };
      else newRight.push({ title, content });
    }

    await setDoc(doc(db, "world", "Sistema"), { left: newLeft, right: newRight });
    setTopicsLeft(newLeft);
    setTopicsRight(newRight);
    setOpenDialog(false);
  };

  // 🔹 Deletar tópico (mestre)
  const handleDelete = async (sideSel, index) => {
    const newLeft = [...topicsLeft];
    const newRight = [...topicsRight];

    if (sideSel === "left") newLeft.splice(index, 1);
    else newRight.splice(index, 1);

    await setDoc(doc(db, "world", "Sistema"), { left: newLeft, right: newRight });
    setTopicsLeft(newLeft);
    setTopicsRight(newRight);
  };

  // 🔹 Renderiza coluna genérica
  const renderColumn = (sideSel, topics) => (
    <Box sx={{ display: "flex", flexDirection: "column", gap: 2, height: "100%" }}>
      {isMaster && (
        <Button
          variant="contained"
          color="primary"
          startIcon={<AddIcon />}
          onClick={() => handleOpenDialog(sideSel)}
        >
          Adicionar Tópico ({sideSel === "left" ? "Esquerda" : "Direita"})
        </Button>
      )}

      {topics.length === 0 && (
        <Typography sx={{ textAlign: "center", color: "#aaa" }}>
          Nenhum tópico nesta coluna.
        </Typography>
      )}

      {topics.map((t, i) => (
        <Box
          key={i}
          sx={{
            bgcolor: "#2a2a2a",
            borderRadius: 2,
            p: 2,
            position: "relative",
            overflowWrap: "break-word",
          }}
        >
          <Typography variant="h6">{t.title}</Typography>
          <Box sx={{ mt: 1 }}>
            <ReactMarkdown
              children={t.content}
              remarkPlugins={[remarkGfm]}
              components={{
                img: ({ ...props }) => (
                  <img
                    {...props}
                    style={{
                      maxWidth: "100%",
                      borderRadius: "8px",
                      marginTop: "8px",
                    }}
                  />
                ),
                video: ({ ...props }) => (
                  <video
                    {...props}
                    controls
                    style={{ maxWidth: "100%", borderRadius: "8px" }}
                  />
                ),
              }}
            />
          </Box>

          {isMaster && (
            <Box sx={{ position: "absolute", top: 8, right: 8 }}>
              <IconButton color="info" onClick={() => handleOpenDialog(sideSel, i)}>
                <EditIcon />
              </IconButton>
              <IconButton color="error" onClick={() => handleDelete(sideSel, i)}>
                <DeleteIcon />
              </IconButton>
            </Box>
          )}
        </Box>
      ))}
    </Box>
  );

  return (
    <Box
      sx={{
        bgcolor: "#1e1e1e",
        minHeight: "100vh",
        color: "#fff",
        display: "flex",
        flexDirection: "column",
        width: "100vw",
        overflowX: "hidden",
      }}
    >
      {/* topo */}
      <Box sx={{ p: 2 }}>
        <Button
          variant="contained"
          color="secondary"
          startIcon={<ArrowBackIcon />}
          onClick={() => navigate("/")}
          sx={{ mb: 3 }}
        >
          Voltar
        </Button>

        <Typography variant="h4" sx={{ mb: 3, textAlign: "center" }}>
          Sistema - Réquiem RPG
        </Typography>
      </Box>

      {/* corpo - duas colunas */}
      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: 2,
          px: 2,
          pb: 4,
          flex: 1,
          width: "100%",
          boxSizing: "border-box",
        }}
      >
        {renderColumn("left", topicsLeft)}
        {renderColumn("right", topicsRight)}
      </Box>

      {/* modal */}
      <Dialog
        open={openDialog}
        onClose={() => setOpenDialog(false)}
        fullWidth
        maxWidth="md"
      >
        <DialogTitle>
          {editIndex !== null ? "Editar Tópico" : "Novo Tópico"}
        </DialogTitle>
        <DialogContent>
          <TextField
            label="Título"
            fullWidth
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            sx={{ mb: 2 }}
          />
          <TextField
            label="Conteúdo (Markdown, emojis, imagens e vídeos suportados)"
            fullWidth
            multiline
            minRows={6}
            value={content}
            onChange={(e) => setContent(e.target.value)}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenDialog(false)}>Cancelar</Button>
          <Button variant="contained" onClick={handleSave}>
            Salvar
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
