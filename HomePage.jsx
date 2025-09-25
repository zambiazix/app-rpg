import React from "react";
import { Paper, Typography, Divider, List, ListItem, ListItemText, Button, TextField } from "@mui/material";
import FichaPersonagem from "../components/FichaPersonagem";

export default function HomePage({ user, role, fichasList, selectedFichaEmail, setSelectedFichaEmail, criarFichaParaEmail }) {
  return (
    <Paper sx={{ p: 2, flex: 1, overflowY: "auto" }}>
      <Typography variant="h6">Fichas</Typography>
      <Divider sx={{ my: 1 }} />
      {!user ? (
        <Typography>Faça login para ver sua ficha.</Typography>
      ) : role === "master" ? (
        <>
          <Typography sx={{ mb: 1 }}>Lista de fichas (clique para abrir):</Typography>
          <List dense>
            {fichasList.length === 0 && <Typography>Nenhuma ficha criada.</Typography>}
            {fichasList.map((fid) => (
              <ListItem
                key={fid}
                button
                selected={selectedFichaEmail === fid}
                onClick={() => setSelectedFichaEmail(fid)}
              >
                <ListItemText primary={fid} />
              </ListItem>
            ))}
          </List>
          <Divider sx={{ my: 1 }} />
          <Typography variant="subtitle2">Criar ficha para e-mail</Typography>
          <TextField
            label="E-mail do jogador"
            fullWidth
            size="small"
            onChange={(e) => setSelectedFichaEmail(e.target.value)}
            sx={{ mb: 1 }}
          />
          <Button variant="outlined" fullWidth onClick={() => criarFichaParaEmail(selectedFichaEmail)}>
            Criar ficha vazia
          </Button>
        </>
      ) : (
        <FichaPersonagem user={user} fichaId={selectedFichaEmail} isMestre={role === "master"} />
      )}
    </Paper>
  );
}
