import { useEffect, useState, useContext } from "react";
import SignalGraph from "./SignalGraph";
import EnvironmentGraph from "./EnvironmentGraph";
import SpeedGraph from "./SpeedGraph";
import { Activity, Wind, Gauge, Car, Video, VideoOff, AlertTriangle } from "lucide-react";
import { AuthContext } from "../context/AuthContext";
import { useSocket } from "../context/SocketContext";

const SignalInfoPanel = ({ signal, onViewFeed }) => {
  const [history, setHistory] = useState([]);
  const { user } = useContext(AuthContext);
  const socket = useSocket();
  const [weather, setWeather] = useState("CLEAR"); // Add weather state

  useEffect(() => {
    if (!socket) return;
    socket.on("weatherUpdate", (data) => setWeather(data));
    return () => socket.off("weatherUpdate");
  }, [socket]);

  useEffect(() => {
    if (!signal) return;

    setHistory((prev) => [
      ...prev.slice(-9),
      {
        time: new Date().toLocaleTimeString(),
        vehicles: signal.vehicles,
        avgSpeed: signal.avgSpeed,
        aqi: signal.aqi
      }
    ]);
  }, [signal?.vehicles]);

  const overrideSignal = (action, duration = 30) => {
    if (!socket || !signal) return;
    socket.emit("adminSignalUpdate", { id: signal.id, action, duration });
  };

  if (!signal) {
    return (
      <div className="panel-container fade-in">
        <div style={{ textAlign: "center", marginTop: "100px", color: "#9ca3af" }}>
          <Activity size={48} style={{ opacity: 0.2, marginBottom: "16px" }} />
          <h3>Select a Signal</h3>
          <p>Click on any traffic light map marker <br /> to view real-time analytics.</p>
        </div>
      </div>
    );
  }

  const InfoItem = ({ icon: Icon, label, value, color }) => (
    <div style={{
      display: "flex",
      alignItems: "center",
      padding: "12px",
      background: "#f9fafb",
      borderRadius: "8px",
      marginBottom: "8px",
      borderLeft: `4px solid ${color}`
    }}>
      <div style={{
        padding: "8px",
        background: "white",
        borderRadius: "50%",
        boxShadow: "0 2px 4px rgba(0,0,0,0.05)",
        marginRight: "12px"
      }}>
        <Icon size={20} color={color} />
      </div>
      <div>
        <div style={{ fontSize: "12px", color: "#6b7280", fontWeight: "600" }}>{label}</div>
        <div style={{ fontSize: "16px", color: "#1f2937", fontWeight: "700" }}>{value}</div>
      </div>
    </div>
  );

  return (
    <div className="panel-container fade-in">
      <h2 className="section-title">{signal.name}</h2>

      <div style={{ marginBottom: "24px" }}>
        <InfoItem icon={Car} label="Total Vehicles" value={signal.vehicles} color="#3b82f6" />
        <InfoItem icon={Activity} label="Congestion Level" value={signal.congestion} color={signal.congestion === "HIGH" ? "#ef4444" : "#10b981"} />
        <InfoItem icon={Wind} label="Air Quality Index" value={signal.aqi} color="#8b5cf6" />

        <div style={{ position: "relative" }}>
          <InfoItem icon={Gauge} label="Avg Speed" value={`${signal.avgSpeed} km/h`} color="#f59e0b" />
          {weather !== "CLEAR" && (
            <div style={{ position: "absolute", top: 12, right: 12, fontSize: "10px", background: weather === "RAIN" ? "#dbeafe" : "#f3f4f6", color: weather === "RAIN" ? "#1e40af" : "#374151", padding: "2px 6px", borderRadius: "4px", fontWeight: "600" }}>
              {weather === "RAIN" ? "Rain: -20%" : "Fog: -40%"}
            </div>
          )}
        </div>
      </div>

      {user?.role === "admin" && (
        <div style={{ marginBottom: "24px", padding: "16px", background: "#fefff5", border: "1px solid #fde68a", borderRadius: "12px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "12px" }}>
            <AlertTriangle size={18} color="#d97706" />
            <h4 style={{ margin: 0, fontSize: "14px", color: "#b45309", fontWeight: "700" }}>Admin Override</h4>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "8px" }}>
            <button
              onClick={() => overrideSignal("forceGreen", 45)}
              className="btn"
              style={{ background: "#dcfce7", color: "#166534", border: "1px solid #22c55e", justifyContent: "center", fontSize: "12px", padding: "8px 4px" }}
            >
              Force GREEN
            </button>
            <button
              onClick={() => overrideSignal("forceYellow", 5)}
              className="btn"
              style={{ background: "#fef9c3", color: "#854d0e", border: "1px solid #ca8a04", justifyContent: "center", fontSize: "12px", padding: "8px 4px" }}
            >
              Force YELLOW
            </button>
            <button
              onClick={() => overrideSignal("forceRed", 45)}
              className="btn"
              style={{ background: "#fee2e2", color: "#991b1b", border: "1px solid #ef4444", justifyContent: "center", fontSize: "12px", padding: "8px 4px" }}
            >
              Force RED
            </button>
          </div>
          <p style={{ fontSize: "11px", color: "#92400e", marginTop: "8px", lineHeight: "1.4" }}>
            Actions apply immediately to all users. System resumes afterward.
          </p>
        </div>
      )}

      <h4 className="section-title">Traffic Volume</h4>
      <div className="card" style={{ padding: "16px", border: "1px solid #e5e7eb", boxShadow: "none", marginBottom: "16px" }}>
        <SignalGraph history={history} />
      </div>

      <h4 className="section-title">Avg Speed Trend</h4>
      <div className="card" style={{ padding: "16px", border: "1px solid #e5e7eb", boxShadow: "none", marginBottom: "16px" }}>
        <SpeedGraph history={history} />
      </div>

      <h4 className="section-title">Air Quality Index</h4>
      <div className="card" style={{ padding: "16px", border: "1px solid #e5e7eb", boxShadow: "none", marginBottom: "24px" }}>
        <EnvironmentGraph history={history} />
      </div>

      <button
        onClick={onViewFeed}
        className="btn btn-primary"
        style={{ width: "100%", display: "flex", justifyContent: "center", alignItems: "center", gap: "8px" }}
      >
        <Video size={18} />
        View Live Feed
      </button>
    </div>
  );
};
export default SignalInfoPanel;
