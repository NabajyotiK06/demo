import { useEffect, useState } from "react";
import { useSocket } from "../context/SocketContext";
import "../styles/weather.css";

const WeatherOverlay = () => {
    const socket = useSocket();
    const [weather, setWeather] = useState("CLEAR");

    useEffect(() => {
        if (!socket) return;

        socket.on("weatherUpdate", (data) => {
            setWeather(data);
        });

        return () => {
            socket.off("weatherUpdate");
        };
    }, [socket]);

    return (
        <div style={{ position: "absolute", top: 0, left: 0, width: "100%", height: "100%", pointerEvents: "none", zIndex: 9999 }}>
            {weather === "RAIN" && (
                <div className="rain-container">
                    <div className="rain-layer"></div>
                    <div className="rain-layer"></div>
                </div>
            )}
            {weather === "FOG" && (
                <div className="weather-overlay-fog"></div>
            )}
        </div>
    );
};

export default WeatherOverlay;
