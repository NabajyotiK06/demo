import React, { useEffect, useState, useContext, useRef } from "react";
import Sidebar from "../components/Sidebar";
import Topbar from "../components/Topbar";
import Map, { Marker, NavigationControl, Source, Layer } from "react-map-gl";
import { LocationContext } from "../context/LocationContext";
import { useSocket } from "../context/SocketContext";
import "mapbox-gl/dist/mapbox-gl.css";
import {
  CheckCircle,
  AlertTriangle,
  AlertCircle,
  Flame,
  Shield,
  Stethoscope,
  Search,
  List,
  MapPin,
  Maximize2,
  Clock,

  Info,
  Zap,
  CircleParking,
  Cloud,
  CloudRain,
  CloudFog
} from "lucide-react";

import IncidentForm from "../components/IncidentForm";
import MapView from "../components/MapView";
import "../styles/layout.css";
import WeatherOverlay from "../components/WeatherOverlay";

const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_TOKEN;
import { MOCK_SERVICES, getNearestService } from "../data/mockServices";

const HEATMAP_LAYER = {
  id: "traffic-heat",
  type: "heatmap",
  paint: {
    // Increase weight based on congestion level (using timer as proxy or mocked)
    "heatmap-weight": [
      "interpolate",
      ["linear"],
      ["get", "opacity"],
      0, 0,
      1, 5
    ],
    // Global intensity
    "heatmap-intensity": [
      "interpolate",
      ["linear"],
      ["zoom"],
      0, 1,
      15, 5
    ],
    // Color Ramp
    "heatmap-color": [
      "interpolate",
      ["linear"],
      ["heatmap-density"],
      0, "rgba(0,0,0,0)",
      0.2, "rgb(59, 130, 246)", // Blue
      0.5, "rgb(234, 179, 8)",  // Yellow
      1, "rgb(239, 68, 68)"     // Red
    ],
    "heatmap-radius": [
      "interpolate",
      ["linear"],
      ["zoom"],
      0, 5,
      15, 30
    ],
    "heatmap-opacity": 0.8
  }
};

// Helper Component for Dispatch Animation
const DispatchMarker = ({ dispatch }) => {
  const { currentPos, serviceType, timeLeft } = dispatch;

  const getIcon = () => {
    switch (serviceType) {
      case "fire_station": return "🚒";
      case "hospital": return "🚑";
      case "police": return "🚓";
      default: return "🚚";
    }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
      <div style={{
        background: "white",
        borderRadius: "50%",
        width: "36px",
        height: "36px",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontSize: "20px",
        boxShadow: "0 2px 4px rgba(0,0,0,0.3)",
        border: "2px solid #3b82f6",
        animation: "pulse 1s infinite"
      }}>
        {getIcon()}
      </div>
      <div style={{
        background: "#1f2937",
        color: "white",
        fontSize: "12px",
        fontWeight: "bold",
        padding: "2px 6px",
        borderRadius: "4px",
        marginTop: "4px"
      }}>
        {Math.ceil(timeLeft)}s
      </div>
    </div>
  );
};

// Helper Component for Admin Signal Marker
const AdminTrafficMarker = ({ signal, onClick }) => {
  const { currentLight, timer } = signal;
  const color = currentLight === "RED" ? "#ef4444" : currentLight === "YELLOW" ? "#eab308" : "#22c55e";

  return (
    <div onClick={onClick} style={{ cursor: "pointer", display: "flex", flexDirection: "column", alignItems: "center" }}>
      <div style={{
        background: "#1f2937", border: "2px solid white", borderRadius: "12px",
        padding: "4px 8px", display: "flex", gap: "4px", boxShadow: "0 4px 6px rgba(0,0,0,0.3)"
      }}>
        <div style={{ width: "10px", height: "10px", borderRadius: "50%", background: currentLight === "RED" ? "#ef4444" : "#374151" }} />
        <div style={{ width: "10px", height: "10px", borderRadius: "50%", background: currentLight === "YELLOW" ? "#eab308" : "#374151" }} />
        <div style={{ width: "10px", height: "10px", borderRadius: "50%", background: currentLight === "GREEN" ? "#22c55e" : "#374151" }} />
      </div>
      <div style={{ marginTop: "2px", background: color, color: "white", fontSize: "10px", fontWeight: "bold", padding: "1px 4px", borderRadius: "4px" }}>
        {timer}s
      </div>
    </div>
  );
};

// Helper: Calculate point along a path
const getPointAlongPath = (path, progress) => {
  if (!path || path.length < 2) return null;

  const totalLength = path.length;
  const index = Math.min(Math.floor(progress * (totalLength - 1)), totalLength - 2);
  const start = path[index];
  const end = path[index + 1];
  const segmentProgress = (progress * (totalLength - 1)) - index;

  const lat = start[1] + (end[1] - start[1]) * segmentProgress;
  const lng = start[0] + (end[0] - start[0]) * segmentProgress;

  return { lat, lng };
};

