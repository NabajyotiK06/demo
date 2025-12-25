import { Link } from "react-router-dom";
import { Menu, Activity, Map, ShieldAlert, ArrowRight } from "lucide-react";
import "../styles/landing.css";

// Replaced background with a relevant "Smart City / Traffic" image
const heroImage = "https://images.unsplash.com/photo-1477959858617-67f85cf4f1df?q=80&w=2613&auto=format&fit=crop";

const LandingPage = () => {
    return (
        <div className="lp-container">
            {/* NAVBAR */}
            <nav className="lp-navbar">
                <Link to="/" className="lp-logo">
                    <div className="lp-logo-icon">
                        <Menu size={20} />
                    </div>
                    MoveWise
                </Link>

                <div className="lp-nav-links">
                    <Link to="/login" className="lp-btn lp-btn-ghost">
                        Login
                    </Link>
                    <Link to="/signup" className="lp-btn lp-btn-primary">
                        Sign Up
                    </Link>
                </div>
            </nav>

            {/* HERO SECTION */}
            <header
                className="lp-hero fade-in"
                style={{
                    backgroundImage: `linear-gradient(to bottom, rgba(15, 23, 42, 0.8), rgba(15, 23, 42, 0.6)), url(${heroImage})`,
                    backgroundSize: 'cover',
                    backgroundPosition: 'center',
                    backgroundRepeat: 'no-repeat'
                }}
            >
                <span className="lp-badge">AI-Powered Traffic Control</span>
                <h1 className="lp-title">
                    Smarter Cities Start with <br />
                    <span>Intelligent Flow.</span>
                </h1>
                <p className="lp-subtitle">
                    Optimize urban mobility, reduce congestion, and manage critical incidents
                    in real-time with MoveWise's advanced traffic management system.
                </p>

                <div className="lp-cta-group">
                    <Link to="/signup" className="lp-btn lp-btn-primary lp-cta-lg">
                        Get Started <ArrowRight size={18} style={{ marginLeft: "8px" }} />
                    </Link>
                    <a href="#features" className="lp-btn lp-btn-ghost lp-cta-lg">
                        Learn More
                    </a>
                </div>


            </header>

            {/* FEATURES SECTION */}
            <section id="features" className="lp-features-section">
                <div className="lp-section-header">
                    <h2 className="lp-section-title">Why MoveWise?</h2>
                    <p className="lp-subtitle" style={{ marginBottom: 0 }}>
                        Built for modern city planners and traffic controllers.
                    </p>
                </div>

                <div className="lp-grid">
                    <div className="lp-feat-card">
                        <div className="lp-feat-icon">
                            <Activity size={24} />
                        </div>
                        <h3 className="lp-feat-title">Real-Time Monitoring</h3>
                        <p className="lp-feat-desc">
                            Visualize traffic density, signal states, and congestion levels across the entire city grid instantly.
                        </p>
                    </div>

                    <div className="lp-feat-card">
                        <div className="lp-feat-icon">
                            <Map size={24} />
                        </div>
                        <h3 className="lp-feat-title">Smart Routing</h3>
                        <p className="lp-feat-desc">
                            AI algorithms analyze historical and live data to suggest optimal routes and reduce travel time.
                        </p>
                    </div>

                    <div className="lp-feat-card">
                        <div className="lp-feat-icon">
                            <ShieldAlert size={24} />
                        </div>
                        <h3 className="lp-feat-title">Incident Management</h3>
                        <p className="lp-feat-desc">
                            Detect, report, and respond to accidents or hazards swiftly with integrated emergency protocols.
                        </p>
                    </div>
                </div>
            </section>

            {/* FOOTER */}
            <footer className="lp-footer">
                <p>© {new Date().getFullYear()} MoveWise. All rights reserved.</p>
            </footer>
        </div>
    );
};

export default LandingPage;
