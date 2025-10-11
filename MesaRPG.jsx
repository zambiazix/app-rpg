import React from "react";
import {
  Paper,
  Typography,
  Button,
  List,
  ListItem,
  Box,
} from "@mui/material";
import { useVoice } from "../context/VoiceProvider";
import { useAudio } from "../context/AudioProvider";

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
    localSocketId,
    avatars, // ✅ vindo do VoiceProvider
  } = useVoice() || {};

  const { unlockAudio } = useAudio() || {};

  // 🧩 fallback seguros
  const safeParticipants = Array.isArray(participants) ? participants : [];
  const safeRemoteStreams = Array.isArray(remoteStreams) ? remoteStreams : [];
  const safeSpeakingIds = speakingIds instanceof Set ? speakingIds : new Set();

  return (
    <Paper sx={{ p: 2, mb: 2 }}>
      <Typography variant="h6">Mesa RPG - Chat de Voz</Typography>

      {!inVoice ? (
        <Button
          variant="contained"
          onClick={() => {
            try {
              unlockAudio?.();
            } catch (err) {
              console.warn("unlockAudio falhou:", err);
            }
            try {
              startVoice?.();
            } catch (err) {
              console.error("Erro ao iniciar voz:", err);
            }
          }}
        >
          Entrar no Áudio
        </Button>
      ) : (
        <>
          <Button variant="outlined" color="error" onClick={leaveVoice}>
            Sair do Áudio
          </Button>
          <Button variant="contained" onClick={toggleLocalMute} sx={{ ml: 1 }}>
            {localMuted ? "Unmute" : "Mute"}
          </Button>
        </>
      )}

      <List>
        {safeParticipants.map((p) => {
          const isSpeaking = safeSpeakingIds.has(p.id);
          // ✅ pega avatar pela ID de socket
          const avatarSrc = p.avatar || avatars?.[p.id] || "";
          return (
            <ListItem key={p.id} sx={{ py: 1 }}>
              <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
                {/* avatar com anel que acende/pulsa quando falando */}
                <Box
                  sx={{
                    position: "relative",
                    width: 44,
                    height: 44,
                    flexShrink: 0,
                    "@keyframes voice-pulse": {
                      "0%": { boxShadow: "0 0 0 0 rgba(34,197,94,0.6)" },
                      "70%": { boxShadow: "0 0 0 8px rgba(34,197,94,0)" },
                      "100%": { boxShadow: "0 0 0 0 rgba(34,197,94,0)" },
                    },
                  }}
                >
                  <Box
                    sx={{
                      width: "100%",
                      height: "100%",
                      borderRadius: "50%",
                      padding: "2px",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      border: isSpeaking
                        ? "3px solid #22c55e"
                        : "3px solid transparent",
                      transition: "border-color 200ms, box-shadow 200ms",
                      boxShadow: isSpeaking
                        ? "0 0 12px rgba(34,197,94,0.45)"
                        : "none",
                      animation: isSpeaking ? "voice-pulse 1.6s infinite" : "none",
                    }}
                  >
                    {avatarSrc ? (
                      <img
                        src={avatarSrc}
                        alt={p.nick}
                        style={{
                          width: "100%",
                          height: "100%",
                          borderRadius: "50%",
                          objectFit: "cover",
                        }}
                      />
                    ) : (
                      <Box
                        sx={{
                          width: "100%",
                          height: "100%",
                          borderRadius: "50%",
                          bgcolor: "#24303a",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          color: "#fff",
                          fontWeight: "bold",
                        }}
                      >
                        {p.nick ? p.nick.charAt(0).toUpperCase() : "?"}
                      </Box>
                    )}
                  </Box>
                </Box>

                <Typography
                  sx={{
                    color: isSpeaking ? "white" : "gray",
                    fontWeight: isSpeaking ? "bold" : "normal",
                  }}
                >
                  {p.nick + (p.id === localSocketId ? " (Você)" : "")}
                </Typography>
              </Box>
            </ListItem>
          );
        })}
      </List>

      {safeRemoteStreams.map((r) => (
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
