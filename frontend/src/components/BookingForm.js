// src/components/BookingForm.js
import React, { useState, useEffect } from "react";
import axios from "axios";
import Modal from "./Modal";
import { io } from "socket.io-client";
import { QRCodeCanvas } from "qrcode.react";
import confetti from "canvas-confetti";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import "./booking.css"; // optional extra styles if you want to add separate CSS

let socket;

export default function BookingForm() {
  const [themeDark, setThemeDark] = useState(false);
  const [form, setForm] = useState({ senderName: "", recipientName: "", origin: "", destination: "" });
  const [created, setCreated] = useState(null);
  const [trackId, setTrackId] = useState("");
  const [tracking, setTracking] = useState(null);
  const [loading, setLoading] = useState(false);
  const [modal, setModal] = useState(null);
  const [liveNotifications, setLiveNotifications] = useState([]);
  const API = "/api/parcels";

  // short success sound as base64 (small click)
  const successSound = "data:audio/mp3;base64,SUQzBAAAAAAAI1RFTkMAAA..."; 
  // Note: replace the truncated base64 above with an actual minimal base64 audio string if you want sound.
  // For safety you can also include an actual small mp3 file under public/ and refer to "/success.mp3"

  useEffect(() => {
    // theme class on body
    document.body.classList.toggle("dark-theme", themeDark);
  }, [themeDark]);

  useEffect(() => {
    // connect to socket.io at current origin
    socket = io();

    socket.on("connect", () => {
      console.log("socket connected", socket.id);
    });

    socket.on("new_parcel", (data) => {
      setLiveNotifications(prev => [data, ...prev].slice(0, 6));
      toast.success(`New parcel: ${data._id} from ${data.senderName}`);
      // small modal popup optionally:
      setModal({ title: "New Parcel Booked", message: `Parcel ${data._id} from ${data.senderName} to ${data.recipientName}`, type: "success" });
    });

    socket.on("status_changed", (payload) => {
      toast.info(`Parcel ${payload._id} status: ${payload.status}`);
      setLiveNotifications(prev => [{...payload, isStatus: true}, ...prev].slice(0, 6));
    });

    return () => {
      if (socket) socket.disconnect();
    };
  }, []);

  const playSuccess = () => {
    try {
      if (successSound && successSound.length > 100) {
        const a = new Audio(successSound);
        a.play().catch(() => {});
      }
    } catch (e) {}
  };

  const doConfetti = () => {
    confetti({
      particleCount: 120,
      spread: 70,
      origin: { y: 0.6 }
    });
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: value }));
  };

  const submit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setCreated(null);
    try {
      const res = await axios.post(API, form);
      setCreated(res.data);
      doConfetti();
      playSuccess();
      toast.success("Parcel booked successfully");
      setForm({ senderName: "", recipientName: "", origin: "", destination: "" });
    } catch (err) {
      console.error(err);
      toast.error(err?.response?.data?.error || "Booking failed");
    } finally {
      setLoading(false);
    }
  };

  const track = async (e) => {
    e.preventDefault();
    if (!trackId) return toast.error("Please enter parcel ID");
    setLoading(true);
    setTracking(null);
    try {
      const res = await axios.get(`${API}/${trackId}`);
      setTracking(res.data);
      toast.info("Parcel fetched");
    } catch (err) {
      toast.error("Parcel not found");
    } finally {
      setLoading(false);
    }
  };

  // admin: update status
  const updateStatus = async (id, newStatus) => {
    if (!id) return toast.error("Provide parcel ID");
    try {
      const res = await axios.patch(`${API}/${id}/status`, { status: newStatus });
      toast.success(`Status updated: ${res.data.status}`);
      // If this client created the parcel, update local created/tracking states
      if (created && created._id === id) setCreated(res.data);
      if (tracking && tracking._id === id) setTracking(res.data);
    } catch (err) {
      toast.error("Unable to update status");
    }
  };

  return (
    <>
      <ToastContainer position="top-right" autoClose={3000} />
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
        <div>
          <h2 style={{ margin: 0 }}>E-Post Office — Live</h2>
          <div style={{ color: "#666", fontSize: 13 }}>Book, track and get live notifications</div>
        </div>
        <div>
          <button className="btn" onClick={() => setThemeDark(!themeDark)} style={{ marginRight: 8 }}>
            {themeDark ? "Light" : "Dark"}
          </button>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 420px", gap: 18 }}>
        <section className="card">
          <h3>Book Parcel</h3>
          <form onSubmit={submit} style={{ display: "grid", gap: 8 }}>
            <input name="senderName" value={form.senderName} onChange={handleChange} placeholder="Sender name" required />
            <input name="recipientName" value={form.recipientName} onChange={handleChange} placeholder="Recipient name" required />
            <div style={{ display: "flex", gap: 8 }}>
              <input name="origin" value={form.origin} onChange={handleChange} placeholder="Origin" required style={{ flex: 1 }} />
              <input name="destination" value={form.destination} onChange={handleChange} placeholder="Destination" required style={{ flex: 1 }} />
            </div>

            <div style={{ display: "flex", gap: 8 }}>
              <button className="btn primary" type="submit" disabled={loading}>{loading ? "Booking..." : "Book Parcel"}</button>
              <button type="button" className="btn" onClick={() => setForm({ senderName: "", recipientName: "", origin: "", destination: "" })}>Reset</button>
            </div>
          </form>

          {created && (
            <div style={{ marginTop: 12, padding: 10, border: "1px solid #eee" }}>
              <div><strong>ID:</strong> {created._id}</div>
              <div><strong>Status:</strong> {created.status}</div>
              <div><strong>Booked At:</strong> {new Date(created.bookedAt).toLocaleString()}</div>

              <div style={{ marginTop: 10 }}>
                <div style={{ marginBottom: 6 }}>Share/Scan QR:</div>
                <QRCodeCanvas value={String(created._id)} size={140} />

              </div>
            </div>
          )}
        </section>

        <section className="card">
          <h3>Track Parcel</h3>
          <form onSubmit={track} style={{ display: "grid", gap: 8 }}>
            <input value={trackId} onChange={(e) => setTrackId(e.target.value)} placeholder="Enter parcel ID" />
            <div style={{ display: "flex", gap: 8 }}>
              <button className="btn primary" type="submit" disabled={loading}>{loading ? "Checking..." : "Track"}</button>
              <button type="button" className="btn" onClick={() => { setTrackId(""); setTracking(null); }}>Clear</button>
            </div>
          </form>

          {tracking && (
            <div style={{ marginTop: 12 }}>
              <div><strong>Sender:</strong> {tracking.senderName}</div>
              <div><strong>Recipient:</strong> {tracking.recipientName}</div>
              <div><strong>Status:</strong> {tracking.status}</div>
            </div>
          )}

          <div style={{ marginTop: 16 }}>
            <h4>Admin — Update Status</h4>
            <div style={{ display: "flex", gap: 8 }}>
              <input placeholder="Parcel ID" value={trackId} onChange={(e) => setTrackId(e.target.value)} />
              <select id="status-select" defaultValue="In Transit" style={{ width: 140 }}>
                <option>In Transit</option>
                <option>Out for Delivery</option>
                <option>Delivered</option>
              </select>
              <button className="btn" onClick={() => updateStatus(trackId, document.getElementById("status-select").value)}>Update</button>
            </div>
          </div>

          <div style={{ marginTop: 18 }}>
            <h4>Live Activity</h4>
            <ul style={{ paddingLeft: 18 }}>
              {liveNotifications.map(n => (
                <li key={n._id + (n.updatedAt||"")}>
                  {n.isStatus ? `Status: ${n._id} → ${n.status}` : `${n.senderName} → ${n.recipientName}`} <small style={{ color: "#666" }}>{n.bookedAt ? new Date(n.bookedAt).toLocaleTimeString() : ""}</small>
                </li>
              ))}
            </ul>
          </div>
        </section>
      </div>

      {modal && <Modal title={modal.title} message={modal.message} type={modal.type} onClose={() => setModal(null)} />}

      {/* small styles inline for convenience */}
      <style>{`
        .btn { padding:8px 12px; border-radius:8px; border:1px solid #ccc; background:#fff; cursor:pointer; }
        .btn.primary { background:#2563eb; color:#fff; border-color:transparent; }
        .card { background:#fff; padding:14px; border-radius:8px; box-shadow:0 6px 18px rgba(15,23,42,0.06); }
        .dark-theme { background:#0f1724; color:#e6eef8; }
        .dark-theme .card { background:#071025; box-shadow:none; }
      `}</style>
    </>
  );
}
