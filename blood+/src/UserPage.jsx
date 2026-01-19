import { useEffect, useState } from "react";
import { auth, db } from "./firebase/firebaseConfig";
import { doc, getDoc, deleteDoc } from "firebase/firestore";
// Aceasta este singura linie de care ai nevoie pentru Firebase Auth:
import { updatePassword, deleteUser, EmailAuthProvider, reauthenticateWithCredential } from "firebase/auth";
import { useNavigate } from "react-router-dom";

function UserPage() {
  const [userData, setUserData] = useState(null);
  const [newPassword, setNewPassword] = useState("");
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchUser = async () => {
      // Așteptăm ca Firebase să verifice starea autentificării
      auth.onAuthStateChanged(async (user) => {
        if (user) {
          const snap = await getDoc(doc(db, "users", user.uid));
          if (snap.exists()) {
            setUserData(snap.data());
          }
          setLoading(false);
        } else {
          navigate("/"); // Dacă nu e logat, trimite-l la login
        }
      });
    };

    fetchUser();
  }, [navigate]);

  const handleDeleteAccount = async () => {
  const currentPassword = window.prompt("Pentru siguranță, introdu parola actuală pentru a șterge contul:");
  
  if (!currentPassword) return; // Utilizatorul a anulat

  try {
    const user = auth.currentUser;
    if (user) {
      // 1. Creăm o "cheie" (credential) cu email-ul și parola introdusă
      const credential = EmailAuthProvider.credential(user.email, currentPassword);

      // 2. Reautentificăm utilizatorul pentru a "debloca" acțiunile sensibile
      await reauthenticateWithCredential(user, credential);

      const userId = user.uid;

      // 3. Ștergem datele din Firestore
      await deleteDoc(doc(db, "users", userId));

      // 4. Ștergem contul de autentificare
      await deleteUser(user);

      alert("Contul tău a fost șters definitiv.");
      navigate("/");
    }
  } catch (err) {
    if (err.code === "auth/wrong-password") {
      alert("Parola introdusă este incorectă.");
    } else {
      alert("Eroare la ștergere: " + err.message);
    }
  }
};

  if (loading) {
    return (
      <div style={{ display: "flex", justifyContent: "center", alignItems: "center", height: "100vh" }}>
        Se încarcă...
      </div>
    );
  }

  return (
    <div style={{
      display: "flex",
      flexDirection: "column",
      alignItems: "center", // Centrare orizontală
      justifyContent: "center", // Centrare verticală (opțional)
      minHeight: "100vh",
      padding: "20px",
      backgroundColor: "#f9f9f9",
      boxSizing: "border-box"
    }}>
      <div style={{ width: "100%", maxWidth: "400px" }}>
        <button
          onClick={() => navigate("/")}
          style={{
            marginBottom: 20,
            padding: "8px 16px",
            background: "#ffffff",
            border: "1px solid #ddd",
            borderRadius: 8,
            cursor: "pointer",
            width: "fit-content"
          }}
        >
          ⟵ Înapoi la hartă
        </button>

        <h1 style={{ marginBottom: 20, textAlign: "center" }}>Profilul meu</h1>

        {/* Informații Utilizator */}
        <div style={{
          background: "white",
          padding: 20,
          borderRadius: 12,
          border: "1px solid #eee",
          boxShadow: "0 2px 8px rgba(0,0,0,0.06)",
          marginBottom: 20,
        }}>
          <p><strong>Nume:</strong> {userData?.name}</p>
          <p><strong>Email:</strong> {userData?.email}</p>
          <p><strong>Grupa sanguină:</strong> {userData?.blood_group}</p>
        </div>

        {/* Șterge Contul */}
        <button
          onClick={handleDeleteAccount}
          style={{
            padding: "12px 20px",
            background: "#ff4d4d",
            color: "white",
            border: "none",
            borderRadius: 8,
            cursor: "pointer",
            fontWeight: 700,
            width: "100%",
          }}
        >
          🗑️ Șterge contul permanent
        </button>
      </div>
    </div>
  );
}

export default UserPage;