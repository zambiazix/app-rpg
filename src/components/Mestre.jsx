import React, { useEffect, useState } from "react";
import {
  Card,
  CardContent,
  Typography,
  Button,
  List,
  ListItem,
  ListItemText
} from "@mui/material";
import { db } from "../firebaseConfig";
import { collection, getDocs } from "firebase/firestore";
import FichaPersonagem from "./FichaPersonagem";

export default function Mestre() {
  const [fichas, setFichas] = useState([]);
  const [fichaSelecionada, setFichaSelecionada] = useState(null);

  // Carrega todas as fichas ao abrir
  useEffect(() => {
    const carregarFichas = async () => {
      try {
        const ref = collection(db, "fichas");
        const snapshot = await getDocs(ref);
        const lista = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setFichas(lista);
      } catch (err) {
        console.error("Erro ao carregar fichas:", err);
      }
    };

    carregarFichas();
  }, []);

  return (
    <Card sx={{ margin: 2, padding: 2 }}>
      <CardContent>
        <Typography variant="h5" gutterBottom>
          Painel do Mestre
        </Typography>

        {fichaSelecionada ? (
          <div>
            <Button
              variant="outlined"
              sx={{ marginBottom: 2 }}
              onClick={() => setFichaSelecionada(null)}
            >
              Voltar
            </Button>

            {/* Abre a ficha do jogador para edição */}
            <FichaPersonagem userId={fichaSelecionada} isMestre={true} />
          </div>
        ) : (
          <List>
            {fichas.length === 0 && (
              <Typography variant="body1">Nenhuma ficha encontrada.</Typography>
            )}
            {fichas.map((f) => (
              <ListItem
                button
                key={f.id}
                onClick={() => setFichaSelecionada(f.id)}
              >
                <ListItemText
                  primary={f.nome || `Jogador ${f.id}`}
                  secondary={`Clique para editar`}
                />
              </ListItem>
            ))}
          </List>
        )}
      </CardContent>
    </Card>
  );
}
