import React, { useEffect, useRef, useState } from "react";

// --- ArcGIS Imports ---
import Map from "@arcgis/core/Map";
import MapView from "@arcgis/core/views/MapView";
import GraphicsLayer from "@arcgis/core/layers/GraphicsLayer";
import Graphic from "@arcgis/core/Graphic";
import Point from "@arcgis/core/geometry/Point";
import * as geometryEngine from "@arcgis/core/geometry/geometryEngine";
import Search from "@arcgis/core/widgets/Search";
import * as route from "@arcgis/core/rest/route";
import RouteParameters from "@arcgis/core/rest/support/RouteParameters";
import FeatureSet from "@arcgis/core/rest/support/FeatureSet";
// [FIX 1] Importăm utilitarul de conversie
import * as webMercatorUtils from "@arcgis/core/geometry/support/webMercatorUtils"; 
import esriConfig from "@arcgis/core/config";
import "@arcgis/core/assets/esri/themes/light/main.css";

// --- Firebase Imports ---
import { getDocs } from "firebase/firestore";
// Verifică dacă calea e corectă (ai scris ./firebase/firebaseService în ultimul mesaj)
import { centersCollection } from "./firebase/firebaseService"; 

const MapComponent = () => {
  const mapDiv = useRef(null);
  const viewRef = useRef(null);
  const graphicsLayerRef = useRef(null);
  const routeLayerRef = useRef(null);
  const centersRef = useRef([]); 
  const [allCenters, setAllCenters] = useState([]);

  useEffect(() => {
    const apiKey = import.meta.env.VITE_ARCGIS_API_KEY;
    esriConfig.apiKey = apiKey;

    const initializeMap = async () => {
      if (mapDiv.current) {
        const map = new Map({ basemap: "arcgis/topographic" });

        const graphicsLayer = new GraphicsLayer();
        graphicsLayerRef.current = graphicsLayer;
        map.add(graphicsLayer);

        const routeLayer = new GraphicsLayer();
        routeLayerRef.current = routeLayer;
        map.add(routeLayer);

        const view = new MapView({
          container: mapDiv.current,
          map: map,
          center: [26.10, 44.42], 
          zoom: 12
        });
        viewRef.current = view;

        const searchWidget = new Search({
          view: view,
          popupEnabled: false,
          resultGraphicEnabled: false
        });
        view.ui.add(searchWidget, "top-right");

        searchWidget.on("select-result", async (event) => {
          console.log("📍 Adresă găsită:", event.result.name);
          const userLocation = event.result.feature.geometry;
          
          drawUserLocation(userLocation);

          const currentCenters = centersRef.current; 
          if (currentCenters.length === 0) {
            alert("Așteaptă încărcarea centrelor.");
            return;
          }

          await findNearestCenterAndRoute(userLocation, currentCenters);
        });

        try {
          const snapshot = await getDocs(centersCollection);
          const centersData = [];
          snapshot.forEach((doc) => {
            const data = doc.data();
            if (data.latitude && data.longitude) {
              centersData.push(data);
            }
          });
          setAllCenters(centersData); 
          centersRef.current = centersData; 
        } catch (error) {
          console.error("Eroare Firebase:", error);
        }
      }
    };

    initializeMap();

    return () => {
      if (viewRef.current) viewRef.current.destroy();
    };
  }, []); 

  useEffect(() => {
    if (!graphicsLayerRef.current || allCenters.length === 0) return;
    graphicsLayerRef.current.removeAll();
    allCenters.forEach(center => {
      const g = new Graphic({
        geometry: new Point({ latitude: center.latitude, longitude: center.longitude }),
        symbol: {
          type: "simple-marker",
          color: [226, 6, 19],
          outline: { color: "white", width: 1 }
        },
        popupTemplate: { title: "{name}", content: "{address}" },
        attributes: center
      });
      graphicsLayerRef.current.add(g);
    });
  }, [allCenters]);

  const drawUserLocation = (geometry) => {
    if (!routeLayerRef.current) return;
    routeLayerRef.current.removeAll();
    const userGraphic = new Graphic({
      geometry: geometry,
      symbol: {
        type: "simple-marker",
        style: "diamond",
        color: "blue",
        size: "14px",
        outline: { color: "white", width: 2 }
      }
    });
    routeLayerRef.current.add(userGraphic);
  };

  // --- [FIX 2] LOGICA DE DISTANȚĂ REPARATĂ ---
  const findNearestCenterAndRoute = async (userPoint, centersList) => {
    let closestCenter = null;
    let minDistance = Infinity;

    centersList.forEach((center) => {
      // 1. Creăm punctul centrului în Grade (WGS84) - cum e în baza de date
      const centerGeo = new Point({ 
        latitude: Number(center.latitude), 
        longitude: Number(center.longitude),
        spatialReference: { wkid: 4326 } // Important: Îi spunem că e GPS
      });

      // 2. Îl convertim în Metri (Web Mercator) ca să fie la fel ca userPoint
      const centerLinear = webMercatorUtils.geographicToWebMercator(centerGeo);

      // 3. Acum calculăm distanța (Metri vs Metri) -> Rezultat Corect!
      const dist = geometryEngine.distance(userPoint, centerLinear, "kilometers");
      
      console.log(`Distanță către ${center.name}: ${dist.toFixed(2)} km`);

      if (dist < minDistance) {
        minDistance = dist;
        closestCenter = center;
      }
    });

    if (closestCenter) {
      console.log(`🏆 Cel mai apropiat: ${closestCenter.name}`);
      await solveRoute(userPoint, closestCenter);
    }
  };

  // --- [FIX 3] AFIȘAREA RUTEI REPARATĂ ---
  const solveRoute = async (startPoint, centerData) => {
    const routeUrl = "https://route-api.arcgis.com/arcgis/rest/services/World/Route/NAServer/Route_World";
    
    // Punctul final trebuie să aibă sistemul de coordonate definit (4326 = GPS)
    const endPoint = new Point({ 
        latitude: Number(centerData.latitude), 
        longitude: Number(centerData.longitude),
        spatialReference: { wkid: 4326 }
    });

    const routeParams = new RouteParameters({
      stops: new FeatureSet({
        features: [
          new Graphic({ geometry: startPoint }),
          new Graphic({ geometry: endPoint })
        ]
      }),
      returnDirections: false,
      // CRITIC: Cerem serviciului să ne dea linia în sistemul hărții (Web Mercator)
      // Altfel ne dă linia în grade și pare invizibilă pe hartă
      outSpatialReference: { wkid: 3857 }
    });

    try {
      const data = await route.solve(routeUrl, routeParams);
      if (data.routeResults.length > 0) {
        const result = data.routeResults[0].route;
        result.symbol = {
          type: "simple-line",
          color: [50, 50, 255, 0.8],
          width: 5
        };
        
        // Adăugăm ruta, dar lăsăm pinul utilizatorului acolo
        routeLayerRef.current.add(result);
        
        // Facem zoom să se vadă tot
        viewRef.current.goTo(result.geometry.extent.expand(1.2));
      }
    } catch (error) {
      console.error("❌ Eroare Rutare:", error);
      alert("Nu s-a putut calcula ruta.");
    }
  };

  return <div className="mapDiv" ref={mapDiv} style={{ height: "100vh", width: "100%" }}></div>;
};

export default MapComponent;