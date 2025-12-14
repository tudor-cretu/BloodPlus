import { collection, getDocs, doc, updateDoc, deleteDoc } from "firebase/firestore";
import { db } from "./firebase/firebaseConfig.js";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

function AdminPage() {
  const [centers, setCenters] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchCenters = async () => {
      try {
        const snap = await getDocs(collection(db, "centers"));
        const centersData = [];

        for (let centerDoc of snap.docs) {
          const stockSnap = await getDocs(
            collection(db, "centers", centerDoc.id, "blood_stock")
          );
          const stockData = stockSnap.docs.map((s) => ({ id: s.id, ...s.data() }));

          centersData.push({
            id: centerDoc.id,
            ...centerDoc.data(),
            blood_stock: stockData,
          });
        }

        setCenters(centersData);
        setLoading(false);
      } catch (err) {
        console.error("Error fetching centers:", err);
        setLoading(false);
      }
    };
    fetchCenters();
  }, []);

  if (loading) {
    return (
      <div style={{ width: "100%", textAlign: "center", marginTop: 80, fontSize: 22 }}>
        Se încarcă centrele...
      </div>
    );
  }

  return (
    <div
      style={{
        width: "100%",
        minHeight: "100vh",
        background: "#f7f7f7",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        padding: "20px",
      }}
    >
      {/* Buton înapoi */}
      <button
        onClick={() => navigate("/")}
        style={{
          position: "absolute",
          top: 20,
          left: 20,
          padding: "10px 15px",
          background: "transparent",
          color: "#007bff",
          border: "none",
          borderRadius: 8,
          cursor: "pointer",
          fontWeight: "bold",
        }}
      >
        {"< "} Înapoi la hartă
      </button>

      <div
        style={{
          width: "100%",
          maxWidth: "850px",
          background: "white",
          padding: "30px",
          borderRadius: 8,
          marginTop: 40,
          boxShadow: "0 2px 10px rgba(0,0,0,0.05)",
        }}
      >
        <h1 style={{ textAlign: "center", marginBottom: 25, color: "#333" }}>
          Gestionare Centre
        </h1>

        {/* Adaugă centru button */}
        <button
          onClick={() => navigate("/admin/add-center")}
          style={{
            width: "100%",
            padding: "12px",
            background: "#007bff",
            color: "white",
            border: "none",
            borderRadius: 6,
            cursor: "pointer",
            fontSize: 16,
            fontWeight: 600,
            marginBottom: 25,
          }}
        >
          + Adaugă centru nou
        </button>

        {/* Lista centrelor */}
        {centers.map((center) => (
          <CenterEditor key={center.id} center={center} />
        ))}
      </div>
    </div>
  );
}

