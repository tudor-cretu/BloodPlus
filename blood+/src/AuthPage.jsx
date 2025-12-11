import React, { useMemo, useState } from "react";
import { auth, db } from "./firebase/firebaseConfig.js";
import { 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword 
} from "firebase/auth";
import { doc, setDoc } from "firebase/firestore";


/**
 * AuthPage.jsx
 * - Login / Register tabs
 * - Continue as guest button
 * - Minimal validation + nice UI
 * - No backend calls (frontend only)
 */
export default function AuthPage({ onContinueAsGuest, onAuthSuccess }) {
  const [mode, setMode] = useState("login"); // "login" | "register"
  const [busy, setBusy] = useState(false);
  const [showPw, setShowPw] = useState(false);

  const [form, setForm] = useState({
    email: "",
    password: "",
    confirmPassword: "",
    name: "",
    blood_group: "",
    agree: false,
  });

  const errors = useMemo(() => {
    const e = {};
    const email = form.email.trim();
    const pw = form.password;

    if (!email) e.email = "Adresa de email este obligatorie.";
    else if (!/^\S+@\S+\.\S+$/.test(email)) e.email = "Adresa de email nu este validă.";

    if (!pw) e.password = "Parola este obligatorie.";
    else if (pw.length < 6) e.password = "Parola trebuie să aibă cel puțin 6 caractere.";

    if (mode === "register") {
      if (!form.name.trim()) e.name = "Numele este obligatoriu.";
      if (!form.confirmPassword) e.confirmPassword = "Te rugăm să confirmi parola.";
      else if (form.confirmPassword !== pw) e.confirmPassword = "Parolele nu coincid.";
      if (!form.blood_group) e.blood_group = "Trebuie să selectezi grupa sanguină.";
      if (!form.agree) e.agree = "Trebuie să accepți termenii și condițiile.";
    }

    return e;
  }, [form, mode]);

  const canSubmit = Object.keys(errors).length === 0 && !busy;

  const set = (key) => (ev) => {
    const v = ev?.target?.type === "checkbox" ? ev.target.checked : ev.target.value;
    setForm((s) => ({ ...s, [key]: v }));
  };

  const onSubmit = async (ev) => {
    ev.preventDefault();
    if (!canSubmit) return;

    setBusy(true);
    try {
      if (mode === "login") {
        // LOGIN
        await signInWithEmailAndPassword(auth, form.email, form.password);

      } else {
        // REGISTER
        const res = await createUserWithEmailAndPassword(auth, form.email, form.password);
        const uid = res.user.uid;

        await setDoc(doc(db, "users", uid), {
          name: form.name,
          email: form.email,
          role: "donor",  // oricine se înregistrează devine user normal
          blood_group: form.blood_group,
          createdAt: Date.now()
        });
      }

      // frontend only
      if (onAuthSuccess) onAuthSuccess();
    } catch (err) {
      console.error("Auth error:", err);
      alert("Eroare la creare cont: " + err.message);
    } finally {
      setBusy(false);
    }
  };

  const continueAsGuest = () => {
    if (onContinueAsGuest) onContinueAsGuest();
  };

  return (
    <div style={styles.page}>
      <div style={styles.shell}>
        {/* Left / Brand */}
        <section style={styles.left}>
          <div style={styles.brandRow}>
            <div style={styles.logo}>
            <img
                src="/bloodplus_logo_wo_text.png"
                alt="Logo"
                style={{ width: "28px", height: "28px", display: "block" }}
            />
            </div>
            <div>
              <div style={styles.brand}>Blood+</div>
              <div style={styles.tagline}>Donează. Găsește centre. Salvează vieți.</div>
            </div>
          </div>

          <div style={styles.featureBox}>
            <ul style={{ ...styles.featureList, listStyle: "none", paddingLeft: 0, margin: 0 }}>
            <li style={{ display: "flex", gap: 10, alignItems: "flex-start", marginBottom: 10 }}>
                <span aria-hidden="true">🩸</span>
                <span>Găsește cel mai apropiat centru de donare</span>
            </li>

            <li style={{ display: "flex", gap: 10, alignItems: "flex-start", marginBottom: 10 }}>
                <span aria-hidden="true">🩸</span>
                <span>Verifică disponibilitatea stocurilor de sânge</span>
            </li>

            <li style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
                <span aria-hidden="true">🩸</span>
                <span>Obține indicații instantanee</span>
            </li>
            </ul>
          </div>

          <button type="button" onClick={continueAsGuest} style={styles.guestBtn}>
            Continuă fără cont →
          </button>

          <div style={{ ...styles.smallNote, textAlign: "center" }}>
            Nu este nevoie de cont pentru a explora harta. Poți crea unul oricând.
          </div>
        </section>

        {/* Right / Form */}
        <section style={styles.right}>
          <div style={styles.tabs}>
            <button
              type="button"
              onClick={() => setMode("login")}
              style={{ ...styles.tab, ...(mode === "login" ? styles.tabActive : {}) }}
            >
              Autentificare
            </button>
            <button
              type="button"
              onClick={() => setMode("register")}
              style={{ ...styles.tab, ...(mode === "register" ? styles.tabActive : {}) }}
            >
              Înregistrare
            </button>
          </div>

          <div style={styles.card}>
            <h1 style={styles.title}>{mode === "login" ? "Bine ai revenit" : "Creează un cont"}</h1>
            <p style={styles.subtitle}>
              {mode === "login"
                ? "Autentifică-te pentru a-ți gestiona profilul și alertele."
                : "Înregistrează-te pentru a primi actualizări și a salva centrele preferate."}
            </p>

            <form onSubmit={onSubmit} style={styles.form} noValidate>
              {mode === "register" && (
                <Field
                  label="Nume complet"
                  value={form.name}
                  onChange={set("name")}
                  placeholder="e.g., Andrei Popescu"
                  error={errors.name}
                />
              )}

              <Field
                label="Email"
                value={form.email}
                onChange={set("email")}
                placeholder="name@example.com"
                error={errors.email}
                inputMode="email"
              />

              <div style={{ marginBottom: 14 }}>
                <label style={styles.label}>Parolă</label>
                <div style={styles.pwRow}>
                  <input
                    style={{ ...styles.input, marginBottom: 0, flex: 1 }}
                    type={showPw ? "text" : "password"}
                    value={form.password}
                    onChange={set("password")}
                    placeholder="••••••••"
                    autoComplete={mode === "login" ? "current-password" : "new-password"}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPw((s) => !s)}
                    style={styles.pwToggle}
                    aria-label={showPw ? "Ascunde parola" : "Arată parola"}
                  >
                    {showPw ? "Ascunde" : "Arată"}
                  </button>
                </div>
                {errors.password && <div style={styles.error}>{errors.password}</div>}
              </div>

              {mode === "register" && (
                <Field
                  label="Confirmă parola"
                  type={showPw ? "text" : "password"}
                  value={form.confirmPassword}
                  onChange={set("confirmPassword")}
                  placeholder="••••••••"
                  error={errors.confirmPassword}
                />
              )}

              {mode === "register" && (
                <div style={{ marginBottom: 14 }}>
                  <label style={styles.label}>Grupa sanguină</label>
                  <select
                    style={styles.input}
                    value={form.blood_group}
                    onChange={(e) =>
                      setForm((prev) => ({ ...prev, blood_group: e.target.value }))
                    }
                    required
                  >
                    <option value="">Selectează grupa</option>
                    <option value="A+">A+</option>
                    <option value="A-">A-</option>
                    <option value="B+">B+</option>
                    <option value="B-">B-</option>
                    <option value="AB+">AB+</option>
                    <option value="AB-">AB-</option>
                    <option value="O+">O+</option>
                    <option value="O-">O-</option>
                  </select>
                  {errors.blood_group && <div style={styles.error}>{errors.blood_group}</div>}
                </div>
              )}


              {mode === "register" && (
                <div style={{ marginBottom: 14 }}>
                  <label style={styles.checkRow}>
                    <input
                      type="checkbox"
                      checked={form.agree}
                      onChange={set("agree")}
                      style={styles.checkbox}
                    />
                    <span>
                      Sunt de acord cu <a href="#" style={styles.link}>Termenii</a> și{" "}
                      <a href="#" style={styles.link}>Politica de confidențialitate</a>.
                    </span>
                  </label>
                  {errors.agree && <div style={styles.error}>{errors.agree}</div>}
                </div>
              )}

              {mode === "login" && (
                <div style={styles.rowBetween}>
                  <label style={styles.checkRow}>
                    <input type="checkbox" style={styles.checkbox} />
                    <span>Ține-mă minte</span>
                  </label>
                  <a href="#" style={styles.link}>
                    Ai uitat parola?
                  </a>
                </div>
              )}

              <button type="submit" disabled={!canSubmit} style={styles.primaryBtn}>
                {busy ? "Așteaptă…" : mode === "login" ? "Intră în cont" : "Creează cont"}
              </button>

            </form>
          </div>
        </section>
      </div>
    </div>
  );
}

