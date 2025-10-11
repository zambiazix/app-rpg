// src/components/FichaPersonagem.jsx
import React, { useEffect, useState } from "react";
import {
  Box,
  Button,
  Grid,
  Paper,
  TextField,
  Typography,
  Slider,
  IconButton,
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import DeleteIcon from "@mui/icons-material/Delete";
import { db } from "../firebaseConfig";
import { doc, getDoc, setDoc } from "firebase/firestore";

export default function FichaPersonagem({ user, fichaId, isMestre }) {
  const [ficha, setFicha] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [mostrarBackground, setMostrarBackground] = useState(false);

  const modelo = {
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
    imagemPersonagem: "",
    background: "",

    atributos: {
      forca: 0,
      destreza: 0,
      agilidade: 0,
      constituicao: 0,
      inteligencia: 0,
      vontade: 0,
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
    moedas: { cobre: 0, prata: 0, ouro: 0 },
    equipamentos: [],
    vestes: [],
    diversos: [],
    anotacoes: "",
    dono: user?.email || "",
  };

  const LABELS = {
    titulo: "● FICHA RPG RÉQUIEM ●",
    atributosTitulo: "● ATRIBUTOS ●",
    periciasTitulo: "● PERÍCIAS ●",
    habilidadesTitulo: "● HABILIDADES AURANAS ●",
    itensTitulo: "● ITENS ●",
    anotacoesTitulo: "● ANOTAÇÕES ●",
    backgroundTitulo: "● BACKGROUND ●",
  };

  // Mapeamento textual com acentos e espaços bonitos
  const LABEL_MAP = {
    // Campos principais
    nome: "Nome",
    genero: "Gênero",
    idade: "Idade",
    altura: "Altura",
    peso: "Peso",
    movimentacao: "Movimentação",
    defeitos: "Defeitos",
    tracos: "Traços",
    pontosVida: "Pontos de Vida",
    pontosEnergia: "Pontos de Energia",
    armadura: "Armadura",
    caracteristicas: "Características",
    imagemPersonagem: "Imagem do Personagem",
    background: "História do Personagem",
    anotacoes: "Anotações",

    // Atributos
    forca: "Força",
    destreza: "Destreza",
    agilidade: "Agilidade",
    constituicao: "Constituição",
    inteligencia: "Inteligência",
    vontade: "Vontade",

    // Perícias
    atletismo: "Atletismo",
    luta: "Luta",
    armaBranca: "Arma Branca",
    armaDistancia: "Arma à Distância",
    furtividade: "Furtividade",
    sobrevivencia: "Sobrevivência",
    conhecimento: "Conhecimento",
    medicina: "Medicina",
    natureza: "Natureza",
    percepcao: "Percepção",
    investigacao: "Investigação",
    labia: "Lábia",
    performance: "Performance",
    intimidacao: "Intimidação",
    aura: "Aura",

    // Itens e outros
    equipamentos: "Equipamentos",
    vestes: "Vestuário",
    diversos: "Diversos",
    moedas: "Moedas",
    cobre: "Cobre",
    prata: "Prata",
    ouro: "Ouro",
  };

  useEffect(() => {
    let mounted = true;
    async function carregar() {
      setLoading(true);
      try {
        if (!fichaId) {
          if (mounted) setFicha({ ...modelo });
          return;
        }
        const ref = doc(db, "fichas", fichaId);
        const snap = await getDoc(ref);
        if (snap.exists()) {
          const dados = snap.data();
          const combinado = {
            ...modelo,
            ...dados,
            atributos: { ...modelo.atributos, ...(dados.atributos || {}) },
            pericias: { ...modelo.pericias, ...(dados.pericias || {}) },
            habilidades: Array.isArray(dados.habilidades)
              ? dados.habilidades
              : [],
            moedas: { ...modelo.moedas, ...(dados.moedas || {}) },
            equipamentos: Array.isArray(dados.equipamentos)
              ? dados.equipamentos
              : [],
            vestes: Array.isArray(dados.vestes) ? dados.vestes : [],
            diversos: Array.isArray(dados.diversos) ? dados.diversos : [],
          };
          if (mounted) setFicha(combinado);
        } else {
          await setDoc(ref, modelo);
          if (mounted) setFicha({ ...modelo });
        }
      } catch (err) {
        console.error("Erro carregar ficha:", err);
        if (mounted) setFicha({ ...modelo });
      } finally {
        if (mounted) setLoading(false);
      }
    }
    carregar();
    return () => (mounted = false);
  }, [fichaId]);

  function setCampo(chave, valor) {
    setFicha((p) => ({ ...p, [chave]: valor }));
  }
  function setSubCampo(obj, chave, valor) {
    setFicha((p) => ({ ...p, [obj]: { ...p[obj], [chave]: valor } }));
  }

  function adicionarHabilidade() {
    setFicha((p) => ({
      ...p,
      habilidades: [
        ...(p.habilidades || []),
        { nome: "", descricao: "", condicoes: "", limitacoes: "" },
      ],
    }));
  }
  function atualizarHabilidade(i, campo, valor) {
    setFicha((p) => {
      const arr = [...(p.habilidades || [])];
      arr[i] = { ...arr[i], [campo]: valor };
      return { ...p, habilidades: arr };
    });
  }
  function removerHabilidade(i) {
    setFicha((p) => ({
      ...p,
      habilidades: p.habilidades.filter((_, idx) => idx !== i),
    }));
  }

  function adicionarItem(tipo) {
    setFicha((p) => ({
      ...p,
      [tipo]: [
        ...(p[tipo] || []),
        { quantidade: 1, nome: "", durabilidade: 100 },
      ],
    }));
  }

  function atualizarItem(tipo, i, campo, valor) {
    setFicha((p) => {
      const arr = [...(p[tipo] || [])];
      arr[i] = { ...arr[i], [campo]: valor };
      return { ...p, [tipo]: arr };
    });
  }
  function removerItem(tipo, i) {
    setFicha((p) => ({
      ...p,
      [tipo]: p[tipo].filter((_, idx) => idx !== i),
    }));
  }

  async function salvarFicha() {
    if (!fichaId) return alert("FichaId inválido.");
    setSaving(true);
    try {
      const ref = doc(db, "fichas", fichaId);
      const toSave = {
        ...ficha,
        atributos: Object.fromEntries(
          Object.entries(ficha.atributos || {}).map(([k, v]) => [k, Number(v || 0)])
        ),
        pericias: Object.fromEntries(
          Object.entries(ficha.pericias || {}).map(([k, v]) => [k, Number(v || 0)])
        ),
        moedas: {
          cobre: Number(ficha.moedas?.cobre || 0),
          prata: Number(ficha.moedas?.prata || 0),
          ouro: Number(ficha.moedas?.ouro || 0),
        },
      };
      await setDoc(ref, toSave, { merge: true });
      alert("Ficha salva com sucesso!");
    } catch (err) {
      console.error(err);
      alert("Erro ao salvar.");
    } finally {
      setSaving(false);
    }
  }

  async function handleUploadImagem(e) {
    const file = e.target.files?.[0];
    if (!file) return;

    let apiBase = "";
    try {
      apiBase = import.meta?.env?.VITE_SERVER_URL || "";
    } catch {
      apiBase = "";
    }

    if (!apiBase) {
      apiBase =
        window.location.hostname === "localhost"
          ? "http://localhost:5000"
          : "https://app-rpg.onrender.com";
    }

    const fd = new FormData();
    fd.append("file", file);
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000);

    try {
      const res = await fetch(`${apiBase}/upload`, {
        method: "POST",
        body: fd,
        signal: controller.signal,
      });
      clearTimeout(timeoutId);
      if (!res.ok) throw new Error(await res.text());
      const data = await res.json();
      if (!data?.url) throw new Error("Sem URL de retorno");
      setCampo("imagemPersonagem", data.url);
      await salvarFicha();
    } catch (err) {
      alert(`Erro no upload: ${err.message}`);
    }
  }

  if (loading)
    return (
      <Box p={2}>
        <Typography>Carregando ficha...</Typography>
      </Box>
    );

  return (
    <Paper sx={{ p: 2, bgcolor: "#07121a", color: "#fff", height: "100%", overflowY: "auto" }}>
      <Typography variant="h5" gutterBottom>{LABELS.titulo}</Typography>

      <Grid container spacing={2}>
        <Grid item xs={12} md={9}>
          <Grid container spacing={2}>
            <Grid item xs={12} md={6}>
              {["nome", "genero", "idade", "altura", "peso", "movimentacao"].map((campo) => (
                <Box key={campo} sx={{ mb: 1 }}>
                  <Typography>{LABEL_MAP[campo] || campo}</Typography>
                  <TextField fullWidth size="small" value={ficha[campo]} onChange={(e) => setCampo(campo, e.target.value)} />
                </Box>
              ))}
            </Grid>
            <Grid item xs={12} md={6}>
              {["defeitos", "tracos", "pontosVida", "pontosEnergia", "armadura", "caracteristicas"].map((campo) => (
                <Box key={campo} sx={{ mb: 1 }}>
                  <Typography>{LABEL_MAP[campo] || campo}</Typography>
                  <TextField
                    fullWidth size="small"
                    value={ficha[campo]}
                    type={["pontosVida", "pontosEnergia"].includes(campo) ? "number" : "text"}
                    onChange={(e) => setCampo(campo, e.target.value)}
                  />
                </Box>
              ))}
            </Grid>
          </Grid>

          <Box mt={2}>
            <Typography>{LABELS.atributosTitulo}</Typography>
            {Object.entries(ficha.atributos).map(([k, v]) => (
              <Box key={k} sx={{ mb: 1 }}>
                <Typography sx={{ fontSize: 14 }}>{LABEL_MAP[k] || k}</Typography>
                <Slider value={Number(v || 0)} min={0} max={5} step={1} onChange={(e, val) => setSubCampo("atributos", k, val)} valueLabelDisplay="auto" />
              </Box>
            ))}
          </Box>

          <Box mt={2}>
            <Typography>{LABELS.periciasTitulo}</Typography>
            {Object.entries(ficha.pericias).map(([k, v]) => (
              <Box key={k} sx={{ mb: 1 }}>
                <Typography sx={{ fontSize: 14 }}>{LABEL_MAP[k] || k}</Typography>
                <Slider value={Number(v || 0)} min={0} max={5} step={1} onChange={(e, val) => setSubCampo("pericias", k, val)} valueLabelDisplay="auto" />
              </Box>
            ))}
          </Box>
          <Box mt={2}>
            <Typography>{LABELS.habilidadesTitulo}</Typography>
            {ficha.habilidades.map((h, i) => (
              <Paper key={i} sx={{ p: 1, mb: 1 }}>
                <Grid container spacing={1}>
                  <Grid item xs={11}>
                    {["nome", "descricao", "condicoes", "limitacoes"].map((campo) => (
                      <TextField
                        key={campo}
                        label={campo.charAt(0).toUpperCase() + campo.slice(1)}
                        fullWidth
                        size="small"
                        multiline={["descricao", "condicoes", "limitacoes"].includes(campo)}
                        value={h[campo]}
                        onChange={(e) => atualizarHabilidade(i, campo, e.target.value)}
                        sx={{ mb: 1 }}
                      />
                    ))}
                  </Grid>
                  <Grid item xs={1}>
                    <IconButton color="error" onClick={() => removerHabilidade(i)}>
                      <DeleteIcon />
                    </IconButton>
                  </Grid>
                </Grid>
              </Paper>
            ))}
            <Button variant="outlined" startIcon={<AddIcon />} onClick={adicionarHabilidade}>
              Adicionar Habilidade
            </Button>
          </Box>

          <Box mt={2}>
            <Typography>{LABELS.itensTitulo}</Typography>
            <Box mt={1}>
              <Typography>Moedas (Cobre / Prata / Ouro)</Typography>
              <Grid container spacing={1} sx={{ mt: 1 }}>
                {["cobre", "prata", "ouro"].map((m) => (
                  <Grid item xs={4} key={m}>
                    <TextField
                      label={LABEL_MAP[m] || m}
                      size="small"
                      type="number"
                      value={ficha.moedas[m]}
                      onChange={(e) =>
                        setCampo("moedas", {
                          ...ficha.moedas,
                          [m]: Number(e.target.value || 0),
                        })
                      }
                    />
                  </Grid>
                ))}
              </Grid>
            </Box>
            {["equipamentos", "vestes", "diversos"].map((tipo) => (
              <Box mt={2} key={tipo}>
                <Typography>{LABEL_MAP[tipo] || tipo}</Typography>
                {ficha[tipo].map((it, i) => (
                  <Grid
                    container
                    key={i}
                    spacing={1}
                    alignItems="center"
                    sx={{ mt: 1 }}
                  >
                    <Grid item xs={2}>
                      <TextField
                        label="Quantidade"
                        type="number"
                        size="small"
                        value={it.quantidade}
                        onChange={(e) =>
                          atualizarItem(tipo, i, "quantidade", Number(e.target.value))
                        }
                      />
                    </Grid>
                    <Grid item xs={6}>
                      <TextField
                        label="Nome"
                        fullWidth
                        size="small"
                        value={it.nome}
                        onChange={(e) => atualizarItem(tipo, i, "nome", e.target.value)}
                      />
                    </Grid>
                    <Grid item xs={3}>
                      <TextField
                        label="Durabilidade"
                        type="number"
                        size="small"
                        value={it.durabilidade}
                        onChange={(e) =>
                          atualizarItem(
                            tipo,
                            i,
                            "durabilidade",
                            Number(e.target.value)
                          )
                        }
                      />
                    </Grid>
                    <Grid item xs={1}>
                      <IconButton color="error" onClick={() => removerItem(tipo, i)}>
                        <DeleteIcon />
                      </IconButton>
                    </Grid>
                  </Grid>
                ))}
                <Button
                  startIcon={<AddIcon />}
                  variant="outlined"
                  sx={{ mt: 1 }}
                  onClick={() => adicionarItem(tipo)}
                >
                  Adicionar {LABEL_MAP[tipo] || tipo}
                </Button>
              </Box>
            ))}
          </Box>

          {/* Anotações */}
          <Box mt={2}>
            <Typography>{LABELS.anotacoesTitulo}</Typography>
            <TextField
              fullWidth
              multiline
              rows={4}
              value={ficha.anotacoes}
              onChange={(e) => setCampo("anotacoes", e.target.value)}
            />
          </Box>

          {/* Background */}
          <Box mt={2}>
            <Button
              variant="outlined"
              onClick={() => setMostrarBackground(!mostrarBackground)}
              sx={{ mb: 1 }}
            >
              {mostrarBackground ? "Esconder Background" : "Mostrar Background"}
            </Button>
            {mostrarBackground && (
              <TextField
                fullWidth
                multiline
                rows={6}
                value={ficha.background}
                onChange={(e) => setCampo("background", e.target.value)}
                placeholder="Escreva aqui a história do personagem..."
              />
            )}
          </Box>

          {/* Salvar */}
          <Box mt={2} sx={{ display: "flex", justifyContent: "flex-end" }}>
            <Button
              variant="contained"
              color="primary"
              onClick={salvarFicha}
              disabled={saving}
            >
              {saving ? "Salvando..." : "Salvar Ficha"}
            </Button>
          </Box>
        </Grid>

        {/* Painel da imagem */}
        <Grid item xs={12} md={3}>
          <Paper
            sx={{
              p: 2,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 1,
            }}
          >
            <Typography sx={{ mb: 1 }}>Personagem</Typography>
            {ficha.imagemPersonagem ? (
              <img
                src={ficha.imagemPersonagem}
                alt="Personagem"
                style={{
                  width: "100%",
                  height: "auto",
                  borderRadius: 8,
                  objectFit: "cover",
                }}
              />
            ) : (
              <Box
                sx={{
                  width: "100%",
                  height: 180,
                  bgcolor: "#021319",
                  borderRadius: 1,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Typography>Sem imagem</Typography>
              </Box>
            )}

            <Button
              variant="outlined"
              component="label"
              sx={{ mt: 1, width: "100%" }}
            >
              Upload Imagem
              <input
                type="file"
                accept="image/*"
                hidden
                onChange={handleUploadImagem}
              />
            </Button>

            {ficha.imagemPersonagem && (
              <Button
                variant="text"
                sx={{ mt: 0 }}
                onClick={() => {
                  if (
                    confirm(
                      "Remover imagem da ficha? (Isso apenas remove o link salvo; a imagem hospedada pode permanecer)."
                    )
                  ) {
                    setCampo("imagemPersonagem", "");
                    salvarFicha();
                  }
                }}
              >
                Remover imagem
              </Button>
            )}
          </Paper>
        </Grid>
      </Grid>
    </Paper>
  );
}
