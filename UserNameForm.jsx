import { useState } from "react";
import { TextField, Button, Card, CardContent, Typography } from "@mui/material";

export default function UserNameForm({ onSetName }) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");

  const handleSubmit = (e) => {
    e.preventDefault();
    if (name.trim() && email.trim()) {
      onSetName(name, email);
    }
  };

  return (
    <Card style={{ maxWidth: 400, margin: "50px auto", textAlign: "center" }}>
      <CardContent>
        <Typography variant="h5" gutterBottom>
          Entrar no Jogo
        </Typography>
        <form onSubmit={handleSubmit}>
          <TextField
            label="Nome do Jogador"
            fullWidth
            margin="normal"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
          <TextField
            label="E-mail"
            type="email"
            fullWidth
            margin="normal"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <Button
            variant="contained"
            color="primary"
            type="submit"
            fullWidth
            style={{ marginTop: "20px" }}
          >
            Entrar
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
