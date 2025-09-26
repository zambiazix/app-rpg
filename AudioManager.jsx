// src/components/AudioManager.jsx
import React, { useEffect, useRef, useState } from "react";
import { doc, onSnapshot } from "firebase/firestore";
import { db } from "../firebaseConfig";

const ROOM_ID = "mesa-rpg";

export default function AudioManager() {
  const [soundInfo, setSoundInfo] = useState(null);
  const audioRef = useRef(null);

  useEffect(() => {
    const unsub = onSnapshot(doc(db, "rooms", ROOM_ID, "ambientSound"), (snap) => {
      if (snap.exists()) setSoundInfo(snap.data());
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    if (!audioRef.current) return;
    if (!soundInfo) {
      audioRef.current.pause();
      return;
    }
    if (soundInfo.action === "play" && soundInfo.url) {
      audioRef.current.src = soundInfo.url;
      audioRef.current.loop = true;
      audioRef.current.play().catch(() => {});
    } else if (soundInfo.action === "stop") {
      audioRef.current.pause();
    }
  }, [soundInfo]);

  return <audio ref={audioRef} autoPlay />;
}
