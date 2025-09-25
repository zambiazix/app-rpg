import React, { useState, useEffect, useRef } from "react";
import {
  Paper,
  Typography,
  Button,
  List,
  ListItem,
  ListItemText,
  Divider,
  Box,
  Slider,
} from "@mui/material";
import { db } from "../firebaseConfig";
import { doc, setDoc, onSnapshot, serverTimestamp } from "firebase/firestore";
import { useAudio } from "../context/AudioProvider";

export default function SoundBoard({ isMaster }) {
  const [musicTracks, setMusicTracks] = useState([]);
  const [ambianceTracks, setAmbianceTracks] = useState([]);
  const [interactionAllowed, setInteractionAllowed] = useState(false);
  const [volumes, setVolumes] = useState({});
  const unsubRef = useRef(null);
  const saveTimeoutRef = useRef(null);

  // Funções globais do AudioProvider
  const { playMusic, pauseMusic, stopAllMusic, setVolume, getVolume, playingTracks, startVoice, stopVoice } = useAudio();

  // Carrega a lista de músicas e ambientes
  useEffect(() => {
    async function load() {
      try {
        let res = await fetch("/sounds.json");
        if (!res.ok) throw new Error("sounds.json não encontrado");
        const data = await res.json();
        const music = (data.music || []).map((f) => ({ name: stripExt(f), url: resolveUrl(f) }));
        const ambience = (data.ambience || []).map((f) => ({ name: stripExt(f), url: resolveUrl(f) }));
        setMusicTracks(music);
        setAmbianceTracks(ambience);
      } catch (err) {
        console.error("Erro carregando sounds.json:", err);
      }
    }
    load();
  }, []);

  function stripExt(filename) {
    return filename.replace(/^.*[\\/]/, "").replace(/\.[^/.]+$/, "");
  }

  function resolveUrl(file) {
    if (!file) return file;
    if (/^https?:\/\//i.test(file)) return file;
    if (file.startsWith("/")) return file;
    return `/${file}`;
  }

  function handleActivateAudio() {
    setInteractionAllowed(true);
  }

  // Sincronização com Firestore (opcional)
  useEffect(() => {
    try {
      unsubRef.current = onSnapshot(doc(db, "sound", "current"), (snap) => {
        const data = snap?.data?.() ?? snap?.data() ?? snap;
        if (!data) return;
        if (!isMaster) {
          // No futuro: poderíamos tocar músicas remotas aqui
        }
      });
    } catch {}
    return () => unsubRef.current && unsubRef.current();
  }, [isMaster]);

  function scheduleSaveState(newState) {
    if (!isMaster) return;
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    saveTimeoutRef.current = setTimeout(() => saveStateToFirestore(newState), 250);
  }

  async function saveStateToFirestore(state) {
    if (!isMaster) return;
    await setDoc(doc(db, "sound", "current"), { sounds: state, updatedAt: serverTimestamp() });
  }

  // Funções de controle
  function handlePlay(url) {
    playMusic(url);
    setVolumes((prev) => ({ ...prev, [url]: 100 })); // Volume inicial 100%
    scheduleSaveState([...playingTracks, url].map((u) => ({ url: u, playing: true })));
  }

  function handleStop(url) {
    pauseMusic(url);
    setVolumes((prev) => {
      const copy = { ...prev };
      delete copy[url]; // Remove volume da música parada
      return copy;
    });
    scheduleSaveState(playingTracks.filter((u) => u !== url).map((u) => ({ url: u, playing: true })));
  }

  function handleStopAll() {
    stopAllMusic();
    setVolumes({});
    scheduleSaveState([]);
  }

  function handleVolume(url, value) {
    setVolumes((prev) => ({ ...prev, [url]: value }));
    setVolume(url, value);
  }

  // Atualiza sliders quando tocar música ou alterar volumes
  useEffect(() => {
    const updated = {};
    playingTracks.forEach((url) => {
      updated[url] = Math.round((getVolume(url) ?? 1.0) * 100);
    });
    setVolumes((prev) => ({ ...prev, ...updated }));
  }, [playingTracks, getVolume]);

  // Renderiza lista de faixas
  function renderList(title, tracks) {
    return (
      <>
        <Typography variant="subtitle1" sx={{ mt: 1 }}>
          {title}
        </Typography>
        <List dense>
          {tracks.map((t, i) => {
            const playing = playingTracks.includes(t.url);
            const vol100 = volumes[t.url] ?? 100;
            return (
              <ListItem
                key={i}
                divider
                sx={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "flex-start",
                  gap: 1,
                }}
              >
                <ListItemText
                  primary={t.name}
                  primaryTypographyProps={{
                    sx: { whiteSpace: "normal", wordBreak: "break-word", textAlign: "left", width: "100%" },
                  }}
                />
                <Box sx={{ display: "flex", alignItems: "center", gap: 1, width: "100%", justifyContent: "space-between" }}>
                  {playing ? (
                    <Button variant="outlined" size="small" color="error" onClick={() => handleStop(t.url)}>
                      Parar
                    </Button>
                  ) : (
                    <Button variant="contained" size="small" onClick={() => handlePlay(t.url)}>
                      Play
                    </Button>
                  )}
                  <Box sx={{ flex: 1, ml: 1 }}>
                    <Slider
                      value={vol100}
                      onChange={(_, v) => handleVolume(t.url, Array.isArray(v) ? v[0] : v)}
                      aria-label="volume"
                      size="small"
                      min={0}
                      max={100}
                    />
                  </Box>
                </Box>
              </ListItem>
            );
          })}
        </List>
      </>
    );
  }

  if (!isMaster) return null;

  return (
    <Paper sx={{ p: 2, mt: 2, maxHeight: 420, overflowY: "auto" }}>
      <Typography variant="h6" sx={{ mb: 1 }}>
        🎵 Trilha Sonora
      </Typography>

      {!interactionAllowed ? (
        <Button variant="contained" color="primary" fullWidth sx={{ mb: 2 }} onClick={handleActivateAudio}>
          Ativar Áudio
        </Button>
      ) : (
        <>
          {renderList("🎶 Música", musicTracks)}
          <Divider sx={{ my: 1 }} />
          {renderList("🌲 Ambiente", ambianceTracks)}
          {playingTracks.length > 0 && (
            <Button variant="outlined" color="error" fullWidth sx={{ mt: 1 }} onClick={handleStopAll}>
              Parar Todos
            </Button>
          )}
          <Divider sx={{ my: 1 }} />
          <Button variant="contained" color="secondary" fullWidth sx={{ mt: 1 }} onClick={startVoice}>
            Iniciar Chamada de Voz
          </Button>
          <Button variant="outlined" color="secondary" fullWidth sx={{ mt: 1 }} onClick={stopVoice}>
            Encerrar Chamada de Voz
          </Button>
        </>
      )}
    </Paper>
  );
}
