import React from "react";
import { Outlet } from "react-router-dom";
import { Box, Grid, Paper } from "@mui/material";
import MesaRPG from "../components/MesaRPG";
import SoundBoard from "../components/SoundBoard";
import Chat from "../components/Chat";

export default function MainLayout({ user, userNick, role }) {
  return (
    <Box sx={{ height: "100vh", p: 2 }}>
      <Grid container spacing={2} sx={{ height: "100%" }}>
        {/* Coluna esquerda: mesa, som e chat */}
        <Grid item xs={4} sx={{ height: "100%" }}>
          <Box sx={{ display: "flex", flexDirection: "column", gap: 2, height: "100%" }}>
            {user && <MesaRPG userNick={userNick} />}
            {user && <SoundBoard isMaster={role === "master"} />}
            <Paper sx={{ flex: 1, overflow: "hidden" }}>
              <Chat userNick={userNick || "Convidado"} userEmail={user?.email || null} />
            </Paper>
          </Box>
        </Grid>

        {/* Coluna direita: conteúdo que muda conforme a rota */}
        <Grid item xs={8} sx={{ height: "100%" }}>
          <Box sx={{ height: "100%", display: "flex", flexDirection: "column", gap: 2 }}>
            <Outlet />
          </Box>
        </Grid>
      </Grid>
    </Box>
  );
}
