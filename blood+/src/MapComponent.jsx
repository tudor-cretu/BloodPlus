import React, { useEffect, useRef, useState } from "react";

// --- ArcGIS Imports ---
import Map from "@arcgis/core/Map";
import MapView from "@arcgis/core/views/MapView";
import GraphicsLayer from "@arcgis/core/layers/GraphicsLayer";
import FeatureLayer from "@arcgis/core/layers/FeatureLayer";
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
import { centersCollection, bloodStockCollection } from "./firebase/firebaseService";

const MapComponent = ({ currentUser }) => {
  const mapDiv = useRef(null);
  const [isMapLoaded, setIsMapLoaded] = useState(false);
  const [searchLocation, setSearchLocation] = useState(null);
  const [maxDistance, setMaxDistance] = useState(50); // distanță max implicită: 50 km
  const [selectedBloodGroup, setSelectedBloodGroup] = useState(""); // filtru grupă sanguină
  const [stockThreshold, setStockThreshold] = useState(10); // prag de stoc implicit: 10

  // Stocăm centrele într-un ref pentru a fi accesibile instantaneu în funcțiile hărții
  const centersDataRef = useRef([]);
  const centersLayerRef = useRef(null);
  const heatmapLayerRef = useRef(null);
  const criticalLayerRef = useRef(null);

  // Function to calculate critical level based on blood stock
  const calculateCriticalLevel = (bloodStock) => {
    if (!bloodStock || bloodStock.length === 0) {
      return 'critical'; // No data = critical
    }

    let hasCritical = false;
    let hasWarning = false;

    bloodStock.forEach(stock => {
      const quantity = stock.quantity || 0;
      if (quantity < 1) {
        hasCritical = true;
      } else if (quantity < 10) {
        hasWarning = true;
      }
    });

    if (hasCritical) return 'critical';
    if (hasWarning) return 'warning';
    return 'normal';
  };

  // Function to get color based on critical level
  const getCriticalLevelColor = (level) => {
    switch (level) {
      case 'critical': return [211, 47, 47]; // Red
      case 'warning': return [255, 152, 0]; // Orange
      case 'normal': return [56, 142, 60]; // Green
      default: return [128, 128, 128]; // Gray
    }
  };

  // Function to get critical level text and emoji
  const getCriticalLevelInfo = (level) => {
    switch (level) {
      case 'critical': return { text: 'CRITIC', emoji: '🚨', color: '#d32f2f' };
      case 'warning': return { text: 'ATENȚIE', emoji: '⚠️', color: '#f57c00' };
      case 'normal': return { text: 'NORMAL', emoji: '✅', color: '#388e3c' };
      default: return { text: 'NECUNOSCUT', emoji: '❓', color: '#999' };
    }
  };

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

        // routeLayer stays as GraphicsLayer for user location + routes
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

        // Store references for the button to access
        mapDiv.current.__mapView = myMapView;
        mapDiv.current.__routeLayer = routeLayer;

        // --- C. Widget Căutare ---
        const searchWidget = new Search({
          view: myMapView,
          popupEnabled: false,
          resultGraphicEnabled: false
        });
        myMapView.ui.add(searchWidget, "top-right");

        // Clear route when search is cleared (X button)
        searchWidget.on("search-clear", () => {
          console.log("🧹 Search cleared, removing route");
          routeLayer.removeAll();
          myMapView.closePopup();
          setSearchLocation(null); // Hide the button
        });

        // Clear route when clicking on the map (not on a feature)
        myMapView.on("click", (event) => {
          // Always clear route when clicking anywhere on the map
          // (clicking a center will show its popup via the layer's popupTemplate)
          console.log("🧹 Map clicked, removing route");
          routeLayer.removeAll();
        });

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

              // --- POPUP: match the center marker style + add route info ---
              try {
                if (myMapView) {
                  // închide orice popup vechi
                  myMapView.closePopup();

                const email = centerData.contact_email || "—";
                const phone = centerData.contact_phone || "—";
                const program = centerData.program || "—";
                const address = centerData.address || "—";
                
                // Format blood stock for routing popup
                const bloodStockHTML = centerData.bloodStock && centerData.bloodStock.length > 0
                  ? (() => {
                      // Define the order for display
                      const rowOrder = ['0-', '0+', 'A-', 'A+', 'B-', 'B+', 'AB-', 'AB+'];
                      const stockMap = {};
                      centerData.bloodStock.forEach(stock => {
                        stockMap[stock.blood_group] = stock.quantity || 0;
                      });
                      
                      const firstRow = rowOrder.slice(0, 4).map(bg => {
                        const quantity = stockMap[bg] !== undefined ? stockMap[bg] : 0;
                        const color = quantity === 0 ? '#d32f2f' : quantity < 10 ? '#f57c00' : '#388e3c';
                        return `<span style="display:inline-block; margin:2px 8px 2px 0; padding:4px 8px; background-color:${color}; color:white; border-radius:4px; font-weight:500;">${bg}: ${quantity}</span>`;
                      }).join('');
                      
                      const secondRow = rowOrder.slice(4, 8).map(bg => {
                        const quantity = stockMap[bg] !== undefined ? stockMap[bg] : 0;
                        const color = quantity === 0 ? '#d32f2f' : quantity < 10 ? '#f57c00' : '#388e3c';
                        return `<span style="display:inline-block; margin:2px 8px 2px 0; padding:4px 8px; background-color:${color}; color:white; border-radius:4px; font-weight:500;">${bg}: ${quantity}</span>`;
                      }).join('');
                      
                      return `<div style="margin-bottom:4px;">${firstRow}</div><div>${secondRow}</div>`;
                    })()
                  : '<span style="color:#999;">Nu există date despre stoc</span>';

                myMapView.openPopup({
                  title: centerData.name,
                  location: endPointForPopup,
                  content: `
                    <div style="font-family: sans-serif; padding: 8px; width: 480px; max-width: 480px;">
                      <p style="margin:0 0 8px 0;">📍 <b>Adresă:</b> ${address}</p>

                      <hr style="border:0; border-top:1px solid #eee; margin:10px 0;" />

                      <p style="margin:0 0 6px 0;">📧 <b>Email:</b> ${
                        email !== "—" ? `<a href="mailto:${email}" style="color: #0079c1; text-decoration: none;">${email}</a>` : email
                      }</p>

                      <p style="margin:0 0 6px 0;">📞 <b>Telefon:</b> ${
                        phone !== "—" ? `<a href="tel:${phone}" style="color: #0079c1; text-decoration: none;">${phone}</a>` : phone
                      }</p>

                      <p style="margin:0 0 10px 0;">🕒 <b>Program:</b> ${program}</p>

                      <hr style="border:0; border-top:1px solid #eee; margin:10px 0;" />

                      <div style="display:flex; justify-content:space-between; margin-bottom:10px;">
                        <span>🚗 <b>${distanceKm} km</b></span>
                        <span>⏱️ <b>${timeMin} min</b></span>
                      </div>

                      <hr style="border:0; border-top:1px solid #eee; margin:10px 0;" />

                      <div style="margin-top:10px;">
                        <p style="margin:0 0 8px 0; font-weight:600;">🩸 Stocuri de sânge disponibile:</p>
                        <div style="margin-top:8px;">
                          ${bloodStockHTML}
                        </div>
                      </div>
                    </div>
                  `,
                  maxInlineSize: 500,
                  maxBlockSize: 500
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
          const location = event.result.feature.geometry;

          // Store location and draw pin, but don't route automatically
          setSearchLocation(location);

          // Curățăm rutele vechi
          routeLayer.removeAll();

          // Desenăm pin user
          const userGraphic = new Graphic({
            geometry: location,
            symbol: {
              type: "simple-marker",
              style: "diamond",
              color: "blue",
              size: "18px",
              outline: { color: "white", width: 3 }
            }
          });
          routeLayer.add(userGraphic);

          console.log("📍 Location marked. Click 'Find Nearest Center' to route.");
        });

        // --- F. Firebase Load & FeatureLayer Creation ---
        try {
          const snapshot = await getDocs(centersCollection);
          const dataList = [];
          
          // Fetch centers and their blood stock
          for (const docSnap of snapshot.docs) {
            const centerData = docSnap.data();
            if (centerData.latitude && centerData.longitude) {
              // Fetch blood stock for this center
              const stockSnapshot = await getDocs(bloodStockCollection(docSnap.id));
              const bloodStock = [];
              stockSnapshot.forEach((stockDoc) => {
                bloodStock.push(stockDoc.data());
              });
              
              // Add blood stock to center data
              centerData.bloodStock = bloodStock;
              centerData.center_id = docSnap.id;
              dataList.push(centerData);
            }
          }

          centersDataRef.current = dataList;

          // Build features for FeatureLayer
          const features = dataList.map((center, idx) => {
            const geo = new Point({
              latitude: parseFloat(center.latitude),
              longitude: parseFloat(center.longitude),
              spatialReference: { wkid: 4326 } // lat/lon (WGS84)
            });

            // Convert to WebMercator for consistent display
            const geoWebMercator = webMercatorUtils.geographicToWebMercator(geo);

            const email = center.contact_email || "—";
            const phone = center.contact_phone || "—";
            const program = center.program || "—";
            const address = center.address || "—";
            
            // Calculate critical level for this center
            const criticalLevel = calculateCriticalLevel(center.bloodStock);
            const criticalInfo = getCriticalLevelInfo(criticalLevel);
            
            // Format blood stock for display
            const bloodStockHTML = center.bloodStock && center.bloodStock.length > 0
              ? (() => {
                  // Define the order for display
                  const rowOrder = ['0-', '0+', 'A-', 'A+', 'B-', 'B+', 'AB-', 'AB+'];
                  const stockMap = {};
                  center.bloodStock.forEach(stock => {
                    stockMap[stock.blood_group] = stock.quantity || 0;
                  });
                  
                  const firstRow = rowOrder.slice(0, 4).map(bg => {
                    const quantity = stockMap[bg] !== undefined ? stockMap[bg] : 0;
                    const color = quantity === 0 ? '#d32f2f' : quantity < 10 ? '#f57c00' : '#388e3c';
                    return `<span style="display:inline-block; margin:2px 8px 2px 0; padding:4px 8px; background-color:${color}; color:white; border-radius:4px; font-weight:500;">${bg}: ${quantity}</span>`;
                  }).join('');
                  
                  const secondRow = rowOrder.slice(4, 8).map(bg => {
                    const quantity = stockMap[bg] !== undefined ? stockMap[bg] : 0;
                    const color = quantity === 0 ? '#d32f2f' : quantity < 10 ? '#f57c00' : '#388e3c';
                    return `<span style="display:inline-block; margin:2px 8px 2px 0; padding:4px 8px; background-color:${color}; color:white; border-radius:4px; font-weight:500;">${bg}: ${quantity}</span>`;
                  }).join('');
                  
                  return `<div style="margin-bottom:4px;">${firstRow}</div><div>${secondRow}</div>`;
                })()
              : '<span style="color:#999;">Nu există date despre stoc</span>';

            return new Graphic({
              geometry: geoWebMercator,
              attributes: {
                ObjectID: idx + 1,
                name: center.name || "",
                address: address,
                contact_email: email,
                contact_phone: phone,
                program: program,
                latitude: parseFloat(center.latitude),
                longitude: parseFloat(center.longitude),
                bloodStockHTML: bloodStockHTML,
                criticalLevel: criticalLevel,
                criticalText: criticalInfo.text,
                criticalEmoji: criticalInfo.emoji,
                criticalColor: criticalInfo.color
              }
            });
          });

          // Create client-side FeatureLayer
          const centersLayer = new FeatureLayer({
            source: features,
            objectIdField: "ObjectID",
            fields: [
              { name: "ObjectID", alias: "ObjectID", type: "oid" },
              { name: "name", alias: "Name", type: "string" },
              { name: "address", alias: "Address", type: "string" },
              { name: "contact_email", alias: "Email", type: "string" },
              { name: "contact_phone", alias: "Phone", type: "string" },
              { name: "program", alias: "Program", type: "string" },
              { name: "latitude", alias: "Latitude", type: "double" },
              { name: "longitude", alias: "Longitude", type: "double" },
              { name: "bloodStockHTML", alias: "Blood Stock", type: "string" },
              { name: "criticalLevel", alias: "Critical Level", type: "string" },
              { name: "criticalText", alias: "Critical Text", type: "string" },
              { name: "criticalEmoji", alias: "Critical Emoji", type: "string" },
              { name: "criticalColor", alias: "Critical Color", type: "string" }
            ],
            geometryType: "point",
            spatialReference: { wkid: 3857 }, // WebMercator
            renderer: {
              type: "unique-value",
              field: "criticalLevel",
              defaultSymbol: {
                type: "simple-marker",
                color: [128, 128, 128], // Gray for unknown
                outline: { color: [0, 0, 0, 1], width: 3 },
                size: "20px"
              },
              uniqueValueInfos: [
                {
                  value: "critical",
                  symbol: {
                    type: "simple-marker",
                    color: [211, 47, 47], // Red
                    outline: { color: [139, 0, 0, 1], width: 4 },
                    size: "22px"
                  },
                  label: "🚨 Nivel Critic"
                },
                {
                  value: "warning",
                  symbol: {
                    type: "simple-marker",
                    color: [255, 152, 0], // Orange
                    outline: { color: [230, 81, 0, 1], width: 3 },
                    size: "20px"
                  },
                  label: "⚠️ Atenție"
                },
                {
                  value: "normal",
                  symbol: {
                    type: "simple-marker",
                    color: [56, 142, 60], // Green
                    outline: { color: [27, 94, 32, 1], width: 3 },
                    size: "18px"
                  },
                  label: "✅ Normal"
                }
              ]
            },
            popupTemplate: {
              title: "{name}",
              content: `
                <div style="font-family: sans-serif; padding: 8px; width: 400px; max-width: 420px;">
                  <p style="margin:0 0 8px 0;">📍 <b>Adresă:</b> {address}</p>

                  <hr style="border:0; border-top:1px solid #eee; margin:10px 0;" />

                  <p style="margin:0 0 6px 0;">📧 <b>Email:</b> <a href="mailto:{contact_email}" style="color: #0079c1; text-decoration: none;">{contact_email}</a></p>

                  <p style="margin:0 0 6px 0;">📞 <b>Telefon:</b> <a href="tel:{contact_phone}" style="color: #0079c1; text-decoration: none;">{contact_phone}</a></p>

                  <p style="margin:0 0 10px 0;">🕒 <b>Program:</b> {program}</p>

                  <hr style="border:0; border-top:1px solid #eee; margin:10px 0;" />

                  <div style="margin-top:10px;">
                    <p style="margin:0 0 8px 0; font-weight:600;">🩸 Stocuri de sânge disponibile:</p>
                    <div style="margin-top:8px;">
                      {bloodStockHTML}
                    </div>
                  </div>
                </div>
              `,
              maxInlineSize: 500,
              maxBlockSize: 500
            },
            popupEnabled: true
          });

          map.add(centersLayer);
          centersLayerRef.current = centersLayer; // Store reference for filtering
          // Build initial heatmap layer (will be updated when currentUser is available)
          try {
            const heatFeatures = dataList.map((center, idx) => {
              const geo = new Point({
                latitude: parseFloat(center.latitude),
                longitude: parseFloat(center.longitude),
                spatialReference: { wkid: 4326 }
              });
              const geoWebMercator = webMercatorUtils.geographicToWebMercator(geo);

              return new Graphic({
                geometry: geoWebMercator,
                attributes: {
                  ObjectID: idx + 1,
                  heatWeight: 0 // initial zero, will be recalculated for logged-in users
                }
              });
            });

            const heatmapLayer = new FeatureLayer({
              source: heatFeatures,
              objectIdField: "ObjectID",
              fields: [
                { name: "ObjectID", alias: "ObjectID", type: "oid" },
                { name: "heatWeight", alias: "Heat Weight", type: "double" }
              ],
              geometryType: "point",
              spatialReference: { wkid: 3857 },
              renderer: {
                type: "heatmap",
                field: "heatWeight",
                colorStops: [
                  { ratio: 0, color: "rgba(0,0,0,0)" },
                  { ratio: 0.2, color: "rgba(255,235,59,0.6)" },
                  { ratio: 0.5, color: "rgba(255,152,0,0.75)" },
                  { ratio: 1, color: "rgba(211,47,47,0.95)" }
                ],
                maxPixelIntensity: 100,
                minPixelIntensity: 0
              },
              visible: !!currentUser,
              opacity: 0.75,
              popupEnabled: false
            });

            map.add(heatmapLayer);
            heatmapLayerRef.current = heatmapLayer;
            console.log("✅ Heatmap layer added (initial, visibility depends on user).");
          } catch (hmErr) {
            console.error("⚠️ Heatmap init error:", hmErr);
          }
          // Create a persistent critical-level graphics layer (visual notification)
          try {
            const criticalGraphics = [];
            dataList.forEach((center, idx) => {
              const criticalLevel = calculateCriticalLevel(center.bloodStock);
              if (criticalLevel === 'critical') {
                const geo = new Point({
                  latitude: parseFloat(center.latitude),
                  longitude: parseFloat(center.longitude),
                  spatialReference: { wkid: 4326 }
                });
                const geoWebMercator = webMercatorUtils.geographicToWebMercator(geo);

                // Large translucent halo graphic to notify critical need
                criticalGraphics.push(new Graphic({
                  geometry: geoWebMercator,
                  attributes: { ObjectID: idx + 1 },
                  symbol: {
                    type: "simple-marker",
                    style: "circle",
                    color: [211, 47, 47, 0.2],
                    size: "36px",
                    outline: { color: [211, 47, 47, 0.6], width: 3 }
                  }
                }));
              }
            });

            const criticalLayer = new GraphicsLayer({ opacity: 1 });
            if (criticalGraphics.length > 0) criticalLayer.addMany(criticalGraphics);

            // Add critical layer beneath other layers so halos appear under markers
            map.add(criticalLayer, 0);
            criticalLayerRef.current = criticalLayer;
            console.log(`🔴 Critical notification layer added with ${criticalGraphics.length} items.`);
          } catch (critErr) {
            console.error("⚠️ Critical layer init error:", critErr);
          }
          console.log(`✅ FeatureLayer with ${features.length} centers added to map.`);
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

  // Filter centers by distance and blood group when filters change
  useEffect(() => {
    if (!centersLayerRef.current) {
      return;
    }

    // Reset filter if no search location and no blood group filter
    if (!searchLocation && !selectedBloodGroup) {
      centersLayerRef.current.definitionExpression = "1=1";
      return;
    }

    const validObjectIDs = [];
    centersDataRef.current.forEach((center, idx) => {
      let passesDistanceFilter = true;
      let passesBloodGroupFilter = true;

      // Check distance filter (only if searchLocation exists)
      if (searchLocation) {
        const centerGeo = new Point({
          latitude: Number(center.latitude),
          longitude: Number(center.longitude),
          spatialReference: { wkid: 4326 }
        });

        let centerProjected = centerGeo;
        if (
          searchLocation.spatialReference.isWebMercator &&
          !centerGeo.spatialReference.isWebMercator
        ) {
          centerProjected = webMercatorUtils.geographicToWebMercator(centerGeo);
        }

        const dist = geometryEngine.distance(searchLocation, centerProjected, "kilometers");
        passesDistanceFilter = dist <= maxDistance;
      }

      // Check blood group filter (only if selectedBloodGroup exists)
      if (selectedBloodGroup) {
        const bloodStock = center.bloodStock || [];
        const stockItem = bloodStock.find(s => s.blood_group === selectedBloodGroup);
        const quantity = stockItem ? stockItem.quantity : 0;
        passesBloodGroupFilter = quantity < stockThreshold; // Show only centers with stock < threshold
      }

      // Center must pass both filters
      if (passesDistanceFilter && passesBloodGroupFilter) {
        validObjectIDs.push(idx + 1); // ObjectID starts at 1
      }
    });

    if (validObjectIDs.length > 0) {
      centersLayerRef.current.definitionExpression = `ObjectID IN (${validObjectIDs.join(",")})`;
      console.log(`🔍 Filtered to ${validObjectIDs.length} centers`);
    } else {
      centersLayerRef.current.definitionExpression = "1=0"; // show nothing
      console.log(`🔍 No centers match the filters`);
    }
  }, [maxDistance, searchLocation, selectedBloodGroup, stockThreshold]);

  // Update/create heatmap layer when currentUser changes (only visible for logged-in users)
  useEffect(() => {
    try {
      if (!mapDiv.current) return;
      const mapViewElem = mapDiv.current;
      const view = mapViewElem.__mapView;
      if (!view) return;
      const map = view.map;

      // Remove existing heatmap layer if present
      if (heatmapLayerRef.current) {
        try { map.remove(heatmapLayerRef.current); } catch (e) { /* ignore */ }
        heatmapLayerRef.current = null;
      }

      // Only create/show heatmap for authenticated users
      if (!currentUser) return;

      const userBloodGroup = currentUser.blood_group;

      const heatFeatures = centersDataRef.current.map((center, idx) => {
        const geo = new Point({
          latitude: parseFloat(center.latitude),
          longitude: parseFloat(center.longitude),
          spatialReference: { wkid: 4326 }
        });
        const geoWebMercator = webMercatorUtils.geographicToWebMercator(geo);

        let quantity = 0;
        if (userBloodGroup) {
          const stockItem = (center.bloodStock || []).find(s => s.blood_group === userBloodGroup);
          quantity = stockItem ? Number(stockItem.quantity || 0) : 0;
        }

        // Heat weight: higher when stock is lower. Cap to a small range.
        const heatWeight = Math.max(0, 30 - quantity);

        return new Graphic({
          geometry: geoWebMercator,
          attributes: {
            ObjectID: idx + 1,
            heatWeight
          }
        });
      });

      const newHeatmapLayer = new FeatureLayer({
        source: heatFeatures,
        objectIdField: "ObjectID",
        fields: [
          { name: "ObjectID", alias: "ObjectID", type: "oid" },
          { name: "heatWeight", alias: "Heat Weight", type: "double" }
        ],
        geometryType: "point",
        spatialReference: { wkid: 3857 },
        renderer: {
          type: "heatmap",
          field: "heatWeight",
          colorStops: [
            { ratio: 0, color: "rgba(0,0,0,0)" },
            { ratio: 0.2, color: "rgba(255,235,59,0.6)" },
            { ratio: 0.5, color: "rgba(255,152,0,0.75)" },
            { ratio: 1, color: "rgba(211,47,47,0.95)" }
          ],
          maxPixelIntensity: 100,
          minPixelIntensity: 0
        },
        visible: true,
        opacity: 0.75,
        popupEnabled: false
      });

      map.add(newHeatmapLayer);
      heatmapLayerRef.current = newHeatmapLayer;
      console.log("✅ Heatmap recreated for authenticated user.");
    } catch (err) {
      console.error("⚠️ Heatmap update error:", err);
    }
  }, [currentUser]);

  return (
    <div style={{ position: "relative", height: "100vh", width: "100%" }}>
      <div ref={mapDiv} style={{ height: "100%", width: "100%" }}></div>
      
      {/* Find Nearest Center Button */}
      {searchLocation && (
        <button
          onClick={async () => {
            if (searchLocation) {
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
                  searchLocation.spatialReference.isWebMercator &&
                  !centerGeo.spatialReference.isWebMercator
                ) {
                  centerProjected = webMercatorUtils.geographicToWebMercator(centerGeo);
                }

                const dist = geometryEngine.distance(searchLocation, centerProjected, "kilometers");

                if (dist < minDistance) {
                  minDistance = dist;
                  closestCenter = center;
                }
              });

              if (closestCenter) {
                console.log(`🏆 Routing to: ${closestCenter.name} (${minDistance.toFixed(2)} km)`);
                
                // Perform routing
                const routeUrl = "https://route-api.arcgis.com/arcgis/rest/services/World/Route/NAServer/Route_World";
                const endPoint = new Point({
                  latitude: Number(closestCenter.latitude),
                  longitude: Number(closestCenter.longitude)
                });

                const routeParams = new RouteParameters({
                  stops: new FeatureSet({
                    features: [
                      new Graphic({ geometry: searchLocation }),
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

                    result.symbol = {
                      type: "simple-line",
                      color: [50, 50, 255, 0.8],
                      width: 5
                    };

                    // Get map view from ref (we need to store it)
                    const mapViewElem = mapDiv.current;
                    if (mapViewElem && mapViewElem.__mapView) {
                      const view = mapViewElem.__mapView;
                      const routeLayerRef = mapViewElem.__routeLayer;
                      
                      routeLayerRef.add(result);
                      view.goTo(result.geometry.extent.expand(1.4));

                      const email = closestCenter.contact_email || "—";
                      const phone = closestCenter.contact_phone || "—";
                      const program = closestCenter.program || "—";
                      const address = closestCenter.address || "—";

                      view.closePopup();
                      view.openPopup({
                        title: closestCenter.name,
                        location: endPoint,
                        content: `
                          <div style="font-family: sans-serif; padding: 8px;">
                            <p style="margin:0 0 8px 0;">📍 <b>Adresă:</b> ${address}</p>
                            <hr style="border:0; border-top:1px solid #eee; margin:10px 0;" />
                            <p style="margin:0 0 6px 0;">📧 <b>Email:</b> ${
                              email !== "—" ? `<a href="mailto:${email}" style="color: #0079c1; text-decoration: none;">${email}</a>` : email
                            }</p>
                            <p style="margin:0 0 6px 0;">📞 <b>Telefon:</b> ${
                              phone !== "—" ? `<a href="tel:${phone}" style="color: #0079c1; text-decoration: none;">${phone}</a>` : phone
                            }</p>
                            <p style="margin:0 0 10px 0;">🕒 <b>Program:</b> ${program}</p>
                            <hr style="border:0; border-top:1px solid #eee; margin:10px 0;" />
                            <div style="display:flex; justify-content:space-between;">
                              <span>🚗 <b>${distanceKm} km</b></span>
                              <span>⏱️ <b>${timeMin} min</b></span>
                            </div>
                          </div>
                        `
                      });
                    }
                  }
                } catch (error) {
                  console.error("❌ Routing error:", error);
                }
              }
            }
          }}
          style={{
            position: "absolute",
            top: "50px",
            right: "15px",
            width: "240px",
            height: "35px",
            backgroundColor: "#fbcfeaff",
            border: "1px solid rgba(0, 0, 0, 0.3)",
            borderRadius: "0px",
            padding: "6px 6px",
            fontSize: "14px",
            fontFamily: "'Avenir Next', Arial, sans-serif",
            color: "#323232",
            cursor: "pointer",
            boxShadow: "0 1px 2px rgba(0,0,0,0.3)",
            zIndex: 1000,
            display: "flex",
            alignItems: "center",
            gap: "2px"
          }}
        >
          <span>🩸</span>
          Gaseste cel mai apropiat centru
        </button>
      )}

      {/* Donor Recommendation Button - Only for authenticated donors with blood group */}
      {searchLocation && currentUser && currentUser.role === "donor" && currentUser.blood_group && (
        <button
          onClick={async () => {
            if (mapDiv.current?.__mapView && searchLocation) {
              const myMapView = mapDiv.current.__mapView;
              const routeLayer = mapDiv.current.__routeLayer;

              try {
                const centers = centersDataRef.current;
                if (centers.length === 0) {
                  alert("Centrele se încarcă...");
                  return;
                }

                const userBloodGroup = currentUser.blood_group;
                let bestCenter = null;
                let bestScore = -Infinity;

                // Calculate score for each center based on:
                // 1. Stock level for user's blood group (lower is better - more urgent need)
                // 2. Distance (closer is better)
                centers.forEach((center) => {
                  const centerGeo = new Point({
                    latitude: Number(center.latitude),
                    longitude: Number(center.longitude)
                  });

                  let centerProjected = centerGeo;
                  if (
                    searchLocation.spatialReference.isWebMercator &&
                    !centerGeo.spatialReference.isWebMercator
                  ) {
                    centerProjected = webMercatorUtils.geographicToWebMercator(centerGeo);
                  }

                  const distance = geometryEngine.distance(searchLocation, centerProjected, "kilometers");

                  // Find stock for user's blood group
                  const bloodStock = center.bloodStock || [];
                  const stockItem = bloodStock.find(s => s.blood_group === userBloodGroup);
                  const quantity = stockItem ? stockItem.quantity : 0;

                  // Scoring algorithm:
                  // - Lower stock = higher priority (inverted)
                  // - Closer distance = higher priority (inverted)
                  // Weight: stock urgency (70%) + distance (30%)
                  const stockScore = Math.max(0, 30 - quantity); // Max score when stock is 0
                  const distanceScore = Math.max(0, 50 - distance); // Max score when very close
                  const totalScore = (stockScore * 0.7) + (distanceScore * 0.3);

                  if (totalScore > bestScore) {
                    bestScore = totalScore;
                    bestCenter = center;
                  }
                });

                if (bestCenter) {
                  const bloodStock = bestCenter.bloodStock || [];
                  const stockItem = bloodStock.find(s => s.blood_group === userBloodGroup);
                  const quantity = stockItem ? stockItem.quantity : 0;

                  console.log(`🎯 Recommended center: ${bestCenter.name} (Stock ${userBloodGroup}: ${quantity} units)`);

                  // Perform routing to recommended center
                  const performRouting = myMapView.__performRouting || mapDiv.current.__performRouting;
                  if (performRouting) {
                    await performRouting(searchLocation, bestCenter);
                  }

                  // Show recommendation info
                  alert(`Recomandare:\n\n${bestCenter.name}\n\nStoc ${userBloodGroup}: ${quantity} unități\n${quantity < 10 ? '⚠️ Stoc critic - donația ta este urgent necesară!' : quantity < 20 ? '📊 Stoc scăzut - donația ta este necesară' : '✅ Stoc adecvat'}`);
                }
              } catch (error) {
                console.error("❌ Recommendation error:", error);
              }
            }
          }}
          style={{
            position: "absolute",
            top: "90px",
            right: "15px",
            width: "240px",
            height: "45px",
            backgroundColor: "#acf9aeff",
            border: "1px solid rgba(0, 0, 0, 0.3)",
            borderRadius: "0px",
            padding: "6px 6px",
            fontSize: "14px",
            fontFamily: "'Avenir Next', Arial, sans-serif",
            color: "#323232",
            fontWeight: "600",
            cursor: "pointer",
            boxShadow: "0 1px 2px rgba(0,0,0,0.3)",
            zIndex: 1000,
            display: "flex",
            alignItems: "center",
            gap: "2px"
          }}
        >
          <span>⭐</span>
          Recomandare centru pentru grupa ta ({currentUser.blood_group})
        </button>
      )}

      {/* Distance Filter Dropdown - Only for authenticated users */}
      {searchLocation && currentUser && (
        <div style={{
          position: "absolute",
          top: currentUser.role === "donor" && currentUser.blood_group ? "140px" : "90px", // Adjust if recommendation button exists
          right: "15px",
          width: "240px",
          backgroundColor: "#f3f3f3",
          border: "1px solid rgba(0, 0, 0, 0.3)",
          borderRadius: "0px",
          padding: "12px",
          boxShadow: "0 1px 2px rgba(0,0,0,0.3)",
          zIndex: 1000,
          fontFamily: "'Avenir Next', Arial, sans-serif",
          fontSize: "14px",
          color: "#323232"
        }}>
          <label style={{
            display: "block",
            marginBottom: "8px",
            fontSize: "14px",
            fontWeight: 500,
            color: "#323232"
          }}>
            Distanta maxima pana la centre
          </label>
          <select
            value={maxDistance}
            onChange={(e) => setMaxDistance(Number(e.target.value))}
            style={{
              width: "100%",
              // padding: "1px 8px",
              border: "1px solid rgba(0, 0, 0, 0.3)",
              borderRadius: "0px",
              backgroundColor: "#ffffff",
              fontSize: "14px",
              fontFamily: "'Avenir Next', Arial, sans-serif",
              color: "#323232",
              cursor: "pointer",
              outline: "none",
              // height: "36px"
              textAlign: "center"
            }}
          >
            <option value={1}>1 km</option>
            <option value={2}>2 km</option>
            <option value={5}>5 km</option>
            <option value={10}>10 km</option>
            <option value={20}>20 km</option>
            <option value={50}>50 km</option>
          </select>
        </div>
      )}

      {/* Blood Group Filter - Only for authenticated users */}
      {currentUser && (
        <div style={{
          position: "absolute",
          top: "415px", 
          right: "15px",
          width: "240px",
          backgroundColor: "#f3f3f3",
          border: "1px solid rgba(0, 0, 0, 0.3)",
          borderRadius: "0px",
          padding: "12px",
          boxShadow: "0 1px 2px rgba(0,0,0,0.3)",
          zIndex: 1000,
          fontFamily: "'Avenir Next', Arial, sans-serif",
          fontSize: "14px",
          color: "#323232"
        }}>
          <label style={{
            display: "block",
            marginBottom: "8px",
            fontSize: "14px",
            fontWeight: 500,
            color: "#323232"
          }}>
            Filtrare după grupă sanguină
          </label>
          <select
            value={selectedBloodGroup}
            onChange={(e) => setSelectedBloodGroup(e.target.value)}
            style={{
              width: "100%",
              border: "1px solid rgba(0, 0, 0, 0.3)",
              borderRadius: "0px",
              backgroundColor: "#ffffff",
              fontSize: "14px",
              fontFamily: "'Avenir Next', Arial, sans-serif",
              color: "#323232",
              cursor: "pointer",
              outline: "none",
              textAlign: "center",
              marginBottom: "12px"
            }}
          >
            <option value="">Toate</option>
            <option value="0-">0-</option>
            <option value="0+">0+</option>
            <option value="A-">A-</option>
            <option value="A+">A+</option>
            <option value="B-">B-</option>
            <option value="B+">B+</option>
            <option value="AB-">AB-</option>
            <option value="AB+">AB+</option>
          </select>

          <label style={{
            display: "block",
            marginBottom: "6px",
            fontSize: "14px",
            fontWeight: 500,
            color: "#323232"
          }}>
            Arată centre cu stoc mai mic de:
          </label>
          <input
            type="number"
            min="0"
            max="100"
            value={stockThreshold}
            onChange={(e) => setStockThreshold(Number(e.target.value))}
            style={{
              width: "100%",
              border: "1px solid rgba(0, 0, 0, 0.3)",
              borderRadius: "0px",
              backgroundColor: "#ffffff",
              fontSize: "14px",
              fontFamily: "'Avenir Next', Arial, sans-serif",
              color: "#323232",
              padding: "2px 8px",
              outline: "none",
              textAlign: "center",
              boxSizing: "border-box"
            }}
            placeholder="ex: 10"
          />
        </div>
      )}

      {/* Critical Level Legend */}
      <div style={{
        position: "absolute",
        bottom: "20px",
        left: "10px",
        backgroundColor: "rgba(255, 255, 255, 0.95)",
        border: "1px solid rgba(0, 0, 0, 0.3)",
        borderRadius: "8px",
        padding: "12px",
        boxShadow: "0 2px 8px rgba(0,0,0,0.2)",
        zIndex: 1000,
        fontFamily: "'Avenir Next', Arial, sans-serif",
        fontSize: "12px",
        minWidth: "80px"
      }}>
        <div style={{
          fontSize: "14px",
          fontWeight: "600",
          marginBottom: "8px",
          textAlign: "left",
          color: "#333"
        }}>
          Legenda nivel stoc 
        </div>
        
        <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <div style={{
              width: "16px",
              height: "16px",
              borderRadius: "50%",
              backgroundColor: "#d32f2f",
              border: "2px solid #8b0000"
            }}></div>
            <span> Critic (&lt;0)</span>
          </div>
          
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <div style={{
              width: "16px",
              height: "16px",
              borderRadius: "50%",
              backgroundColor: "#ff9800",
              border: "2px solid #e65100"
            }}></div>
            <span>Mediu (&lt;10)</span>
          </div>
          
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <div style={{
              width: "16px",
              height: "16px",
              borderRadius: "50%",
              backgroundColor: "#388e3c",
              border: "2px solid #1b5e20"
            }}></div>
            <span>Normal (≥10)</span>
          </div>
        </div>
      </div>
      {/* Heatmap legend - only for logged-in users */}
      {currentUser && (
        <div style={{
          position: "absolute",
          bottom: "20px",
          right: "10px",
          backgroundColor: "rgba(255, 255, 255, 0.95)",
          border: "1px solid rgba(0, 0, 0, 0.3)",
          borderRadius: "8px",
          padding: "10px",
          boxShadow: "0 2px 8px rgba(0,0,0,0.2)",
          zIndex: 1000,
          fontFamily: "'Avenir Next', Arial, sans-serif",
          fontSize: "12px",
          color: "#333",
          minWidth: "160px"
        }}>
          <div style={{ fontSize: "13px", fontWeight: 700, marginBottom: "6px" }}>
            Heatmap — nevoia pentru grupa ta
          </div>
          <div style={{ fontSize: "12px" }}>
            Culori: galben → portocaliu → roșu indică nivelul de nevoie pentru <b>{currentUser.blood_group || 'grupa ta'}</b>
          </div>
        </div>
      )}
    </div>
  );
};

export default MapComponent;
