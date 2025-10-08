// routes/parcels.js
const express = require("express");
const router = express.Router();
const Parcel = require("../models/Parcel");

// Create a parcel (booking)
router.post("/", async (req, res) => {
  try {
    const p = new Parcel(req.body);
    await p.save();

    // emit to all connected clients via socket.io
    const io = req.app.get("io");
    if (io) {
      io.emit("new_parcel", {
        _id: p._id,
        senderName: p.senderName,
        recipientName: p.recipientName,
        origin: p.origin,
        destination: p.destination,
        status: p.status,
        bookedAt: p.bookedAt
      });
    }

    res.status(201).json(p);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Get parcel by id
router.get("/:id", async (req, res) => {
  try {
    const p = await Parcel.findById(req.params.id);
    if (!p) return res.status(404).json({ msg: "Not found" });
    res.json(p);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Optional: list all parcels (helpful for admin/testing)
router.get("/", async (req, res) => {
  try {
    const all = await Parcel.find().sort({ bookedAt: -1 });
    res.json(all);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
  // PATCH /api/parcels/:id/status
router.patch("/:id/status", async (req, res) => {
  try {
    const { status } = req.body;
    if (!status) return res.status(400).json({ error: "status required" });

    const p = await Parcel.findById(req.params.id);
    if (!p) return res.status(404).json({ error: "Parcel not found" });

    p.status = status;
    await p.save();

    // emit status_changed via socket.io
    const io = req.app.get("io");
    if (io) {
      io.emit("status_changed", {
        _id: p._id,
        status: p.status,
        updatedAt: new Date()
      });
    }

    res.json(p);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

});

module.exports = router;
