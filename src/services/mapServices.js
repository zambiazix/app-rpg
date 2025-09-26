import { db } from "../firebaseConfig";
import { doc, setDoc, getDoc, onSnapshot } from "firebase/firestore";

const MAP_DOC = "mapaMundi/dados"; // coleção/documento fixos

export async function salvarMapa({ svg, cities }) {
  await setDoc(doc(db, MAP_DOC), { svg, cities });
}

export async function carregarMapa() {
  const snap = await getDoc(doc(db, MAP_DOC));
  if (snap.exists()) return snap.data();
  return null;
}

export function ouvirMapa(callback) {
  return onSnapshot(doc(db, MAP_DOC), (snap) => {
    if (snap.exists()) callback(snap.data());
  });
}
