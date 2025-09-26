import React, { createContext, useContext, useRef, useState } from "react";

const AudioContextGlobal = createContext();
export const useAudio = () => useContext(AudioContextGlobal);

export default function AudioProvider({ children }) {
  const audioObjects = useRef({}); // Mantém objetos de áudio fora do React
  const [playingTracks, setPlayingTracks] = useState([]); // Apenas URLs das músicas tocando

  // --- Tocar música ---
  const playMusic = (url) => {
    if (!audioObjects.current[url]) {
      const audio = new Audio(url);
      audio.loop = true;
      audio.volume = 1.0;
      audio.play();
      audioObjects.current[url] = { audio, volume: 1.0 };
    } else {
      audioObjects.current[url].audio.play();
    }

    setPlayingTracks((prev) => (prev.includes(url) ? prev : [...prev, url]));
  };

  // --- Parar música específica ---
  const pauseMusic = (url) => {
    if (audioObjects.current[url]) {
      audioObjects.current[url].audio.pause();
      setPlayingTracks((prev) => prev.filter((u) => u !== url));
    }
  };

  // --- Parar todas ---
  const stopAllMusic = () => {
    Object.values(audioObjects.current).forEach(({ audio }) => {
      audio.pause();
      audio.currentTime = 0;
    });
    audioObjects.current = {};
    setPlayingTracks([]);
  };

  // --- Alterar volume ---
  const setVolume = (url, value) => {
    if (audioObjects.current[url]) {
      const vol = value / 100;
      audioObjects.current[url].audio.volume = vol;
      audioObjects.current[url].volume = vol;
    }
  };

  // --- Pegar volume atual ---
  const getVolume = (url) => {
    return audioObjects.current[url]?.volume ?? 1.0;
  };

  // --- Chamada de voz ---
  const [voiceStream, setVoiceStream] = useState(null);

  const startVoice = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      setVoiceStream(stream);
    } catch (error) {
      console.error("Erro ao acessar microfone", error);
    }
  };

  const stopVoice = () => {
    if (voiceStream) {
      voiceStream.getTracks().forEach((track) => track.stop());
      setVoiceStream(null);
    }
  };

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
      }}
    >
      {children}
    </AudioContextGlobal.Provider>
  );
}
