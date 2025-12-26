import { BrowserRouter, Routes, Route } from "react-router-dom";
import Dashboard from "./pages/Dashboard";
import AdminDashboard from "./pages/AdminDashboard";
import AnalyticsPage from "./pages/AnalyticsPage";
import RoutePlanner from "./pages/RoutePlanner";
import LandingPage from "./pages/LandingPage";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import ContactUs from "./pages/ContactUs";
import IncidentReport from "./pages/IncidentReport";
import BulletinBoard from "./pages/BulletinBoard";
import ProtectedRoute from "./components/ProtectedRoute";
import { AuthProvider } from "./context/AuthContext";
import { LocationProvider } from "./context/LocationContext";
import { SocketProvider } from "./context/SocketContext";
import { ThemeProvider } from "./context/ThemeContext";
import "./styles/themes.css"; // Import global themes

import EmergencyOverlay from "./components/EmergencyOverlay";

function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <LocationProvider>
          <SocketProvider>
            <EmergencyOverlay />
            <BrowserRouter>
              <Routes>
                <Route path="/login" element={<Login />} />
                <Route path="/signup" element={<Signup />} />

                <Route path="/" element={<LandingPage />} />

                <Route
                  path="/dashboard"
                  element={
                    <ProtectedRoute>
                      <Dashboard />
                    </ProtectedRoute>
                  }
                />

                <Route
                  path="/admin"
                  element={
                    <ProtectedRoute role="admin">
                      <AdminDashboard />
                    </ProtectedRoute>
                  }
                />

                <Route
                  path="/analytics"
                  element={
                    <ProtectedRoute role="admin">
                      <AnalyticsPage />
                    </ProtectedRoute>
                  }
                />

                <Route
                  path="/route-planner"
                  element={
                    <ProtectedRoute>
                      <RoutePlanner />
                    </ProtectedRoute>
                  }
                />

                <Route
                  path="/contact"
                  element={
                    <ProtectedRoute>
                      <ContactUs />
                    </ProtectedRoute>
                  }
                />

                <Route
                  path="/report-incident"
                  element={
                    <ProtectedRoute>
                      <IncidentReport />
                    </ProtectedRoute>
                  }
                />

                <Route
                  path="/bulletin"
                  element={
                    <ProtectedRoute>
                      <BulletinBoard />
                    </ProtectedRoute>
                  }
                />
              </Routes>
            </BrowserRouter>
          </SocketProvider>
        </LocationProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;
