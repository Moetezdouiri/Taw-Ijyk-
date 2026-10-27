import React, { useEffect, useMemo, useState } from "react";
import { createRoot } from "react-dom/client";
import "./styles.css";

class AppErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  render() {
    if (!this.state.error) return this.props.children;
    return <main className="auth-page"><div className="auth-card"><Logo /><p className="eyebrow">Dorak needs attention</p><h1>The page could not load.</h1><p className="hero-copy">{this.state.error.message}</p><button className="primary-button" onClick={() => window.location.reload()}>Reload page <span>↻</span></button></div></main>;
  }
}

const token = () => localStorage.getItem("dorak_token") || "";
async function readJson(response) {
  const contentType = response.headers.get("content-type") || "";
  if (!contentType.includes("application/json")) throw new Error("The Dorak API is not responding. Keep npm run dev running and use http://localhost:5173.");
  return response.json();
}
async function api(path, options = {}) {
  const response = await fetch(path, { headers: { "Content-Type": "application/json", Authorization: `Bearer ${token()}` }, ...options });
  const data = await readJson(response);
  if (response.status === 401) {
    localStorage.removeItem("dorak_token");
    if (window.location.hash === "#dashboard") window.location.hash = "#login";
    throw new Error(data.error || "Your login session has expired. Please log in again.");
  }
  if (!response.ok) throw new Error(data.error || "Request failed");
  return data;
}
function Logo() { return <span className="brand"><span className="brand-mark">d</span><span>Dorak</span></span>; }
function Auth({ signup = false }) {
  const [form, setForm] = useState({ name: "", email: "", password: "" }); const [error, setError] = useState("");
  const submit = async (event) => { event.preventDefault(); try { if (signup) await api("/api/auth/signup", { method: "POST", body: JSON.stringify(form) }); const result = await api("/api/auth/login", { method: "POST", body: JSON.stringify({ email: form.email, password: form.password }) }); localStorage.setItem("dorak_token", result.token); window.location.hash = "#dashboard"; } catch (e) { setError(e.message); } };
  const update = (key) => (e) => setForm({ ...form, [key]: e.target.value });
  return <main className="auth-page"><div className="auth-card"><Logo /><p className="eyebrow">{signup ? "Get started" : "Staff access"}</p><h1>{signup ? <>Set up your<br /><em>counter.</em></> : <>Welcome<br /><em>back.</em></>}</h1><p className="hero-copy">{signup ? "Create your business account to get started." : "Log in to manage your live order queue."}</p><form onSubmit={submit}>{signup && <><label>Business name</label><div className="input-wrap"><input value={form.name} onChange={update("name")} required /></div></>}<label>Business email</label><div className="input-wrap"><input type="email" value={form.email} onChange={update("email")} required /></div><label>Password</label><div className="input-wrap"><input type="password" value={form.password} onChange={update("password")} minLength="8" required /></div><button className="primary-button"> {signup ? "Create account" : "Log in"} <span>→</span></button><p className="form-message">{error}</p></form><p className="auth-switch"><a href={signup ? "#login" : "#signup"}>{signup ? "Already have an account? Log in" : "Create a business account"}</a></p></div></main>;
}
function Dashboard() {
  const [orders, setOrders] = useState([]); const [business, setBusiness] = useState(null); const [invoice, setInvoice] = useState(""); const [minutes, setMinutes] = useState(10); const [filter, setFilter] = useState("active"); const [message, setMessage] = useState(""); const [loadError, setLoadError] = useState(""); const [loading, setLoading] = useState(true);
  const load = async () => { try { const [nextOrders, account] = await Promise.all([api("/api/orders"), api("/api/auth/me")]); setOrders(nextOrders); setBusiness(account); setLoadError(""); } catch (error) { setLoadError(error.message); } finally { setLoading(false); } };
  useEffect(() => { load(); const timer = setInterval(load, 5000); return () => clearInterval(timer); }, []);
  const active = orders.filter((o) => o.status !== "ready"); const visible = orders.filter((o) => filter === "all" || (filter === "ready" ? o.status === "ready" : o.status !== "ready")); const attention = active.filter((o) => Date.now() >= new Date(o.readyAt).getTime());
  const add = async (e) => { e.preventDefault(); try { await api("/api/orders", { method: "POST", body: JSON.stringify({ invoice, minutes }) }); setInvoice(""); setMessage("Order added to the live queue."); load(); } catch (err) { setMessage(err.message); } };
  const ready = async (id) => { await api(`/api/orders/${id}/ready`, { method: "POST" }); load(); };
  const qr = business ? `${window.location.origin}/?customer&business=${business.publicCode}` : `${window.location.origin}/?customer`;
  return <div className="app-shell"><header className="topbar"><Logo /><div className="topbar-right"><span className="connection-dot"><i /> Live</span><button className="logout" onClick={() => { localStorage.removeItem("dorak_token"); window.location.hash = "#login"; }}>Log out</button></div></header><main><section className="hero"><div><p className="eyebrow">Order queue</p><h1>Keep customers<br /><em>in the know.</em></h1><p className="hero-copy">Add an order, hand over the number, and let Dorak do the waiting.</p></div><div className="hero-stat"><span>Active orders</span><strong>{active.length}</strong><span className="stat-change">{attention.length} need attention</span></div></section>{loadError && <div className="server-alert"><strong>Dashboard is offline</strong><span>{loadError}</span><button onClick={load}>Try again</button></div>}<section className="workspace"><div className="panel"><div className="panel-heading"><div><p className="eyebrow">New order</p><h2>Start a timer</h2></div><span className="step-label">01 / 02</span></div><form onSubmit={add}><label>Invoice number</label><div className="input-wrap invoice-input"><span>#</span><input inputMode="numeric" placeholder="e.g. 112" value={invoice} onChange={(e) => setInvoice(e.target.value)} required /></div><div className="field-row"><div><label>Ready in</label><div className="input-wrap"><input type="number" min="1" max="180" value={minutes} onChange={(e) => setMinutes(Number(e.target.value))} /><span>min</span></div><div className="time-presets">{[5, 10, 15, 20].map((n) => <button type="button" className={minutes === n ? "selected" : ""} onClick={() => setMinutes(n)} key={n}>{n}m</button>)}</div></div><div className="tip"><span className="tip-icon">i</span><span>The customer enters this same invoice number on their phone.</span></div></div><button className="primary-button" disabled={loading}>Start order <span>→</span></button><p className="form-message">{message}</p></form></div><div className="panel"><div className="panel-heading"><div><p className="eyebrow">For your counter</p><h2>Your business QR</h2></div><span className="qr-badge">QR</span></div><div className="poster-content"><img className="fake-qr" src={`https://api.qrserver.com/v1/create-qr-code/?size=240x240&margin=8&data=${encodeURIComponent(qr)}`} alt="Unique QR code for this business customer page" /><div><p className="poster-title">Scan to track<br />your order</p><p className="muted">One QR for your business.<br />Customers enter their invoice.</p></div></div><a className="secondary-button" href={qr}>Open customer page <span>↗</span></a></div></section><section className="queue-section"><div className="section-heading"><div><p className="eyebrow">Live queue</p><h2>Today’s orders <span>{visible.length}</span></h2></div><div className="queue-actions"><div className="legend"><span className="legend-dot" /> Waiting <span className="legend-dot ready" /> Ready</div></div></div><div className="queue-summary"><div><strong>{active.length}</strong><span>active</span></div><div className="attention"><strong>{attention.length}</strong><span>need attention</span></div><div className="queue-filters">{["active", "ready", "all"].map((value) => <button className={filter === value ? "selected" : ""} onClick={() => setFilter(value)} key={value}>{value === "ready" ? "Completed" : value[0].toUpperCase() + value.slice(1)}</button>)}</div></div><div className="queue-list">{visible.length ? visible.map((order) => { const isReady = order.status === "ready"; const overdue = !isReady && Date.now() >= new Date(order.readyAt).getTime(); return <div className="order-row" key={order._id}><div className="order-number">#{order.invoice}</div><div className="order-time">{isReady ? "Completed" : overdue ? "Past estimated time" : `${order.minutes} min estimate`}</div><div className={`order-status ${overdue ? "overdue" : ""}`}><i className={`status-pip ${isReady ? "ready" : ""}`} />{isReady ? "Ready" : overdue ? "Needs attention" : "Waiting"}</div><button className="ready-button" disabled={isReady} onClick={() => ready(order._id)}>{isReady ? "Done" : "Mark ready"}</button></div>; }) : <div className="empty-state"><span>✦</span><p>{loading ? "Connecting to your queue…" : "Your active orders will appear here."}</p></div>}</div></section></main><footer><span className="brand-mini">d</span> Dorak keeps the queue moving quietly.</footer></div>;
}
function Customer({ token: publicToken }) {
  const [order, setOrder] = useState(null); const [invoice, setInvoice] = useState(""); const [error, setError] = useState("");
  const businessCode = new URLSearchParams(window.location.search).get("business") || "";
  const find = async (value) => { try { const response = await fetch(`/api/public/orders?invoice=${encodeURIComponent(value)}&business=${encodeURIComponent(businessCode)}`); const data = await readJson(response); if (!response.ok) throw new Error(data.error || "We can’t find that order."); setOrder(data); setError(""); } catch (e) { setError(e.message); } };
  const findToken = async (value) => { try { const response = await fetch(`/api/public/orders/${encodeURIComponent(value)}?business=${encodeURIComponent(businessCode)}`); const data = await readJson(response); if (!response.ok) throw new Error(data.error || "We can’t find that order."); setOrder(data); setError(""); } catch (e) { setError(e.message); } };
  useEffect(() => { if (publicToken) findToken(publicToken); }, [publicToken]);
  useEffect(() => { if (!order) return; const timer = setInterval(() => findToken(order.publicToken), 2000); return () => clearInterval(timer); }, [order?.publicToken]);
  const remaining = order ? new Date(order.readyAt).getTime() - Date.now() : 0; const display = `${String(Math.floor(Math.abs(remaining) / 60000)).padStart(2, "0")}:${String(Math.floor(Math.abs(remaining) / 1000) % 60).padStart(2, "0")}`;
  return <main className="customer-page"><div className="customer-screen"><Logo /><div className="customer-card"><p className="eyebrow">Order tracking</p>{!order ? <><h1>Track your<br /><em>order.</em></h1><p className="customer-copy">Scan the counter QR code or enter your invoice number.</p><form onSubmit={(e) => { e.preventDefault(); find(invoice); }}><label>Invoice number</label><div className="input-wrap invoice-input"><span>#</span><input inputMode="numeric" value={invoice} onChange={(e) => setInvoice(e.target.value)} required /></div><button className="primary-button">See my order <span>→</span></button></form><p className="not-found">{error}</p></> : order.status === "ready" ? <div className="customer-status"><div className="status-icon">✦</div><h2>Your order is ready</h2><p className="ready-message">Please collect it at the counter.</p><button className="secondary-button" onClick={() => setOrder(null)}>Track another order <span>→</span></button></div> : <div className="customer-status"><p className="eyebrow">Order #{order.invoice}</p><div className="countdown">{remaining <= 0 ? "+" : ""}{display}</div><h2>{remaining <= 0 ? "It is taking a little longer" : "We’re making it now"}</h2><p>{remaining <= 0 ? "We’ll tell you as soon as it is ready." : "Your order will be ready soon."}<br />You can keep this screen open.</p><button className="secondary-button" onClick={() => setOrder(null)}>Track another order <span>→</span></button></div>}</div><p className="customer-footnote">Dorak keeps you in the know.</p></div></main>;
}
function App() { const [route, setRoute] = useState(window.location.hash || "#login"); const params = new URLSearchParams(window.location.search); useEffect(() => { const change = () => setRoute(window.location.hash || "#login"); window.addEventListener("hashchange", change); return () => window.removeEventListener("hashchange", change); }, []); if (params.has("customer")) return <Customer token={params.get("customer")} />; if (route === "#dashboard" && token()) return <Dashboard />; return <Auth signup={route === "#signup"} />; }
createRoot(document.getElementById("root")).render(<AppErrorBoundary><App /></AppErrorBoundary>);
