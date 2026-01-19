import React, { useEffect, useState } from "react";
import MapComponent from "./MapComponent";
import AuthPage from "./AuthPage";
import { auth, db } from "./firebase/firebaseConfig.js";
import { onAuthStateChanged } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { useNavigate } from "react-router-dom";
// import { seedCenters } from "./firebase/seedCenters"; // îl poți lăsa comentat

function App() {
  // "auth" | "map"
  const [screen, setScreen] = useState("auth");
  const [currentUser, setCurrentUser] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    const mode = localStorage.getItem("app_mode"); // "guest" | "user" | null
    if (mode === "guest") {
      setScreen("map"); // guest merge direct pe hartă
      setCurrentUser(null); // nu avem user
      return;
    }

    if (mode === "user") {
      setScreen("map");

      // ✅ Folosește onAuthStateChanged pentru a detecta userul
      const unsubscribe = onAuthStateChanged(auth, async (user) => {
        if (user) {
          const docSnap = await getDoc(doc(db, "users", user.uid));
          if (docSnap.exists()) {
            setCurrentUser(docSnap.data());
          }
        } else {
          setCurrentUser(null);
        }
      });

      return () => unsubscribe();
    }
  }, []);


  const enterAsGuest = () => {
    localStorage.setItem("app_mode", "guest");
    setScreen("map");
  };

  const enterAsUser = () => {
    localStorage.setItem("app_mode", "user");
    setScreen("map");
  };

  const logout = () => {
    localStorage.removeItem("app_mode");
    setScreen("auth");
    setCurrentUser(null);
  };

  return (
    <div style={{ width: "100vw", height: "100vh" }}>
      {screen === "auth" ? (
        <AuthPage
          onContinueAsGuest={enterAsGuest}
          onAuthSuccess={enterAsUser}
        />
      ) : (
        <>
          <MapComponent currentUser={currentUser} />

          {/* Mic buton de "logout" pentru test (opțional) */}
          <button
            onClick={logout}
            style={{
              position: "absolute",
              top: 13,
              left: 50,
              zIndex: 2000,
              padding: "8px 10px",
              borderRadius: 10,
              border: "1px solid rgba(0,0,0,0.2)",
              background: "white",
              cursor: "pointer",
              fontFamily: "Arial, sans-serif",
            }}
          >
            ⟵ Back to Login
          </button>
          {/* Buton Admin – vizibil doar pentru admin */}
          {currentUser?.role === "admin" && (
            <button
              // onClick={() => window.location.href = "/admin"} // asigură-te că ai React Router
              onClick={() => navigate("/admin")}
              style={{
                position: "absolute",
                bottom: 145,
                left: 22,
                zIndex: 2000,
                padding: "8px 10px",
                borderRadius: 10,
                border: "1px solid rgba(0,0,0,0.2)",
                background: "linear-gradient(135deg, #d32f2f, #ff5252)",
                color: "white",
                fontWeight: 700,
                cursor: "pointer",
                fontFamily: "Arial, sans-serif",
              }}
            >
              Admin Panel
            </button>
          )}
          {/* Buton My Account – vizibil doar pentru donor */}
          {currentUser && currentUser.role === "donor" && (
          <button
            onClick={() => navigate("/account")}
            style={{
              position: "absolute",
              bottom: 145,
              left: 22,
              zIndex: 2000,
              padding: "8px 10px",
              borderRadius: 10,
              border: "1px solid rgba(0,0,0,0.2)",
              background: "linear-gradient(135deg, #d32f2f, #ff5252)",
              color: "white",
              fontWeight: 700,
              cursor: "pointer",
              fontFamily: "Arial, sans-serif",
            }}
          >
            My Account
          </button>
        )}
        </>
      )}
    </div>
  );
}

export default App;