function CenterEditor({ center }) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ ...center });
  const [busy, setBusy] = useState(false);

  const toggle = () => setOpen(!open);

  const handleChange = (key) => (e) =>
    setForm({ ...form, [key]: e.target.value });

  const handleStockChange = (stockId) => (e) => {
    const updated = form.blood_stock.map((s) =>
      s.id === stockId
        ? { ...s, quantity: Number(e.target.value) }
        : s
    );
    setForm({ ...form, blood_stock: updated });
  };

  const saveChanges = async (e) => {
    e.preventDefault();
    setBusy(true);

    try {
      // update center
      await updateDoc(doc(db, "centers", center.id), {
        name: form.name,
        address: form.address,
        latitude: Number(form.latitude),
        longitude: Number(form.longitude),
        contact_phone: form.contact_phone,
        contact_email: form.contact_email,
        program: form.program,
      });

      // update stock
      for (let item of form.blood_stock) {
        await updateDoc(
          doc(db, "centers", center.id, "blood_stock", item.id),
          { quantity: item.quantity }
        );
      }

      alert("Modificări salvate!");
    } catch (err) {
      console.error(err);
      alert("Eroare la actualizare.");
    } finally {
      setBusy(false);
    }
  };

  const deleteCenter = async () => {
    const confirmDelete = window.confirm(
      `Sigur vrei să ștergi centrul "${center.name}"?\nAceastă acțiune este definitivă.`
    );

    if (!confirmDelete) return;

    try {
      setBusy(true);

      // 1. Șterge subcolecția blood_stock
      const stockSnap = await getDocs(
        collection(db, "centers", center.id, "blood_stock")
      );

      for (let docu of stockSnap.docs) {
        await deleteDoc(doc(db, "centers", center.id, "blood_stock", docu.id));
      }

      // 2. Șterge centrul
      await deleteDoc(doc(db, "centers", center.id));

      alert("Centrul a fost șters!");

      // 3. Refresh simplu
      window.location.reload();

    } catch (err) {
      console.error(err);
      alert("Eroare la ștergere.");
    } finally {
      setBusy(false);
    }
  };


  return (
    <div
      style={{
        marginBottom: 20,
        borderRadius: 8,
        overflow: "hidden",
        border: "1px solid #e1e1e1",
        background: "white",
      }}
    >
      {/* header */}
      <div
        onClick={toggle}
        style={{
          padding: 18,
          background: "#fafafa",
          cursor: "pointer",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          fontWeight: 600,
          borderBottom: open ? "1px solid #ddd" : "none",
        }}
      >
        <span>{center.name}</span>
        <span style={{ fontSize: 22 }}>{open ? "▾" : "▸"}</span>
      </div>

      {open && (
        <form
          onSubmit={saveChanges}
          style={{ padding: 20, animation: "fadeIn 0.2s ease" }}
        >
          {/* fields */}
          {[
            ["name", "Nume centru"],
            ["address", "Adresă"],
            ["latitude", "Latitudine"],
            ["longitude", "Longitudine"],
            ["contact_phone", "Telefon"],
            ["contact_email", "Email"],
            ["program", "Program"],
          ].map(([key, label]) => (
            <div key={key} style={{ marginBottom: 15 }}>
              <label style={{ fontWeight: 600, marginBottom: 5, display: "block" }}>
                {label}
              </label>
              <input
                value={form[key]}
                onChange={handleChange(key)}
                style={{
                  width: "100%",
                  padding: 10,
                  border: "1px solid #ddd",
                  borderRadius: 6,
                }}
              />
            </div>
          ))}

          <h3 style={{ marginTop: 20, marginBottom: 10 }}>Stoc de sânge</h3>

          {form.blood_stock.map((item) => (
            <div
              key={item.id}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 20,
                marginBottom: 10,
              }}
            >
              <div style={{ width: 60, fontWeight: 600 }}>{item.blood_group}</div>
              <input
                type="number"
                value={item.quantity}
                onChange={handleStockChange(item.id)}
                style={{
                  padding: 8,
                  width: 100,
                  border: "1px solid #ddd",
                  borderRadius: 6,
                }}
              />
            </div>
          ))}

          <button
            disabled={busy}
            style={{
              marginTop: 20,
              width: "100%",
              padding: "12px",
              background: busy ? "#ccc" : "#4CAF50",
              color: "white",
              border: "none",
              borderRadius: 6,
              fontSize: 16,
              cursor: busy ? "not-allowed" : "pointer",
              fontWeight: 600,
            }}
          >
            {busy ? "Se salvează..." : "Salvează modificări"}
          </button>
          <button
            type="button"
            onClick={deleteCenter}
            disabled={busy}
            style={{
              marginTop: 10,
              width: "100%",
              padding: "12px",
              background: "#dc3545",
              color: "white",
              border: "none",
              borderRadius: 6,
              fontSize: 16,
              cursor: busy ? "not-allowed" : "pointer",
              fontWeight: 600,
            }}
          >
            Șterge centrul
          </button>
        </form>
      )}
    </div>
  );
}

export default AdminPage;
