
const express = require("express");
const Availability = require("../models/Availability");

const router = express.Router();

const validTime = (value) =>
  typeof value === "string" &&
  /^([01]\d|2[0-3]):[0-5]\d$/.test(value);

router.get("/", async (req, res) => {
  try {
    const availability = await Availability.findOne({
      therapist_id: req.therapistId,
    });

    return res.json({
      success: true,
      data: availability,
    });
  } catch (error) {
    console.error("Get availability error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to load availability.",
    });
  }
});

router.put("/", async (req, res) => {
  try {
    const {
      timezone,
      weeklySchedule,
      overrides,
      bufferMinutes,
      sessionDurations,
    } = req.body;

    if (
      !Array.isArray(weeklySchedule) ||
      !Array.isArray(overrides) ||
      !Array.isArray(sessionDurations)
    ) {
      return res.status(400).json({
        success: false,
        message: "Weekly schedule, overrides and durations are required.",
      });
    }

    if (
      !Number.isInteger(bufferMinutes) ||
      bufferMinutes < 0 ||
      bufferMinutes > 120
    ) {
      return res.status(400).json({
        success: false,
        message: "Buffer must be between 0 and 120 minutes.",
      });
    }

    const allowedDurations = [30, 45, 60, 90];

    if (
      sessionDurations.length === 0 ||
      sessionDurations.some(
        (duration) => !allowedDurations.includes(duration)
      )
    ) {
      return res.status(400).json({
        success: false,
        message: "Choose session durations of 30, 45, 60 or 90 minutes.",
      });
    }

    const days = new Set();

    for (const day of weeklySchedule) {
      if (
        !Number.isInteger(day.dayOfWeek) ||
        day.dayOfWeek < 0 ||
        day.dayOfWeek > 6 ||
        days.has(day.dayOfWeek) ||
        typeof day.isAvailable !== "boolean"
      ) {
        return res.status(400).json({
          success: false,
          message: "Invalid or duplicate weekday.",
        });
      }

      days.add(day.dayOfWeek);

      if (
        day.isAvailable &&
        (!validTime(day.startTime) ||
          !validTime(day.endTime) ||
          day.startTime >= day.endTime)
      ) {
        return res.status(400).json({
          success: false,
          message: "Check the start and end times.",
        });
      }
    }

    for (const override of overrides) {
      if (
        typeof override.date !== "string" ||
        !/^\d{4}-\d{2}-\d{2}$/.test(override.date) ||
        Number.isNaN(Date.parse(`${override.date}T00:00:00Z`))
      ) {
        return res.status(400).json({
          success: false,
          message: "Each override needs a valid YYYY-MM-DD date.",
        });
      }

      if (override.isBlocked === false) {
        if (
          !validTime(override.startTime) ||
          !validTime(override.endTime) ||
          override.startTime >= override.endTime
        ) {
          return res.status(400).json({
            success: false,
            message: "Check override start and end times.",
          });
        }
      }
    }

    const availability = await Availability.findOneAndUpdate(
      { therapist_id: req.therapistId },
      {
        $set: {
          timezone: timezone || "Asia/Kolkata",
          weeklySchedule,
          overrides,
          bufferMinutes,
          sessionDurations: [...new Set(sessionDurations)],
        },
      },
      {
        new: true,
        upsert: true,
        runValidators: true,
        setDefaultsOnInsert: true,
      }
    );

    return res.json({
      success: true,
      message: "Availability saved successfully.",
      data: availability,
    });
  } catch (error) {
    console.error("Save availability error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to save availability.",
    });
  }
});

module.exports = router;
