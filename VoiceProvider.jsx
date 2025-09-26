import React, { createContext, useContext, useEffect, useRef, useState } from "react";
import { collection, doc, getDoc, addDoc, onSnapshot, serverTimestamp } from "firebase/firestore";
import { db } from "../firebaseConfig"; 
import { ROOM_ID, MASTER_EMAIL } from "../config";
import { getAuth, onAuthStateChanged } from "firebase/auth";

const VoiceContext = createContext();
export const useVoice = () => useContext(VoiceContext);

export default function VoiceProvider({ children }) {
  const [inVoice, setInVoice] = useState(false);
  const [participants, setParticipants] = useState([]);
  const [remoteStreams, setRemoteStreams] = useState([]);
  const [localMuted, setLocalMuted] = useState(false);
  const [speakingIds, setSpeakingIds] = useState(new Set());
  const [userNick, setUserNick] = useState(null);

  const pcsRef = useRef({});
  const localStreamRef = useRef(null);
  const localIdRef = useRef(crypto.randomUUID());
  const remoteNickById = useRef({});
  const signalsUnsubRef = useRef(null);
  const pendingCandidatesRef = useRef({});
  const remoteAudioCtxRef = useRef({});
  const localAudioCtxRef = useRef(null);
  const localAnalyserRef = useRef(null);
  const localDetectRafRef = useRef(null);

  // Busca o nick no Firestore usando o e-mail como ID
  useEffect(() => {
    const auth = getAuth();
    const unsub = onAuthStateChanged(auth, async (user) => {
      if (user) {
        try {
          const userRef = doc(db, "users", user.email); // ← usa o e-mail como ID
          const snap = await getDoc(userRef);
          if (snap.exists() && snap.data().nick) {
            setUserNick(snap.data().nick);
          } else {
            setUserNick(user.email.split("@")[0]); // fallback
          }
        } catch (e) {
          console.error("Erro ao buscar nick:", e);
          setUserNick(user.email.split("@")[0]);
        }
      }
    });
    return () => unsub();
  }, []);

  function refreshParticipants() {
    const remoteArr = Object.entries(pcsRef.current)
      .filter(([_, pcObj]) => pcObj?.pc?.connectionState !== "closed")
      .map(([rid]) => ({
        id: rid,
        nick: remoteNickById.current[rid] || "Jogador",
      }));

    const local = {
      id: localIdRef.current,
      nick: userNick === MASTER_EMAIL ? "Mestre" : userNick || "Você",
    };

    const seen = new Set();
    const unique = [local, ...remoteArr].filter((p) => {
      if (seen.has(p.id)) return false;
      seen.add(p.id);
      return true;
    });

    setParticipants(unique);
  }

  function refreshRemoteStreams() {
    const arr = Object.entries(pcsRef.current)
      .filter(([_, pcObj]) => pcObj._stream && pcObj.pc?.connectionState !== "closed")
      .map(([rid, pcObj]) => ({
        id: rid,
        stream: pcObj._stream,
        nick: remoteNickById.current[rid] || "Jogador",
      }));
    setRemoteStreams(arr);
  }

  function setupRemoteAnalyser(remoteId, stream) {
    cleanupRemoteAnalyser(remoteId);
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      const audioCtx = new AudioCtx();
      const source = audioCtx.createMediaStreamSource(stream);
      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 2048;
      source.connect(analyser);
      const dataArray = new Uint8Array(analyser.frequencyBinCount);

      function check() {
        analyser.getByteFrequencyData(dataArray);
        const volume = dataArray.reduce((a, b) => a + b, 0) / dataArray.length;
        setSpeakingIds((prev) => {
          const s = new Set(prev);
          if (volume > 18) s.add(remoteId);
          else s.delete(remoteId);
          return s;
        });
        remoteAudioCtxRef.current[remoteId].rafId = requestAnimationFrame(check);
      }

      remoteAudioCtxRef.current[remoteId] = { audioCtx, analyser, source, rafId: null };
      check();
    } catch (e) {
      console.warn("Erro no analyser remoto:", e);
    }
  }

  function cleanupRemoteAnalyser(remoteId) {
    const e = remoteAudioCtxRef.current[remoteId];
    if (!e) return;
    if (e.rafId) cancelAnimationFrame(e.rafId);
    e.source?.disconnect();
    e.audioCtx?.close?.();
    delete remoteAudioCtxRef.current[remoteId];
    setSpeakingIds((prev) => {
      const s = new Set(prev);
      s.delete(remoteId);
      return s;
    });
  }

  function createPeerConnection(remoteId) {
    if (pcsRef.current[remoteId]) return pcsRef.current[remoteId].pc;
    const pc = new RTCPeerConnection();
    pc.ontrack = (e) => {
      pcsRef.current[remoteId] = { pc, _stream: e.streams[0] };
      setupRemoteAnalyser(remoteId, e.streams[0]);
      refreshRemoteStreams();
      refreshParticipants();
    };
    pc.onicecandidate = (e) => {
      if (e.candidate) {
        addDoc(collection(db, "rooms", ROOM_ID, "signals"), {
          type: "candidate",
          from: localIdRef.current,
          to: remoteId,
          candidate: e.candidate.toJSON(),
          createdAt: serverTimestamp(),
        });
      }
    };
    localStreamRef.current?.getTracks().forEach((t) => pc.addTrack(t, localStreamRef.current));
    pcsRef.current[remoteId] = { pc, _stream: null };
    pendingCandidatesRef.current[remoteId] = pendingCandidatesRef.current[remoteId] || [];
    return pc;
  }

  async function applyPendingCandidates(remoteId) {
    const pc = pcsRef.current[remoteId]?.pc;
    if (!pc) return;
    for (const c of pendingCandidatesRef.current[remoteId] || []) {
      try {
        await pc.addIceCandidate(new RTCIceCandidate(c));
      } catch {}
    }
    pendingCandidatesRef.current[remoteId] = [];
  }

  async function createAndSendOffer(remoteId) {
    const pc = createPeerConnection(remoteId);
    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);
    await addDoc(collection(db, "rooms", ROOM_ID, "signals"), {
      type: "offer",
      from: localIdRef.current,
      to: remoteId,
      sdp: offer.sdp,
      sdpType: offer.type,
      nick: userNick,
      createdAt: serverTimestamp(),
    });
  }

  async function handleOffer(remoteId, sdp, type) {
    const pc = createPeerConnection(remoteId);
    await pc.setRemoteDescription({ type, sdp });
    const answer = await pc.createAnswer();
    await pc.setLocalDescription(answer);
    await addDoc(collection(db, "rooms", ROOM_ID, "signals"), {
      type: "answer",
      from: localIdRef.current,
      to: remoteId,
      sdp: answer.sdp,
      sdpType: answer.type,
      nick: userNick,
      createdAt: serverTimestamp(),
    });
    await applyPendingCandidates(remoteId);
  }

  async function handleAnswer(remoteId, sdp, type) {
    await pcsRef.current[remoteId]?.pc.setRemoteDescription({ type, sdp });
    await applyPendingCandidates(remoteId);
  }

  async function handleCandidate(remoteId, cand) {
    if (!pcsRef.current[remoteId]) {
      pendingCandidatesRef.current[remoteId] = pendingCandidatesRef.current[remoteId] || [];
      pendingCandidatesRef.current[remoteId].push(cand);
    } else {
      try {
        await pcsRef.current[remoteId].pc.addIceCandidate(new RTCIceCandidate(cand));
      } catch {}
    }
  }

  function closePeer(remoteId) {
    pcsRef.current[remoteId]?.pc?.close?.();
    delete pcsRef.current[remoteId];
    cleanupRemoteAnalyser(remoteId);
    delete remoteNickById.current[remoteId];
    delete pendingCandidatesRef.current[remoteId];
    refreshParticipants();
    refreshRemoteStreams();
  }

  function startSignalsListener() {
    if (signalsUnsubRef.current) return;
    signalsUnsubRef.current = onSnapshot(collection(db, "rooms", ROOM_ID, "signals"), (snap) => {
      snap.docChanges().forEach((c) => {
        if (c.type !== "added") return;
        const d = c.doc.data();
        if (!d.from || d.from === localIdRef.current) return;
        if (!d.createdAt || Date.now() - d.createdAt.toMillis() > 20000) return;

        const rid = d.from;
        if (d.nick) {
          remoteNickById.current[rid] = d.nick;
          refreshParticipants();
        }

        if (d.type === "join" && !pcsRef.current[rid] && localIdRef.current > rid)
          createAndSendOffer(rid);
        if (d.type === "offer" && d.to === localIdRef.current) handleOffer(rid, d.sdp, d.sdpType);
        if (d.type === "answer" && d.to === localIdRef.current) handleAnswer(rid, d.sdp, d.sdpType);
        if (d.type === "candidate" && d.to === localIdRef.current) handleCandidate(rid, d.candidate);
        if (d.type === "leave") closePeer(rid);
      });
    });
  }

  async function startVoice() {
    if (inVoice || !userNick) return;
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    localStreamRef.current = stream;

    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    const ctx = new AudioCtx();
    const analyser = ctx.createAnalyser();
    analyser.fftSize = 2048;
    ctx.createMediaStreamSource(stream).connect(analyser);
    localAudioCtxRef.current = ctx;
    localAnalyserRef.current = analyser;
    const arr = new Uint8Array(analyser.frequencyBinCount);

    function detectLocal() {
      analyser.getByteFrequencyData(arr);
      const vol = arr.reduce((a, b) => a + b, 0) / arr.length;
      setSpeakingIds((s) => {
        const n = new Set(s);
        if (vol > 18) n.add(localIdRef.current);
        else n.delete(localIdRef.current);
        return n;
      });
      localDetectRafRef.current = requestAnimationFrame(detectLocal);
    }
    detectLocal();

    startSignalsListener();
    await addDoc(collection(db, "rooms", ROOM_ID, "signals"), {
      type: "join",
      from: localIdRef.current,
      nick: userNick,
      createdAt: serverTimestamp(),
    });

    setInVoice(true);
    refreshParticipants();
  }

  async function leaveVoice() {
    await addDoc(collection(db, "rooms", ROOM_ID, "signals"), {
      type: "leave",
      from: localIdRef.current,
      createdAt: serverTimestamp(),
    });

    Object.keys(pcsRef.current).forEach(closePeer);
    localStreamRef.current?.getTracks().forEach((t) => t.stop());
    localStreamRef.current = null;
    if (localDetectRafRef.current) cancelAnimationFrame(localDetectRafRef.current);
    localAudioCtxRef.current?.close?.();
    localAudioCtxRef.current = null;
    localAnalyserRef.current = null;
    localDetectRafRef.current = null;
    Object.keys(remoteAudioCtxRef.current).forEach(cleanupRemoteAnalyser);
    signalsUnsubRef.current?.();
    signalsUnsubRef.current = null;
    setRemoteStreams([]);
    setParticipants([]);
    setInVoice(false);
    setLocalMuted(false);
    setSpeakingIds(new Set());
  }

  function toggleLocalMute() {
    if (!localStreamRef.current) return;
    const muted = !localMuted;
    localStreamRef.current.getAudioTracks().forEach((t) => (t.enabled = !muted));
    setLocalMuted(muted);
  }

  return (
    <VoiceContext.Provider
      value={{
        inVoice,
        participants,
        remoteStreams,
        localMuted,
        speakingIds,
        startVoice,
        leaveVoice,
        toggleLocalMute,
      }}
    >
      {children}
    </VoiceContext.Provider>
  );
}