const AdminDashboard = () => {
  const socket = useSocket();
  const [incidents, setIncidents] = useState([]);
  const [rawSignals, setRawSignals] = useState([]); // Raw Traffic Signals from Server
  const [weather, setWeather] = useState("CLEAR"); // Global Weather Consumer

  // Derived Signals based on Weather happens on Server now or we can keep it here for optimistic UI
  // But since we are broadcasting, we should listen to signal updates from server which already have speed adjusted?
  // Actually, the server simulation logic I wrote DOES NOT adjust speed based on weather yet, only traffic density.
  // Let's rely on the server to broadcast weather and we apply visual effects.
  // The server simulation creates traffic data, but my previous edit to server didn't implement speed reduction in logic.
  // For now, let's keep client-side speed reduction visualization if we want immediate feedback, 
  // OR update server logic to actually reduce speed. 
  // Let's trust the server broadcasts and just visualise here.

  const signals = rawSignals; // Use raw signals directly, assuming server will handle physics later or visuals are enough.
  const [selectedIncident, setSelectedIncident] = useState(null);
  const [selectedSignal, setSelectedSignal] = useState(null); // Selected Signal for Control
  const [activeTab, setActiveTab] = useState("LIVE");
  const [alertedDepartments, setAlertedDepartments] = useState([]);
  const [showServices, setShowServices] = useState(false);
  const [showHeatmap, setShowHeatmap] = useState(false);
  const [showSignals, setShowSignals] = useState(true);
  const [reportLocation, setReportLocation] = useState(null);


  // Dispatch Animation State
  const [activeDispatches, setActiveDispatches] = useState([]);

  // Emergency Broadcast State
  const [broadcastMessage, setBroadcastMessage] = useState("");
  const [broadcastPriority, setBroadcastPriority] = useState("HIGH");
  const [isBroadcasting, setIsBroadcasting] = useState(false);

  const { searchedLocation } = useContext(LocationContext);
  const mapRef = useRef(null);

  // SOCKET: Listen for traffic updates
  useEffect(() => {
    if (!socket) return;

    socket.on("trafficUpdate", (data) => {
      setRawSignals(data);
      // Update selected signal if it exists
      if (selectedSignal) {
        const updated = data.find(s => s.id === selectedSignal.id);
        if (updated) setSelectedSignal(updated);
      }
    });

    socket.on("weatherUpdate", (data) => {
      setWeather(data);
    });

    return () => {
      socket.off("trafficUpdate");
      socket.off("weatherUpdate");
    };
  }, [socket, selectedSignal]);

  const updateGlobalWeather = (newWeather) => {
    if (!socket) return;
    socket.emit("adminWeatherUpdate", newWeather);
    // Optimistic updatre
    setWeather(newWeather);
  };

  // Handle Signal Override
  const overrideSignal = (action, duration = 30) => {
    if (!socket || !selectedSignal) return;
    socket.emit("adminSignalUpdate", { id: selectedSignal.id, action, duration });
    // Optimistic update handled by incoming socket event
  };

  // Fly to searched location
  useEffect(() => {
    if (searchedLocation && mapRef.current) {
      mapRef.current.flyTo({
        center: [searchedLocation.lng, searchedLocation.lat],
        zoom: 14,
        duration: 1500
      });
    }
  }, [searchedLocation]);

  // Fetch incidents
  const fetchIncidents = async () => {
    try {
      const res = await fetch("http://localhost:5000/api/incidents");
      const data = await res.json();
      setIncidents(data);
    } catch (err) {
      console.error("Failed to fetch incidents", err);
    }
  };

  useEffect(() => {
    fetchIncidents();
  }, []);

  // 🚑 Animation Loop for Dispatches
  useEffect(() => {
    if (activeDispatches.length === 0) return;

    const interval = setInterval(() => {
      setActiveDispatches(prev => {
        const now = Date.now();
        // Filter out arrived dispatches IMMEDIATELY
        return prev.map(d => {
          const elapsedTime = (now - d.startTime) / 1000; // in seconds
          const progress = Math.min(elapsedTime / d.duration, 1);

          // Calculate current position (Path Following)
          let currentPos = d.currentPos;
          if (d.routePath && d.routePath.length > 0) {
            const point = getPointAlongPath(d.routePath, progress);
            if (point) currentPos = point;
          } else {
            // Fallback to Linear Interpolation
            const currentLat = d.startLocation.lat + (d.endLocation.lat - d.startLocation.lat) * progress;
            const currentLng = d.startLocation.lng + (d.endLocation.lng - d.startLocation.lng) * progress;
            currentPos = { lat: currentLat, lng: currentLng };
          }

          return {
            ...d,
            currentPos,
            timeLeft: Math.max(d.duration - elapsedTime, 0),
            isArrived: progress >= 1
          };
        }).filter(d => !d.isArrived); // Remove immediately upon arrival
      });
    }, 50); // 20 FPS

    return () => clearInterval(interval);
  }, [activeDispatches]);

  // 🔁 Reset department locks when new incident selected
  useEffect(() => {
    if (selectedIncident) {
      setAlertedDepartments(selectedIncident.alertedDepartments || []);
    } else {
      setAlertedDepartments([]);
    }
  }, [selectedIncident]);

  // Update incident status
  const updateIncidentStatus = async (status) => {
    if (!selectedIncident) return;

    try {
      const res = await fetch(
        `http://localhost:5000/api/incidents/${selectedIncident._id}`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status })
        }
      );

      const updatedIncident = await res.json();

      setIncidents((prev) =>
        prev.map((inc) =>
          inc._id === updatedIncident._id ? updatedIncident : inc
        )
      );

      if (status === "RESOLVED") {
        setSelectedIncident(null);
      } else {
        setSelectedIncident(updatedIncident);
      }
    } catch (err) {
      console.error("Failed to update incident", err);
    }
  };

  // 🔔 Alert department (LOCK AFTER CLICK)
  const alertDepartment = async (department) => {
    if (!selectedIncident) return;
    if (alertedDepartments.includes(department)) return;

    // START ANIMATION
    let serviceType = "";
    if (department === "Fire") serviceType = "fire_station";
    if (department === "EMS") serviceType = "hospital";
    if (department === "Police") serviceType = "police";

    const nearestService = getNearestService(selectedIncident.lat, selectedIncident.lng, serviceType);

    if (nearestService) {
      // 1. Fetch Route from Mapbox
      try {
        const query = await fetch(
          `https://api.mapbox.com/directions/v5/mapbox/driving/${nearestService.lng},${nearestService.lat};${selectedIncident.lng},${selectedIncident.lat}?geometries=geojson&access_token=${MAPBOX_TOKEN}`
        );
        const json = await query.json();
        const routePath = json.routes[0]?.geometry?.coordinates; // Array of [lng, lat]
        const duration = json.routes[0]?.duration ? json.routes[0].duration / 4 : 20; // Speed up 4x for demo, or default 20s

        const newDispatch = {
          id: Date.now(),
          serviceType,
          startTime: Date.now(),
          duration: duration,
          startLocation: { lat: nearestService.lat, lng: nearestService.lng },
          endLocation: { lat: selectedIncident.lat, lng: selectedIncident.lng },
          currentPos: { lat: nearestService.lat, lng: nearestService.lng },
          routePath: routePath, // Store path
          timeLeft: duration,
          isArrived: false
        };

        setActiveDispatches(prev => [...prev, newDispatch]);

        // 🚑 GREEN WAVE LOGIC: Find signals on route and Force GREEN
        if (socket && routePath && routePath.length > 0) {
          const affectedSignalIds = signals.filter(s => {
            // Check proximity to any route point (approx 100m radius)
            return routePath.some((coord, idx) => {
              if (idx % 10 !== 0) return false; // Optimization: Check every 10th point
              const dist = Math.sqrt(Math.pow(s.lng - coord[0], 2) + Math.pow(s.lat - coord[1], 2));
              return dist < 0.001; // ~111 meters
            });
          }).map(s => s.id);

          if (affectedSignalIds.length > 0) {
            console.log("🚑 Activating Green Wave for:", affectedSignalIds);
            socket.emit("emergencyRouteActive", { signalIds: affectedSignalIds, duration: 45 }); // 45s Green Wave
            // Optional: Visual feedback could be added here
          }
        }

      } catch (err) {
        console.error("Failed to fetch route for animation", err);
        // Fallback to simple line if API fails
        const newDispatch = {
          id: Date.now(),
          serviceType,
          startTime: Date.now(),
          duration: 20,
          startLocation: { lat: nearestService.lat, lng: nearestService.lng },
          endLocation: { lat: selectedIncident.lat, lng: selectedIncident.lng },
          currentPos: { lat: nearestService.lat, lng: nearestService.lng },
          timeLeft: 20,
          isArrived: false
        };
        setActiveDispatches(prev => [...prev, newDispatch]);
      }

    } else {
      alert(`No active ${department} units found nearby.`);
    }

    try {
      const newAlerts = [...(selectedIncident.alertedDepartments || []), department];

      const res = await fetch(
        `http://localhost:5000/api/incidents/${selectedIncident._id}`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ alertedDepartments: newAlerts })
        }
      );

      const updatedIncident = await res.json();

      // Update local state
      setIncidents((prev) =>
        prev.map((inc) =>
          inc._id === updatedIncident._id ? updatedIncident : inc
        )
      );
      setSelectedIncident(updatedIncident);
      setAlertedDepartments(updatedIncident.alertedDepartments || []);

      alert(`${department} department alerted for ${selectedIncident.type}`);
    } catch (err) {
      console.error("Failed to alert department", err);
      alert("Failed to update status");
    }
  };

  // 📢 Handle Emergency Broadcast
  const handleBroadcast = async () => {
    if (!broadcastMessage.trim()) return alert("Please enter a message");

    setIsBroadcasting(true);
    try {
      const res = await fetch("http://localhost:5000/api/broadcast", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: broadcastMessage,
          priority: broadcastPriority
        })
      });

      if (res.ok) {
        alert("Emergency Broadcast Sent Successfully!");
        setBroadcastMessage("");
      } else {
        alert("Failed to send broadcast");
      }
    } catch (err) {
      console.error("Broadcast failed", err);
      alert("Error sending broadcast");
    } finally {
      setIsBroadcasting(false);
    }
  };

  const liveIncidents = incidents.filter(
    (inc) => inc.status !== "RESOLVED"
  );

  const resolvedIncidents = incidents.filter(
    (inc) => inc.status === "RESOLVED"
  );

  const isLocked = (dept) => alertedDepartments.includes(dept);

  return (
    <div className="app-layout">
      <Sidebar role="admin" />

      <div className="main-content">
        <Topbar />

        <div className="page-body">
          {/* Map */}
          {/* Map */}
          <div className="dashboard-map-container" style={{ position: "relative" }}>
            {/* WEATHER OVERLAYS */}
            {activeTab === "LIVE" && weather === "RAIN" && (
              <div className="rain-container">
                <div className="rain-layer"></div>
                <div className="rain-layer"></div>
              </div>
            )}
            {activeTab === "LIVE" && weather === "FOG" && (
              <div className="weather-overlay-fog"></div>
            )}
            {activeTab === "REPORT" ? (
              <MapView
                signals={signals}
                setSignals={setRawSignals}
                setSelectedSignalId={(id) => {
                  const signal = signals.find(s => s.id === id);
                  if (signal) setSelectedSignal(signal);
                }}
                setLocation={setReportLocation}
                location={reportLocation}
                showHeatmap={showHeatmap}
              />
            ) : activeTab !== "HISTORY" ? (
              <Map
                initialViewState={{
                  latitude: 22.4969,
                  longitude: 88.3702,
                  zoom: 12
                }}
                ref={mapRef}
                style={{ width: "100%", height: "100%" }}
                mapStyle="mapbox://styles/mapbox/streets-v12"
                mapboxAccessToken={MAPBOX_TOKEN}
                onClick={(e) => {
                  if (activeTab === "REPORT") {
                    const { lng, lat } = e.lngLat;
                    setReportLocation({ lat, lng });
                  } else {
                    setSelectedIncident(null);
                    setSelectedSignal(null);
                  }
                }}
              >
                <NavigationControl position="bottom-right" />

                {/* CONTROL BUTTONS GROUP */}
                <div className="mapboxgl-ctrl mapboxgl-ctrl-group" style={{ position: "absolute", top: 10, right: 10, display: "flex", flexDirection: "column", gap: "5px" }}>
                  {/* Heatmap Toggle */}
                  <button
                    className="mapboxgl-ctrl-icon"
                    onClick={(e) => {
                      e.stopPropagation();
                      setShowHeatmap(!showHeatmap);
                    }}
                    title="Toggle Traffic Heatmap"
                    style={{ width: '29px', height: '29px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: showHeatmap ? '#fee2e2' : 'white' }}
                  >
                    <Flame size={16} color={showHeatmap ? '#dc2626' : '#333'} />
                  </button>

                  {/* Signals Toggle */}
                  <button
                    className="mapboxgl-ctrl-icon"
                    onClick={(e) => {
                      e.stopPropagation();
                      setShowSignals(!showSignals);
                    }}
                    title="Toggle Traffic Signals"
                    style={{ width: '29px', height: '29px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: showSignals ? '#dcfce7' : 'white' }}
                  >
                    <Zap size={16} color={showSignals ? '#15803d' : '#333'} />
                  </button>

                  {/* Services Toggle */}
                  <button
                    className="mapboxgl-ctrl-icon"
                    onClick={(e) => {
                      e.stopPropagation();
                      setShowServices(!showServices);
                    }}
                    title="Toggle Essential Services"
                    style={{ width: '29px', height: '29px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: showServices ? '#e0f2fe' : 'white' }}
                  >
                    <Info size={16} color={showServices ? '#0284c7' : '#333'} />
                  </button>
                </div>

                {/* HEATMAP LAYER */}
                {showHeatmap && (
                  <Source type="geojson" data={{
                    type: "FeatureCollection",
                    features: signals.map(s => ({
                      type: "Feature",
                      properties: { opacity: s.congestion === "HIGH" ? 1 : s.congestion === "MEDIUM" ? 0.5 : 0.2 },
                      geometry: { type: "Point", coordinates: [s.lng, s.lat] }
                    }))
                  }}>
                    <Layer {...HEATMAP_LAYER} />
                  </Source>
                )}

                {/* SERVICE MARKERS */}
                {showServices && MOCK_SERVICES.map((s) => (
                  <Marker
                    key={s.id}
                    longitude={s.lng}
                    latitude={s.lat}
                    anchor="bottom"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <div
                      style={{
                        background: "white",
                        padding: "4px",
                        borderRadius: "50%",
                        boxShadow: "0 2px 4px rgba(0,0,0,0.3)",
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        width: "24px",
                        height: "24px"
                      }}
                      title={s.name}
                    >
                      {s.type === "hospital" && <Stethoscope size={14} color="#ef4444" />}
                      {s.type === "police" && <Shield size={14} color="#3b82f6" />}
                      {s.type === "fire_station" && <Flame size={14} color="#f97316" />}
                      {s.type === "parking" && <CircleParking size={14} color="#f97316" />}
                      {s.type === "fuel" && <Zap size={14} color="#22c55e" />}
                    </div>
                  </Marker>
                ))}

                {/* Signals Markers */}
                {showSignals && signals.map((s) => (
                  <Marker
                    key={s.id}
                    longitude={s.lng}
                    latitude={s.lat}
                    anchor="center"
                  >
                    <AdminTrafficMarker
                      signal={s}
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedSignal(s);
                        setSelectedIncident(null);
                        setActiveTab("LIVE");
                      }}
                    />
                  </Marker>
                ))}

                {/* Incident Markers */}
                {/* Reporting Marker */}
                {activeTab === "REPORT" && reportLocation && (
                  <Marker
                    latitude={reportLocation.lat}
                    longitude={reportLocation.lng}
                    anchor="bottom"
                  >
                    <MapPin size={32} color="#ef4444" fill="white" />
                  </Marker>
                )}

                {/* Active Dispatches Animation */}
                {activeDispatches.map(dispatch => (
                  <Marker
                    key={dispatch.id}
                    latitude={dispatch.currentPos.lat}
                    longitude={dispatch.currentPos.lng}
                    anchor="center"
                  >
                    <DispatchMarker dispatch={dispatch} />
                  </Marker>
                ))}

                {liveIncidents.map((inc) => (
                  <Marker
                    key={inc._id}
                    longitude={inc.lng}
                    latitude={inc.lat}
                    anchor="bottom"
                    onClick={(e) => {
                      e.originalEvent.stopPropagation();
                      setSelectedIncident(inc);
                      setSelectedSignal(null);
                    }}
                  >
                    <div style={{ cursor: "pointer", fontSize: "28px", filter: "drop-shadow(0 2px 4px rgba(0,0,0,0.3))" }}>
                      {/* Use simple emoji markers or custom divs based on status */}
                      {inc.status === "UNDER_INVESTIGATION" ? "🟡" : "🔴"}
                    </div>
                  </Marker>
                ))}
              </Map>
            ) : (
              <div style={{ padding: "24px", overflowY: "auto", height: "100%" }}>
                <h2 className="section-title">Resolved History</h2>

                {resolvedIncidents.length === 0 && <p style={{ color: "#6b7280" }}>No resolved incidents found.</p>}

                {resolvedIncidents.map((inc) => (
                  <div
                    key={inc._id}
                    className="card incident-card"
                    style={{ marginBottom: "12px", display: "flex", justifyContent: "space-between" }}
                  >
                    <div>
                      <div className="incident-type" style={{ fontWeight: "700" }}>{inc.type}</div>
                      <p className="incident-desc" style={{ margin: "4px 0" }}>{inc.description}</p>
                      <div className="incident-time" style={{ fontSize: "12px", opacity: 0.7 }}>
                        {new Date(inc.createdAt).toLocaleString()}
                      </div>
                    </div>
                    <div className="status-badge resolved">
                      resolved
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Right Panel */}
          <div className="dashboard-sidebar">
            <div className="dashboard-scroll-area">

              {/* TABS */}
              {/* TABS */}
              <div className="dashboard-tabs">
                <button
                  onClick={() => setActiveTab("LIVE")}
                  className={`btn dashboard-tab-btn ${activeTab === "LIVE" ? "active" : ""}`}
                >
                  <MapPin size={16} style={{ marginRight: "6px" }} />
                  Live Map
                </button>

                <button
                  onClick={() => setActiveTab("HISTORY")}
                  className={`btn dashboard-tab-btn ${activeTab === "HISTORY" ? "active" : ""}`}
                >
                  <List size={16} style={{ marginRight: "6px" }} />
                  History
                </button>

                <button
                  onClick={() => setActiveTab("REPORT")}
                  className={`btn dashboard-tab-btn ${activeTab === "REPORT" ? "active" : ""}`}
                >
                  <AlertCircle size={16} style={{ marginRight: "6px" }} />
                  Report
                </button>
              </div>

              <div className="panel-container">
                {/* WEATHER CONTROL WIDGET */}
                {activeTab === "LIVE" && !selectedSignal && !selectedIncident && (
                  <div className="fade-in" style={{ marginBottom: "20px" }}>
                    <div className="card" style={{ background: "linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)", color: "white", border: "none" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
                        <h3 style={{ margin: 0, fontSize: "1.1rem", display: "flex", alignItems: "center", gap: "8px" }}>
                          {weather === "CLEAR" && <Cloud size={20} />}
                          {weather === "RAIN" && <CloudRain size={20} />}
                          {weather === "FOG" && <CloudFog size={20} />}
                          Weather Control
                        </h3>
                        <span style={{ fontSize: "0.8rem", background: "rgba(255,255,255,0.2)", padding: "2px 8px", borderRadius: "12px" }}>
                          Active
                        </span>
                      </div>

                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "8px" }}>
                        <button
                          onClick={() => updateGlobalWeather("CLEAR")}
                          style={{
                            background: weather === "CLEAR" ? "white" : "rgba(255,255,255,0.2)",
                            color: weather === "CLEAR" ? "#2563eb" : "white",
                            border: "none", padding: "8px", borderRadius: "6px", cursor: "pointer", fontWeight: "600",
                            display: "flex", flexDirection: "column", alignItems: "center", gap: "4px"
                          }}
                        >
                          <Cloud size={16} />
                          Clear
                        </button>
                        <button
                          onClick={() => updateGlobalWeather("RAIN")}
                          style={{
                            background: weather === "RAIN" ? "white" : "rgba(255,255,255,0.2)",
                            color: weather === "RAIN" ? "#2563eb" : "white",
                            border: "none", padding: "8px", borderRadius: "6px", cursor: "pointer", fontWeight: "600",
                            display: "flex", flexDirection: "column", alignItems: "center", gap: "4px"
                          }}
                        >
                          <CloudRain size={16} />
                          Rain
                        </button>
                        <button
                          onClick={() => updateGlobalWeather("FOG")}
                          style={{
                            background: weather === "FOG" ? "white" : "rgba(255,255,255,0.2)",
                            color: weather === "FOG" ? "#2563eb" : "white",
                            border: "none", padding: "8px", borderRadius: "6px", cursor: "pointer", fontWeight: "600",
                            display: "flex", flexDirection: "column", alignItems: "center", gap: "4px"
                          }}
                        >
                          <CloudFog size={16} />
                          Fog
                        </button>
                      </div>
                      <div style={{ marginTop: "12px", fontSize: "0.8rem", opacity: 0.9, textAlign: "center" }}>
                        {weather === "CLEAR" && "Optimal driving conditions."}
                        {weather === "RAIN" && "Traffic speed reduced by 20% due to slippery roads."}
                        {weather === "FOG" && "Traffic speed reduced by 40% due to low visibility."}
                      </div>
                    </div>
                  </div>
                )}

                {/* SIGNAL CONTROL PANEL */}
                {selectedSignal && (
                  <div className="fade-in">
                    <div style={{ paddingBottom: "16px", borderBottom: "1px solid #e5e7eb", marginBottom: "16px" }}>
                      <h2 style={{ fontSize: "1.25rem", fontWeight: "bold", margin: 0 }}>🚦 {selectedSignal.name}</h2>
                      <p style={{ color: "#6b7280", margin: "4px 0 0 0" }}>Control Traffic Flow</p>
                    </div>

                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px", marginBottom: "20px" }}>
                      <div style={{ background: "#f3f4f6", padding: "10px", borderRadius: "8px", textAlign: "center" }}>
                        <span style={{ fontSize: "12px", color: "#6b7280" }}>Current Phase</span>
                        <div style={{ fontWeight: "bold", color: selectedSignal.currentLight === "RED" ? "#ef4444" : selectedSignal.currentLight === "GREEN" ? "#22c55e" : "#eab308" }}>
                          {selectedSignal.currentLight} ({selectedSignal.timer}s)
                        </div>
                      </div>
                      <div style={{ background: "#f3f4f6", padding: "10px", borderRadius: "8px", textAlign: "center" }}>
                        <span style={{ fontSize: "12px", color: "#6b7280" }}>Congestion</span>
                        <div style={{ fontWeight: "bold", color: selectedSignal.congestion === "HIGH" ? "#ef4444" : "#22c55e" }}>
                          {selectedSignal.congestion}
                        </div>
                      </div>
                    </div>

                    <h4 style={{ fontSize: "0.875rem", fontWeight: "600", marginBottom: "10px" }}>Manual Override</h4>
                    <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                      <button
                        onClick={() => overrideSignal("forceGreen", 45)}
                        className="btn"
                        style={{ background: "#dcfce7", color: "#166534", border: "1px solid #22c55e", justifyContent: "center" }}
                      >
                        Force GREEN (45s)
                      </button>
                      <button
                        onClick={() => overrideSignal("forceYellow", 5)}
                        className="btn"
                        style={{ background: "#fef9c3", color: "#854d0e", border: "1px solid #ca8a04", justifyContent: "center" }}
                      >
                        Force YELLOW (5s)
                      </button>
                      <button
                        onClick={() => overrideSignal("forceRed", 45)}
                        className="btn"
                        style={{ background: "#fee2e2", color: "#991b1b", border: "1px solid #ef4444", justifyContent: "center" }}
                      >
                        Force RED (45s)
                      </button>
                      <button
                        onClick={() => overrideSignal("forceGreen", 10)}
                        className="btn"
                        style={{ background: "#fff", border: "1px solid #d1d5db", color: "#374151", justifyContent: "center", marginTop: "10px" }}
                      >
                        Short Green (10s)
                      </button>
                    </div>

                    <div style={{ marginTop: "20px", padding: "12px", background: "#fffbeb", borderRadius: "8px", border: "1px solid #fcd34d", display: "flex", alignItems: "start", gap: "8px" }}>
                      <AlertTriangle size={16} color="#d97706" style={{ marginTop: "3px" }} />
                      <div style={{ fontSize: "12px", color: "#b45309" }}>
                        Overrides apply immediately to all users. System will resume automatic scheduling after the forced phase ends.
                      </div>
                    </div>
                  </div>
                )}


                {/* INCIDENT DETAILS PANEL */}
                {!selectedSignal && selectedIncident && activeTab === "LIVE" && (
                  <div className="fade-in">
                    <div style={{ marginBottom: "24px" }}>
                      <div style={{
                        fontSize: "0.875rem",
                        fontWeight: "600",
                        color: "#6b7280",
                        textTransform: "uppercase",
                        letterSpacing: "0.05em",
                        marginBottom: "4px"
                      }}>
                        INCIDENT DETAILS
                      </div>
                      <h2 style={{ fontSize: "1.5rem", fontWeight: "800", color: "#111827", margin: "0 0 8px 0" }}>
                        {selectedIncident.type}
                      </h2>
                      <p style={{ color: "#4b5563", lineHeight: "1.5" }}>{selectedIncident.description}</p>

                      <div style={{ marginTop: "12px", display: "flex", flexDirection: "column", gap: "8px" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                          <span style={{ fontWeight: "600", fontSize: "0.875rem", minWidth: "60px" }}>Status:</span>
                          <span className="status-badge" style={{
                            background: selectedIncident.status === "PENDING" ? "#fef3c7" : "#ecfdf5",
                            color: selectedIncident.status === "PENDING" ? "#d97706" : "#059669"
                          }}>
                            {selectedIncident.status}
                          </span>
                        </div>

                        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                          <span style={{ fontWeight: "600", fontSize: "0.875rem", minWidth: "60px" }}>Priority:</span>
                          <span className="status-badge" style={{
                            background: selectedIncident.priority === "HIGH" ? "#fee2e2" : selectedIncident.priority === "LOW" ? "#dbeafe" : "#fef3c7",
                            color: selectedIncident.priority === "HIGH" ? "#b91c1c" : selectedIncident.priority === "LOW" ? "#1e40af" : "#d97706"
                          }}>
                            {selectedIncident.priority || "MEDIUM"}
                          </span>
                        </div>
                      </div>

                      {selectedIncident.image && (
                        <div style={{ marginTop: "16px", borderRadius: "8px", overflow: "hidden", border: "1px solid #e5e7eb" }}>
                          <img src={selectedIncident.image} alt="Incident" style={{ width: "100%", maxHeight: "200px", objectFit: "cover", display: "block" }} />
                        </div>
                      )}
                    </div>

                    <div style={{ borderTop: "1px solid #e5e7eb", paddingTop: "24px", marginBottom: "24px" }}>
                      <h4 className="section-title">Update Status</h4>

                      <div style={{ display: "grid", gap: "10px" }}>
                        <button
                          className="btn"
                          onClick={() => updateIncidentStatus("UNDER_INVESTIGATION")}
                          style={{
                            justifyContent: "flex-start",
                            background: "#fff",
                            border: "1px solid #fbbf24",
                            color: "#b45309"
                          }}
                        >
                          <Search size={18} style={{ marginRight: "10px" }} />
                          Mark as Under Investigation
                        </button>

                        <button
                          className="btn"
                          onClick={() => updateIncidentStatus("RESOLVED")}
                          style={{
                            justifyContent: "flex-start",
                            background: "#fff",
                            border: "1px solid #34d399",
                            color: "#059669"
                          }}
                        >
                          <CheckCircle size={18} style={{ marginRight: "10px" }} />
                          Mark as Resolved
                        </button>
                      </div>
                    </div>

                    <div>
                      <h4 className="section-title">Dispatch Teams</h4>
                      <p style={{ fontSize: "0.875rem", color: "#6b7280", marginBottom: "12px" }}>
                        Select departments to alert immediately.
                      </p>

                      <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                        <button
                          disabled={isLocked("Fire")}
                          className="btn"
                          style={{
                            justifyContent: "flex-start",
                            background: isLocked("Fire") ? "#fee2e2" : "#ef4444",
                            color: "white",
                            opacity: isLocked("Fire") ? 0.7 : 1,
                            border: "none"
                          }}
                          onClick={() => alertDepartment("Fire")}
                        >
                          <Flame size={18} style={{ marginRight: "10px" }} />
                          {isLocked("Fire") ? "Fire Dept. Dispatched" : "Dispatch Fire Department"}
                        </button>

                        <button
                          disabled={isLocked("EMS")}
                          className="btn"
                          style={{
                            justifyContent: "flex-start",
                            background: isLocked("EMS") ? "#d1fae5" : "#10b981",
                            color: isLocked("EMS") ? "#065f46" : "white",
                            opacity: isLocked("EMS") ? 0.7 : 1,
                            border: "none"
                          }}
                          onClick={() => alertDepartment("EMS")}
                        >
                          <Stethoscope size={18} style={{ marginRight: "10px" }} />
                          {isLocked("EMS") ? "EMS Dispatched" : "Dispatch Medical (EMS)"}
                        </button>

                        <button
                          disabled={isLocked("Police")}
                          className="btn"
                          style={{
                            justifyContent: "flex-start",
                            background: isLocked("Police") ? "#dbeafe" : "#3b82f6",
                            color: isLocked("Police") ? "#1e40af" : "white",
                            opacity: isLocked("Police") ? 0.7 : 1,
                            border: "none"
                          }}
                          onClick={() => alertDepartment("Police")}
                        >
                          <Shield size={18} style={{ marginRight: "10px" }} />
                          {isLocked("Police") ? "Police Dispatched" : "Dispatch Police"}
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {/* REPORTING FORM */}
                {activeTab === "REPORT" && (
                  <div className="fade-in">
                    <IncidentForm location={reportLocation} setLocation={setReportLocation} />
                  </div>
                )}

                {/* EMPTY STATE */}
                {!selectedIncident && !selectedSignal && activeTab === "LIVE" && (
                  <div style={{ textAlign: "center", padding: "40px 20px", color: "#9ca3af" }}>
                    <Search size={48} style={{ marginBottom: "16px", opacity: 0.5 }} />
                    <p>Select a signal or incident on the map.</p>
                  </div>
                )}

                {/* 📢 EMERGENCY BROADCAST PANEL */}
                {activeTab === "LIVE" && (
                  <div className="fade-in" style={{ marginTop: "20px" }}>
                    <div className="card" style={{ border: "1px solid #fee2e2", background: "#fffafa" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "12px", color: "#dc2626" }}>
                        <AlertTriangle size={24} />
                        <h3 style={{ margin: 0, fontSize: "1.1rem", fontWeight: "bold" }}>Emergency Broadcast</h3>
                      </div>

                      <p style={{ fontSize: "0.875rem", color: "#6b7280", marginBottom: "16px" }}>
                        Send an alert to all connected users immediately.
                      </p>

                      <div style={{ marginBottom: "12px" }}>
                        <label style={{ display: "block", fontSize: "0.875rem", fontWeight: "600", color: "#374151", marginBottom: "4px" }}>
                          Priority Level
                        </label>
                        <select
                          value={broadcastPriority}
                          onChange={(e) => setBroadcastPriority(e.target.value)}
                          style={{
                            width: "100%",
                            padding: "8px",
                            borderRadius: "6px",
                            border: "1px solid #d1d5db",
                            background: "white",
                            fontSize: "0.875rem"
                          }}
                        >
                          <option value="HIGH">High (Flashing Red)</option>
                          <option value="MEDIUM">Medium (Yellow Warning)</option>
                          <option value="LOW">Low (Info Blue)</option>
                        </select>
                      </div>

                      <div style={{ marginBottom: "16px" }}>
                        <textarea
                          rows="4"
                          placeholder="Type emergency alert message..."
                          value={broadcastMessage}
                          onChange={(e) => setBroadcastMessage(e.target.value)}
                          style={{
                            width: "100%",
                            padding: "10px",
                            borderRadius: "6px",
                            border: "1px solid #d1d5db",
                            fontSize: "0.875rem",
                            resize: "none"
                          }}
                        />
                      </div>

                      <button
                        onClick={handleBroadcast}
                        disabled={isBroadcasting}
                        className="btn"
                        style={{
                          width: "100%",
                          justifyContent: "center",
                          background: "#ef4444",
                          color: "white",
                          fontWeight: "bold",
                          border: "none",
                          padding: "12px",
                          opacity: isBroadcasting ? 0.7 : 1
                        }}
                      >
                        {isBroadcasting ? "SENDING..." : "BROADCAST ALERT"}
                      </button>
                    </div>
                  </div>
                )}


              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;
