import React, { useState } from "react";
import { Box, Button, Typography, Dialog, DialogTitle, DialogContent, DialogActions, TextField, IconButton } from "@mui/material";
import { useNavigate } from "react-router-dom";
import AddIcon from "@mui/icons-material/Add";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import { getAuth } from "firebase/auth";

const MESTRE_EMAIL = "mestre@reqviemrpg.com";

export default function Sistema() {
  const navigate = useNavigate();
  const auth = getAuth();
  const currentUser = auth.currentUser;
  const isMaster = currentUser?.email === MESTRE_EMAIL;

  const [topics, setTopics] = useState(JSON.parse(localStorage.getItem("sistema_topics")) || []);
  const [openDialog, setOpenDialog] = useState(false);
  const [editIndex, setEditIndex] = useState(null);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");

  // Abrir modal
  const handleOpenDialog = (index = null) => {
    setEditIndex(index);
    if (index !== null) {
      setTitle(topics[index].title);
      setContent(topics[index].content);
    } else {
      setTitle("");
      setContent("");
    }
    setOpenDialog(true);
  };

  // Salvar tópico
  const handleSave = () => {
    const updated = [...topics];
    if (editIndex !== null) {
      updated[editIndex] = { title, content };
    } else {
      updated.push({ title, content });
    }
    setTopics(updated);
    localStorage.setItem("sistema_topics", JSON.stringify(updated));
    setOpenDialog(false);
  };

  // Deletar tópico
  const handleDelete = (index) => {
    const updated = topics.filter((_, i) => i !== index);
    setTopics(updated);
    localStorage.setItem("sistema_topics", JSON.stringify(updated));
  };

  return (
    <Box sx={{ bgcolor: "#1e1e1e", minHeight: "100vh", color: "#fff", p: 3 }}>
      {/* Botão voltar */}
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
        Sistema - Reqviem RPG
      </Typography>

      {/* Botão adicionar só para Mestre */}
      {isMaster && (
        <Button
          variant="contained"
          color="primary"
          startIcon={<AddIcon />}
          onClick={() => handleOpenDialog()}
          sx={{ mb: 3 }}
        >
          Adicionar Tópico
        </Button>
      )}

      {/* Lista de tópicos */}
      {topics.length === 0 && (
        <Typography sx={{ textAlign: "center", mt: 4, color: "#aaa" }}>
          Nenhum tópico adicionado ainda.
        </Typography>
      )}

      {topics.map((t, i) => (
        <Box
          key={i}
          sx={{
            bgcolor: "#2a2a2a",
            borderRadius: 2,
            p: 2,
            mb: 2,
            position: "relative",
          }}
        >
          <Typography variant="h6">{t.title}</Typography>
          <Typography sx={{ mt: 1 }}>{t.content}</Typography>

          {isMaster && (
            <Box sx={{ position: "absolute", top: 8, right: 8 }}>
              <IconButton color="info" onClick={() => handleOpenDialog(i)}>
                <EditIcon />
              </IconButton>
              <IconButton color="error" onClick={() => handleDelete(i)}>
                <DeleteIcon />
              </IconButton>
            </Box>
          )}
        </Box>
      ))}

      {/* Modal de edição */}
      <Dialog open={openDialog} onClose={() => setOpenDialog(false)} fullWidth maxWidth="sm">
        <DialogTitle>{editIndex !== null ? "Editar Tópico" : "Novo Tópico"}</DialogTitle>
        <DialogContent>
          <TextField
            label="Título"
            fullWidth
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            sx={{ mb: 2 }}
          />
          <TextField
            label="Conteúdo"
            fullWidth
            multiline
            minRows={4}
            value={content}
            onChange={(e) => setContent(e.target.value)}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenDialog(false)}>Cancelar</Button>
          <Button variant="contained" onClick={handleSave}>Salvar</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
