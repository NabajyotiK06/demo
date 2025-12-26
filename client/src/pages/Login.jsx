import { useContext, useState } from "react";
import axios from "axios";
import { AuthContext } from "../context/AuthContext";
import { useNavigate, Link } from "react-router-dom";
import { Mail, Lock, Zap, ArrowRight, Eye, EyeOff } from "lucide-react";
import "../styles/auth.css";

const Login = () => {
  const navigate = useNavigate();
  const { login } = useContext(AuthContext);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [adminSecretKey, setAdminSecretKey] = useState("");
  const [isAdminLogin, setIsAdminLogin] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");

  const handleLogin = async () => {
    setError("");

    if (!email || !password) {
      setError("Please fill in all fields");
      return;
    }

    if (isAdminLogin && !adminSecretKey) {
      setError("Admin Secret Key is required");
      return;
    }

    try {
      const res = await axios.post("http://localhost:5000/api/auth/login", {
        email,
        password,
        adminSecretKey: isAdminLogin ? adminSecretKey : undefined
      });

      login(res.data);

      if (res.data.role === "admin") navigate("/admin");
      else navigate("/dashboard");
    } catch (err) {
      console.error("Login Error:", err);
      setError(err.response?.data?.message || "Login failed");
    }
  };

  return (
    <div className="auth-split-layout">
      {/* Left Panel - Branding */}
      <div className="auth-left-panel">
        <div className="auth-left-overlay"></div>
        <div className="auth-brand-content">
          <div className="auth-brand-logo">
            <div style={{ background: '#3b82f6', padding: '8px', borderRadius: '8px', display: 'flex' }}>
              <Zap size={24} fill="white" />
            </div>
            MoveWise
          </div>
        </div>

        <div className="auth-brand-quote">
          <div className="quote-text">
            "The future of traffic management is here. Join the revolution."
          </div>
          <div className="quote-author">
            — MoveWise Intelligent Systems
          </div>
        </div>
      </div>

      {/* Right Panel - Form */}
      <div className="auth-right-panel">
        <div className="auth-form-container animate-slide-in">
          <div className="auth-header">
            <h2 className="auth-title-large">Welcome Back</h2>
            <p className="auth-subtitle">Please sign in to your dashboard.</p>
          </div>

          {error && (
            <div style={{
              background: "#fee2e2", color: "#b91c1c", padding: "12px",
              borderRadius: "8px", fontSize: "14px", marginBottom: "20px"
            }}>
              {error}
            </div>
          )}

          <div className="auth-input-group">
            <label className="auth-label">Email Address</label>
            <div className="auth-input-wrapper">
              <input
                placeholder="name@company.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="auth-input"
              />
              <Mail size={18} className="auth-icon" />
            </div>
          </div>

          <div className="auth-input-group">
            <label className="auth-label">Password</label>
            <div className="auth-input-wrapper">
              <input
                type={showPassword ? "text" : "password"}
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="auth-input"
              />
              <Lock size={18} className="auth-icon" />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                style={{
                  position: "absolute", right: "12px", top: "50%", transform: "translateY(-50%)",
                  background: "none", border: "none", cursor: "pointer", color: "#94a3b8"
                }}
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          <div style={{ marginBottom: "20px", display: "flex", alignItems: "center", gap: "10px" }}>
            <input
              type="checkbox"
              checked={isAdminLogin}
              onChange={(e) => setIsAdminLogin(e.target.checked)}
              id="adminToggle"
              style={{ width: "16px", height: "16px", accentColor: "#3b82f6" }}
            />
            <label htmlFor="adminToggle" style={{ color: "#334155", fontSize: "14px", fontWeight: "600", cursor: "pointer" }}>
              Login as Administrator
            </label>
          </div>

          {isAdminLogin && (
            <div className="auth-input-group animate-slide-in">
              <label className="auth-label">Admin Secret Key</label>
              <div className="auth-input-wrapper">
                <input
                  type="password"
                  placeholder="Enter system key"
                  value={adminSecretKey}
                  onChange={(e) => setAdminSecretKey(e.target.value)}
                  className="auth-input"
                />
                <Lock size={18} className="auth-icon" />
              </div>
            </div>
          )}

          <button onClick={handleLogin} className="auth-btn-primary">
            Sign In <ArrowRight size={18} />
          </button>

          <div className="auth-footer-text">
            Don’t have an account? <Link to="/signup" className="auth-link">Create Account</Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
