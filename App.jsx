// src/App.jsx
import React, { useEffect, useState, useRef } from "react";
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
import {
  collection,
  getDocs,
  doc,
  getDoc,
  setDoc,
  addDoc,
  onSnapshot,
  serverTimestamp,
} from "firebase/firestore";
import SoundBoard from "./components/SoundBoard";
import Chat from "./components/Chat";
import FichaPersonagem from "./components/FichaPersonagem";
import { BrowserRouter as Router, Routes, Route, Link } from "react-router-dom";
import BattleMap from "./components/BattleMap";
import { unlockAudio } from "./utils/audioUnlock";
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
      styleOverrides: {
        input: { color: "#ffffff" },
      },
    },
    MuiInputLabel: {
      styleOverrides: {
        root: { color: "#ffffff" },
      },
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

export default function App() {
  const [user, setUser] = useState(null);
  const [userNick, setUserNick] = useState("");
  const [role, setRole] = useState("");
  const [loadingAuth, setLoadingAuth] = useState(true);

  const [emailInput, setEmailInput] = useState("");
  const [passwordInput, setPasswordInput] = useState("");

  const [fichasList, setFichasList] = useState([]);
  const [selectedFichaEmail, setSelectedFichaEmail] = useState(null);
  const [createEmailInput, setCreateEmailInput] = useState("");

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (u) => {
      setUser(u || null);
      setLoadingAuth(false);
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
        } catch (err) {
          console.error("Erro ao buscar user doc:", err);
          setUserNick(u.email);
          setRole(u.email === MASTER_EMAIL ? "master" : "player");
        }

        if (u.email === MASTER_EMAIL) {
          carregarListaFichas();
        } else {
          setSelectedFichaEmail(u.email);
        }
      } else {
        setUserNick("");
        setRole("");
        setFichasList([]);
        setSelectedFichaEmail(null);
      }
    });

    return () => unsub();
  }, []);

  async function carregarListaFichas() {
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
  }

  async function handleLogin(e) {
    e.preventDefault();
    try {
      await signInWithEmailAndPassword(auth, emailInput, passwordInput);
      setEmailInput("");
      setPasswordInput("");
    } catch (err) {
      alert("Erro no login: " + err.message);
    }
  }

  async function handleLogout() {
    await signOut(auth);
    setUser(null);
    setUserNick("");
    setRole("");
    setFichasList([]);
    setSelectedFichaEmail(null);
  }

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
    pericias: {
      atletismo: 0,
      luta: 0,
      armaBranca: 0,
      armaDistancia: 0,
      furtividade: 0,
      sobrevivencia: 0,
      conhecimento: 0,
      medicina: 0,
      natureza: 0,
      percepcao: 0,
      investigacao: 0,
      labia: 0,
      performance: 0,
      intimidacao: 0,
      aura: 0,
    },
    habilidades: [],
    itens: {
      equipamento: [],
      vestes: [],
      diversos: [],
    },
    moedas: { cobre: 0, prata: 0, ouro: 0 },
    anotacoes: "",
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

  const [audioUnlocked, setAudioUnlocked] = useState(false);
  const musicRef = useRef(null);

  useEffect(() => {
    if (audioUnlocked && musicRef.current) {
      musicRef.current.play().catch(() => {});
    }
  }, [audioUnlocked]);

  function handleUnlockAudio() {
    unlockAudio().then(() => {
      setAudioUnlocked(true);
    });
  }

  // Home component separado (para evitar JSX gigante inline dentro de Route)
  function Home() {
    return (
      <ThemeProvider theme={theme}>
        {!audioUnlocked && (
          <Button
            onClick={handleUnlockAudio}
            variant="contained"
            sx={{
              position: "fixed",
              top: 20,
              right: 20,
              zIndex: 9999,
            }}
          >
            Ativar Áudio
          </Button>
        )}

        <audio ref={musicRef} src="/musicas/tema.mp3" loop />

        <CssBaseline />
        <Box sx={{ height: "100vh", p: 2 }}>
          <Grid container spacing={2} sx={{ height: "100%" }}>
            <Grid item xs={4} sx={{ height: "100%" }}>
              <Box sx={{ display: "flex", flexDirection: "column", gap: 2, height: "100%" }}>
                <Paper sx={{ p: 2 }}>
                  {!user ? (
                    <form onSubmit={handleLogin}>
                      <Typography variant="subtitle1" sx={{ mb: 1 }}>Entrar</Typography>
                      <TextField
                        label="E-mail"
                        fullWidth
                        size="small"
                        value={emailInput}
                        onChange={(e) => setEmailInput(e.target.value)}
                        sx={{ mb: 1 }}
                      />
                      <TextField
                        label="Senha"
                        fullWidth
                        size="small"
                        type="password"
                        value={passwordInput}
                        onChange={(e) => setPasswordInput(e.target.value)}
                        sx={{ mb: 1 }}
                      />
                      <Button variant="contained" type="submit">ENTRAR</Button>
                    </form>
                  ) : (
                    <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                      <Box>
                        <Typography variant="h6">Bem-vindo,</Typography>
                        <Typography variant="subtitle1">{userNick}</Typography>
                        <Typography variant="caption">{user?.email}</Typography>
                      </Box>
                      <IconButton color="inherit" onClick={handleLogout} title="Sair">
                        <LogoutIcon />
                      </IconButton>
                    </Box>
                  )}

                  {user && (
                    <Box sx={{ display: "flex", gap: 1, mt: 2 }}>
                      <Button
                        variant="contained"
                        component={Link}
                        to="/map"
                      >
                        Abrir Grid
                      </Button>

                      <Button
                        variant="contained"
                        component={Link}
                        to="/cronica"
                      >
                        Abrir Crônica
                      </Button>

                      <Button
                        variant="contained"
                        component={Link}
                        to="/sistema"
                      >
                        Abrir Sistema
                      </Button>
                    </Box>
                  )}
                </Paper>

                {user && <MesaRPG userNick={userNick} />}
                {user && <SoundBoard />}

                <Paper sx={{ flex: 1, overflow: "hidden" }}>
                  <Chat userNick={userNick || "Convidado"} userEmail={user?.email || null} />
                </Paper>
              </Box>
            </Grid>

            <Grid item xs={8} sx={{ height: "100%" }}>
              <Box sx={{ height: "100%", display: "flex", gap: 2 }}>
                {role === "master" && (
                  <Paper sx={{ width: "320px", p: 2, overflowY: "auto" }}>
                    <Typography variant="h6">Fichas</Typography>
                    <Divider sx={{ my: 1 }} />

                    {!user ? (
                      <Typography>Faça login para ver sua ficha.</Typography>
                    ) : (
                      <>
                        <Typography sx={{ mb: 1 }}>Lista de fichas (clique para abrir):</Typography>
                        <List dense>
                          {fichasList.length === 0 && <Typography>Nenhuma ficha criada.</Typography>}
                          {fichasList.map((fid) => (
                            <ListItem
                              key={fid}
                              button
                              selected={selectedFichaEmail === fid}
                              onClick={() => setSelectedFichaEmail(fid)}
                            >
                              <ListItemText primary={fid} />
                            </ListItem>
                          ))}
                        </List>
                        <Divider sx={{ my: 1 }} />
                        <Typography variant="subtitle2">Criar ficha para e-mail</Typography>
                        <TextField
                          label="E-mail do jogador"
                          fullWidth
                          size="small"
                          value={createEmailInput}
                          onChange={(e) => setCreateEmailInput(e.target.value)}
                          sx={{ mb: 1 }}
                        />
                        <Button variant="outlined" fullWidth onClick={() => criarFichaParaEmail(createEmailInput)}>
                          Criar ficha vazia
                        </Button>

                        <Button variant="text" sx={{ mt: 1 }} onClick={carregarListaFichas}>Atualizar lista</Button>
                        <SoundBoard isMaster={user?.email === MASTER_EMAIL} />
                      </>
                    )}
                  </Paper>
                )}

                <Box sx={{ flex: 1, overflowY: "auto" }}>
                  {user ? (
                    <FichaPersonagem
                      user={user}
                      fichaId={selectedFichaEmail}
                      isMestrAe={role === "master"}
                    />
                  ) : (
                    <Paper sx={{ p: 2 }}>
                      <Typography>Faça login para editar suas fichas.</Typography>
                    </Paper>
                  )}
                </Box>
              </Box>
            </Grid>
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
