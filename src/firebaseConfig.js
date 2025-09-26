// src/firebaseConfig.js
import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";
import { getStorage } from "firebase/storage";

// 🔹 Cole aqui as informações que o Firebase deu para você
const firebaseConfig = {
  apiKey: "AIzaSyBXr773B7XwoZkQoMxULEE-G5Dr3qe3EFc",
  authDomain: "requiem-rpg.firebaseapp.com",
  projectId: "requiem-rpg",
  storageBucket: "requiem-rpg.firebasestorage.app",
  messagingSenderId: "843912800714",
  appId: "1:843912800714:web:58acc8c517a8bbe68e4733"
};

// 🔹 Inicia o app e o banco
const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const auth = getAuth(app);
export const storage = getStorage(app);