function Field({
  label,
  error,
  type = "text",
  ...props
}) {
  return (
    <div style={{ marginBottom: 14 }}>
      <label style={styles.label}>{label}</label>
      <input style={styles.input} type={type} {...props} />
      {error && <div style={styles.error}>{error}</div>}
    </div>
  );
}

const styles = {
  page: {
    minHeight: "100vh",
    display: "grid",
    placeItems: "center",
    background:
      "radial-gradient(1200px 600px at 20% 0%, rgba(211,47,47,0.18), transparent 60%), radial-gradient(900px 500px at 90% 20%, rgba(0,121,193,0.16), transparent 55%), #0b1020",
    padding: 18,
  },
  shell: {
    width: "min(1100px, 100%)",
    display: "grid",
    gridTemplateColumns: "1.05fr 0.95fr",
    gap: 14,
  },
  left: {
    borderRadius: 22,
    padding: 22,
    color: "white",
    background: "linear-gradient(160deg, rgba(255,255,255,0.10), rgba(255,255,255,0.04))",
    border: "1px solid rgba(255,255,255,0.14)",
    boxShadow: "0 18px 60px rgba(0,0,0,0.35)",
    backdropFilter: "blur(10px)",
    display: "flex",
    flexDirection: "column",
    justifyContent: "space-between",
    minHeight: 560,
  },
  right: {
    borderRadius: 22,
    padding: 14,
    background: "rgba(255,255,255,0.92)",
    border: "1px solid rgba(255,255,255,0.55)",
    boxShadow: "0 18px 60px rgba(0,0,0,0.35)",
    minHeight: 560,
    display: "flex",
    flexDirection: "column",
    justifyContent: "space-between",
  },
  brandRow: { display: "flex", gap: 12, alignItems: "center" },
  logo: {
    width: 44,
    height: 44,
    borderRadius: 14,
    display: "grid",
    placeItems: "center",
    background: "rgba(255,255,255,0.14)",
    border: "1px solid rgba(255,255,255,0.18)",
    fontSize: 22,
  },
  brand: { fontSize: 20, fontWeight: 800, letterSpacing: 0.2 },
  tagline: { opacity: 0.85, fontSize: 13, marginTop: 2 },
  featureBox: {
    marginTop: 22,
    borderRadius: 18,
    padding: 16,
    background: "rgba(0,0,0,0.18)",
    border: "1px solid rgba(255,255,255,0.12)",
  },
  featureTitle: { fontWeight: 700, marginBottom: 10 },
  featureList: { margin: 0, paddingLeft: 18, lineHeight: 1.7, opacity: 0.92 },
  guestBtn: {
    marginTop: 16,
    borderRadius: 14,
    padding: "12px 14px",
    border: "1px solid rgba(255,255,255,0.22)",
    background: "rgba(255,255,255,0.10)",
    color: "white",
    fontWeight: 700,
    cursor: "pointer",
  },
  smallNote: { marginTop: 10, fontSize: 12, opacity: 0.8, lineHeight: 1.45 },
  tabs: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: 8,
    padding: 8,
    borderRadius: 16,
    background: "rgba(0,0,0,0.05)",
  },
  tab: {
    padding: "10px 12px",
    borderRadius: 14,
    border: "1px solid rgba(0,0,0,0.06)",
    background: "transparent",
    cursor: "pointer",
    fontWeight: 800,
    color: "rgba(0,0,0,0.65)",
  },
  tabActive: {
    background: "white",
    color: "#111",
    boxShadow: "0 6px 16px rgba(0,0,0,0.10)",
  },
  card: { padding: 14 },
  title: { margin: "10px 0 6px 0", fontSize: 26, letterSpacing: -0.2 },
  subtitle: { margin: "0 0 16px 0", color: "rgba(0,0,0,0.62)", lineHeight: 1.35 },
  form: { display: "flex", flexDirection: "column" },
  label: { display: "block", fontSize: 12, fontWeight: 800, marginBottom: 6, color: "#222" },
  input: {
    width: "100%",
    padding: "11px 12px",
    borderRadius: 14,
    border: "1px solid rgba(0,0,0,0.12)",
    outline: "none",
    fontSize: 14,
    background: "white",
    marginBottom: 6,
  },
  error: { color: "#c62828", fontSize: 12, marginTop: 4 },
  pwRow: { display: "flex", gap: 8, alignItems: "center" },
  pwToggle: {
    padding: "10px 12px",
    borderRadius: 14,
    border: "1px solid rgba(0,0,0,0.12)",
    background: "white",
    cursor: "pointer",
    fontWeight: 700,
  },
  rowBetween: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 },
  checkRow: { display: "flex", gap: 10, alignItems: "center", fontSize: 13, color: "rgba(0,0,0,0.75)" },
  checkbox: { width: 16, height: 16 },
  link: { color: "#0079c1", textDecoration: "none", fontWeight: 700 },
  primaryBtn: {
    width: "100%",
    padding: "12px 14px",
    borderRadius: 14,
    border: "none",
    cursor: "pointer",
    fontWeight: 800,
    color: "white",
    background: "linear-gradient(135deg, #d32f2f, #ff5252)",
    boxShadow: "0 12px 26px rgba(211,47,47,0.25)",
    opacity: 1,
  },
  secondaryBtn: {
    width: "100%",
    padding: "12px 14px",
    borderRadius: 14,
    border: "1px solid rgba(0,0,0,0.12)",
    cursor: "pointer",
    fontWeight: 800,
    background: "white",
  },
  dividerRow: { display: "flex", alignItems: "center", gap: 10, margin: "16px 0" },
  divider: { height: 1, flex: 1, background: "rgba(0,0,0,0.12)" },
  dividerText: { fontSize: 12, color: "rgba(0,0,0,0.55)", fontWeight: 800 },
  footerText: { marginTop: 14, fontSize: 13, color: "rgba(0,0,0,0.68)", textAlign: "center" },
  textBtn: {
    border: "none",
    background: "transparent",
    color: "#0079c1",
    fontWeight: 900,
    cursor: "pointer",
    padding: 0,
  },
  rightNote: { padding: "0 14px 14px 14px", fontSize: 12, color: "rgba(0,0,0,0.55)" },
};
