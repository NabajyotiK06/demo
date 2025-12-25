import React, { useEffect, useContext, useState, useRef, useMemo, useCallback } from "react";
import { MOCK_SERVICES } from "../data/mockServices";
import Map, { Marker, NavigationControl, GeolocateControl, Source, Layer, Popup } from "react-map-gl";
import { LocationContext } from "../context/LocationContext";
import { useSocket } from "../context/SocketContext";
import axios from "axios";
import { LocateFixed, Building, Car, Share2, Clock, MapPin as MapPinIcon, Info, Stethoscope, Shield, CircleParking, Zap } from "lucide-react";
import "mapbox-gl/dist/mapbox-gl.css";
import "../styles/trafficLight.css";

const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_TOKEN;

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

/* ---------- TRAFFIC LIGHT COMPONENT ---------- */
const TrafficLightMarker = ({ signal, onClick }) => {
  const { currentLight, timer } = signal;
  const color = currentLight === "RED" ? "#ef4444" : currentLight === "YELLOW" ? "#eab308" : "#22c55e";

  return (
    <div onClick={onClick} style={{ cursor: "pointer", display: "flex", flexDirection: "column", alignItems: "center" }}>
      <div style={{
        background: "#1f2937",
        border: "2px solid white",
        borderRadius: "12px",
        padding: "4px 8px",
        display: "flex",
        gap: "4px",
        boxShadow: "0 4px 6px rgba(0,0,0,0.3)"
      }}>
        <div style={{ width: "12px", height: "12px", borderRadius: "50%", background: currentLight === "RED" ? "#ef4444" : "#374151" }} />
        <div style={{ width: "12px", height: "12px", borderRadius: "50%", background: currentLight === "YELLOW" ? "#eab308" : "#374151" }} />
        <div style={{ width: "12px", height: "12px", borderRadius: "50%", background: currentLight === "GREEN" ? "#22c55e" : "#374151" }} />
      </div>
      <div style={{
        marginTop: "2px",
        background: color,
        color: "white",
        fontSize: "10px",
        fontWeight: "bold",
        padding: "2px 6px",
        borderRadius: "4px"
      }}>
        {timer}s
      </div>
    </div>
  );
};

/* ---------- INCIDENT MARKER COMPONENT ---------- */
const IncidentMarker = ({ type, onClick, onMouseEnter, onMouseLeave }) => (
  <div
    onClick={onClick}
    onMouseEnter={onMouseEnter}
    onMouseLeave={onMouseLeave}
    style={{ cursor: "pointer", fontSize: "24px" }}
  >
    ⚠️
  </div>
);

const HEATMAP_LAYER = {
  id: "traffic-heat",
  type: "heatmap",
  paint: {
    // Increase weight based on vehicle count (opacity prop 0-1)
    "heatmap-weight": [
      "interpolate",
      ["linear"],
      ["get", "opacity"],
      0, 0,
      0.5, 2, // Boost weight for medium traffic
      1, 5    // Significant boost for high traffic
    ],
    // Global intensity increases with zoom
    "heatmap-intensity": [
      "interpolate",
      ["linear"],
      ["zoom"],
      0, 1,
      15, 5 // Stronger intensity at street level
    ],
    // Traffic Color Ramp: Blue (Low) -> Yellow (Medium) -> Red (High)
    "heatmap-color": [
      "interpolate",
      ["linear"],
      ["heatmap-density"],
      0, "rgba(0,0,0,0)",
      0.2, "rgb(59, 130, 246)", // Blue (Low Density)
      0.5, "rgb(234, 179, 8)",  // Yellow (Medium Density)
      1, "rgb(239, 68, 68)"     // Red (High Density)
    ],
    // Radius increases with zoom to cover intersections
    "heatmap-radius": [
      "interpolate",
      ["linear"],
      ["zoom"],
      0, 5,
      15, 30 // Larger radius at high zoom
    ],
    // Fade out at very high zoom to show individual markers
    "heatmap-opacity": [
      "interpolate",
      ["linear"],
      ["zoom"],
      14, 0.8,
      18, 0
    ]
  }
};

