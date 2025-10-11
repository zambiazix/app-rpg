// src/App.jsx
import React, { useEffect, useState, useCallback, memo } from "react";
import { ThemeProvider, createTheme } from "@mui/material/styles";
import {
  CssBaseline,
  Box,
  Grid,
  Paper,
  Button,
  TextField,
  Typography,
  List,
  ListItem,
  ListItemText,
  Divider,
  IconButton,
} from "@mui/material";
import LogoutIcon from "@mui/icons-material/Logout";

import { auth, db } from "./firebaseConfig";
import {
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
} from "firebase/auth";
import { collection, getDocs, doc, getDoc, setDoc } from "firebase/firestore";
import SoundBoard from "./components/SoundBoard";
import Chat from "./components/Chat";
import FichaPersonagem from "./components/FichaPersonagem";
import { BrowserRouter as Router, Routes, Route, Link } from "react-router-dom";
import BattleMap from "./components/BattleMap";
import AudioProvider from "./context/AudioProvider";
import VoiceProvider from "./context/VoiceProvider";
import MesaRPG from "./components/MesaRPG";
import MapaMundi from "./pages/MapaMundi";
import Sistema from "./pages/Sistema";

const theme = createTheme({
  palette: {
    mode: "dark",
    primary: { main: "#1976d2" },
    background: { default: "#121212", paper: "#1e1e1e" },
    text: { primary: "#ffffff" },
  },
  components: {
    MuiInputBase: {
      styleOverrides: { input: { color: "#ffffff" } },
    },
    MuiInputLabel: {
      styleOverrides: { root: { color: "#ffffff" } },
    },
    MuiTextField: {
      styleOverrides: {
        root: {
          "& .MuiInputBase-input": { color: "#fff" },
          "& .MuiInputLabel-root": { color: "#fff" },
        },
      },
    },
  },
});

const MASTER_EMAIL = "mestre@reqviemrpg.com";

// 🧩 Novo componente isolado para o login
const LoginForm = memo(function LoginForm({ onLogin }) {
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [erro, setErro] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    try {
      await signInWithEmailAndPassword(auth, email, senha);
      onLogin();
    } catch (err) {
      setErro("Email ou senha incorretos");
    }
  };

  return (
    <Paper sx={{ p: 3, m: "auto", maxWidth: 400, display: "flex", flexDirection: "row", alignItems: "center", gap: 2 }}>
      {/* Logo à esquerda */}
      <Box sx={{ flexShrink: 0 }}>
        <img
          src="/src/assets/logo.png"
          alt="Logo Réquiem RPG"
          style={{
            width: "80px",
            height: "80px",
            borderRadius: "50%",
            objectFit: "contain",
            boxShadow:
              "0 0 6px rgba(255,255,255,0.4), 0 0 10px rgba(255,255,255,0.2)",
          }}
        />
      </Box>

      {/* Área do formulário à direita */}
      <Box sx={{ flex: 1 }}>
        <Typography variant="h6" sx={{ mb: 2 }}>
          Fazer Login
        </Typography>
        {erro && <Typography color="error">{erro}</Typography>}
        <form onSubmit={handleSubmit}>
          <TextField
            label="E-mail"
            fullWidth
            size="small"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            sx={{ mb: 2 }}
          />
          <TextField
            label="Senha"
            fullWidth
            size="small"
            type="password"
            value={senha}
            onChange={(e) => setSenha(e.target.value)}
            sx={{ mb: 2 }}
          />
          <Button variant="contained" type="submit" fullWidth>
            Entrar
          </Button>
        </form>
      </Box>
    </Paper>
  );
});

