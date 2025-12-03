import React, { useEffect, useRef } from "react";

// 1. Importă modulele necesare din @arcgis/core
import Map from "@arcgis/core/Map";
import MapView from "@arcgis/core/views/MapView";
import esriConfig from "@arcgis/core/config";

// 2. Importă CSS-ul (Obligatoriu pentru a se afișa corect)
import "@arcgis/core/assets/esri/themes/light/main.css";

const MapComponent = () => {
  // Folosim useRef pentru a crea o referință către elementul <div> din DOM
  const mapDiv = useRef(null);

  useEffect(() => {
    // Setează API Key-ul
    const apiKey = import.meta.env.VITE_ARCGIS_API_KEY; 
    
    esriConfig.apiKey = apiKey;

    let view;

    if (mapDiv.current) {
      // A. Definește harta
      const map = new Map({
        basemap: "arcgis/topographic"
      });

      // B. Definește View-ul și leagă-l de "mapDiv.current"
      view = new MapView({
        container: mapDiv.current, // Aici folosim referința, nu un ID string
        map: map,
        center: [26.10, 44.42], // București
        zoom: 13
      });
    }

    // Curățare (Cleanup): Distruge harta când componenta este ștearsă (unmount)
    // pentru a elibera memoria.
    return () => {
      if (view) {
        view.destroy();
      }
    };
  }, []); // [] asigură că harta se inițializează o singură dată

  // Returnăm div-ul care va ține harta. Îi dăm stiluri inline pentru exemplu.
  return <div className="mapDiv" ref={mapDiv} style={{ height: "100vh", width: "100%" }}></div>;
};

export default MapComponent;