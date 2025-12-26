import { useState } from "react";
import axios from "axios";
import { useNavigate, Link } from "react-router-dom";
import { User, Mail, Lock, Zap, ArrowRight, Eye, EyeOff, Shield } from "lucide-react";
import "../styles/auth.css";

const Signup = () => {
  const navigate = useNavigate();

  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    role: "user",
    adminSecretKey: ""
  });
  const [showPassword, setShowPassword] = useState(false);

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSignup = async () => {
    const { name, email, password } = form;
    if (!name || !email || !password) {
      alert("Please fill in all fields");
      return;
    }
    if (password.length < 8) {
      alert("Password must be at least 8 characters");
      return;
    }

    try {
      await axios.post("http://localhost:5000/api/auth/signup", form);
      alert("Signup successful. Please login.");
      navigate("/login");
    } catch (err) {
      alert(err.response?.data?.message || "Signup failed");
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
            "Empowering cities with data-driven traffic solutions."
          </div>
          <div className="quote-author">
            — Join the Network
          </div>
        </div>
      </div>

      {/* Right Panel - Form */}
      <div className="auth-right-panel">
        <div className="auth-form-container animate-slide-in">
          <div className="auth-header">
            <h2 className="auth-title-large">Create Account</h2>
            <p className="auth-subtitle">Get started with your free account.</p>
          </div>

          <div className="auth-input-group">
            <label className="auth-label">Full Name</label>
            <div className="auth-input-wrapper">
              <input
                name="name"
                placeholder="John Doe"
                onChange={handleChange}
                className="auth-input"
              />
              <User size={18} className="auth-icon" />
            </div>
          </div>

          <div className="auth-input-group">
            <label className="auth-label">Email Address</label>
            <div className="auth-input-wrapper">
              <input
                name="email"
                placeholder="john@example.com"
                onChange={handleChange}
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
                name="password"
                placeholder="Create a password"
                onChange={handleChange}
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

          <div className="auth-input-group">
            <label className="auth-label">Role</label>
            <div className="auth-input-wrapper">
              <select
                name="role"
                onChange={handleChange}
                className="auth-input"
                style={{ appearance: 'none' }}
              >
                <option value="user">Public User</option>
                <option value="admin">Administrator</option>
              </select>
              <Shield size={18} className="auth-icon" />
            </div>
          </div>

          {form.role === "admin" && (
            <div className="auth-input-group animate-slide-in">
              <label className="auth-label">Admin Secret Key</label>
              <div className="auth-input-wrapper">
                <input
                  type="password"
                  name="adminSecretKey"
                  placeholder="Enter secret key"
                  onChange={handleChange}
                  className="auth-input"
                />
                <Lock size={18} className="auth-icon" />
              </div>
            </div>
          )}

          <button onClick={handleSignup} className="auth-btn-primary">
            create Account <ArrowRight size={18} />
          </button>

          <div className="auth-footer-text">
            Already have an account? <Link to="/login" className="auth-link">Log In</Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Signup;
