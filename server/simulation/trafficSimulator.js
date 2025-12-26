import fs from "fs";
import path from "path";

const filePath = path.join("simulation", "trafficData.json");

const getRandomInt = (min, max) =>
  Math.floor(Math.random() * (max - min + 1)) + min;


// In-memory state for traffic signals
let signalsState = [];
let currentWeather = "CLEAR"; // Default Weather


const getCongestionLevel = (vehicles) => {
  if (vehicles < 60) return "LOW";
  if (vehicles < 130) return "MEDIUM";
  return "HIGH";
};

// Calculate dynamic duration based on congestion
const calculateGreenDuration = (congestion) => {
  switch (congestion) {
    case "HIGH": return 40; // Seconds
    case "MEDIUM": return 20;
    case "LOW": return 10;
    default: return 15;
  }
};

const simulateTraffic = (io) => {
  // Initial Load
  if (signalsState.length === 0) {
    const rawData = fs.readFileSync(filePath);
    signalsState = JSON.parse(rawData).map(s => ({
      ...s,
      lat: s.location.lat,
      lng: s.location.lng,
      currentLight: "RED", // RED, YELLOW, GREEN
      timer: 0,
      phaseDuration: 10,
      vehicles: s.vehicles || 0,
      trend: Math.random() > 0.5 ? 1 : -1
    }));
  }

  // Handle Admin Overrides
  io.on("connection", (socket) => {
    // Admin manually changes a signal
    socket.on("adminSignalUpdate", ({ id, action, duration }) => {
      const signal = signalsState.find(s => s.id === id);
      if (signal) {
        if (action === "forceGreen") {
          signal.currentLight = "GREEN";
          signal.timer = duration || 30;
          signal.phaseDuration = duration || 30;
        } else if (action === "forceRed") {
          signal.currentLight = "RED";
          signal.timer = duration || 30;
          signal.phaseDuration = duration || 30;
        } else if (action === "forceYellow") {
          signal.currentLight = "YELLOW";
          signal.timer = duration || 5;
          signal.phaseDuration = duration || 5;
        }
        // Broadcast immediate update
        io.emit("trafficUpdate", signalsState);
      }
    });

    // Admin manually updates Weather
    socket.on("adminWeatherUpdate", (weather) => {
      currentWeather = weather;
      io.emit("weatherUpdate", currentWeather); // Broadcast to all
    });

    // 🚑 Emergency Green Wave
    socket.on("emergencyRouteActive", ({ signalIds, duration }) => {
      console.log(`🚑 Green Wave Activated for ${signalIds.length} signals`);
      signalsState.forEach(s => {
        if (signalIds.includes(s.id)) {
          s.currentLight = "GREEN";
          s.timer = duration || 45;
          s.phaseDuration = duration || 45;
          s.congestion = "LOW"; // Clear the way logic
          s.vehicles = Math.max(5, Math.floor(s.vehicles * 0.3)); // Clear 70% of traffic
        }
      });
      io.emit("trafficUpdate", signalsState);
    });
  });


  // Simulation Loop (runs every 1 second)
  setInterval(() => {
    signalsState = signalsState.map(signal => {
      let { currentLight, timer, vehicles, trend } = signal;

      // 1. Simulate Vehicle Flux (Trend-based)
      // 5% chance to flip trend
      if (Math.random() < 0.05) trend *= -1;

      // Calculate change based on trend
      let change;
      if (trend === 1) {
        change = getRandomInt(-5, 15); // Bias positive
      } else {
        change = getRandomInt(-15, 5); // Bias negative
      }

      vehicles = Math.max(2, Math.min(200, vehicles + change));

      const congestion = getCongestionLevel(vehicles);

      // Calculate derived metrics
      // Calculate Speed: Inversely proportional to vehicles. Base 60km/h. Min 2km/h.
      let baseSpeed = 70 - (vehicles * 0.45) + getRandomInt(-10, 10);

      // Weather Impact
      if (currentWeather === "RAIN") baseSpeed *= 0.8;
      if (currentWeather === "FOG") baseSpeed *= 0.6;

      let avgSpeed = Math.max(2, baseSpeed);
      avgSpeed = Math.round(avgSpeed * 10) / 10;

      // AQI: Map 0-200 vehicles to 70-190 range
      let aqi = 70 + (vehicles * 0.6) + getRandomInt(-10, 10);
      aqi = Math.max(70, Math.min(190, Math.round(aqi)));

      // 2. Decrement Timer
      if (timer > 0) {
        timer--;
      } else {
        // 3. Switch Light Phase
        if (currentLight === "RED") {
          currentLight = "GREEN";
          timer = calculateGreenDuration(congestion);
        } else if (currentLight === "GREEN") {
          currentLight = "YELLOW";
          timer = 5; // Yellow always 5s
        } else if (currentLight === "YELLOW") {
          currentLight = "RED";
          timer = 20; // Default Red
        }
        signal.phaseDuration = timer;
      }

      return {
        ...signal,
        vehicles,
        congestion,
        trend,
        avgSpeed, // Added
        aqi,      // Added
        currentLight,
        timer,
        lastUpdated: new Date().toISOString()
      };
    });

    // Write to file (optional, for persistence)
    // fs.writeFileSync(filePath, JSON.stringify(signalsState, null, 2));

    // Emit Real-time Update
    io.emit("trafficUpdate", signalsState);
    io.emit("weatherUpdate", currentWeather); // Ensure new clients get this


  }, 1000);
}

export const getTrafficState = () => signalsState;
export default simulateTraffic;
