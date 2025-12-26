import { useState, useEffect, useContext } from "react";
import axios from "axios";
import { AuthContext } from "../context/AuthContext";
import Sidebar from "../components/Sidebar";
import Topbar from "../components/Topbar";
import { Edit2, Trash2, Plus, Calendar } from "lucide-react";
import "../styles/layout.css";

const BulletinBoard = () => {
    // Only user is returned by AuthContext, token is inside user object
    const { user } = useContext(AuthContext);
    const token = user?.token;

    const [bulletins, setBulletins] = useState([]);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingId, setEditingId] = useState(null);

    // Form State
    const [title, setTitle] = useState("");
    const [content, setContent] = useState("");
    const [expiresAt, setExpiresAt] = useState("");

    const fetchBulletins = async () => {
        if (!token) return;
        try {
            const res = await axios.get("http://localhost:5000/api/bulletin", {
                headers: { Authorization: `Bearer ${token}` }
            });
            setBulletins(res.data);
        } catch (err) {
            console.error(err);
        }
    };

    useEffect(() => {
        fetchBulletins();
    }, [token]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            const config = { headers: { Authorization: `Bearer ${token}` } };
            if (editingId) {
                await axios.put(`http://localhost:5000/api/bulletin/${editingId}`, { title, content, expiresAt }, config);
            } else {
                await axios.post("http://localhost:5000/api/bulletin", { title, content, expiresAt }, config);
            }
            closeModal();
            fetchBulletins();
        } catch (err) {
            console.error("Failed to save bulletin", err);
            alert("Failed to save operation");
        }
    };

    const handleDelete = async (id) => {
        if (!window.confirm("Are you sure you want to delete this bulletin?")) return;
        try {
            await axios.delete(`http://localhost:5000/api/bulletin/${id}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            fetchBulletins();
        } catch (err) {
            console.error(err);
            alert("Failed to delete");
        }
    };

    const openModal = (bulletin = null) => {
        if (bulletin) {
            setEditingId(bulletin._id);
            setTitle(bulletin.title);
            setContent(bulletin.content);
            setExpiresAt(bulletin.expiresAt ? new Date(bulletin.expiresAt).toISOString().slice(0, 16) : "");
        } else {
            setEditingId(null);
            setTitle("");
            setContent("");
            setExpiresAt("");
        }
        setIsModalOpen(true);
    };

    const closeModal = () => {
        setIsModalOpen(false);
        setEditingId(null);
        setTitle("");
        setContent("");
        setExpiresAt("");
    };

    return (
        <div className="app-layout">
            <Sidebar role={user.role} />

            <div className="main-content">
                <Topbar showSearch={false} />

                <div className="page-body" style={{ display: "block", padding: "24px", overflowY: "auto" }}>

                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "24px" }}>
                        <h2 className="section-title" style={{ fontSize: "1.5rem", margin: 0 }}>Bulletin Board</h2>

                        {user.role === "admin" && (
                            <button onClick={() => openModal()} className="btn btn-primary" style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                                <Plus size={18} />
                                New Post
                            </button>
                        )}
                    </div>

                    <div style={{ display: "grid", gap: "20px", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))" }}>
                        {bulletins.map((item) => (
                            <div key={item._id} className="bulletin-card fade-in">
                                <div style={{ marginBottom: "12px" }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                        <h3 style={{ fontSize: "1.25rem", fontWeight: "600", marginBottom: "8px" }}>{item.title}</h3>
                                        {user.role === "admin" && (
                                            <div style={{ display: "flex", gap: "8px" }}>
                                                <button onClick={() => openModal(item)} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-secondary)" }}>
                                                    <Edit2 size={16} />
                                                </button>
                                                <button onClick={() => handleDelete(item._id)} style={{ background: "none", border: "none", cursor: "pointer", color: "#ef4444" }}>
                                                    <Trash2 size={16} />
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                    <div style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "0.85rem", color: "var(--text-secondary)" }}>
                                        <Calendar size={14} />
                                        <span>{new Date(item.createdAt).toLocaleDateString()}</span>
                                    </div>
                                </div>

                                <p style={{ lineHeight: "1.6", whiteSpace: "pre-wrap", flex: 1 }}>
                                    {item.content}
                                </p>

                                {item.expiresAt && (
                                    <div style={{ marginTop: "12px", fontSize: "0.75rem", color: "var(--text-secondary)", fontStyle: "italic" }}>
                                        Expires: {new Date(item.expiresAt).toLocaleString()}
                                    </div>
                                )}
                            </div>
                        ))}

                        {bulletins.length === 0 && (
                            <div style={{ gridColumn: "1/-1", textAlign: "center", padding: "40px", color: "#6b7280" }}>
                                <p>No bulletins posted yet.</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Modal */}
            {isModalOpen && (
                <div className="bulletin-overlay">
                    <div className="bulletin-modal fade-in">
                        <h3 style={{ marginTop: 0, marginBottom: "20px", fontSize: "1.5rem" }}>
                            {editingId ? "Edit Bulletin" : "New Bulletin"}
                        </h3>

                        <form onSubmit={handleSubmit}>
                            <div style={{ marginBottom: "16px" }}>
                                <label style={{ display: "block", marginBottom: "8px", fontWeight: "500" }}>Title</label>
                                <input
                                    type="text"
                                    className="input-field"
                                    value={title}
                                    onChange={(e) => setTitle(e.target.value)}
                                    required
                                />
                            </div>

                            <div style={{ marginBottom: "16px" }}>
                                <label style={{ display: "block", marginBottom: "8px", fontWeight: "500" }}>Expiration Date (Optional)</label>
                                <input
                                    type="datetime-local"
                                    className="input-field"
                                    value={expiresAt}
                                    onChange={(e) => setExpiresAt(e.target.value)}
                                    style={{ width: "100%", padding: "10px", borderRadius: "6px", border: "1px solid var(--border-color)" }}
                                />
                                <small style={{ color: "var(--text-secondary)" }}>Post will be automatically deleted after this time.</small>
                            </div>

                            <div style={{ marginBottom: "24px" }}>
                                <label style={{ display: "block", marginBottom: "8px", fontWeight: "500" }}>Content</label>
                                <textarea
                                    className="input-field"
                                    rows="5"
                                    value={content}
                                    onChange={(e) => setContent(e.target.value)}
                                    required
                                    style={{ resize: "vertical" }}
                                />
                            </div>

                            <div style={{ display: "flex", gap: "12px", justifyContent: "flex-end" }}>
                                <button type="button" onClick={closeModal} className="btn" style={{ background: "var(--bg-primary)", color: "var(--text-primary)", border: "1px solid var(--border-color)" }}>
                                    Cancel
                                </button>
                                <button type="submit" className="btn btn-primary">
                                    {editingId ? "Update" : "Post"}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default BulletinBoard;
