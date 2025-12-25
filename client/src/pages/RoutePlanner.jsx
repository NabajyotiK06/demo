import { useContext, useState, useRef, useEffect, useMemo, useCallback } from "react";
import {
  ArrowRight,
  ArrowLeft,
  ArrowUp,
  CornerUpLeft,
  CornerUpRight,
  MapPin,
  Navigation,
  Flag,
  RotateCcw,
  TriangleAlert,
  Building,
  Car,
  Share2,
  Clock,
  Stethoscope,
  Shield,
  CircleParking,
  Zap,
  Info
} from "lucide-react";
import Topbar from "../components/Topbar";
import Sidebar from "../components/Sidebar";
import Map, { Marker, Source, Layer, NavigationControl, GeolocateControl, Popup } from "react-map-gl";
import mapboxgl from "mapbox-gl";
import { LocationContext } from "../context/LocationContext";
import { AuthContext } from "../context/AuthContext";
import io from "socket.io-client";
import axios from "axios";
import "mapbox-gl/dist/mapbox-gl.css";
import "../styles/layout.css";

const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_TOKEN;
const socket = io("http://localhost:5000");

// 3D Building Layer Style
const BUILDING_LAYER_STYLE = {
  id: "3d-buildings",
  source: "composite",
  "source-layer": "building",
  filter: ["==", "extrude", "true"],
  type: "fill-extrusion",
  minzoom: 15,
  paint: {
    "fill-extrusion-color": "#aaa",
    "fill-extrusion-height": [
      "interpolate",
      ["linear"],
      ["zoom"],
      15,
      0,
      15.05,
      ["get", "height"]
    ],
    "fill-extrusion-base": [
      "interpolate",
      ["linear"],
      ["zoom"],
      15,
      0,
      15.05,
      ["get", "min_height"]
    ],
    "fill-extrusion-opacity": 0.6
  }
};

const HEATMAP_LAYER = {
  id: "traffic-heat",
  type: "heatmap",
  paint: {
    "heatmap-weight": ["interpolate", ["linear"], ["get", "opacity"], 0, 0, 1, 5],
    "heatmap-intensity": ["interpolate", ["linear"], ["zoom"], 0, 1, 15, 5],
    "heatmap-color": ["interpolate", ["linear"], ["heatmap-density"], 0, "rgba(0,0,0,0)", 0.2, "rgb(59, 130, 246)", 0.5, "rgb(234, 179, 8)", 1, "rgb(239, 68, 68)"],
    "heatmap-radius": ["interpolate", ["linear"], ["zoom"], 0, 5, 15, 30],
    "heatmap-opacity": ["interpolate", ["linear"], ["zoom"], 14, 0.8, 18, 0]
  }
};

