import React from "react";
import { Button, Box, Typography } from "@mui/material";
import { useVoice } from "../context/VoiceProvider";

export default function VoiceControls() {
  const { inCall, startCall, leaveCall, toggleMute, participants } = useVoice();

  return (
    <Box sx={{ p: 2, border: "1px solid #ccc", borderRadius: 2, mt: 2 }}>
      <Typography variant="h6">🎙 Chat de Voz</Typography>
      {!inCall ? (
        <Button variant="contained" color="primary" onClick={startCall} sx={{ mt: 1 }}>
          Entrar na Chamada
        </Button>
      ) : (
        <>
          <Button variant="outlined" color="error" onClick={leaveCall} sx={{ mt: 1, mr: 1 }}>
            Sair da Chamada
          </Button>
          <Button variant="contained" color="secondary" onClick={toggleMute} sx={{ mt: 1 }}>
            Mute / Unmute
          </Button>
        </>
      )}

      {inCall && (
        <Box sx={{ mt: 2 }}>
          <Typography variant="subtitle1">Participantes:</Typography>
          {participants.length === 0 && <Typography>Ninguém mais na chamada</Typography>}
          {participants.map((p, i) => (
            <Typography key={i}>{p.nick || `Participante ${i + 1}`}</Typography>
          ))}
        </Box>
      )}
    </Box>
  );
}
