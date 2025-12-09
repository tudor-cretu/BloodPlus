import React, { useEffect, useRef } from "react";

// 1. ArcGIS Imports
import Map from "@arcgis/core/Map";
import MapView from "@arcgis/core/views/MapView";
import GraphicsLayer from "@arcgis/core/layers/GraphicsLayer";
import Graphic from "@arcgis/core/Graphic";
import esriConfig from "@arcgis/core/config";
import "@arcgis/core/assets/esri/themes/light/main.css";

// 2. Firebase Imports
import { getDocs } from "firebase/firestore";
// Importăm referința la colecție creată de tine
import { centersCollection } from "./firebase/firebaseService"; 

const MapComponent = () => {
  const mapDiv = useRef(null);

  useEffect(() => {
    // Setează API Key-ul
    const apiKey = import.meta.env.VITE_ARCGIS_API_KEY; 
    esriConfig.apiKey = apiKey;

    let view;

    const initializeMap = async () => {
      if (mapDiv.current) {
        
        // A. Creăm Harta
        const map = new Map({
          basemap: "arcgis/topographic" 
        });

        // B. Adăugăm stratul pentru markeri (GraphicsLayer)
        const graphicsLayer = new GraphicsLayer();
        map.add(graphicsLayer);

        // C. Inițializăm View-ul (Camera)
        view = new MapView({
          container: mapDiv.current,
          map: map,
          center: [26.10, 44.42], // București
          zoom: 12
        });

        // D. Aducem datele din Firestore
        try {
          const snapshot = await getDocs(centersCollection);

          snapshot.forEach((doc) => {
            const data = doc.data();
            
            // Verificăm dacă avem coordonate (lat/long din imaginea ta Firestore)
            if (data.latitude && data.longitude) {
              
              // 1. Geometria (Locația)
              const point = {
                type: "point",
                longitude: data.longitude, // ex: 26.081417
                latitude: data.latitude    // ex: 44.387972
              };

              // 2. Simbolul (Punct Roșu)
              const markerSymbol = {
                type: "simple-marker",
                color: [226, 6, 19], // Roșu (Sânge)
                outline: { color: [255, 255, 255], width: 1 }
              };

              // 3. Popup (Ce afișăm la click)
              // Folosim câmpurile din modelele tale: name, address, program
              const popupTemplate = {
                title: "{name}", 
                content: `
                  <div style="padding: 5px;">
                    <p><b>Adresă:</b> {address}</p>
                    <p><b>Program:</b> {program}</p>
                    <p><b>Contact:</b> {contact_phone}</p>
                    <p style="margin-top:10px; font-size: 0.9em; color: gray;">ID: {center_id}</p>
                  </div>
                `
              };

              // 4. Creăm Graficul
              const pointGraphic = new Graphic({
                geometry: point,
                symbol: markerSymbol,
                attributes: data, // Aici injectăm datele din Firestore în graphic
                popupTemplate: popupTemplate
              });

              // 5. Îl punem pe hartă
              graphicsLayer.add(pointGraphic);
            }
          });

        } catch (error) {
          console.error("Eroare la citirea centrelor:", error);
        }
      }
    };

    initializeMap();

    // Cleanup la unmount
    return () => {
      if (view) {
        view.destroy();
      }
    };
  }, []);

  return <div className="mapDiv" ref={mapDiv} style={{ height: "100vh", width: "100%" }}></div>;
};

export default MapComponent;