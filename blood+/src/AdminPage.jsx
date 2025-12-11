import { collection, getDocs, doc, updateDoc } from "firebase/firestore";
import { db } from "./firebase/firebaseConfig.js";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

function AdminPage() {
  const [centers, setCenters] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate(); 

  useEffect(() => {
    console.log("AdminPage mounted, fetching centers...");
    const fetchCenters = async () => {
        try {
            const snap = await getDocs(collection(db, "centers"));
            const centersData = [];

            for (let centerDoc of snap.docs) {
                const stockSnap = await getDocs(collection(db, "centers", centerDoc.id, "blood_stock"));
                const stockData = stockSnap.docs.map(s => ({ id: s.id, ...s.data() }));

                centersData.push({
                    id: centerDoc.id,
                    ...centerDoc.data(),
                    blood_stock: stockData
                });
            }

            setCenters(centersData);
            setLoading(false);
        } catch (error) {
            console.error("Error fetching centers:", error); // ✅ DEBUG
            setLoading(false);
        }
    };
    fetchCenters();
  }, []);

  console.log("Loading:", loading, "Centers:", centers);

  if (loading) {
    return <div style={{ padding: 20, fontSize: 20 }}>Se încarcă centrele...</div>;
  }

  if (centers.length === 0) {
    return (
      <div style={{ padding: 20 }}>
        <h1>Nu există centre în baza de date</h1>
        <button onClick={() => navigate("/")}>⟵ Înapoi la hartă</button>
      </div>
    );
  }

 return (
    <div style={{
        width: "100%",
        minHeight: "100vh",
        background: "#f5f5f5",
        display: "flex",
        flexDirection: "column",
        alignItems: "center"
    }}>
    <button
        onClick={() => navigate("/")}
        style={{
            position: "absolute",
            top: 20,
            left: 20,
            padding: "10px 20px",
            background: "white",
            border: "1px solid #ccc",
            borderRadius: 8,
            cursor: "pointer",
            zIndex: 1000
        }}
        >
        ⟵ Înapoi la hartă
    </button>
    <div style={{ width: "100%", maxWidth: "900px", padding: 20 }}>

      <h1 style={{ marginBottom: 30 }}>Gestionare Centre</h1>
      
      {centers.map(center => (
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

  const handleChange = (key) => (e) => setForm({ ...form, [key]: e.target.value });

  // Modificarea stocului
  const handleStockChange = (stockId) => (e) => {
    const newStock = form.blood_stock.map(item =>
      item.stock_id === stockId ? { ...item, quantity: Number(e.target.value) } : item
    );
    setForm({ ...form, blood_stock: newStock });
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    setBusy(true);
    try {
      const centerRef = doc(db, "centers", center.id);

      await updateDoc(centerRef, {
        name: form.name,
        address: form.address,
        latitude: Number(form.latitude),
        longitude: Number(form.longitude),
        contact_phone: form.contact_phone,
        contact_email: form.contact_email,
        program: form.program,
      });
      for (let item of form.blood_stock) {
        const stockRef = doc(db, "centers", center.id, "blood_stock", item.id);
        await updateDoc(stockRef, {
            quantity: item.quantity
        });
    }

        alert("Centru actualizat cu succes!");
    } catch(err) {
        console.error("Eroare COMPLETĂ:", err);
        console.error("Eroare mesaj:", err.message);
        console.error("Eroare cod:", err.code);
        alert("Eroare la actualizarea centrului");
    } finally {
        setBusy(false);
    }
  };

  return (
    <div
        style={{
        marginBottom: 20,
        width: "100%",
        background: "white",
        borderRadius: 8,
        border: "1px solid #ccc",
        overflow: "hidden"
        }}
    >

        {/* HEADER CLICKABLE */}
        <div
        onClick={toggle}
        style={{
            padding: 20,
            background: "#fafafa",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            cursor: "pointer",
            borderBottom: open ? "1px solid #ddd" : "none"
        }}
        >
        <h3 style={{ margin: 0 }}>{form.name}</h3>
        <span style={{ fontSize: 22 }}>
            {open ? "▾" : "▸"}
        </span>
        </div>

        {/* FORMUL CLASIC — ignorat până aici, păstrat IDENTIC */}
        {open && (
        <form
            onSubmit={onSubmit}
            style={{
            padding: 20
            }}
        >
            <label style={{ display: "block", marginBottom: 5, fontWeight: 600 }}>Nume centru:</label>
            <input
            value={form.name}
            onChange={handleChange("name")}
            style={{ display: "block", marginBottom: 15, padding: 10, width: "100%" }}
            />

            <label style={{ display: "block", marginBottom: 5, fontWeight: 600 }}>Adresă:</label>
            <input
            value={form.address}
            onChange={handleChange("address")}
            style={{ display: "block", marginBottom: 15, padding: 10, width: "100%" }}
            />

            <label style={{ display: "block", marginBottom: 5, fontWeight: 600 }}>Latitudine:</label>
            <input
            value={form.latitude}
            onChange={handleChange("latitude")}
            style={{ display: "block", marginBottom: 15, padding: 10, width: "100%" }}
            />

            <label style={{ display: "block", marginBottom: 5, fontWeight: 600 }}>Longitudine:</label>
            <input
            value={form.longitude}
            onChange={handleChange("longitude")}
            style={{ display: "block", marginBottom: 15, padding: 10, width: "100%" }}
            />

            <label style={{ display: "block", marginBottom: 5, fontWeight: 600 }}>Telefon:</label>
            <input
            value={form.contact_phone}
            onChange={handleChange("contact_phone")}
            style={{ display: "block", marginBottom: 15, padding: 10, width: "100%" }}
            />

            <label style={{ display: "block", marginBottom: 5, fontWeight: 600 }}>Email:</label>
            <input
            value={form.contact_email}
            onChange={handleChange("contact_email")}
            style={{ display: "block", marginBottom: 15, padding: 10, width: "100%" }}
            />

            <label style={{ display: "block", marginBottom: 5, fontWeight: 600 }}>Program:</label>
            <input
            value={form.program}
            onChange={handleChange("program")}
            style={{ display: "block", marginBottom: 15, padding: 10, width: "100%" }}
            />

            <h4 style={{ marginTop: 20 }}>Stoc sânge</h4>
            {form.blood_stock.map(item => (
            <div 
                key={item.stock_id}
                style={{
                marginBottom: 10,
                display: "flex",
                alignItems: "center",
                gap: 20
                }}
            >
                <div style={{ width: 80, fontWeight: 600 }}>
                {item.blood_group}:
                </div>

                <input
                type="number"
                value={item.quantity}
                onChange={handleStockChange(item.stock_id)}
                style={{
                    padding: 8,
                    width: 100,
                    border: "1px solid #ccc",
                    borderRadius: 6
                }}
                />
            </div>
            ))}

            <button
            type="submit"
            disabled={busy}
            style={{
                marginTop: 20,
                padding: "12px 24px",
                cursor: busy ? "not-allowed" : "pointer",
                background: busy ? "#ccc" : "#4CAF50",
                color: "white",
                border: "none",
                borderRadius: 6,
                fontSize: 16,
                fontWeight: 600
            }}
            >
            {busy ? "Se actualizează..." : "Salvează modificări"}
            </button>
        </form>
        )}

    </div>
    );

}

export default AdminPage;
