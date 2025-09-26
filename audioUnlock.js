// src/utils/audioUnlock.js
export async function unlockAudio() {
  return new Promise((resolve, reject) => {
    try {
      const silentAudio = new Audio(
        "data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEAESsAACJWAAACABAAZGF0YQAAAAA="
      );
      // Tenta tocar um áudio mudo para desbloquear autoplay no navegador
      silentAudio.play()
        .then(() => {
          silentAudio.pause();
          silentAudio.currentTime = 0;
          resolve();
        })
        .catch((err) => {
          // Se falhar, ainda rejeitamos para que o componente saiba
          reject(err);
        });
    } catch (err) {
      reject(err);
    }
  });
}

export default unlockAudio;
