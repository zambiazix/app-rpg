import React, { createContext, useContext, useRef, useState, useEffect } from "react";
import socket from "../socket";
import { doc, onSnapshot } from "firebase/firestore";
import { db } from "../firebaseConfig";

const AudioContextGlobal = createContext();
export const useAudio = () => useContext(AudioContextGlobal);

export default function AudioProvider({ children }) {
  // audioObjects: { url: { audio, sourceNode, volume } }
  const audioObjects = useRef({});
  const [playingTracks, setPlayingTracks] = useState([]);
  const pendingRef = useRef(new Set());
  const desiredVolumesRef = useRef({});
  const socketRef = useRef(socket);

  // AudioContext / destination (mix) / stream
  const audioCtxRef = useRef(null);
  const destinationRef = useRef(null);
  const musicStreamRef = useRef(null);

  // unlock gesture
  const [interactionAllowed, setInteractionAllowed] = useState(false);
  const unlockAudio = () => {
    if (interactionAllowed) return;
    setInteractionAllowed(true);
    const pend = Array.from(pendingRef.current);
    pendingRef.current.clear();
    pend.forEach((url) => _playLocal(url));
  };

  function ensureAudioContext() {
    if (!audioCtxRef.current) {
      try {
        const AudioCtx = window.AudioContext || window.webkitAudioContext;
        const ctx = new AudioCtx();
        const dest = ctx.createMediaStreamDestination();
        audioCtxRef.current = ctx;
        destinationRef.current = dest;
        musicStreamRef.current = dest.stream;
      } catch (e) {
        console.warn("Falha ao criar AudioContext:", e);
      }
    }
  }

  function _playLocal(url) {
    if (!url) return;
    // se usuário ainda não fez gesture
    if (!interactionAllowed) {
      pendingRef.current.add(url);
      return;
    }

    const existing = audioObjects.current[url];
    if (!existing) {
      ensureAudioContext();

      const audio = new Audio();
      audio.crossOrigin = "anonymous";
      audio.src = url;
      audio.loop = true;
      audio.preload = "auto";

      audio.addEventListener("error", (e) => {
        console.error("Audio error:", url, e, audio.error);
      });

      const vol = (desiredVolumesRef.current[url] ?? 100) / 100;
      audio.volume = vol;

      try {
        if (audioCtxRef.current) {
          const srcNode = audioCtxRef.current.createMediaElementSource(audio);
          try { srcNode.connect(audioCtxRef.current.destination); } catch {}
          if (destinationRef.current) {
            try { srcNode.connect(destinationRef.current); } catch (err) {
              console.warn("Erro conectar srcNode -> destination:", err);
            }
          }
          audioObjects.current[url] = { audio, sourceNode: srcNode, volume: vol };
        } else {
          audioObjects.current[url] = { audio, sourceNode: null, volume: vol };
        }
      } catch (e) {
        console.warn("Falha ao criar MediaElementSource (fallback):", e);
        audioObjects.current[url] = { audio, sourceNode: null, volume: vol };
      }

      audio.play().catch((err) => {
        console.warn("Audio play falhou para", url, err);
        pendingRef.current.add(url);
      });

      setPlayingTracks((prev) => (prev.includes(url) ? prev : [...prev, url]));
    } else {
      existing.audio.play().catch((err) => {
        console.warn("Erro ao dar play no existente:", err);
        pendingRef.current.add(url);
      });
      setPlayingTracks((prev) => (prev.includes(url) ? prev : [...prev, url]));
    }
  }

  const playMusic = (url) => {
    _playLocal(url);
    try {
      socketRef.current?.emit("play-music", url);
    } catch (e) {}
  };

  const pauseMusic = (url) => {
    if (!url) return;
    if (audioObjects.current[url]) {
      try {
        audioObjects.current[url].audio.pause();
        try { audioObjects.current[url].sourceNode?.disconnect?.(); } catch {}
      } catch (err) {
        console.warn("Erro pausar:", err);
      }
      delete audioObjects.current[url];
    }
    setPlayingTracks((prev) => prev.filter((u) => u !== url));
    pendingRef.current.delete(url);
  };

  const stopAllMusic = () => {
    Object.keys(audioObjects.current).forEach((url) => {
      try {
        audioObjects.current[url].audio.pause();
        audioObjects.current[url].audio.currentTime = 0;
        try { audioObjects.current[url].sourceNode?.disconnect?.(); } catch {}
      } catch (err) {}
    });
    audioObjects.current = {};
    setPlayingTracks([]);
    pendingRef.current.clear();
  };

  const setVolume = (url, value) => {
    desiredVolumesRef.current[url] = value;
    if (audioObjects.current[url]) {
      try {
        audioObjects.current[url].audio.volume = value / 100;
        audioObjects.current[url].volume = value / 100;
      } catch (err) {
        console.warn("Erro setVolume:", err);
      }
    }
  };

  const getVolume = (url) => {
    if (audioObjects.current[url]) return audioObjects.current[url].volume;
    if (desiredVolumesRef.current[url] != null) return desiredVolumesRef.current[url] / 100;
    return 1.0;
  };

  const getMusicStream = () => musicStreamRef.current || null;

  // voice local (apenas utilidade)
  const [voiceStream, setVoiceStream] = useState(null);
  const startVoice = async () => {
    try {
      // 🔒 Força permissão explícita (essencial para Brave/Chrome)
      await navigator.mediaDevices.getUserMedia({ audio: true });
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      setVoiceStream(stream);
    } catch (error) {
      alert("⚠️ Permita o acesso ao microfone para usar o chat de voz.");
      console.error("Erro ao acessar microfone (AudioProvider.startVoice):", error);
    }
  };
  const stopVoice = () => {
    voiceStream?.getTracks()?.forEach((t) => t.stop());
    setVoiceStream(null);
  };

  useEffect(() => {
    const s = socketRef.current;
    if (!s) return;

    const onPlay = (url) => {
      // 🔊 só toca se o usuário já interagiu
      if (!interactionAllowed) {
        console.warn("Usuário ainda não desbloqueou áudio. Esperando gesture...");
        pendingRef.current.add(url);
        return;
      }
      if (!audioObjects.current[url]) _playLocal(url);
    };
    const onStop = (url) => pauseMusic(url);
    const onStopAll = () => stopAllMusic();
    const onVolume = ({ url, value }) => setVolume(url, value);

    s.on("play-music", onPlay);
    s.on("stop-music", onStop);
    s.on("stop-all-music", onStopAll);
    s.on("volume-music", onVolume);

    s.on("connect", () => {
      console.log("Socket conectado (AudioProvider):", s.id);
    });

    s.on("disconnect", () => {
      console.log("Socket desconectado (AudioProvider)");
    });

    return () => {
      s.off("play-music", onPlay);
      s.off("stop-music", onStop);
      s.off("stop-all-music", onStopAll);
      s.off("volume-music", onVolume);
    };
  }, [interactionAllowed]);

  // Firestore: sincroniza estado persistente
  useEffect(() => {
    let unsub;
    try {
      unsub = onSnapshot(doc(db, "sound", "current"), (snap) => {
        const data = snap?.data?.() ?? snap;
        if (!data) return;
        const sounds = Array.isArray(data.sounds) ? data.sounds : [];
        const playing = sounds.filter((s) => s.playing).map((s) => s.url);

        Object.keys(audioObjects.current).forEach((url) => {
          if (!playing.includes(url)) pauseMusic(url);
        });

        playing.forEach((url) => {
          if (!Object.keys(audioObjects.current).includes(url)) _playLocal(url);
        });

        sounds.forEach((s) => {
          if (s.url && s.volume != null) setVolume(s.url, s.volume);
        });
      });
    } catch (err) {
      console.warn("Erro onSnapshot sound/current:", err);
    }
    return () => unsub && unsub();
  }, []);

  return (
    <AudioContextGlobal.Provider
      value={{
        playMusic,
        pauseMusic,
        stopAllMusic,
        setVolume,
        getVolume,
        startVoice,
        stopVoice,
        playingTracks,
        interactionAllowed,
        unlockAudio,
        socket: socketRef.current,
        getMusicStream,
        _internal: { audioCtxRef, destinationRef, musicStreamRef },
      }}
    >
      {children}
    </AudioContextGlobal.Provider>
  );
}
