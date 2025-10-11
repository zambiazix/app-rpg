// src/components/SoundBoard.jsx
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

// O SoundBoard continua visível apenas para o mestre (isMaster)
// Os eventos de play/stop/volume são enviados via socket.io (AudioProvider)

export default function SoundBoard({ isMaster }) {
  const [musicTracks, setMusicTracks] = useState([]);
  const [ambianceTracks, setAmbianceTracks] = useState([]);
  const [volumes, setVolumes] = useState({});
  const unsubRef = useRef(null);
  const saveTimeoutRef = useRef(null);

  const {
    playMusic,
    pauseMusic,
    stopAllMusic,
    setVolume,
    getVolume,
    playingTracks,
    socket,
  } = useAudio();

  // Carrega a lista de músicas do sounds.json
  useEffect(() => {
    async function load() {
      try {
        let res = await fetch("/sounds.json");
        if (!res.ok) throw new Error("sounds.json não encontrado");
        const data = await res.json();
        const music = (data.music || []).map((f) => ({
          name: stripExt(f),
          url: resolveUrl(f),
        }));
        const ambience = (data.ambience || []).map((f) => ({
          name: stripExt(f),
          url: resolveUrl(f),
        }));
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

  // 🔧 URLs absolutas sempre (garante compatibilidade localhost e Render)
  function resolveUrl(file) {
    if (!file) return file;
    if (/^https?:\/\//i.test(file)) return file;
    return `${window.location.origin}/${file.replace(/^\//, "")}`;
  }

  // Mestre: tocar música → emite para todos
  function handlePlay(url) {
    playMusic(url);
    setVolumes((prev) => ({ ...prev, [url]: 100 }));
    try {
      socket?.emit?.("play-music", url);
    } catch (err) {
      console.warn("Socket emitir play-music falhou:", err);
    }
    scheduleSaveState(
      [...new Set([...playingTracks, url])].map((u) => ({
        url: u,
        playing: true,
        volume: volumes[u] ?? 100,
      }))
    );
  }

  function handleStop(url) {
    pauseMusic(url);
    setVolumes((prev) => {
      const copy = { ...prev };
      delete copy[url];
      return copy;
    });
    try {
      socket?.emit?.("stop-music", url);
    } catch (err) {
      console.warn("Socket emitir stop-music falhou:", err);
    }
    scheduleSaveState(
      playingTracks
        .filter((u) => u !== url)
        .map((u) => ({ url: u, playing: true, volume: volumes[u] ?? 100 }))
    );
  }

  function handleStopAll() {
    stopAllMusic();
    setVolumes({});
    try {
      socket?.emit?.("stop-all-music");
    } catch (err) {
      console.warn("Socket emitir stop-all-music falhou:", err);
    }
    scheduleSaveState([]);
  }

  function handleVolume(url, value) {
    setVolume(url, value);
    setVolumes((prev) => ({ ...prev, [url]: value }));
    try {
      socket?.emit?.("volume-music", { url, value });
    } catch (err) {
      console.warn("Socket emitir volume-music falhou:", err);
    }
    scheduleSaveState(
      playingTracks.map((u) => ({
        url: u,
        playing: true,
        volume: u === url ? value : volumes[u] ?? 100,
      }))
    );
  }

  // Firestore (mantém estado sincronizado para quem entra depois)
  useEffect(() => {
    try {
      unsubRef.current = onSnapshot(doc(db, "sound", "current"), (snap) => {
        const data = snap?.data?.() ?? snap;
        if (!data) return;
      });
    } catch {}
    return () => unsubRef.current && unsubRef.current();
  }, []);

  function scheduleSaveState(newState) {
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    saveTimeoutRef.current = setTimeout(
      () => saveStateToFirestore(newState),
      250
    );
  }

  async function saveStateToFirestore(state) {
    await setDoc(doc(db, "sound", "current"), {
      sounds: state,
      updatedAt: serverTimestamp(),
    });
  }

  // Atualiza sliders quando playingTracks muda
  useEffect(() => {
    const updated = {};
    playingTracks.forEach((url) => {
      updated[url] = Math.round((getVolume(url) ?? 1.0) * 100);
    });
    setVolumes((prev) => ({ ...prev, ...updated }));
  }, [playingTracks, getVolume]);

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
                <ListItemText primary={t.name} />
                <Box
                  sx={{
                    display: "flex",
                    alignItems: "center",
                    gap: 1,
                    width: "100%",
                    justifyContent: "space-between",
                  }}
                >
                  {playing ? (
                    <Button
                      variant="outlined"
                      size="small"
                      color="error"
                      onClick={() => handleStop(t.url)}
                    >
                      Parar
                    </Button>
                  ) : (
                    <Button
                      variant="contained"
                      size="small"
                      onClick={() => handlePlay(t.url)}
                    >
                      Play
                    </Button>
                  )}
                  <Box sx={{ flex: 1, ml: 1 }}>
                    <Slider
                      value={vol100}
                      onChange={(_, v) =>
                        handleVolume(t.url, Array.isArray(v) ? v[0] : v)
                      }
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

      {renderList("🎶 Música", musicTracks)}
      <Divider sx={{ my: 1 }} />
      {renderList("🌲 Ambiente", ambianceTracks)}

      {playingTracks.length > 0 && (
        <Button
          variant="outlined"
          color="error"
          fullWidth
          sx={{ mt: 1 }}
          onClick={handleStopAll}
        >
          Parar Todos
        </Button>
      )}
    </Paper>
  );
}
