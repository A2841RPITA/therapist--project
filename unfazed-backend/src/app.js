
const express = require("express");
const cors = require("cors");

const app = express();

// Existing routes
const appointmentRoutes = require("./routes/appointmentRoutes");
const clientRoutes = require("./routes/clientRoutes");
const authRoutes = require("./routes/authRoutes");
const availabilityRoutes = require("./routes/availabilityRoutes");
const sessionNoteRoutes = require("./routes/sessionNoteRoutes");
const paymentRoutes = require("./routes/paymentRoutes");
const messageRoutes = require("./routes/messageRoutes");
const notificationRoutes = require("./routes/notificationRoutes");

// Client portal routes
const clientAuthRoutes = require("./routes/clientAuthRoutes");
const clientMessageRoutes = require("./routes/clientMessageRoutes");

// Authentication middleware
const authenticateToken = require("./middleware/authMiddleware");

app.use(cors());
app.use(express.json());

// Health checks
app.get("/", (req, res) => {
  res.json({
    success: true,
    message: "Unfazed API is running",
  });
});

app.get("/api/health", (req, res) => {
  res.json({
    success: true,
    message: "Backend is working correctly",
  });
});

// Public authentication routes
app.use("/api/auth", authRoutes);
app.use("/api/client-auth", clientAuthRoutes);

// Client portal messaging (client token required inside the router)
app.use("/api/client-messages", clientMessageRoutes);

// Protected therapist routes
app.use("/api/appointments", authenticateToken, appointmentRoutes);
app.use("/api/clients", authenticateToken, clientRoutes);
app.use("/api/availability", authenticateToken, availabilityRoutes);
app.use("/api/session-notes", authenticateToken, sessionNoteRoutes);
app.use("/api/payments", authenticateToken, paymentRoutes);
app.use("/api/messages", authenticateToken, messageRoutes);
app.use("/api/notifications", authenticateToken, notificationRoutes);

module.exports = app;
