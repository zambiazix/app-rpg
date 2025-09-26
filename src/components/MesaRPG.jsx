import React from "react";
import { Paper, Typography, Button, List, ListItem, Box } from "@mui/material";
import { useVoice } from "../context/VoiceProvider";
import { unlockAudio } from "../utils/audioUnlock";

export default function MesaRPG({ userNick }) {
  const {
    inVoice,
    participants,
    remoteStreams,
    localMuted,
    speakingIds,
    startVoice,
    leaveVoice,
    toggleLocalMute,
  } = useVoice();

  return (
    <Paper sx={{ p: 2, mb: 2 }}>
      <Typography variant="h6">Mesa RPG - Chat de Voz</Typography>
      {!inVoice ? (
        <Button
          variant="contained"
          onClick={() => {
            unlockAudio();
            startVoice(userNick);
          }}
        >
          Entrar no Áudio
        </Button>
      ) : (
        <>
          <Button variant="outlined" color="error" onClick={leaveVoice}>
            Sair do Áudio
          </Button>
          <Button variant="contained" onClick={toggleLocalMute}>
            {localMuted ? "Unmute" : "Mute"}
          </Button>
        </>
      )}

      <List>
        {participants.map((p) => (
          <ListItem key={p.id}>
            <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
              <Box
                sx={{
                  width: 10,
                  height: 10,
                  borderRadius: "50%",
                  bgcolor: speakingIds.has(p.id) ? "green" : "gray",
                }}
              />
              <Typography
                sx={{
                  color: speakingIds.has(p.id) ? "white" : "gray",
                  fontWeight: speakingIds.has(p.id) ? "bold" : "normal",
                }}
              >
                {p.nick + (p.id === "me" ? " (Você)" : "")}
              </Typography>
            </Box>
          </ListItem>
        ))}
      </List>

      {remoteStreams.map((r) => (
        <RemoteAudio key={r.id} stream={r.stream} />
      ))}
    </Paper>
  );
}

function RemoteAudio({ stream }) {
  const ref = React.useRef();
  React.useEffect(() => {
    if (ref.current) ref.current.srcObject = stream;
  }, [stream]);
  return <audio ref={ref} autoPlay playsInline />;
}
