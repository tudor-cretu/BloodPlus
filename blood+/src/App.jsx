import React, { useEffect, useState } from "react";
import MapComponent from "./MapComponent";
import AuthPage from "./AuthPage";
// import { seedCenters } from "./firebase/seedCenters"; // îl poți lăsa comentat

function App() {
  // "auth" | "map"
  const [screen, setScreen] = useState("auth");

  useEffect(() => {
    const mode = localStorage.getItem("app_mode"); // "guest" | "user" | null
    if (mode === "guest" || mode === "user") setScreen("map");
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
          <MapComponent />

          {/* Mic buton de "logout" pentru test (opțional) */}
          <button
            onClick={logout}
            style={{
              position: "absolute",
              top: 12,
              left: 12,
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
        </>
      )}
    </div>
  );
}

export default App;
