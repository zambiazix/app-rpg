import { doc, setDoc, getDoc } from "firebase/firestore";
import { db } from "../firebaseConfig";

export async function saveUserNick(user) {
  if (!user) return;
  const userRef = doc(db, "users", user.uid);
  const snap = await getDoc(userRef);

  if (!snap.exists()) {
    // salva o nick inicial como o prefixo do e-mail, ex: fulano@gmail → fulano
    const defaultNick = user.email.split("@")[0];
    await setDoc(userRef, { nick: defaultNick, email: user.email });
  }
}
