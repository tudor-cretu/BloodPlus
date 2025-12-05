// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";

// import { getAnalytics } from "firebase/analytics";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyCAQeFrUThePlhiG5MNL2PfrvbxxEcHcvE",
  authDomain: "bloodplus-7e1fa.firebaseapp.com",
  projectId: "bloodplus-7e1fa",
  storageBucket: "bloodplus-7e1fa.firebasestorage.app",
  messagingSenderId: "814093351324",
  appId: "1:814093351324:web:7e36429736450d8d65b059",
  measurementId: "G-E9QT3SFWGD"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
// const analytics = getAnalytics(app);

// Export Firestore DB and Auth for the rest of the app
export const db = getFirestore(app);
export const auth = getAuth(app);