// server/index.js - Express API + WebSocket Server
const http = require("http");
const path = require("path");
const fs = require("fs");
const express = require("express");
const cors = require("cors");
const { WebSocketServer, WebSocket } = require("ws");
const apiRouter = require("./routes/api");
const partsRouter = require("./routes/parts");
const store = require("./store");

const app = express();
const PORT = process.env.PORT || 3001;

// Middlewares
app.use(cors());
app.use(express.json());

// Create HTTP server
const server = http.createServer(app);

// Create WebSocket server attached to HTTP server
const wss = new WebSocketServer({ server });

// Broadcast utility function
const wsBroadcast = (payload) => {
  const message = JSON.stringify(payload);
  wss.clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      try {
        client.send(message);
      } catch (err) {
        console.error("WS broadcast error:", err);
      }
    }
  });
};

// Make wsBroadcast available to route handlers
app.locals.wsBroadcast = wsBroadcast;

// Handle WebSocket connections
wss.on("connection", (ws) => {
  console.log("[WebSocket] Client connected. Total clients:", wss.clients.size);

  // Send initial handshake with current state
  ws.send(JSON.stringify({
    type: "INIT_STATE",
    data: {
      plant: store.plant,
      deliveries: store.deliveries,
      notifications: store.notifications.slice(0, 10),
      timestamp: new Date().toISOString()
    }
  }));

  ws.on("message", (raw) => {
    try {
      const parsed = JSON.parse(raw);
      if (parsed.type === "PING") {
        ws.send(JSON.stringify({ type: "PONG", timestamp: Date.now() }));
      }
    } catch (e) {
      console.warn("Invalid WS message received:", raw);
    }
  });

  ws.on("close", () => {
    console.log("[WebSocket] Client disconnected. Remaining:", wss.clients.size);
  });
});

// Mount REST API
app.use("/api/parts", partsRouter);
app.use("/api", apiRouter);

// Health check endpoint
app.get("/health", (req, res) => {
  res.json({
    status: "healthy",
    uptime: process.uptime(),
    plant: store.plant.name,
    timestamp: new Date().toISOString()
  });
});

// Serve client production build if available
const clientDistPath = path.resolve(__dirname, "../client/dist");
if (fs.existsSync(clientDistPath)) {
  app.use(express.static(clientDistPath));
  app.get("*", (req, res, next) => {
    if (req.path.startsWith("/api")) return next();
    res.sendFile(path.join(clientDistPath, "index.html"));
  });
  console.log("[Static] Serving compiled client from", clientDistPath);
}

// Start server
server.listen(PORT, () => {
  console.log(`=======================================================`);
  console.log(`  Plant Material Delivery Backend running on port ${PORT}`);
  console.log(`  REST API: http://localhost:${PORT}/api`);
  console.log(`  WebSocket: ws://localhost:${PORT}`);
  console.log(`  Web App UI: http://localhost:${PORT}`);
  console.log(`=======================================================`);
});
