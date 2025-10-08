// server.js
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
require("dotenv").config();
const bodyParser = require("body-parser");
const path = require("path");
const http = require("http");

const app = express();
app.use(cors());
app.use(bodyParser.json());

// Use an HTTP server for socket.io
const server = http.createServer(app);
const { Server } = require("socket.io");
const io = new Server(server, {
  cors: { origin: "*" } // in production, restrict origin
});

// attach io to app so routes can emit
app.set("io", io);

// API routes
const parcelsRouter = require("./routes/parcels");
app.use("/api/parcels", parcelsRouter);

// Serve React build (single-host mode)
const PORT = process.env.PORT || 5000;
const MONGO_URI = process.env.MONGO_URI || "mongodb://127.0.0.1:27017/epost";

const frontendBuildPath = path.join(__dirname, "../frontend/build");
if (require("fs").existsSync(frontendBuildPath)) {
  app.use(express.static(frontendBuildPath));
  app.get("*", (req, res) => {
    if (req.path.startsWith("/api/")) return res.status(404).json({ error: "API route not found" });
    res.sendFile(path.join(frontendBuildPath, "index.html"));
  });
}

// Socket.io connection logging (optional)
io.on("connection", (socket) => {
  console.log("Client connected", socket.id);
  socket.on("disconnect", () => {
    console.log("Client disconnected", socket.id);
  });
});

// Connect to Mongo and start server
mongoose.connect(MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(()=> {
    console.log("Mongo connected");
    server.listen(PORT, ()=> console.log(`Server (API + web) running on http://localhost:${PORT}`));
  })
  .catch(err => {
    console.error("Mongo connection error:", err.message);
  });
