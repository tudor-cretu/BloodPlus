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
import * as webMercatorUtils from "@arcgis/core/geometry/support/webMercatorUtils";
import esriConfig from "@arcgis/core/config";
import "@arcgis/core/assets/esri/themes/light/main.css";

// --- Firebase Imports ---
import { getDocs } from "firebase/firestore";
import { centersCollection } from "./firebase/firebaseService";

const MapComponent = () => {
  const mapDiv = useRef(null);
  const [isMapLoaded, setIsMapLoaded] = useState(false);

  // Stocăm centrele într-un ref pentru a fi accesibile instantaneu în funcțiile hărții
  const centersDataRef = useRef([]);

  useEffect(() => {
    // 1. Configurare API Key
    const apiKey = import.meta.env.VITE_ARCGIS_API_KEY;
    esriConfig.apiKey = apiKey;

    // Variabilă locală pentru a păstra instanța hărții
    let myMapView = null;

    const initializeMap = async () => {
      if (mapDiv.current) {
        // --- A. Setup Hartă ---
        const map = new Map({ basemap: "arcgis/navigation" });

        const graphicsLayer = new GraphicsLayer();
        map.add(graphicsLayer);

        const routeLayer = new GraphicsLayer();
        map.add(routeLayer);

        // --- B. Setup View (Folosim o variabilă locală unică) ---
        myMapView = new MapView({
          container: mapDiv.current,
          map: map,
          center: [26.10, 44.42], // București
          zoom: 12
        });

        // Așteptăm ca harta să fie gata complet
        await myMapView.when();
        setIsMapLoaded(true);
        console.log("✅ Harta inițializată corect.");

        // --- C. Widget Căutare ---
        const searchWidget = new Search({
          view: myMapView,
          popupEnabled: false,
          resultGraphicEnabled: false
        });
        myMapView.ui.add(searchWidget, "top-right");

        // --- D. Logica de Rutare (Definită AICI pentru a vedea 'myMapView') ---

        const performRouting = async (startPoint, centerData) => {
          console.log("🚗 Încep calculul rutei către:", centerData.name);

          const routeUrl =
            "https://route-api.arcgis.com/arcgis/rest/services/World/Route/NAServer/Route_World";

          const endPoint = new Point({
            latitude: Number(centerData.latitude),
            longitude: Number(centerData.longitude)
          });
          const endPointForPopup = endPoint;


          const routeParams = new RouteParameters({
            stops: new FeatureSet({
              features: [
                new Graphic({ geometry: startPoint }),
                new Graphic({ geometry: endPoint })
              ]
            }),
            returnDirections: true
          });

          try {
            const data = await route.solve(routeUrl, routeParams);

            if (data.routeResults.length > 0) {
              const result = data.routeResults[0].route;

              const distanceKm = result.attributes.Total_Kilometers.toFixed(2);
              const timeMin = result.attributes.Total_TravelTime.toFixed(0);

              // Stilizare
              result.symbol = {
                type: "simple-line",
                color: [50, 50, 255, 0.8],
                width: 5
              };

              routeLayer.add(result);

              // Zoom pe rută
              myMapView.goTo(result.geometry.extent.expand(1.4));

              // --- POPUP (FIX): folosește view.openPopup() ---
              try {
                if (myMapView) {
                  // închide orice popup vechi
                  myMapView.closePopup();

                const email = centerData.contact_email || "—";
                const phone = centerData.contact_phone || "—";
                const program = centerData.program || "—";

                myMapView.openPopup({
                  title: "Traseu Către Donare",
                  location: endPointForPopup,
                  content: `
                    <div style="font-family: sans-serif; padding: 10px;">
                      <h3 style="margin: 0 0 10px 0; color: #d32f2f;">🏥 ${centerData.name}</h3>

                      <p style="margin:0 0 8px 0;">📍 <b>Adresă:</b> ${centerData.address || "—"}</p>

                      <p style="margin:0 0 6px 0;">📧 <b>Email:</b> ${
                        email !== "—" ? `<a href="mailto:${email}">${email}</a>` : "—"
                      }</p>

                      <p style="margin:0 0 6px 0;">📞 <b>Telefon:</b> ${
                        phone !== "—" ? `<a href="tel:${phone}">${phone}</a>` : "—"
                      }</p>

                      <p style="margin:0 0 10px 0;">🕒 <b>Program:</b> ${program}</p>

                      <hr style="border: 0; border-top: 1px solid #eee; margin: 10px 0;">

                      <div style="display:flex; justify-content:space-between;">
                        <span>🚗 <b>${distanceKm} km</b></span>
                        <span>⏱️ <b>${timeMin} min</b></span>
                      </div>
                    </div>
                  `
                });

                  console.log("✅ Popup deschis cu succes!");
                }
              } catch (popupErr) {
                console.error("⚠️ Eroare Popup (openPopup):", popupErr);
              }
            }
          } catch (error) {
            console.error("❌ Eroare Generală Rutare:", error);
          }
        };

        const findNearestAndRoute = async (userPoint) => {
          const centers = centersDataRef.current;

          if (centers.length === 0) {
            alert("Centrele se încarcă...");
            return;
          }

          let closestCenter = null;
          let minDistance = Infinity;

          centers.forEach((center) => {
            const centerGeo = new Point({
              latitude: Number(center.latitude),
              longitude: Number(center.longitude)
            });

            let centerProjected = centerGeo;
            if (
              userPoint.spatialReference.isWebMercator &&
              !centerGeo.spatialReference.isWebMercator
            ) {
              centerProjected = webMercatorUtils.geographicToWebMercator(centerGeo);
            }

            const dist = geometryEngine.distance(userPoint, centerProjected, "kilometers");

            if (dist < minDistance) {
              minDistance = dist;
              closestCenter = center;
            }
          });

          if (closestCenter) {
            console.log(
              `🏆 Cel mai apropiat: ${closestCenter.name} (${minDistance.toFixed(2)} km)`
            );
            await performRouting(userPoint, closestCenter);
          }
        };

        // --- E. Event Handler ---
        searchWidget.on("select-result", async (event) => {
          console.log("📍 Adresă găsită:", event.result.name);
          const userLocation = event.result.feature.geometry;

          // Curățăm rutele vechi
          routeLayer.removeAll();

          // Desenăm pin user
          const userGraphic = new Graphic({
            geometry: userLocation,
            symbol: {
              type: "simple-marker",
              style: "diamond",
              color: "blue",
              size: "14px",
              outline: { color: "white", width: 2 }
            }
          });
          routeLayer.add(userGraphic);

          await findNearestAndRoute(userLocation);
        });

        // --- F. Firebase Load ---
        try {
          const snapshot = await getDocs(centersCollection);
          const dataList = [];
          snapshot.forEach((doc) => {
            const data = doc.data();
            if (data.latitude && data.longitude) {
              dataList.push(data);
            }
          });

          centersDataRef.current = dataList;

          // Pini centre
          graphicsLayer.removeAll();
          dataList.forEach((center) => {
            const g = new Graphic({
              geometry: new Point({
                latitude: parseFloat(center.latitude),
                longitude: parseFloat(center.longitude)
              }),
              symbol: {
                type: "simple-marker",
                color: [226, 6, 19],
                outline: { color: "white", width: 1 },
                size: "10px"
              },
              popupTemplate: {
                title: center.name,
                content: (() => {
                  const email = center.contact_email || "—";
                  const phone = center.contact_phone || "—";
                  const program = center.program || "—";
                  const address = center.address || "—";

                  return `
                    <div style="font-family: sans-serif; padding: 8px;">
                      <p style="margin:0 0 8px 0;">📍 <b>Adresă:</b> ${address}</p>

                      <hr style="border:0; border-top:1px solid #eee; margin:10px 0;" />

                      <p style="margin:0 0 6px 0;">📧 <b>Email:</b> ${
                        email !== "—" ? `<a href="mailto:${email}">${email}</a>` : "—"
                      }</p>

                      <p style="margin:0 0 6px 0;">📞 <b>Telefon:</b> ${
                        phone !== "—" ? `<a href="tel:${phone}">${phone}</a>` : "—"
                      }</p>

                      <p style="margin:0;">🕒 <b>Program:</b> ${program}</p>
                    </div>
                  `;
                })()
              },
              attributes: center
            });
            graphicsLayer.add(g);
          });
        } catch (error) {
          console.error("Eroare Firebase:", error);
        }
      }
    };

    initializeMap();

    // Cleanup
    return () => {
      if (myMapView) {
        myMapView.destroy();
      }
    };
  }, []);

  return <div ref={mapDiv} style={{ height: "100vh", width: "100%" }}></div>;
};

export default MapComponent;