const MapView = ({
  signals,
  setSignals,
  setSelectedSignalId,
  setLocation,
  location,
  showHeatmap,
  showSignals
}) => {
  const { searchedLocation } = useContext(LocationContext);
  const socket = useSocket();
  const [incidents, setIncidents] = useState([]);
  const [is3DMode, setIs3DMode] = useState(false);
  const [showTraffic, setShowTraffic] = useState(false);
  const [showNetwork, setShowNetwork] = useState(false);
  const [showIsochrone, setShowIsochrone] = useState(false);
  const [isochroneData, setIsochroneData] = useState(null);
  const [hoveredIncident, setHoveredIncident] = useState(null);

  const [viewState, setViewState] = useState({
    latitude: 22.5629,
    longitude: 88.3653,
    zoom: 12,
    pitch: 0,
    bearing: 0
  });
  const mapRef = useRef(null);

  // Fetch Signals via Socket
  useEffect(() => {
    if (!socket) return;

    socket.on("trafficUpdate", (data) => {
      setSignals(data);
    });

    return () => {
      socket.off("trafficUpdate");
    };
  }, [socket, setSignals]);

  // Fetch Incidents (Regular Polling is okay for now, or could use socket too)
  useEffect(() => {
    const fetchIncidents = async () => {
      try {
        const res = await axios.get("http://localhost:5000/api/incidents");
        setIncidents(res.data.filter(i => i.status !== "RESOLVED"));
      } catch (err) {
        console.error(err);
      }
    };
    fetchIncidents();
    // Use socket for incidents later or poll less frequently
    const interval = setInterval(fetchIncidents, 10000);
    return () => clearInterval(interval);
  }, []);

  // Kolkata Boundary (Approximate Polygon)
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

  // Helper: Point in Polygon (Ray Ray-Casting Algorithm)
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

  // Handle map click for setting location & Isochrone
  const handleMapClick = async (event) => {
    const { lat, lng } = event.lngLat;

    const isInside = isPointInPolygon([lng, lat], KOLKATA_BOUNDARY);

    if (!isInside) {
      alert("We currently don't serve in that area.");
      return;
    }

    if (setLocation) {
      setLocation({ lat, lng });
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
  };

  // Fly to searched location
  useEffect(() => {
    if (searchedLocation && mapRef.current) {
      mapRef.current.flyTo({
        center: [searchedLocation.lng, searchedLocation.lat],
        zoom: 15,
        duration: 1500,
        pitch: is3DMode ? 60 : 0
      });
    }
  }, [searchedLocation, is3DMode]);

  // Toggle 3D Mode
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

  const [showServices, setShowServices] = useState(false);
  const [services, setServices] = useState([]);
  const [hoveredService, setHoveredService] = useState(null);

  // MOCK_SERVICES imported at top level

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

  // Generate Network Connections (Arcs)
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
        geometry: {
          type: "LineString",
          coordinates: curvePoints
        }
      });
    }

    return {
      type: "FeatureCollection",
      features: lines
    };
  }, [signals, showNetwork]);

  return (
    <div style={{ height: "100%", width: "100%", position: "relative" }}>
      <Map
        {...viewState}
        ref={mapRef}
        onMove={evt => setViewState(evt.viewState)}
        style={{ width: "100%", height: "100%" }}
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

        {/* Custom Toggle Controls */}
        <div className="mapboxgl-ctrl mapboxgl-ctrl-group" style={{ position: "absolute", top: 10, right: 10, display: "flex", flexDirection: "column", gap: "5px" }}>
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
            onClick={toggleServices}
            title="Nearby Essential Services"
            style={{ width: '29px', height: '29px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: showServices ? '#e0f2fe' : 'white' }}
          >
            <Info size={16} color={showServices ? '#0284c7' : '#333'} />
          </button>
        </div>

        {/* Isochrone Layer */}
        {showIsochrone && isochroneData && (
          <Source type="geojson" data={isochroneData}>
            <Layer
              id="isochrone-fill"
              type="fill"
              paint={{
                "fill-color": "#db2777",
                "fill-opacity": 0.3
              }}
            />
            <Layer
              id="isochrone-line"
              type="line"
              paint={{
                "line-color": "#db2777",
                "line-width": 2
              }}
            />
          </Source>
        )}

        {/* Network Connections Layer */}
        {showNetwork && networkData && (
          <Source type="geojson" data={networkData}>
            <Layer
              id="network-arcs"
              type="line"
              paint={{
                "line-color": "#00f0ff", // Cyan
                "line-width": 3,
                "line-opacity": 0.8,
                "line-dasharray": [1, 2] // Dashed effect
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

        {/* Selected Location Marker */}
        {location && (
          <Marker longitude={location.lng} latitude={location.lat} anchor="bottom">
            <MapPin size={30} fill="#ef4444" color="#fff" />
          </Marker>
        )}

        {/* Traffic Signals Markers */}
        {showSignals && signals.map((s) => (
          <Marker
            key={s.id}
            longitude={s.lng}
            latitude={s.lat}
            anchor="center"
          >
            <TrafficLightMarker
              signal={s}
              onClick={(e) => {
                e.stopPropagation();
                setSelectedSignalId(s.id);
              }}
            />
          </Marker>
        ))}

        {/* Incident Markers */}
        {incidents.map((inc) => (
          <Marker
            key={inc._id}
            longitude={inc.lng}
            latitude={inc.lat}
            anchor="center"
          >
            <IncidentMarker
              type={inc.type}
              onClick={(e) => {
                e.stopPropagation();
              }}
              onMouseEnter={() => setHoveredIncident(inc)}
              onMouseLeave={() => setHoveredIncident(null)}
            />
          </Marker>
        ))}

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

        {/* Incident Popup */}
        {hoveredIncident && (
          <Popup
            longitude={hoveredIncident.lng}
            latitude={hoveredIncident.lat}
            anchor="top"
            closeButton={false}
            closeOnClick={false}
            offset={15}
            onClose={() => setHoveredIncident(null)}
          >
            <div style={{ color: "#333", padding: "5px" }}>
              <div style={{ fontWeight: "bold", marginBottom: "3px" }}>{hoveredIncident.type}</div>
              <div style={{ fontSize: "12px" }}>{hoveredIncident.description || "Caution advised"}</div>
              {hoveredIncident.timestamp && !isNaN(new Date(hoveredIncident.timestamp).getTime()) && (
                <div style={{ fontSize: "10px", color: "#666", marginTop: "3px" }}>
                  {new Date(hoveredIncident.timestamp).toLocaleTimeString()}
                </div>
              )}
            </div>
          </Popup>
        )}
      </Map>
    </div>
  );
};

// Simple MapPin component
const MapPin = ({ size = 24, fill = "currentColor", color = "none" }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill={fill}
    stroke={color}
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z" />
    <circle cx="12" cy="10" r="3" />
  </svg>
);

export default MapView;

