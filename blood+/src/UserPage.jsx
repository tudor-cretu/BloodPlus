import { useEffect, useState } from "react";
import { auth, db } from "./firebase/firebaseConfig";
import { doc, getDoc, deleteDoc } from "firebase/firestore";
import { updatePassword, deleteUser } from "firebase/auth";
import { useNavigate } from "react-router-dom";

function UserPage() {
  const [userData, setUserData] = useState(null);
  const [newPassword, setNewPassword] = useState("");
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchUser = async () => {
      const user = auth.currentUser;

      if (!user) return;

      const snap = await getDoc(doc(db, "users", user.uid));
      if (snap.exists()) {
        setUserData(snap.data());
      }
      setLoading(false);
    };

    fetchUser();
  }, []);

  const changePassword = async () => {
    try {
      if (!newPassword) return alert("Introdu o parolă nouă!");

      const user = auth.currentUser;
      await updatePassword(user, newPassword);

      alert("Parola a fost schimbată!");
      setNewPassword("");
    } catch (err) {
      if (err.code === "auth/requires-recent-login") {
        alert("Trebuie să te reconectezi pentru a schimba parola.");
      } else {
        alert(err.message);
      }
    }
  };

  // 🔥 Delete account
  const handleDeleteAccount = async () => {
    const confirmDelete = window.confirm(
      "Ești sigur că vrei să ștergi contul? Această acțiune este permanentă."
    );

    if (!confirmDelete) return;

    try {
      const user = auth.currentUser;

      // 1. șterge contul din Firestore
      await deleteDoc(doc(db, "users", user.uid));

      // 2. șterge contul din Firebase Auth
      await deleteUser(user);

      alert("Contul tău a fost șters cu succes.");

      navigate("/"); // redirect la homepage / login
    } catch (err) {
      if (err.code === "auth/requires-recent-login") {
        alert("Trebuie să te reconectezi pentru a șterge contul.");
      } else {
        alert("Eroare: " + err.message);
      }
    }
  };

  if (loading) return <div style={{ padding: 20 }}>Se încarcă...</div>;

  return (
    <div style={{ padding: 20 }}>
      <button
        onClick={() => navigate("/")}
        style={{
          marginBottom: 20,
          padding: "8px 16px",
          background: "#ffffff",
          border: "1px solid #ddd",
          borderRadius: 8,
          cursor: "pointer",
        }}
      >
        ⟵ Înapoi la hartă
      </button>

      <h1 style={{ marginBottom: 20 }}>Profilul meu</h1>

      <div
        style={{
          background: "white",
          padding: 20,
          borderRadius: 12,
          border: "1px solid #eee",
          boxShadow: "0 2px 8px rgba(0,0,0,0.06)",
          maxWidth: 400,
          marginBottom: 30,
        }}
      >
        <p><strong>Nume:</strong> {userData.name}</p>
        <p><strong>Email:</strong> {userData.email}</p>
        <p><strong>Grupa sanguină:</strong> {userData.blood_group}</p>
      </div>

      <div
        style={{
          background: "white",
          padding: 20,
          borderRadius: 12,
          border: "1px solid #eee",
          boxShadow: "0 2px 8px rgba(0,0,0,0.06)",
          maxWidth: 400,
          marginBottom: 30,
        }}
      >
        <h3>Schimbă parola</h3>

        <input
          type="password"
          placeholder="Parolă nouă"
          value={newPassword}
          onChange={(e) => setNewPassword(e.target.value)}
          style={{
            padding: 10,
            width: "100%",
            borderRadius: 6,
            border: "1px solid #ccc",
            marginBottom: 10,
          }}
        />
        <button
          onClick={changePassword}
          style={{
            padding: "10px 20px",
            background: "#4CAF50",
            color: "white",
            border: "none",
            borderRadius: 6,
            cursor: "pointer",
            fontWeight: 600,
            width: "100%",
          }}
        >
          Salvează parola
        </button>
      </div>

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
          maxWidth: 400,
        }}
      >
        🗑️ Șterge contul
      </button>
    </div>
  );
}

export default UserPage;
