import { useContext, useState, useEffect } from "react";
import Sidebar from "../components/Sidebar";
import Topbar from "../components/Topbar";
import MapView from "../components/MapView";
import SignalInfoPanel from "../components/SignalInfoPanel";
import { VideoOff, Cloud, CloudRain, CloudFog, Briefcase, Home, MapPin, Navigation, Edit2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import axios from "axios";

import { AuthContext } from "../context/AuthContext";
import "../styles/layout.css";
import WeatherOverlay from "../components/WeatherOverlay";
import { useSocket } from "../context/SocketContext";

const Dashboard = () => {
  const { user } = useContext(AuthContext);

  const [signals, setSignals] = useState([]);
  const [selectedSignalId, setSelectedSignalId] = useState(null);
  const [showHeatmap, setShowHeatmap] = useState(true);
  const [showSignals, setShowSignals] = useState(true);
  const [showFeed, setShowFeed] = useState(false);

  const navigate = useNavigate();

  /* Removed Commute State and Handlers */
  const [weather, setWeather] = useState("CLEAR"); // Local weather state

  const socket = useSocket();

  useEffect(() => {
    if (!socket) return;

    // Listen for global weather updates
    socket.on("weatherUpdate", (data) => {
      setWeather(data);
    });

    return () => {
      socket.off("weatherUpdate");
    };
  }, [socket]);

  useEffect(() => {
    if (!selectedSignalId && signals.length) {
      const worst = signals.find((s) => s.congestion === "HIGH");
      if (worst) setSelectedSignalId(worst.id);
    }
  }, [signals]);

  const selectedSignal = signals.find(
    (s) => s.id === selectedSignalId
  );

  return (
    <div className="app-layout">
      <Sidebar role={user.role} />

      <div className="main-content">
        <Topbar />

        <div className="page-body">
          <div className="dashboard-map-container">
            <div className="heatmap-toggle fade-in" style={{ display: "flex", gap: "16px" }}>
              <label className="heatmap-label">
                <input
                  type="checkbox"
                  checked={showHeatmap}
                  onChange={() => setShowHeatmap(!showHeatmap)}
                  style={{ width: "16px", height: "16px" }}
                />
                Show Traffic Heatmap
              </label>
              <label className="heatmap-label">
                <input
                  type="checkbox"
                  checked={showSignals}
                  onChange={() => setShowSignals(!showSignals)}
                  style={{ width: "16px", height: "16px" }}
                />
                Show Traffic Signals
              </label>
            </div>
            <MapView
              signals={signals}
              setSignals={setSignals}
              setSelectedSignalId={setSelectedSignalId}
              showHeatmap={showHeatmap}
              showSignals={showSignals}
            />

            {/* GLOBAL WEATHER OVERLAY */}
            <WeatherOverlay />

            {/* Live Feed Modal Overlay - Positioned over map */}
            {showFeed && selectedSignal && (
              <div style={{
                position: "absolute", top: 0, left: 0, right: 0, bottom: 0,
                background: "rgba(0,0,0,0.4)", display: "flex", alignItems: "center", justifyContent: "center",
                zIndex: 2000
              }}>
                <div className="fade-in" style={{
                  background: "black", width: "90%", maxWidth: "500px", borderRadius: "12px", overflow: "hidden",
                  boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.4)"
                }}>
                  <div style={{ padding: "12px 16px", display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid #333", background: "#111" }}>
                    <h3 style={{ margin: 0, color: "white", fontSize: "16px" }}>Live Feed - {selectedSignal.name}</h3>
                    <button onClick={() => setShowFeed(false)} style={{ background: "none", border: "none", color: "#9ca3af", cursor: "pointer", fontSize: "20px" }}>
                      ✕
                    </button>
                  </div>
                  <div style={{
                    height: "300px", display: "flex", flexDirection: "column",
                    alignItems: "center", justifyContent: "center", background: "#000", color: "#4b5563"
                  }}>
                    <div style={{ position: "relative", width: "100%", height: "100%" }}>
                      {/* Simulated Camera View Background */}
                      <div
                        style={{
                          width: "100%",
                          height: "100%",
                          background: "radial-gradient(circle, #333 0%, #000 100%)",
                          opacity: 0.8
                        }}
                      />

                      {/* Camera Overlay Info */}
                      <div style={{ position: "absolute", top: "10px", left: "10px", right: "10px", display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                        <div style={{ padding: "4px 8px", background: "rgba(0,0,0,0.7)", color: "#00ff00", borderRadius: "4px", fontSize: "12px", fontFamily: "monospace", display: "flex", gap: "8px" }}>
                          <span>REC ●</span>
                          <span>CAM-{selectedSignal.id}</span>
                          <span>{new Date().toLocaleTimeString()}</span>
                        </div>
                        <div style={{ padding: "4px 8px", background: selectedSignal.congestion === "HIGH" ? "rgba(239, 68, 68, 0.8)" : "rgba(16, 185, 129, 0.8)", color: "#fff", borderRadius: "4px", fontSize: "12px", fontWeight: "bold" }}>
                          {selectedSignal.congestion} TRAFFIC
                        </div>
                      </div>

                      {/* Analysis Overlay */}
                      <div style={{ position: "absolute", bottom: "10px", left: "10px", right: "10px", background: "rgba(0,0,0,0.8)", padding: "10px", borderRadius: "8px", backdropFilter: "blur(4px)" }}>
                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "8px", fontFamily: "monospace" }}>
                          <div style={{ color: "#fff" }}>
                            <div style={{ fontSize: "10px", color: "#9ca3af" }}>VEHICLES DETECTED</div>
                            <div style={{ fontSize: "16px", color: "#60a5fa" }}>{selectedSignal.vehicles}</div>
                          </div>
                          <div style={{ color: "#fff" }}>
                            <div style={{ fontSize: "10px", color: "#9ca3af" }}>AVG SPEED</div>
                            <div style={{ fontSize: "16px", color: "#fbbf24" }}>{selectedSignal.avgSpeed} km/h</div>
                          </div>
                          <div style={{ color: "#fff" }}>
                            <div style={{ fontSize: "10px", color: "#9ca3af" }}>AQI LEVEL</div>
                            <div style={{ fontSize: "16px", color: "#c084fc" }}>{selectedSignal.aqi}</div>
                          </div>
                        </div>
                      </div>

                      {/* Scanning Effect Line */}
                      <div className="scan-line" style={{
                        position: "absolute", top: 0, left: 0, right: 0, height: "2px", background: "rgba(0, 255, 0, 0.5)",
                        boxShadow: "0 0 10px rgba(0,255,0,0.8)", animation: "scan 3s linear infinite"
                      }}></div>
                      <style>{`
                        @keyframes scan {
                          0% { top: 0%; opacity: 0; }
                          10% { opacity: 1; }
                          90% { opacity: 1; }
                          100% { top: 100%; opacity: 0; }
                        }
                      `}</style>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="dashboard-sidebar">
            <div className="dashboard-scroll-area">

              {/* WEATHER WIDGET (User View) */}
              <div className="card fade-in" style={{ marginBottom: "16px", background: weather === "RAIN" ? "linear-gradient(to right, #374151, #4b5563)" : weather === "FOG" ? "linear-gradient(to right, #6b7280, #9ca3af)" : "linear-gradient(to right, #60a5fa, #3b82f6)", color: "white", border: "none" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div>
                    <div style={{ fontSize: "0.9rem", fontWeight: "600", display: "flex", alignItems: "center", gap: "6px" }}>
                      <MapPin size={14} color="white" /> Kolkata, IN
                    </div>
                    <div style={{ fontSize: "2rem", fontWeight: "bold", margin: "4px 0" }}>
                      {weather === "CLEAR" ? "28°" : weather === "RAIN" ? "22°" : "19°"}
                    </div>
                    <div style={{ fontSize: "0.85rem", opacity: 0.9 }}>
                      {weather === "CLEAR" ? "Mostly Sunny" : weather === "RAIN" ? "Light Rain" : "Foggy"}
                    </div>
                  </div>
                  {weather === "CLEAR" && <Cloud size={48} color="white" style={{ opacity: 0.8 }} />}
                  {weather === "RAIN" && <CloudRain size={48} color="white" style={{ opacity: 0.8 }} />}
                  {weather === "FOG" && <CloudFog size={48} color="white" style={{ opacity: 0.8 }} />}
                </div>
              </div>



              <SignalInfoPanel
                signal={selectedSignal}
                onViewFeed={() => setShowFeed(true)}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
