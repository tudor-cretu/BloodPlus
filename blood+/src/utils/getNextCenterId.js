import { collection, getDocs } from "firebase/firestore";
import { db } from "../firebase/firebaseConfig.js";

export const getNextCenterId = async () => {
  const snap = await getDocs(collection(db, "centers"));

  let maxId = 0;

  snap.forEach(doc => {
    const id = Number(doc.id);
    if (!isNaN(id) && id > maxId) {
      maxId = id;
    }
  });

  return String(maxId + 1);
};
