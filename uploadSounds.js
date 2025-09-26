// uploadSounds.js
import { initializeApp } from "firebase/app";
import { getStorage, ref, uploadBytesResumable, getDownloadURL } from "firebase/storage";
import fs from "fs";
import path from "path";

// 🔹 Ajuste as informações do firebaseConfig conforme seu Firebase
const firebaseConfig = {
  apiKey: "AIzaSyBXr773B7XwoZkQoMxULEE-G5Dr3qe3EFc",
  authDomain: "requiem-rpg.firebaseapp.com",
  projectId: "requiem-rpg",
  storageBucket: "requiem-rpg.appspot.com", // ⚠️ CORRIGIDO PARA O FORMATO CORRETO
  messagingSenderId: "843912800714",
  appId: "1:843912800714:web:58acc8c517a8bbe68e4733"
};

// Inicializa Firebase e Storage
const app = initializeApp(firebaseConfig);
const storage = getStorage(app);

// Pastas locais
const musicFolder = path.resolve("./sounds/music");
const ambianceFolder = path.resolve("./sounds/ambiance");

// Função para fazer upload dos arquivos
async function uploadFolder(localFolder, remoteFolder) {
  if (!fs.existsSync(localFolder)) {
    console.log(`⚠️ Pasta não encontrada: ${localFolder}`);
    return;
  }

  const files = fs.readdirSync(localFolder);
  for (const file of files) {
    const filePath = path.join(localFolder, file);
    const fileBuffer = fs.readFileSync(filePath);

    const storageRef = ref(storage, `${remoteFolder}/${file}`);
    console.log(`📤 Enviando ${file} para ${remoteFolder}...`);

    try {
      const snapshot = await uploadBytesResumable(storageRef, fileBuffer);
      const downloadURL = await getDownloadURL(snapshot.ref);
      console.log(`✅ Upload concluído: ${file} → ${downloadURL}`);
    } catch (error) {
      console.error(`❌ Erro ao enviar ${file}:`, error.message);
    }
  }
}

// Função principal
(async () => {
  console.log("🚀 Iniciando upload...");
  await uploadFolder(musicFolder, "music");
  await uploadFolder(ambianceFolder, "ambiance");
  console.log("🏁 Upload finalizado!");
})();
