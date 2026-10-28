
const express = require("express");
const mongoose = require("mongoose");

const Client = require("../models/Client");
const Message = require("../models/Message");
const authenticateClient = require("../middleware/clientAuthMiddleware");

const router = express.Router();

// Verify that the client account is active and linked to the therapist
const verifyClient = async (req, res, next) => {
  try {
    if (
      !mongoose.isValidObjectId(req.clientId) ||
      !mongoose.isValidObjectId(req.therapistId)
    ) {
      return res.status(401).json({
        success: false,
        message: "Invalid client session.",
      });
    }

    const client = await Client.findOne({
      _id: req.clientId,
      therapist_id: req.therapistId,
      status: "Active",
    });

    if (!client) {
      return res.status(403).json({
        success: false,
        message: "Client account not found or inactive.",
      });
    }

    req.clientRecord = client;
    next();
  } catch (error) {
    console.error("Verify client error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to verify client account.",
    });
  }
};

router.use(authenticateClient, verifyClient);

// GET: Read messages for the logged-in client only
router.get("/", async (req, res) => {
  try {
    const messages = await Message.find({
      therapistId: req.therapistId,
      clientId: req.clientId,
    }).sort({ createdAt: 1 });

    return res.status(200).json({
      success: true,
      data: messages,
    });
  } catch (error) {
    console.error("Get client messages error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to load messages.",
    });
  }
});

// POST: Send a message from the logged-in client
router.post("/", async (req, res) => {
  try {
    const { text } = req.body;

    if (typeof text !== "string" || !text.trim()) {
      return res.status(400).json({
        success: false,
        message: "Message text is required.",
      });
    }

    if (text.trim().length > 5000) {
      return res.status(400).json({
        success: false,
        message: "Message must be 5000 characters or fewer.",
      });
    }

    const message = await Message.create({
      therapistId: req.therapistId,
      clientId: req.clientId,
      sender: "client",
      senderName: req.clientRecord.name,
      text: text.trim(),
      read: false,
    });

    // Notify the therapist
    const Notification = require("../models/Notification");

    const notification = await Notification.create({
      therapistId: req.therapistId,
      clientId: req.clientId,
      title: "New client message",
      message: `${req.clientRecord.name} sent you a message.`,
      type: "message",
      read: false,
    });

    // Emit a real-time event if Socket.IO is configured
    const io = req.app.get("io");

    if (io) {
      io.to(`therapist:${req.therapistId}`).emit("newMessage", message);
      io.to(`therapist:${req.therapistId}`).emit(
        "newNotification",
        notification
      );
    }

    return res.status(201).json({
      success: true,
      message: "Message sent successfully.",
      data: message,
    });
  } catch (error) {
    console.error("Send client message error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to send message.",
    });
  }
});

module.exports = router;
