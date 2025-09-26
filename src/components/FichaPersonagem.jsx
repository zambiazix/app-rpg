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
    habilidadesTitulo: "● Habilidades Auranas de [Tipo de Aura] ●",
    itensTitulo: "● Itens [Valor Máximo]●",
    anotacoesTitulo: "● Anotações:",
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
            habilidades: Array.isArray(dados.habilidades) ? dados.habilidades : modelo.habilidades,
            moedas: { ...modelo.moedas, ...(dados.moedas || dados.moedas) },
            equipamentos: Array.isArray(dados.equipamentos) ? dados.equipamentos : modelo.equipamentos,
            vestes: Array.isArray(dados.vestes) ? dados.vestes : modelo.vestes,
            diversos: Array.isArray(dados.diversos) ? dados.diversos : modelo.diversos,
            anotacoes: dados.anotacoes ?? modelo.anotacoes,
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

  // habilidades
  function adicionarHabilidade() {
    setFicha((p) => ({ ...p, habilidades: [...(p.habilidades || []), { nome: "", descricao: "", condicoes: "", limitacoes: "" }] }));
  }
  function atualizarHabilidade(i, campo, valor) {
    setFicha((p) => {
      const arr = [...(p.habilidades || [])];
      arr[i] = { ...arr[i], [campo]: valor };
      return { ...p, habilidades: arr };
    });
  }
  function removerHabilidade(i) {
    setFicha((p) => ({ ...p, habilidades: p.habilidades.filter((_, idx) => idx !== i) }));
  }

  // itens com 3 campos
  function adicionarItem(tipo) {
    setFicha((p) => ({ ...p, [tipo]: [...(p[tipo] || []), { quantidade: 1, nome: "", durabilidade: 100 }] }));
  }
  function atualizarItem(tipo, i, campo, valor) {
    setFicha((p) => {
      const arr = [...(p[tipo] || [])];
      arr[i] = { ...arr[i], [campo]: valor };
      return { ...p, [tipo]: arr };
    });
  }
  function removerItem(tipo, i) {
    setFicha((p) => ({ ...p, [tipo]: p[tipo].filter((_, idx) => idx !== i) }));
  }

  async function salvarFicha() {
    if (!fichaId) return alert("FichaId inválido. Faça login ou informe um id.");
    setSaving(true);
    try {
      const ref = doc(db, "fichas", fichaId);
      const toSave = {
        ...ficha,
        atributos: Object.fromEntries(Object.entries(ficha.atributos || {}).map(([k, v]) => [k, Number(v || 0)])),
        pericias: Object.fromEntries(Object.entries(ficha.pericias || {}).map(([k, v]) => [k, Number(v || 0)])),
        moedas: {
          cobre: Number((ficha.moedas && ficha.moedas.cobre) || 0),
          prata: Number((ficha.moedas && ficha.moedas.prata) || 0),
          ouro: Number((ficha.moedas && ficha.moedas.ouro) || 0),
        },
        habilidades: Array.isArray(ficha.habilidades) ? ficha.habilidades : [],
        equipamentos: Array.isArray(ficha.equipamentos) ? ficha.equipamentos : [],
        vestes: Array.isArray(ficha.vestes) ? ficha.vestes : [],
        diversos: Array.isArray(ficha.diversos) ? ficha.diversos : [],
      };
      await setDoc(ref, toSave, { merge: true });
      const snap = await getDoc(ref);
      if (snap.exists()) {
        setFicha(snap.data());
      }
      alert("Ficha salva com sucesso!");
    } catch (err) {
      console.error(err);
      alert("Erro ao salvar (veja console).");
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <Box p={2}><Typography>Carregando ficha...</Typography></Box>;
  if (!ficha) return <Box p={2}><Typography>Nenhuma ficha carregada.</Typography></Box>;

  return (
    <Paper sx={{ p: 2, bgcolor: "#07121a", color: "#fff", height: "100%", overflowY: "auto" }}>
      <Typography variant="h5" gutterBottom>{LABELS.titulo}</Typography>

      {/* BÁSICOS */}
      <Grid container spacing={2}>
        <Grid item xs={12} md={6}>
          <Typography>Nome</Typography>
          <TextField fullWidth size="small" value={ficha.nome} onChange={(e) => setCampo("nome", e.target.value)} sx={{ mb: 1 }} />
          <Typography>Gênero</Typography>
          <TextField fullWidth size="small" value={ficha.genero} onChange={(e) => setCampo("genero", e.target.value)} sx={{ mb: 1 }} />
          <Typography>Idade</Typography>
          <TextField fullWidth size="small" value={ficha.idade} onChange={(e) => setCampo("idade", e.target.value)} sx={{ mb: 1 }} />
          <Typography>Altura</Typography>
          <TextField fullWidth size="small" value={ficha.altura} onChange={(e) => setCampo("altura", e.target.value)} sx={{ mb: 1 }} />
          <Typography>Peso</Typography>
          <TextField fullWidth size="small" value={ficha.peso} onChange={(e) => setCampo("peso", e.target.value)} sx={{ mb: 1 }} />
          <Typography>Movimentação</Typography>
          <TextField fullWidth size="small" value={ficha.movimentacao} onChange={(e) => setCampo("movimentacao", e.target.value)} sx={{ mb: 1 }} />
        </Grid>

        <Grid item xs={12} md={6}>
          <Typography>Defeitos</Typography>
          <TextField fullWidth size="small" multiline value={ficha.defeitos} onChange={(e) => setCampo("defeitos", e.target.value)} sx={{ mb: 1 }} />
          <Typography>Traços</Typography>
          <TextField fullWidth size="small" multiline value={ficha.tracos} onChange={(e) => setCampo("tracos", e.target.value)} sx={{ mb: 1 }} />
          <Typography>Pontos de Vida</Typography>
          <TextField fullWidth size="small" type="number" value={ficha.pontosVida} onChange={(e) => setCampo("pontosVida", Number(e.target.value || 0))} sx={{ mb: 1 }} />
          <Typography>Pontos de Energia</Typography>
          <TextField fullWidth size="small" type="number" value={ficha.pontosEnergia} onChange={(e) => setCampo("pontosEnergia", Number(e.target.value || 0))} sx={{ mb: 1 }} />
          <Typography>Armadura</Typography>
          <TextField fullWidth size="small" value={ficha.armadura} onChange={(e) => setCampo("armadura", e.target.value)} sx={{ mb: 1 }} />
          <Typography>Características</Typography>
          <TextField fullWidth size="small" value={ficha.caracteristicas} onChange={(e) => setCampo("caracteristicas", e.target.value)} sx={{ mb: 1 }} />
        </Grid>
      </Grid>

      {/* ATRIBUTOS */}
      <Box mt={2}>
        <Typography variant="subtitle1">{LABELS.atributosTitulo}</Typography>
        {Object.entries(ficha.atributos).map(([k, v]) => (
          <Box key={k} sx={{ mb: 1 }}>
            <Typography sx={{ fontSize: 14 }}>{k}</Typography>
            <Slider value={Number(v || 0)} min={0} max={5} step={1} onChange={(e, val) => setSubCampo("atributos", k, val)} valueLabelDisplay="auto" />
          </Box>
        ))}
      </Box>

      {/* PERÍCIAS */}
      <Box mt={2}>
        <Typography variant="subtitle1">{LABELS.periciasTitulo}</Typography>
        {Object.entries(ficha.pericias).map(([k, v]) => (
          <Box key={k} sx={{ mb: 1 }}>
            <Typography sx={{ fontSize: 14 }}>{k}</Typography>
            <Slider value={Number(v || 0)} min={0} max={5} step={1} onChange={(e, val) => setSubCampo("pericias", k, val)} valueLabelDisplay="auto" />
          </Box>
        ))}
      </Box>

      {/* HABILIDADES */}
      <Box mt={2}>
        <Typography variant="subtitle1">{LABELS.habilidadesTitulo}</Typography>
        {ficha.habilidades.map((h, i) => (
          <Paper key={i} sx={{ p: 1, mb: 1 }}>
            <Grid container spacing={1}>
              <Grid item xs={11}>
                <TextField label="Nome da Habilidade" fullWidth size="small" value={h.nome} onChange={(e) => atualizarHabilidade(i, "nome", e.target.value)} sx={{ mb: 1 }} />
                <TextField label="Descrição" fullWidth size="small" multiline value={h.descricao} onChange={(e) => atualizarHabilidade(i, "descricao", e.target.value)} sx={{ mb: 1 }} />
                <TextField label="Condições (C)" fullWidth size="small" multiline value={h.condicoes} onChange={(e) => atualizarHabilidade(i, "condicoes", e.target.value)} sx={{ mb: 1 }} />
                <TextField label="Limitações (L)" fullWidth size="small" multiline value={h.limitacoes} onChange={(e) => atualizarHabilidade(i, "limitacoes", e.target.value)} />
              </Grid>
              <Grid item xs={1}>
                <IconButton color="error" onClick={() => removerHabilidade(i)}><DeleteIcon /></IconButton>
              </Grid>
            </Grid>
          </Paper>
        ))}
        <Button variant="outlined" startIcon={<AddIcon />} onClick={adicionarHabilidade}>Adicionar Habilidade</Button>
      </Box>

      {/* MOEDAS & ITENS */}
      <Box mt={2}>
        <Typography variant="subtitle1">{LABELS.itensTitulo}</Typography>
        <Box mt={1}>
          <Typography>Moedas (Cobre / Prata / Ouro)</Typography>
          <Grid container spacing={1} sx={{ mt: 1 }}>
            {["cobre", "prata", "ouro"].map((m) => (
              <Grid item xs={4} key={m}>
                <TextField label={m} size="small" type="number" value={ficha.moedas[m]} onChange={(e) => setCampo("moedas", { ...ficha.moedas, [m]: Number(e.target.value || 0) })} />
              </Grid>
            ))}
          </Grid>
        </Box>

        {["equipamentos", "vestes", "diversos"].map((tipo) => (
          <Box mt={2} key={tipo}>
            <Typography>{tipo.charAt(0).toUpperCase() + tipo.slice(1)}</Typography>
            {ficha[tipo].map((it, i) => (
              <Grid container key={i} spacing={1} alignItems="center" sx={{ mt: 1 }}>
                <Grid item xs={2}>
                  <TextField label="Quantidade" type="number" size="small" inputProps={{ min: 1, max: 99 }} value={it.quantidade} onChange={(e) => atualizarItem(tipo, i, "quantidade", Number(e.target.value))} />
                </Grid>
                <Grid item xs={6}>
                  <TextField label="Nome" fullWidth size="small" value={it.nome} onChange={(e) => atualizarItem(tipo, i, "nome", e.target.value)} />
                </Grid>
                <Grid item xs={3}>
                  <TextField label="Durabilidade" type="number" size="small" inputProps={{ min: 1, max: 100 }} value={it.durabilidade} onChange={(e) => atualizarItem(tipo, i, "durabilidade", Number(e.target.value))} />
                </Grid>
                <Grid item xs={1}>
                  <IconButton color="error" onClick={() => removerItem(tipo, i)}><DeleteIcon /></IconButton>
                </Grid>
              </Grid>
            ))}
            <Button startIcon={<AddIcon />} variant="outlined" sx={{ mt: 1 }} onClick={() => adicionarItem(tipo)}>Adicionar {tipo}</Button>
          </Box>
        ))}
      </Box>

      {/* ANOTAÇÕES */}
      <Box mt={2}>
        <Typography>{LABELS.anotacoesTitulo}</Typography>
        <TextField fullWidth multiline rows={4} value={ficha.anotacoes} onChange={(e) => setCampo("anotacoes", e.target.value)} />
      </Box>

      {/* SALVAR */}
      <Box mt={2} sx={{ display: "flex", justifyContent: "flex-end" }}>
        <Button variant="contained" color="primary" onClick={salvarFicha} disabled={saving}>
          {saving ? "Salvando..." : "Salvar Ficha"}
        </Button>
      </Box>
    </Paper>
  );
}
