import { useContext, useState, useEffect } from "react";
import Sidebar from "../components/Sidebar";
import Topbar from "../components/Topbar";
import MapView from "../components/MapView";
import IncidentForm from "../components/IncidentForm";
import { AuthContext } from "../context/AuthContext";
import "../styles/layout.css";
import WeatherOverlay from "../components/WeatherOverlay";

const IncidentReport = () => {
  const { user } = useContext(AuthContext);
  const [signals, setSignals] = useState([]); // Needed for MapView to render correctly
  const [selectedSignalId, setSelectedSignalId] = useState(null); // Needed for MapView props
  const [location, setLocation] = useState(null);

  // We can keep the heatmap toggle or default it. Let's keep it simple for now, 
  // maybe just default to showing it so the map isn't empty.
  const [showHeatmap, setShowHeatmap] = useState(true);

  return (
    <div className="app-layout">
      <Sidebar role={user.role} />

      <div className="main-content">
        <Topbar />

        <div className="page-body">
          <div className="dashboard-map-container">
            <div className="heatmap-toggle fade-in">
              <label className="heatmap-label">
                <input
                  type="checkbox"
                  checked={showHeatmap}
                  onChange={() => setShowHeatmap(!showHeatmap)}
                  style={{ width: "16px", height: "16px" }}
                />
                Show Traffic Heatmap
              </label>
            </div>
            <MapView
              signals={signals}
              setSignals={setSignals}
              setSelectedSignalId={setSelectedSignalId}
              setLocation={setLocation}
              location={location}
              showHeatmap={showHeatmap}
            />
            {/* GLOBAL WEATHER OVERLAY */}
            <WeatherOverlay />
          </div>

          <div className="dashboard-sidebar">
            <div className="dashboard-scroll-area">
              <IncidentForm location={location} setLocation={setLocation} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default IncidentReport;