const RoutePlanner = () => {
  const { user } = useContext(AuthContext);
  const { searchedLocation } = useContext(LocationContext);

  const [viewState, setViewState] = useState({
    latitude: 22.4969,
    longitude: 88.3702,
    zoom: 12,
    pitch: 0,
    bearing: 0
  });

  const [start, setStart] = useState(null);
  const [end, setEnd] = useState(null);
  const [routes, setRoutes] = useState([]);
  const [selectedRouteIndex, setSelectedRouteIndex] = useState(0);
  const [routeType, setRouteType] = useState(null);
  const [vehicleIndex, setVehicleIndex] = useState(0);
  const [aiReasoning, setAiReasoning] = useState(null);
  const [incidents, setIncidents] = useState([]);

  // Advanced Map Features State
  const [is3DMode, setIs3DMode] = useState(false);
  const [showTraffic, setShowTraffic] = useState(false);
  const [showNetwork, setShowNetwork] = useState(false);
  const [showIsochrone, setShowIsochrone] = useState(false);
  const [showHeatmap, setShowHeatmap] = useState(false);
  const [showServices, setShowServices] = useState(false);
  const [isochroneData, setIsochroneData] = useState(null);
  const [signals, setSignals] = useState([]);
  const [services, setServices] = useState([]);
  const [hoveredService, setHoveredService] = useState(null);

  const mapRef = useRef(null);

  // Fetch Signals for Heatmap/Network
  useEffect(() => {
    socket.on("trafficUpdate", (data) => {
      setSignals(data);
    });
    return () => {
      socket.off("trafficUpdate");
    };
  }, []);

  // Update map view when searchedLocation changes
  useEffect(() => {
    if (searchedLocation && mapRef.current) {
      mapRef.current.flyTo({
        center: [searchedLocation.lng, searchedLocation.lat],
        zoom: 14,
        duration: 1500,
        pitch: is3DMode ? 60 : 0
      });
    }
  }, [searchedLocation, is3DMode]);

  const toggle3DMode = useCallback(() => {
    setIs3DMode((prev) => {
      const nextMode = !prev;
      if (mapRef.current) {
        mapRef.current.flyTo({
          pitch: nextMode ? 60 : 0,
          bearing: nextMode ? -17.6 : 0,
          duration: 1000
        });
      }
      return nextMode;
    });
  }, []);

  // Static Mock Data for Services (Expanded)
  const MOCK_SERVICES = [
    // Hospitals
    { id: "h1", type: "hospital", name: "Apollo Gleneagles Hospital", address: "58, Canal Circular Rd", lat: 22.5735, lng: 88.4011 },
    { id: "h2", type: "hospital", name: "SSKM Hospital", address: "244, AJC Bose Rd", lat: 22.5393, lng: 88.3426 },
    { id: "h3", type: "hospital", name: "AMRI Hospital", address: "Salt Lake Sector 3", lat: 22.5647, lng: 88.4116 },
    { id: "h4", type: "hospital", name: "Fortis Hospital", address: "Anandapur, EM Bypass", lat: 22.5195, lng: 88.4026 },
    { id: "h5", type: "hospital", name: "Ruby General Hospital", address: "Kasba Golpark", lat: 22.5133, lng: 88.4016 },
    { id: "h6", type: "hospital", name: "Desun Hospital", address: "Kasba", lat: 22.5160, lng: 88.4020 },
    { id: "h7", type: "hospital", name: "CMRI", address: "Diamond Harbour Rd", lat: 22.5398, lng: 88.3283 },
    { id: "h8", type: "hospital", name: "Woodlands Hospital", address: "Alipore", lat: 22.5350, lng: 88.3300 },
    { id: "h9", type: "hospital", name: "RG Kar Medical College", address: "Belgachia", lat: 22.6047, lng: 88.3751 },
    { id: "h10", type: "hospital", name: "Calcutta Medical College", address: "College Street", lat: 22.5745, lng: 88.3630 },
    // Police Stations
    { id: "p1", type: "police", name: "Lalbazar Police HQ", address: "Lalbazar", lat: 22.5714, lng: 88.3524 },
    { id: "p2", type: "police", name: "Bidhannagar South PS", address: "Sector 3, Salt Lake", lat: 22.5726, lng: 88.4030 },
    { id: "p3", type: "police", name: "Park Street PS", address: "Park Street", lat: 22.5550, lng: 88.3550 },
    { id: "p4", type: "police", name: "Shakespeare Sarani PS", address: "Theater Rd", lat: 22.5480, lng: 88.3580 },
    { id: "p5", type: "police", name: "Alipore PS", address: "Belvedere Rd", lat: 22.5300, lng: 88.3350 },
    { id: "p6", type: "police", name: "Ballygunge PS", address: "Hazra Rd", lat: 22.5250, lng: 88.3650 },
    { id: "p7", type: "police", name: "New Market PS", address: "Lindsay St", lat: 22.5600, lng: 88.3520 },
    { id: "p8", type: "police", name: "Ultadanga PS", address: "Ultadanga", lat: 22.5900, lng: 88.3850 },
    // Parking
    { id: "pk1", type: "parking", name: "Park Street Parking", address: "Park Street", lat: 22.5539, lng: 88.3533 },
    { id: "pk2", type: "parking", name: "Salt Lake Stadium", address: "Salt Lake", lat: 22.5700, lng: 88.4060 },
    { id: "pk3", type: "parking", name: "City Centre 1", address: "Salt Lake", lat: 22.5900, lng: 88.4100 },
    { id: "pk4", type: "parking", name: "South City Mall", address: "Prince Anwar Shah Rd", lat: 22.5000, lng: 88.3600 },
    { id: "pk5", type: "parking", name: "Quest Mall", address: "Syed Amir Ali Ave", lat: 22.5400, lng: 88.3700 },
    { id: "pk6", type: "parking", name: "Esplanade Parking", address: "Esplanade", lat: 22.5650, lng: 88.3500 },
    { id: "pk7", type: "parking", name: "Acropolis Mall", address: "Kasba", lat: 22.5130, lng: 88.3950 },
    // Fuel / EV
    { id: "f1", type: "fuel", name: "HP Petrol Pump", address: "Sector 5, Salt Lake", lat: 22.5726, lng: 88.4320 },
    { id: "f2", type: "fuel", name: "Tata Power EV Charging", address: "New Town", lat: 22.5800, lng: 88.4600 },
    { id: "f3", type: "fuel", name: "Indian Oil", address: "EM Bypass", lat: 22.5500, lng: 88.4000 },
    { id: "f4", type: "fuel", name: "Bharat Petroleum", address: "Ballygunge", lat: 22.5300, lng: 88.3700 },
    { id: "f5", type: "fuel", name: "Shell Petrol Pump", address: "Kasba", lat: 22.5100, lng: 88.3900 },
    { id: "f6", type: "fuel", name: "Ather Grid Charging", address: "Park Street", lat: 22.5540, lng: 88.3520 }
  ];

  const toggleServices = useCallback(() => {
    if (showServices) {
      setShowServices(false);
      setServices([]);
      return;
    }

    setShowServices(true);
    // Filter services against Kolkata boundary
    const insideServices = MOCK_SERVICES.filter(s =>
      isPointInPolygon([s.lng, s.lat], KOLKATA_BOUNDARY)
    );
    setServices(insideServices);
  }, [showServices]);

  const heatmapData = useMemo(() => {
    return {
      type: "FeatureCollection",
      features: signals.map(s => ({
        type: "Feature",
        properties: { opacity: s.vehicles / 100 },
        geometry: { type: "Point", coordinates: [s.lng, s.lat] }
      }))
    };
  }, [signals]);

  const networkData = useMemo(() => {
    if (!showNetwork || signals.length < 2) return null;

    const lines = [];
    for (let i = 0; i < signals.length; i++) {
      const start = signals[i];
      const end = signals[(i + 1) % signals.length];
      const curvePoints = [];
      const numSegments = 20;
      const midLng = (start.lng + end.lng) / 2;
      const midLat = (start.lat + end.lat) / 2;
      const offset = 0.005;
      const controlLng = midLng + (i % 2 === 0 ? offset : -offset);
      const controlLat = midLat + (i % 2 !== 0 ? offset : -offset);
      for (let t = 0; t <= 1; t += 1 / numSegments) {
        const l1_lng = start.lng + (controlLng - start.lng) * t;
        const l1_lat = start.lat + (controlLat - start.lat) * t;
        const l2_lng = controlLng + (end.lng - controlLng) * t;
        const l2_lat = controlLat + (end.lat - controlLat) * t;
        const lng = l1_lng + (l2_lng - l1_lng) * t;
        const lat = l1_lat + (l2_lat - l1_lat) * t;
        curvePoints.push([lng, lat]);
      }
      lines.push({
        type: "Feature",
        geometry: { type: "LineString", coordinates: curvePoints }
      });
    }
    return { type: "FeatureCollection", features: lines };
  }, [signals, showNetwork]);

  // Fetch Incidents & Setup Socket
  useEffect(() => {
    const fetchIncidents = async () => {
      try {
        const res = await fetch("http://localhost:5000/api/incidents");
        const data = await res.json();
        // Only show Unresolved incidents on the map
        const activeIncidents = data.filter(inc => inc.status !== "RESOLVED");
        setIncidents(activeIncidents);
      } catch (err) {
        console.error("Failed to fetch incidents", err);
      }
    };

    fetchIncidents();

    socket.on("incidentReported", (newIncident) => {
      setIncidents((prev) => [newIncident, ...prev]);

      // Check if this incident affects current route
      if (routes.length > 0) {
        checkRouteImpact(newIncident);
      }
    });

    socket.on("incidentUpdated", (updatedIncident) => {
      setIncidents((prev) => {
        if (updatedIncident.status === "RESOLVED") {
          return prev.filter(inc => inc._id !== updatedIncident._id);
        }
        return prev.map(inc => inc._id === updatedIncident._id ? updatedIncident : inc);
      });
    });

    return () => {
      socket.off("incidentReported");
      socket.off("incidentUpdated");
    };
  }, [routes, selectedRouteIndex]);

  const checkRouteImpact = (incident) => {
    // Simple check: is incident close to any point on the selected route?
    const currentRoute = routes[selectedRouteIndex];
    if (!currentRoute) return;

    const routeCoords = currentRoute.geoJsonCoords;
    const iLat = incident.location?.lat || incident.lat;
    const iLng = incident.location?.lng || incident.lng;

    if (!iLat || !iLng) return;

    // Check proximity using Point-to-Segment to ensure we catch incidents on the line
    let isImpacted = false;

    // Helper: Distance from point P to segment AB (Squared or Euclidian)
    // We can use simplified Euclidean for small distances
    const distToSegment = (p, v, w) => {
      const l2 = (w[0] - v[0]) ** 2 + (w[1] - v[1]) ** 2;
      if (l2 === 0) return Math.sqrt((p[0] - v[0]) ** 2 + (p[1] - v[1]) ** 2);
      let t = ((p[0] - v[0]) * (w[0] - v[0]) + (p[1] - v[1]) * (w[1] - v[1])) / l2;
      t = Math.max(0, Math.min(1, t));
      const proj = [v[0] + t * (w[0] - v[0]), v[1] + t * (w[1] - v[1])];
      return Math.sqrt((p[0] - proj[0]) ** 2 + (p[1] - proj[1]) ** 2);
    };

    const iPt = [iLng, iLat];
    console.log("Checking Impact for Incident:", iPt);

    for (let i = 0; i < routeCoords.length - 1; i++) {
      const startPt = routeCoords[i];
      const endPt = routeCoords[i + 1];
      const dist = distToSegment(iPt, startPt, endPt);

      // 0.003 degrees is approx 330m - increased sensitivity
      if (dist < 0.003) {
        console.log("Impact DETECTED at segment", i, "Dist:", dist);
        isImpacted = true;
        break;
      }
    }

    if (isImpacted) {
      console.log("Rerouting triggered!");
      setAiReasoning(`⚠️ New Incident Reported: ${incident.type}. Recalculating route...`);
      fetchRoutes(routeType || "optimal");
    } else {
      console.log("No impact detected on this route.");
    }
  };

  // FETCH ROUTES FROM SERVER (AI OPTIMIZED)
  const fetchRoutes = async (type = "optimal") => {
    if (!start || !end) {
      alert("Please select start and destination on the map");
      return;
    }

    setRouteType(type);

    try {
      const res = await fetch("http://localhost:5000/api/traffic/optimize-route", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ start, end, type })
      });

      const data = await res.json();

      if (!data.routes || data.routes.length === 0) {
        alert("No routes found");
        return;
      }

      setRoutes(data.routes);
      setAiReasoning(data.aiReasoning);
      setSelectedRouteIndex(0);

      // Fit bounds to show route
      if (mapRef.current && data.routes[0].geoJsonCoords.length > 0) {
        const bounds = new mapboxgl.LngLatBounds();
        data.routes[0].geoJsonCoords.forEach(coord => {
          bounds.extend(coord);
        });
        mapRef.current.fitBounds(bounds, { padding: 50 });
      }

    } catch (error) {
      console.error(error);
      alert("Failed to fetch route");
    }
  };

  /* ANIMATION EFFECT */
  useEffect(() => {
    if (!routes.length) return;

    setVehicleIndex(0);

    const interval = setInterval(() => {
      setVehicleIndex((prev) => {
        const max = routes[selectedRouteIndex].geoJsonCoords.length - 1;
        return prev < max ? prev + 1 : prev;
      });
    }, 200);

    return () => clearInterval(interval);
  }, [routes, selectedRouteIndex]);

  // Helper: Point in Polygon (Ray-Casting Algorithm)
  const isPointInPolygon = (point, vs) => {
    // point = [lng, lat], vs = [[lng, lat], ...]
    const x = point[0], y = point[1];
    let inside = false;
    for (let i = 0, j = vs.length - 1; i < vs.length; j = i++) {
      const xi = vs[i][0], yi = vs[i][1];
      const xj = vs[j][0], yj = vs[j][1];

      const intersect = ((yi > y) !== (yj > y)) &&
        (x < (xj - xi) * (y - yi) / (yj - yi) + xi);
      if (intersect) inside = !inside;
    }
    return inside;
  };

  const handleMapClick = async (e) => {
    const { lng, lat } = e.lngLat;

    // Check if point is inside Kolkata Boundary
    const isInside = isPointInPolygon([lng, lat], KOLKATA_BOUNDARY);
    if (!isInside) {
      alert("We currently don't serve in that area.");
      return;
    }

    if (showIsochrone) {
      try {
        const res = await axios.get(
          `https://api.mapbox.com/isochrone/v1/mapbox/driving/${lng},${lat}?contours_minutes=10&polygons=true&access_token=${MAPBOX_TOKEN}`
        );
        setIsochroneData(res.data);
      } catch (err) {
        console.error("Failed to fetch isochrone", err);
      }
    }

    if (!start) {
      setStart({ lat, lng });
    } else if (!end) {
      setEnd({ lat, lng });
    }
  };

  // Kolkata Boundary (Approximate Polygon from MapView)
  const KOLKATA_BOUNDARY = [
    [88.3773, 22.6525], // Dunlop (North)
    [88.3857, 22.5947], // Ultadanga
    [88.4200, 22.5700], // Salt Lake / Nicco Park area
    [88.4026, 22.5133], // Ruby
    [88.3723, 22.4700], // Garia/Naktala (South)
    [88.3300, 22.4900], // Taratala/Behala
    [88.3200, 22.5600], // Howrah Side (River bank)
    [88.3600, 22.6000], // Shyambazar/North
    [88.3773, 22.6525]  // Close Loop
  ];

  const serviceArea = useMemo(() => {
    return {
      type: "Feature",
      geometry: {
        type: "Polygon",
        coordinates: [KOLKATA_BOUNDARY]
      },
      properties: {}
    };
  }, []);

  const routeLayers = useMemo(() => {
    return routes.map((route, index) => ({
      type: "Feature",
      geometry: {
        type: "LineString",
        coordinates: route.geoJsonCoords
      },
      properties: {
        index,
        isSelected: index === selectedRouteIndex
      }
    }));
  }, [routes, selectedRouteIndex]);

  const currentVehiclePos = routes.length > 0 && routes[selectedRouteIndex] && routes[selectedRouteIndex].geoJsonCoords[vehicleIndex]
    ? { lng: routes[selectedRouteIndex].geoJsonCoords[vehicleIndex][0], lat: routes[selectedRouteIndex].geoJsonCoords[vehicleIndex][1] }
    : null;

  return (
    <div className="app-layout">
      <Sidebar role={user.role} />

      <div className="main-content">
        <Topbar />

        <div className="page-body">
          {/* MAP SECTION */}
          <div className="dashboard-map-container">
            <Map
              {...viewState}
              ref={mapRef}
              onMove={evt => setViewState(evt.viewState)}
              style={{ width: "100%", height: "100vh" }}
              mapStyle={showTraffic ? "mapbox://styles/mapbox/traffic-day-v2" : "mapbox://styles/mapbox/streets-v12"}
              mapboxAccessToken={MAPBOX_TOKEN}
              onClick={handleMapClick}
              terrain={is3DMode ? { source: 'mapbox-dem', exaggeration: 1.5 } : undefined}
            >
              <NavigationControl position="bottom-right" />
              <GeolocateControl position="bottom-right" />

              {/* Service Area Polygon */}
              {serviceArea && (
                <Source type="geojson" data={serviceArea}>
                  <Layer
                    id="service-area-fill"
                    type="fill"
                    paint={{
                      "fill-color": "#4ade80",
                      "fill-opacity": 0.1
                    }}
                  />
                  <Layer
                    id="service-area-outline"
                    type="line"
                    paint={{
                      "line-color": "#22c55e",
                      "line-width": 2,
                      "line-dasharray": [2, 1]
                    }}
                  />
                </Source>
              )}

              {/* 3D Buildings Layer */}
              {is3DMode && (
                <Layer {...BUILDING_LAYER_STYLE} />
              )}

              {/* Isochrone Layer */}
              {showIsochrone && isochroneData && (
                <Source type="geojson" data={isochroneData}>
                  <Layer id="isochrone-fill" type="fill" paint={{ "fill-color": "#db2777", "fill-opacity": 0.3 }} />
                  <Layer id="isochrone-line" type="line" paint={{ "line-color": "#db2777", "line-width": 2 }} />
                </Source>
              )}

              {/* Network Connections Layer */}
              {showNetwork && networkData && (
                <Source type="geojson" data={networkData}>
                  <Layer
                    id="network-arcs"
                    type="line"
                    paint={{
                      "line-color": "#00f0ff",
                      "line-width": 3,
                      "line-opacity": 0.8,
                      "line-dasharray": [1, 2]
                    }}
                  />
                </Source>
              )}

              {/* Heatmap Layer */}
              {showHeatmap && (
                <Source type="geojson" data={heatmapData}>
                  <Layer {...HEATMAP_LAYER} />
                </Source>
              )}

              {/* Custom Toggle Controls */}
              <div className="mapboxgl-ctrl mapboxgl-ctrl-group" style={{ position: "absolute", top: 10, right: 10, display: "flex", flexDirection: "column", gap: "5px", zIndex: 10 }}>
                <button
                  className="mapboxgl-ctrl-icon"
                  onClick={toggle3DMode}
                  title="Toggle 3D View"
                  style={{ width: '29px', height: '29px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: is3DMode ? '#e0f2fe' : 'white' }}
                >
                  <Building size={16} color={is3DMode ? '#0284c7' : '#333'} />
                </button>

                <button
                  className="mapboxgl-ctrl-icon"
                  onClick={() => setShowTraffic(!showTraffic)}
                  title="Toggle Traffic Layer"
                  style={{ width: '29px', height: '29px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: showTraffic ? '#d1fae5' : 'white' }}
                >
                  <Car size={16} color={showTraffic ? '#059669' : '#333'} />
                </button>

                <button
                  className="mapboxgl-ctrl-icon"
                  onClick={() => setShowNetwork(!showNetwork)}
                  title="Toggle Network View"
                  style={{ width: '29px', height: '29px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: showNetwork ? '#e0e7ff' : 'white' }}
                >
                  <Share2 size={16} color={showNetwork ? '#4338ca' : '#333'} />
                </button>

                <button
                  className="mapboxgl-ctrl-icon"
                  onClick={() => setShowIsochrone(!showIsochrone)}
                  title="Toggle Reachability (10 min)"
                  style={{ width: '29px', height: '29px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: showIsochrone ? '#fce7f3' : 'white' }}
                >
                  <Clock size={16} color={showIsochrone ? '#db2777' : '#333'} />
                </button>
                <button
                  className="mapboxgl-ctrl-icon"
                  onClick={() => setShowHeatmap(!showHeatmap)}
                  title="Toggle Heatmap"
                  style={{ width: '29px', height: '29px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: showHeatmap ? '#fee2e2' : 'white' }}
                >
                  <div style={{ width: 16, height: 16, borderRadius: '50%', background: 'radial-gradient(circle, red, yellow, green)' }}></div>
                </button>

                <button
                  className="mapboxgl-ctrl-icon"
                  onClick={toggleServices}
                  title="Nearby Essential Services"
                  style={{ width: '29px', height: '29px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: showServices ? '#e0f2fe' : 'white' }}
                >
                  <Info size={16} color={showServices ? '#0284c7' : '#333'} />
                </button>
              </div>

              {/* Service Markers */}
              {showServices && services.map((s) => (
                <Marker
                  key={s.id}
                  longitude={s.lng}
                  latitude={s.lat}
                  anchor="bottom"
                >
                  <div
                    style={{
                      cursor: "pointer",
                      background: "white",
                      padding: "4px",
                      borderRadius: "50%",
                      boxShadow: "0 2px 4px rgba(0,0,0,0.3)",
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}
                    onMouseEnter={() => setHoveredService(s)}
                    onMouseLeave={() => setHoveredService(null)}
                  >
                    {s.type === "hospital" && <Stethoscope size={16} color="#ef4444" />}
                    {s.type === "police" && <Shield size={16} color="#3b82f6" />}
                    {s.type === "parking" && <CircleParking size={16} color="#f97316" />}
                    {s.type === "fuel" && <Zap size={16} color="#22c55e" />}
                  </div>
                </Marker>
              ))}

              {/* Service Popup */}
              {hoveredService && (
                <Popup
                  longitude={hoveredService.lng}
                  latitude={hoveredService.lat}
                  anchor="top"
                  closeButton={false}
                  closeOnClick={false}
                  offset={10}
                >
                  <div style={{ padding: "5px", color: "#333" }}>
                    <div style={{ fontWeight: "bold", fontSize: "12px", textTransform: "capitalize" }}>{hoveredService.type}</div>
                    <div style={{ fontSize: "11px", fontWeight: "600" }}>{hoveredService.name}</div>
                    <div style={{ fontSize: "10px", color: "#666", maxWidth: "150px" }}>{hoveredService.address}</div>
                  </div>
                </Popup>
              )}

              {/* Incidents Markers */}
              {incidents.map((inc, i) => (
                <Marker
                  key={i}
                  longitude={inc.location?.lng || inc.lng}
                  latitude={inc.location?.lat || inc.lat}
                  anchor="bottom"
                >
                  <div className="incident-marker" title={inc.type}>
                    <TriangleAlert size={24} color="#ef4444" fill="#fee2e2" />
                  </div>
                </Marker>
              ))}

              {/* Start/End Markers */}
              {start && <Marker longitude={start.lng} latitude={start.lat} color="#10b981" anchor="bottom" />}
              {end && <Marker longitude={end.lng} latitude={end.lat} color="#ef4444" anchor="bottom" />}

              {/* Routes */}
              {routeLayers.map((feature, i) => (
                <Source key={i} id={`route-${i}`} type="geojson" data={feature}>
                  <Layer
                    id={`route-layer-${i}`}
                    type="line"
                    layout={{
                      "line-join": "round",
                      "line-cap": "round"
                    }}
                    paint={{
                      "line-color": feature.properties.isSelected ? "#2563eb" : "#9ca3af",
                      "line-width": feature.properties.isSelected ? 5 : 4,
                      "line-opacity": feature.properties.isSelected ? 1 : 0.6
                    }}
                  />
                </Source>
              ))}

              {/* Vehicle Marker */}
              {currentVehiclePos && (
                <Marker longitude={currentVehiclePos.lng} latitude={currentVehiclePos.lat} anchor="center">
                  <img
                    src="https://cdn-icons-png.flaticon.com/512/3097/3097180.png"
                    alt="Car"
                    style={{ width: "40px", height: "40px" }}
                  />
                </Marker>
              )}
            </Map>
          </div>

          {/* DETAILS SECTION */}
          <div className="dashboard-sidebar">
            <div className="dashboard-scroll-area">
              <div className="panel-container">
                <h2 className="section-title">Route Planner</h2>

                <div className="card" style={{ padding: "16px", marginBottom: "24px", background: "#f8fafc" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "12px" }}>
                    <div style={{ fontSize: "12px", color: "#6b7280", fontWeight: "600" }}>TRIP DETAILS</div>
                    {(start || end) && (
                      <button
                        onClick={() => {
                          setStart(null);
                          setEnd(null);
                          setRoutes([]);
                        }}
                        style={{
                          background: "none",
                          border: "none",
                          color: "#ef4444",
                          fontSize: "12px",
                          fontWeight: "600",
                          cursor: "pointer",
                          padding: 0
                        }}
                      >
                        Reset Map
                      </button>
                    )}
                  </div>

                  <div style={{ marginBottom: "12px" }}>
                    <div style={{ fontSize: "12px", color: "#6b7280", fontWeight: "600", marginBottom: "4px" }}>START POINT</div>
                    <div style={{ color: start ? "#10b981" : "#9ca3af", fontWeight: "500" }}>
                      {start ? "✅ Point Selected" : "Click on map to select"}
                    </div>
                  </div>
                  <div>
                    <div style={{ fontSize: "12px", color: "#6b7280", fontWeight: "600", marginBottom: "4px" }}>DESTINATION</div>
                    <div style={{ color: end ? "📍 Point Selected" : "#9ca3af", fontWeight: "500" }}>
                      {end ? "📍 Point Selected" : "Click on map to select"}
                    </div>
                  </div>
                </div>

                <div style={{ display: "flex", gap: "10px", marginBottom: "24px" }}>
                  <button
                    className="btn btn-primary"
                    style={{ flex: 1, background: "#8b5cf6" }}
                    onClick={() => fetchRoutes("optimal")}
                  >
                    Find Optimal Path
                  </button>
                </div>

                {routes.length > 0 && (
                  <>
                    {/* AI REASONING BOX */}
                    {aiReasoning && (
                      <div className="card fade-in" style={{ marginBottom: "24px", borderLeft: "4px solid #8b5cf6", background: "#f3e8ff", padding: "12px" }}>
                        <div style={{ display: "flex", gap: "8px", alignItems: "flex-start" }}>
                          <div style={{ fontSize: "18px" }}>🤖</div>
                          <div>
                            <div style={{ fontWeight: "700", color: "#6b21a8", fontSize: "14px", marginBottom: "4px" }}>AI Route Analysis</div>
                            <div style={{ fontSize: "13px", color: "#581c87", lineHeight: "1.4" }}>
                              {aiReasoning}
                            </div>
                          </div>
                        </div>
                      </div>
                    )}

                    <h3 className="section-title">Available Routes</h3>
                    <div className="fade-in">
                      {routes.map((r, index) => (
                        <div
                          key={index}
                          onClick={() => setSelectedRouteIndex(index)}
                          className={`route-card ${index === selectedRouteIndex ? "active" : ""}`}
                          style={{ position: "relative" }}
                        >
                          {index === 0 && (
                            <span style={{
                              position: "absolute",
                              top: "-8px",
                              right: "10px",
                              background: routeType === "shortest" ? "#10b981" : "#8b5cf6",
                              color: "white",
                              fontSize: "10px",
                              padding: "2px 8px",
                              borderRadius: "10px",
                              fontWeight: "bold"
                            }}>
                              {routeType === "shortest" ? "FASTEST" : "RECOMMENDED"}
                            </span>
                          )}
                          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "4px" }}>
                            <span style={{ fontWeight: "700", color: "#1f2937" }}>Route {index + 1}</span>
                            <span style={{ color: "#6b7280", fontSize: "14px" }}>{r.duration} min</span>
                          </div>
                          <div style={{ fontSize: "14px", color: "#4b5563" }}>
                            Distance: {r.distance} km
                          </div>
                          {r.congestionPenalty > 0 && (
                            <div style={{ fontSize: "11px", color: "#ef4444", marginTop: "4px", display: "flex", alignItems: "center", gap: "4px" }}>
                              ⚠️ High Traffic Detected
                            </div>
                          )}
                        </div>
                      ))}
                    </div>

                    <h3 className="section-title" style={{ marginTop: "24px" }}>Turn-by-Turn</h3>
                    <div className="card" style={{ padding: "0", overflow: "hidden" }}>
                      {routes[selectedRouteIndex].steps.map((step, i) => {
                        const getManeuverIcon = (type, modifier) => {
                          if (type === "arrive") return <Flag size={20} className="step-icon" color="#ef4444" />;
                          if (type === "depart") return <Navigation size={20} className="step-icon" color="#10b981" />;

                          if (modifier && modifier.includes("left")) return <CornerUpLeft size={20} className="step-icon" />;
                          if (modifier && modifier.includes("right")) return <CornerUpRight size={20} className="step-icon" />;
                          if (modifier && modifier.includes("straight")) return <ArrowUp size={20} className="step-icon" />;
                          if (modifier && modifier.includes("uturn")) return <RotateCcw size={20} className="step-icon" />;

                          return <ArrowUp size={20} className="step-icon" />;
                        };

                        return (
                          <div key={i} className="step-item">
                            <div style={{ minWidth: "32px", display: "flex", justifyContent: "center" }}>
                              {getManeuverIcon(step.maneuver.type, step.maneuver.modifier)}
                            </div>
                            <div>
                              <div style={{ fontWeight: "500", color: "#374151" }}>{step.maneuver.instruction}</div>
                              <div style={{ fontSize: "12px", color: "#9ca3af", marginTop: "2px" }}>
                                {Math.round(step.distance)} meters
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RoutePlanner;