export default function App() {
  const [user, setUser] = useState(null);
  const [userNick, setUserNick] = useState("");
  const [role, setRole] = useState("");
  const [fichasList, setFichasList] = useState([]);
  const [selectedFichaEmail, setSelectedFichaEmail] = useState(null);
  const [createEmailInput, setCreateEmailInput] = useState("");

  const carregarListaFichas = useCallback(async () => {
    try {
      const col = collection(db, "fichas");
      const snapshot = await getDocs(col);
      const list = snapshot.docs.map((d) => d.id);
      setFichasList(list);
      if (list.length > 0 && !selectedFichaEmail) {
        setSelectedFichaEmail(list[0]);
      }
    } catch (err) {
      console.error("Erro ao carregar lista de fichas:", err);
    }
  }, [selectedFichaEmail]);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (u) => {
      setUser(u || null);
      if (u) {
        try {
          const userDocRef = doc(db, "users", u.email);
          const userSnap = await getDoc(userDocRef);
          if (userSnap.exists()) {
            const data = userSnap.data();
            setUserNick(data.nick || u.email);
            setRole(data.role || (u.email === MASTER_EMAIL ? "master" : "player"));
          } else {
            setUserNick(u.email);
            setRole(u.email === MASTER_EMAIL ? "master" : "player");
          }

          if (u.email === MASTER_EMAIL) {
            carregarListaFichas();
          } else {
            setSelectedFichaEmail(u.email);
          }
        } catch (err) {
          console.error("Erro ao buscar user doc:", err);
          setUserNick(u.email);
          setRole(u.email === MASTER_EMAIL ? "master" : "player");
        }
      } else {
        setUserNick("");
        setRole("");
        setFichasList([]);
        setSelectedFichaEmail(null);
      }
    });
    return () => unsub();
  }, [carregarListaFichas]);

  const handleLogout = async () => {
    await signOut(auth);
    setUser(null);
    setUserNick("");
    setRole("");
    setFichasList([]);
    setSelectedFichaEmail(null);
  };

  const initialFichaBlank = {
    nome: "",
    genero: "",
    idade: "",
    altura: "",
    peso: "",
    movimentacao: "",
    defeitos: "",
    tracos: "",
    pontosVida: 0,
    pontosEnergia: 0,
    armadura: "0/25",
    caracteristicas: "",
    atributos: {
      forca: 1,
      destreza: 1,
      agilidade: 1,
      constituicao: 1,
      inteligencia: 1,
      vontade: 1,
    },
    pericias: {},
    habilidades: [],
    equipamentos: [],
    vestes: [],
    diversos: [],
    moedas: { cobre: 0, prata: 0, ouro: 0 },
    anotacoes: "",
    dono: user?.email || "",
  };

  async function criarFichaParaEmail(email) {
    if (!email) return alert("Digite um e-mail para criar a ficha.");
    try {
      await setDoc(doc(db, "fichas", email), initialFichaBlank);
      alert("Ficha criada para " + email);
      await carregarListaFichas();
      setSelectedFichaEmail(email);
    } catch (err) {
      console.error("Erro ao criar ficha:", err);
      alert("Erro ao criar ficha: " + err.message);
    }
  }

  function Home() {
    const isMaster = role === "master";

    return (
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <Box sx={{ height: "100vh", p: 2 }}>
          <Grid container sx={{ height: "100%", flexWrap: "nowrap" }}>
            {/* CHAT / LOGIN - 33% */}
            <Grid
              item
              sx={{
                flex: "1 1 33%",
                minWidth: 0,
                display: "flex",
                flexDirection: "column",
                borderRight: "1px solid rgba(255,255,255,0.08)",
              }}
            >
              {!user ? (
                <LoginForm onLogin={() => {}} />
              ) : (
                <>
                  <Paper sx={{ p: 2, flexShrink: 0 }}>
                    <Box
                      sx={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        mb: 2,
                      }}
                    >
                      <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
                        <img
                          src="/src/assets/logo.png"
                          alt="Logo Réquiem RPG"
                          style={{
                            width: "60px",
                            height: "60px",
                            borderRadius: "50%",
                            objectFit: "contain",
                            boxShadow:
                              "0 0 6px rgba(255,255,255,0.4), 0 0 10px rgba(255,255,255,0.2)",
                          }}
                        />
                        <Box>
                          <Typography variant="h6">Bem-vindo,</Typography>
                          <Typography variant="subtitle1">{userNick}</Typography>
                          <Typography variant="caption" display="block">
                            {user?.email}
                          </Typography>
                          <Typography
                            variant="caption"
                            sx={{
                              fontSize: "0.7rem",
                              color: "rgba(255,255,255,0.5)",
                              display: "block",
                            }}
                          >
                            Réquiem RPG — versão 2.0 - By: Zambiazi
                          </Typography>
                        </Box>
                      </Box>

                      <IconButton color="inherit" onClick={handleLogout} title="Sair">
                        <LogoutIcon />
                      </IconButton>
                    </Box>

                    <Box sx={{ display: "flex", justifyContent: "center", gap: 1.5 }}>
                      <Button variant="contained" component={Link} to="/map">
                        Grid
                      </Button>
                      <Button variant="contained" component={Link} to="/cronica">
                        Crônica
                      </Button>
                      <Button variant="contained" component={Link} to="/sistema">
                        Sistema
                      </Button>
                    </Box>
                  </Paper>

                  <Paper sx={{ p: 1, flexShrink: 0, mt: 2 }}>
                    <MesaRPG userNick={userNick} />
                  </Paper>

                  <Paper
                    sx={{
                      flex: 1,
                      display: "flex",
                      flexDirection: "column",
                      overflow: "hidden",
                      mt: 2,
                    }}
                  >
                    <Box sx={{ flex: 1, overflowY: "auto", minHeight: 0 }}>
                      <Chat userNick={userNick} userEmail={user?.email} />
                    </Box>
                  </Paper>
                </>
              )}
            </Grid>

            {/* ÁREA DE FICHAS */}
            {isMaster ? (
              <>
                <Grid
                  item
                  sx={{
                    flex: "1 1 25%",
                    minWidth: 0,
                    display: "flex",
                    flexDirection: "column",
                    borderRight: "1px solid rgba(255,255,255,0.08)",
                  }}
                >
                  <Paper sx={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
                    <Box sx={{ p: 2, borderBottom: "1px solid rgba(255,255,255,0.1)" }}>
                      <Typography variant="h6">Fichas</Typography>
                    </Box>
                    <Box sx={{ flex: 1, overflowY: "auto", p: 2 }}>
                      <Typography sx={{ mb: 1 }}>Lista de fichas:</Typography>
                      <List dense>
                        {fichasList.map((fid) => (
                          <ListItem
                            key={fid}
                            selected={selectedFichaEmail === fid}
                            onClick={() => setSelectedFichaEmail(fid)}
                            sx={{ cursor: "pointer" }}
                          >
                            <ListItemText primary={fid} />
                          </ListItem>
                        ))}
                      </List>
                      <Divider sx={{ my: 1 }} />
                      <Typography variant="subtitle2">Criar ficha</Typography>
                      <TextField
                        label="E-mail"
                        fullWidth
                        size="small"
                        value={createEmailInput}
                        onChange={(e) => setCreateEmailInput(e.target.value)}
                        sx={{ my: 1 }}
                      />
                      <Button
                        variant="outlined"
                        fullWidth
                        onClick={() => criarFichaParaEmail(createEmailInput)}
                      >
                        Criar ficha vazia
                      </Button>
                    </Box>
                    <Box sx={{ borderTop: "1px solid rgba(255,255,255,0.1)", p: 1 }}>
                      <SoundBoard isMaster={true} />
                    </Box>
                  </Paper>
                </Grid>

                <Grid
                  item
                  sx={{
                    flex: "1 1 42%",
                    minWidth: 0,
                    display: "flex",
                    flexDirection: "column",
                  }}
                >
                  <Paper sx={{ flex: 1, overflowY: "auto", p: 2 }}>
                    {user ? (
                      <FichaPersonagem user={user} fichaId={selectedFichaEmail} isMestre={true} />
                    ) : (
                      <Typography>Faça login para editar suas fichas.</Typography>
                    )}
                  </Paper>
                </Grid>
              </>
            ) : (
              <Grid
                item
                sx={{
                  flex: "1 1 67%",
                  minWidth: 0,
                  display: "flex",
                  flexDirection: "column",
                }}
              >
                <Paper sx={{ flex: 1, overflowY: "auto", p: 2 }}>
                  {user ? (
                    <FichaPersonagem user={user} fichaId={selectedFichaEmail} isMestre={false} />
                  ) : (
                    <Typography>Faça login para editar suas fichas.</Typography>
                  )}
                </Paper>
              </Grid>
            )}
          </Grid>
        </Box>
      </ThemeProvider>
    );
  }

  return (
    <AudioProvider>
      <VoiceProvider>
        <Router>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/map" element={<BattleMap />} />
            <Route path="/cronica" element={<MapaMundi />} />
            <Route path="/sistema" element={<Sistema />} />
          </Routes>
        </Router>
      </VoiceProvider>
    </AudioProvider>
  );
}
