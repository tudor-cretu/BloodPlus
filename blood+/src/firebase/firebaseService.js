import { db } from "./firebaseConfig";
import { collection, doc } from "firebase/firestore";
import { COLLECTIONS, SUBCOLLECTIONS } from "./firebaseCollections";

// referința la colecția centers
export const centersCollection = collection(db, COLLECTIONS.CENTERS);

// referința la un centru anume
export const centerDoc = (centerId) =>
  doc(db, COLLECTIONS.CENTERS, centerId);

// referința la subcolecția blood_stock a unui centru
export const bloodStockCollection = (centerId) =>
  collection(db, COLLECTIONS.CENTERS, centerId, SUBCOLLECTIONS.BLOOD_STOCK);
