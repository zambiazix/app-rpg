import { useState } from "react";
import { Box, TextField, Button } from "@mui/material";

export default function MestreImagens() {
  const [media, setMedia] = useState([]);

  const addMedia = (url) => {
    if (!url) return;
    setMedia([...media, url]);
  };

  let input = "";

  return (
    <Box>
      <Box sx={{ display: "flex", gap: 1, mb: 2 }}>
        <TextField fullWidth size="small" placeholder="Cole o link da imagem ou vídeo" onChange={(e)=>input=e.target.value} />
        <Button variant="contained" onClick={() => addMedia(input)}>Adicionar</Button>
      </Box>
      <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap" }}>
        {media.map((m, i) => (
          m.endsWith(".mp4") || m.includes("youtube") ? (
            <video key={i} src={m} width="150" controls />
          ) : (
            <img key={i} src={m} alt="media" width="150" />
          )
        ))}
      </Box>
    </Box>
  );
}
