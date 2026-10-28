
const express = require("express");
const router = express.Router();

const Message = require("../models/Message");
const Notification = require("../models/Notification");

// Get all messages for a therapist
router.get("/", async (req, res) => {
  try {
    const { therapistId } = req.query;

    if (!therapistId) {
      return res.status(400).json({
        message: "therapistId is required",
      });
    }

    const messages = await Message.find({ therapistId })
      .sort({ createdAt: -1 })
      .lean();

    return res.status(200).json(messages);
  } catch (error) {
    console.error("Get messages error:", error);
    return res.status(500).json({
      message: "Failed to fetch messages",
    });
  }
});

// Send a new message
router.post("/", async (req, res) => {
  try {
    const {
      therapistId,
      clientId,
      sender,
      senderName,
      text,
    } = req.body;

    if (!therapistId || !sender || !senderName || !text?.trim()) {
      return res.status(400).json({
        message: "Required message fields are missing",
      });
    }

    if (!["therapist", "client"].includes(sender)) {
      return res.status(400).json({
        message: "Invalid sender",
      });
    }

    const message = await Message.create({
      therapistId,
      clientId: clientId || null,
      sender,
      senderName,
      text: text.trim(),
    });

    await Notification.create({
      therapistId,
      clientId: clientId || null,
      title: "New message",
      message: `${senderName} sent a message`,
      type: "message",
    });

    return res.status(201).json({
      message: "Message sent successfully",
      data: message,
    });
  } catch (error) {
    console.error("Send message error:", error);
    return res.status(500).json({
      message: "Failed to send message",
    });
  }
});

// Mark a message as read
router.patch("/:id/read", async (req, res) => {
  try {
    const message = await Message.findByIdAndUpdate(
      req.params.id,
      { read: true },
      { new: true, runValidators: true }
    );

    if (!message) {
      return res.status(404).json({
        message: "Message not found",
      });
    }

    return res.status(200).json({
      message: "Message marked as read",
      data: message,
    });
  } catch (error) {
    console.error("Mark message read error:", error);
    return res.status(500).json({
      message: "Failed to update message",
    });
  }
});

module.exports = router;
