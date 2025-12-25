import { Link, useLocation } from "react-router-dom";
import { LayoutDashboard, Map, AlertTriangle, Menu, Mail, AlertCircle, ClipboardList, BarChart2 } from "lucide-react";

const Sidebar = ({ role }) => {
  const location = useLocation();

  const isActive = (path) => location.pathname === path;

  return (
    <div className="sidebar">
      <div className="logo-container">
        <div className="logo-icon">
          <Menu size={24} color="#fff" />
        </div>
        <h2>MoveWise</h2>
      </div>

      <nav className="nav-links">
        <Link to="/dashboard" className={`nav-item ${isActive("/dashboard") ? "active" : ""}`}>
          <LayoutDashboard size={20} />
          <span>Live Monitoring</span>
        </Link>

        <Link
          to="/route-planner"
          className={`nav-item ${isActive("/route-planner") ? "active" : ""}`}
        >
          <Map size={20} />
          <span>Route Planner</span>
        </Link>

        <Link
          to="/report-incident"
          className={`nav-item ${isActive("/report-incident") ? "active" : ""}`}
        >
          <AlertCircle size={20} />
          <span>Report Incident</span>
        </Link>

        <Link
          to="/bulletin"
          className={`nav-item ${isActive("/bulletin") ? "active" : ""}`}
        >
          <ClipboardList size={20} />
          <span>Bulletin Board</span>
        </Link>

        {role === "admin" && (
          <>
            <Link
              to="/admin"
              className={`nav-item ${isActive("/admin") ? "active" : ""}`}
            >
              <AlertTriangle size={20} />
              <span>Incident Management</span>
            </Link>

            <Link
              to="/analytics"
              className={`nav-item ${isActive("/analytics") ? "active" : ""}`}
            >
              <BarChart2 size={20} />
              <span>Analytics</span>
            </Link>
          </>
        )}

        {role !== "admin" && (
          <Link
            to="/contact"
            className={`nav-item ${isActive("/contact") ? "active" : ""}`}
          >
            <Mail size={20} />
            <span>Contact Us</span>
          </Link>
        )}
      </nav>

      <div className="sidebar-footer">
        <p>© {new Date().getFullYear()} MoveWise</p>
      </div>
    </div>
  );
};

export default Sidebar;
