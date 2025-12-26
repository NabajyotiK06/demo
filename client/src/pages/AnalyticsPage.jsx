import { useEffect, useState } from "react";
import Sidebar from "../components/Sidebar";
import Topbar from "../components/Topbar";
import AnalyticsPanel from "../components/AnalyticsPanel";
import { useSocket } from "../context/SocketContext";
import "../styles/layout.css";

const AnalyticsPage = () => {
    const socket = useSocket();
    const [incidents, setIncidents] = useState([]);
    const [signals, setSignals] = useState([]);

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

    // SOCKET: Listen for traffic updates
    useEffect(() => {
        if (!socket) return;

        socket.on("trafficUpdate", (data) => {
            setSignals(data);
        });

        return () => {
            socket.off("trafficUpdate");
        };
    }, [socket]);

    return (
        <div className="app-layout">
            <Sidebar role="admin" />

            <div className="main-content">
                <Topbar showSearch={false} />

                <div className="page-body">
                    <div className="dashboard-map-container" style={{ padding: "16px", overflowY: "auto" }}>
                        <h2 className="section-title">System Analytics</h2>
                        <AnalyticsPanel signals={signals} incidents={incidents} />
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AnalyticsPage;
