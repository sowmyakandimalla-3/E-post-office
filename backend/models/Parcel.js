// models/Parcel.js
const mongoose = require("mongoose");

const ParcelSchema = new mongoose.Schema({
  senderName: { type: String, required: true },
  recipientName: { type: String, required: true },
  origin: { type: String, required: true },
  destination: { type: String, required: true },
  status: { type: String, default: "Booked" },
  bookedAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model("Parcel", ParcelSchema);
