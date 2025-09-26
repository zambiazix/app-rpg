// src/components/SoundControls.jsx
import React from "react";
import { doc, setDoc } from "firebase/firestore";
import { db } from "../firebaseConfig";
import { Button, Box, Typography } from "@mui/material";

const ROOM_ID = "mesa-rpg";

const sounds = [
  { name: "Fogueira", url: "https://example.com/fogueira.mp3" },
  { name: "Chuva", url: "https://example.com/chuva.mp3" },
  { name: "Taverna", url: "https://example.com/taverna.mp3" },
  { name: "Combate", url: "https://example.com/combate.mp3" },
];

export default function SoundControls() {
  async function playSound(sound) {
    await setDoc(doc(db, "rooms", ROOM_ID, "ambientSound"), {
      action: "play",
      url: sound.url,
      name: sound.name,
    });
  }

  async function stopSound() {
    await setDoc(doc(db, "rooms", ROOM_ID, "ambientSound"), { action: "stop" });
  }

  return (
    <Box sx={{ p: 2 }}>
      <Typography variant="h6">Sons Ambiente</Typography>
      <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap", mt: 1 }}>
        {sounds.map((s) => (
          <Button key={s.name} variant="outlined" onClick={() => playSound(s)}>
            {s.name}
          </Button>
        ))}
        <Button variant="contained" color="error" onClick={stopSound}>
          Parar
        </Button>
      </Box>
    </Box>
  );
}
