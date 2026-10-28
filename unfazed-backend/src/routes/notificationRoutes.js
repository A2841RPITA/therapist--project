
const express = require("express");
const router = express.Router();

const Notification = require("../models/Notification");

// Get notifications for a therapist
router.get("/", async (req, res) => {
  try {
    const { therapistId } = req.query;

    if (!therapistId) {
      return res.status(400).json({
        message: "therapistId is required",
      });
    }

    const notifications = await Notification.find({ therapistId })
      .sort({ createdAt: -1 })
      .lean();

    return res.status(200).json(notifications);
  } catch (error) {
    console.error("Get notifications error:", error);
    return res.status(500).json({
      message: "Failed to fetch notifications",
    });
  }
});

// Mark a notification as read
router.patch("/:id/read", async (req, res) => {
  try {
    const notification = await Notification.findByIdAndUpdate(
      req.params.id,
      { read: true },
      { new: true, runValidators: true }
    );

    if (!notification) {
      return res.status(404).json({
        message: "Notification not found",
      });
    }

    return res.status(200).json({
      message: "Notification marked as read",
      data: notification,
    });
  } catch (error) {
    console.error("Mark notification read error:", error);
    return res.status(500).json({
      message: "Failed to update notification",
    });
  }
});

module.exports = router;
