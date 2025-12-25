import express from "express";
import fetch from "node-fetch";
import { getTrafficState } from "../simulation/trafficSimulator.js";
import Incident from "../models/Incident.js";

const router = express.Router();

// Helper: Calculate distance between two coords (Haversine not strictly needed for small deltas, but good for simple proximity)
const getDistance = (lat1, lon1, lat2, lon2) => {
  const R = 6371; // km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

// POST /api/traffic/optimize-route
router.post("/optimize-route", async (req, res) => {
  const { start, end, type } = req.body;

  if (!start || !end) {
    return res.status(400).json({ message: "Start and End coordinates required" });
  }

  try {
    // 1. Fetch Routes from OSRM
    const osrmUrl = `https://router.project-osrm.org/route/v1/driving/${start.lng},${start.lat};${end.lng},${end.lat}?alternatives=true&steps=true&overview=full&geometries=geojson`;
    console.log("Fetching OSRM:", osrmUrl);

    const response = await fetch(osrmUrl);
    const data = await response.json();
    console.log("OSRM Response Code:", data.code);

    if (!data.routes || data.routes.length === 0) {
      console.log("OSRM No Routes:", data);
      return res.status(404).json({ message: "No routes found" });
    }

    const trafficSignals = getTrafficState();

    // Fetch active incidents (created in the last 24 hours, effectively active)
    const activeIncidents = await Incident.find({
      createdAt: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) }, // Fixed field name
      status: { $ne: "RESOLVED" }
    });
    console.log("Active Incidents Found:", activeIncidents.length);

    // 2. Analyze Routes against Live Traffic & Incidents
    const analyzedRoutes = data.routes.map((route, index) => {
      let congestionPenalty = 0;
      let congestionDetails = [];

      // Check route geometry against signal locations
      // For simplicity, we check a subset of points (e.g., every 10th point) against all signals
      // Or check if any signal is "close" to the line.
      // Better: Step through route steps.

      const routeCoords = route.geometry.coordinates; // [lng, lat]

      // Helper: Distance from point P to segment AB
      const distToSegment = (p, v, w) => {
        const l2 = (w[0] - v[0]) ** 2 + (w[1] - v[1]) ** 2;
        if (l2 === 0) return Math.sqrt((p[0] - v[0]) ** 2 + (p[1] - v[1]) ** 2);
        let t = ((p[0] - v[0]) * (w[0] - v[0]) + (p[1] - v[1]) * (w[1] - v[1])) / l2;
        t = Math.max(0, Math.min(1, t));
        const proj = [v[0] + t * (w[0] - v[0]), v[1] + t * (w[1] - v[1])];
        return Math.sqrt((p[0] - proj[0]) ** 2 + (p[1] - proj[1]) ** 2);
      };

      // Check segments for better accuracy
      for (let i = 0; i < routeCoords.length - 1; i++) {
        const startPt = routeCoords[i]; // [lng, lat]
        const endPt = routeCoords[i + 1];

        // Check Traffic Signals
        trafficSignals.forEach(signal => {
          const sPt = [signal.lng, signal.lat];
          // Approximate Degree distance. 0.005 degrees is approx 500m
          const d = distToSegment(sPt, startPt, endPt);

          if (d < 0.005) { // Within ~500m
            if (!congestionDetails.includes(signal.name)) {
              if (signal.congestion === "HIGH") {
                congestionPenalty += 50;
                congestionDetails.push(signal.name);
              } else if (signal.congestion === "MEDIUM") {
                congestionPenalty += 20;
              }
            }
          }
        });

        // Check Incidents
        activeIncidents.forEach(incident => {
          const iLat = incident.lat || (incident.location && incident.location.lat);
          const iLng = incident.lng || (incident.location && incident.location.lng);

          if (iLat && iLng) {
            const iPt = [iLng, iLat];
            // Increased threshold to 0.004 (approx 440m) to catch what frontend catches
            const d = distToSegment(iPt, startPt, endPt);

            if (d < 0.004) {
              const incidentLabel = `Incident: ${incident.type}`;
              if (!congestionDetails.includes(incidentLabel)) {
                congestionPenalty += 5000; // Massive penalty forces reroute
                congestionDetails.push(incidentLabel);
              }
            }
          }
        });
      }

      // Base Score = Duration (mins) + Penalty
      const durationMins = route.duration / 60;
      const score = durationMins + congestionPenalty;

      return {
        ...route,
        aiScore: score,
        congestionPenalty,
        congestionDetails,
        formattedDuration: durationMins.toFixed(1),
        formattedDistance: (route.distance / 1000).toFixed(2)
      };
    });

    // 3. Sort by AI Score (Ascending) or Duration based on type
    if (type === "shortest") {
      // Even in shortest mode, avoid severe incidents (penalty > 400 means incident)
      analyzedRoutes.sort((a, b) => {
        const aEffectiveDuration = a.duration + (a.congestionPenalty >= 400 ? 10000 : 0);
        const bEffectiveDuration = b.duration + (b.congestionPenalty >= 400 ? 10000 : 0);
        return aEffectiveDuration - bEffectiveDuration;
      });
    } else {
      analyzedRoutes.sort((a, b) => a.aiScore - b.aiScore);
    }

    // 4. Add "AI Reasoning"
    const bestRoute = analyzedRoutes[0];
    let aiReasoning = "";

    if (type === "shortest") {
      if (bestRoute.congestionPenalty >= 400) {
        aiReasoning = "Even the shortest route has a reported incident. Use caution.";
      } else {
        aiReasoning = "We selected the route with the absolute shortest travel time, regardless of potential congestion.";
      }
    } else {
      // Optimal Logic
      aiReasoning = "This is the best balance of speed and traffic avoidance.";

      if (analyzedRoutes.length > 1) {
        const alternative = analyzedRoutes[1];
        if (bestRoute.congestionPenalty < alternative.congestionPenalty) {
          aiReasoning = `AI recommended this route to avoid heavy congestion detected at ${alternative.congestionDetails.slice(0, 2).join(", ") || "key intersections"}.`;
        } else if (bestRoute.duration < alternative.duration) {
          aiReasoning = "Traffic conditions are stable, so the shortest route is also the optimal one.";
        }
      } else if (bestRoute.congestionPenalty > 0) {
        aiReasoning = `Heavy traffic detected at ${bestRoute.congestionDetails.slice(0, 2).join(", ")}, but this remains the most efficient option.`;
      }
    }

    res.json({
      routes: analyzedRoutes.map((r, index) => ({
        geoJsonCoords: r.geometry.coordinates,
        distance: r.formattedDistance,
        duration: r.formattedDuration,
        steps: r.legs[0].steps,
        summary: r.legs[0].summary,
        congestionPenalty: r.congestionPenalty,
        aiReasoning: index === 0 ? aiReasoning : null // Only attach reasoning to best route logic for now, or all? 
        // Let's refine: Return the sorted list, Client can display "Recommended" tag.
      })),
      bestRouteIndex: 0,
      aiReasoning
    });

  } catch (error) {
    console.error("Optimizer Error:", error);
    res.status(500).json({ message: "Failed to optimize route" });
  }
});

export default router;
