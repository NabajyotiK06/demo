import React from 'react';
import { Link } from "react-router-dom";
import { Clock, Leaf, Shield, Zap, Ambulance, UserCheck, PlayCircle, ArrowRight, Twitter, Linkedin } from "lucide-react";
import "../styles/landing.css";

const LandingPage = () => {
    return (
        <div className="lp-wrapper">
            {/* Navbar */}
            <nav className="lp-navbar">
                <div className="lp-logo">
                    <div className="lp-logo-icon"><Zap size={20} fill="white" /></div>
                    <span>MoveWise</span>
                </div>
                <div className="lp-nav-menu">
                    <Link to="/signup" className="lp-btn-nav">Get Started</Link>
                </div>
            </nav>

            {/* Hero Section */}
            <header className="lp-hero">
                <div className="lp-hero-overlay"></div>
                <div className="lp-hero-content">
                    <div className="lp-hero-badge animate-fade-in">⚡ AI-POWERED TRAFFIC CONTROL</div>
                    <h1 className="lp-hero-title animate-fade-in delay-100">
                        Reclaiming Your Time,<br />One Green Light at a Time.
                    </h1>
                    <p className="lp-hero-desc animate-fade-in delay-200">
                        Discover how AI-driven traffic solutions are transforming our city streets into safer, faster, and cleaner pathways for everyone.
                    </p>
                    <div className="lp-hero-actions animate-fade-in delay-300">
                        <Link to="/login" className="lp-btn-primary">Login</Link>
                    </div>
                </div>
            </header>

            {/* Stats Bar */}
            <section className="lp-stats-container">
                <div className="lp-stats-bar">
                    <div className="lp-stat-card">
                        <div className="lp-stat-icon blue"><Clock size={24} /></div>
                        <div>
                            <div className="lp-stat-label">LESS COMMUTE TIME</div>
                            <div className="lp-stat-value">20%</div>
                        </div>
                    </div>
                    <div className="lp-stat-card">
                        <div className="lp-stat-icon green"><Leaf size={24} /></div>
                        <div>
                            <div className="lp-stat-label">REDUCTION IN CO2</div>
                            <div className="lp-stat-value">15%</div>
                        </div>
                    </div>
                    <div className="lp-stat-card">
                        <div className="lp-stat-icon purple"><Shield size={24} /></div>
                        <div>
                            <div className="lp-stat-label">SAFER INTERSECTIONS</div>
                            <div className="lp-stat-value">30%</div>
                        </div>
                    </div>
                </div>
            </section>

            {/* Smart Flow Section */}
            <section id="tech" className="lp-section">
                <div className="lp-container lp-split-layout">
                    <div className="lp-text-content">
                        <div className="lp-section-label">TECHNOLOGY</div>
                        <h2 className="lp-section-title">MoveWise: The Brain of the City</h2>
                        <p className="lp-section-desc">
                            Our intelligent system moves beyond static timers. By using advanced sensors and AI, we optimize traffic flow in real-time, adapting to the city's pulse as it happens.
                        </p>

                        <div className="lp-feature-list">
                            <div className="lp-feature-item">
                                <div className="lp-feature-icon-box blue"><Zap size={20} /></div>
                                <div>
                                    <h4>Adaptive Signals</h4>
                                    <p>Lights that communicate with each other, creating "green waves" that adapt based on actual traffic demand, not archaic schedules.</p>
                                </div>
                            </div>
                            <div className="lp-feature-item">
                                <div className="lp-feature-icon-box red"><Ambulance size={20} /></div>
                                <div>
                                    <h4>Emergency Priority</h4>
                                    <p>The system detects approaching emergency vehicles and instantly clears the intersection, saving critical seconds when it matters most.</p>
                                </div>
                            </div>
                            <div className="lp-feature-item">
                                <div className="lp-feature-icon-box yellow"><UserCheck size={20} /></div>
                                <div>
                                    <h4>Pedestrian Safety</h4>
                                    <p>Smart crosswalks equipped with sensors that extend crossing times for elderly or slower pedestrians automatically.</p>
                                </div>
                            </div>
                        </div>
                    </div>
                    <div className="lp-image-content">
                        {/* Abstract Map Visual */}
                        <div className="lp-map-visual">
                            <div className="lp-map-overlay-card animate-float">
                                <div className="lp-status-dot active"></div>
                                <div>
                                    <div className="lp-card-small-title">System Active • Downtown Sector</div>
                                    <div className="lp-progress-bar"><div className="lp-progress-fill" style={{ width: '94%' }}></div></div>
                                    <div className="lp-card-small-meta">Optimization Level 94%</div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* Comparison Section */}
            <section id="impact" className="lp-section lp-bg-light">
                <div className="lp-container">
                    <h2 className="lp-center-title">Visualizing Efficiency</h2>
                    <div className="lp-comparison-grid">
                        <div className="lp-compare-card">
                            <div className="lp-badge-corner red">Before: Static Timers</div>
                            <img src="https://images.unsplash.com/photo-1506521781263-d8422e82f27a?auto=format&fit=crop&q=80&w=1000" alt="Traffic Jam" />
                            <div className="lp-compare-meta">
                                <Clock size={16} className="text-red" /> Avg Wait Time: <strong>4.5 Mins</strong>
                            </div>
                        </div>
                        <div className="lp-compare-card">
                            <div className="lp-badge-corner blue">After: MoveWise</div>
                            <img src="https://cdn.prod.website-files.com/628905bae461d31c437ea344/645cfa15c8a89f04e9581bae_fadhila-nurhakim-3tHKA2POqlI-unsplash.webp" alt="Smooth Traffic Flow" />
                            <div className="lp-compare-meta">
                                <Clock size={16} className="text-blue" /> Avg Wait Time: <strong>1.2 Mins</strong>
                            </div>
                        </div>
                    </div>
                </div>
            </section>



            {/* CTA Footer */}
            <section className="lp-cta-footer">
                <div className="lp-container">
                    <h2>Take Control of the Grid</h2>
                    <p>Experience our AI traffic management system in real-time. Run simulations, trigger incidents, and watch the green wave in action.</p>
                    <div style={{ display: 'flex', justifyContent: 'center', gap: '16px' }}>
                        <Link to="/signup" className="lp-btn-glass" style={{ background: 'white', color: '#3b82f6', border: 'none' }}>
                            Get Started <ArrowRight size={18} />
                        </Link>
                    </div>
                </div>
            </section>

            {/* Copyright Footer */}
            <footer style={{ padding: '20px', textAlign: 'center', background: 'white', borderTop: '1px solid #e2e8f0' }}>
                <p className="lp-copyright" style={{ margin: 0 }}>© 2025 MoveWise Inc. All rights reserved.</p>
            </footer>



        </div>
    );
};
export default LandingPage;
