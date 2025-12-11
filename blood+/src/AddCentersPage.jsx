import { useState } from "react";
import { db } from "./firebase/firebaseConfig";
import { collection, addDoc, doc, setDoc } from "firebase/firestore";
import { useNavigate } from "react-router-dom";

// Stilul pentru input/label, simplificat și reutilizat
const inputGroupStyle = {
  marginBottom: "15px",
};

const labelStyle = {
  display: "block",
  marginBottom: "5px",
  fontWeight: "600",
  color: "#333",
};

const inputStyle = {
  display: "block",
  width: "100%",
  padding: "10px",
  border: "1px solid #ddd",
  borderRadius: "4px",
  boxSizing: "border-box",
};

function AddCenterPage() {
  const navigate = useNavigate();

  const [form, setForm] = useState({
    name: "",
    address: "",
    latitude: "",
    longitude: "",
    contact_phone: "",
    contact_email: "",
    program: "",
  });

  const [busy, setBusy] = useState(false);

  const handleChange = (key) => (e) =>
    setForm({ ...form, [key]: e.target.value });

  const addCenter = async (e) => {
    e.preventDefault();
    setBusy(true);

    const requiredFields = Object.values(form).every((val) => val.trim() !== "");
    if (!requiredFields) {
      alert("Te rugăm să completezi toate câmpurile!");
      setBusy(false);
      return;
    }

    const isLatitudeValid =
      !isNaN(Number(form.latitude)) &&
      Number(form.latitude) >= -90 &&
      Number(form.latitude) <= 90;
    const isLongitudeValid =
      !isNaN(Number(form.longitude)) &&
      Number(form.longitude) >= -180 &&
      Number(form.longitude) <= 180;

    if (!isLatitudeValid || !isLongitudeValid) {
      alert(
        "Latitudinea sau Longitudinea nu sunt valide. Verifică formatul și intervalul."
      );
      setBusy(false);
      return;
    }

    try {
      // 1. Adaugă centrul principal
      const newCenterRef = await addDoc(collection(db, "centers"), {
        name: form.name,
        address: form.address,
        latitude: Number(form.latitude),
        longitude: Number(form.longitude),
        contact_phone: form.contact_phone,
        contact_email: form.contact_email,
        program: form.program,
      });

      // 2. Inițializează subcolecția de stoc de sânge
      const bloodGroups = [
        { blood_group: "0-", quantity: 0 },
        { blood_group: "0+", quantity: 0 },
        { blood_group: "A-", quantity: 0 },
        { blood_group: "A+", quantity: 0 },
        { blood_group: "B-", quantity: 0 },
        { blood_group: "B+", quantity: 0 },
        { blood_group: "AB-", quantity: 0 },
        { blood_group: "AB+", quantity: 0 },
      ];

      for (let bg of bloodGroups) {
        const stockRef = doc(
          collection(db, "centers", newCenterRef.id, "blood_stock")
        );
        await setDoc(stockRef, {
          blood_group: bg.blood_group,
          quantity: bg.quantity,
          center_id: newCenterRef.id,
        });
      }

      alert("Centru adăugat cu succes!");
      navigate("/admin");
    } catch (err) {
      console.error("Eroare la adăugarea centrului:", err);
      alert("Eroare la adăugarea centrului. Verifică consola pentru detalii.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div
      style={{
        width: "100%",
        minHeight: "100vh",
        background: "#f7f7f7", // Fundal foarte deschis
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        padding: "20px",
      }}
    >
      {/* Butonul Înapoi */}
      <button
        onClick={() => navigate("/admin")}
        style={{
          position: "absolute",
          top: 20,
          left: 20,
          padding: "10px 15px",
          background: "transparent",
          color: "#007bff", // Culoare primară (albastru)
          border: "none",
          borderRadius: 8,
          cursor: "pointer",
          fontWeight: "bold",
          zIndex: 1000,
        }}
      >
        {"< "} Înapoi
      </button>

      <div
        style={{
          width: "100%",
          maxWidth: "550px", // Lățime moderată
          padding: "30px",
          marginTop: "40px",
          background: "white",
          borderRadius: "8px",
          boxShadow: "0 2px 10px rgba(0, 0, 0, 0.05)", // Umbră ușoară
        }}
      >
        <h1 style={{ textAlign: "center", color: "#333", marginBottom: "25px" }}>
          Adaugă Centru Nou
        </h1>

        <form onSubmit={addCenter}>
          <div style={inputGroupStyle}>
            <label style={labelStyle}>Nume:</label>
            <input
              value={form.name}
              onChange={handleChange("name")}
              style={inputStyle}
              required
            />
          </div>

          <div style={inputGroupStyle}>
            <label style={labelStyle}>Adresă:</label>
            <input
              value={form.address}
              onChange={handleChange("address")}
              style={inputStyle}
              required
            />
          </div>

          <div style={inputGroupStyle}>
            <label style={labelStyle}>Latitudine:</label>
            <input
              value={form.latitude}
              onChange={handleChange("latitude")}
              style={inputStyle}
              type="text"
              required
            />
          </div>

          <div style={inputGroupStyle}>
            <label style={labelStyle}>Longitudine:</label>
            <input
              value={form.longitude}
              onChange={handleChange("longitude")}
              style={inputStyle}
              type="text"
              required
            />
          </div>

          <div style={inputGroupStyle}>
            <label style={labelStyle}>Telefon:</label>
            <input
              value={form.contact_phone}
              onChange={handleChange("contact_phone")}
              style={inputStyle}
              type="tel"
              required
            />
          </div>

          <div style={inputGroupStyle}>
            <label style={labelStyle}>Email:</label>
            <input
              value={form.contact_email}
              onChange={handleChange("contact_email")}
              style={inputStyle}
              type="email"
              required
            />
          </div>

          <div style={inputGroupStyle}>
            <label style={labelStyle}>Program:</label>
            <input
              value={form.program}
              onChange={handleChange("program")}
              style={inputStyle}
              required
            />
          </div>

          <button
            type="submit"
            disabled={busy}
            style={{
              marginTop: 20,
              padding: "12px 24px",
              background: busy ? "#ccc" : "#007bff",
              color: "white",
              border: "none",
              borderRadius: 6,
              cursor: busy ? "not-allowed" : "pointer",
              fontSize: "1em",
              fontWeight: "bold",
              width: "100%",
            }}
          >
            {busy ? "Se adaugă..." : "Adaugă centrul"}
          </button>
        </form>
      </div>
    </div>
  );
}

export default AddCenterPage;