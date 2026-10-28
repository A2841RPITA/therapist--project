
const express = require("express");
const mongoose = require("mongoose");
const Appointment = require("../models/Appointment");
const Availability = require("../models/Availability");

const router = express.Router();

const validDate = (value) => {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return false;
  }

  const date = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(date.getTime()) &&
    date.toISOString().slice(0, 10) === value;
};

const validTime = (value) =>
  typeof value === "string" &&
  /^([01]\d|2[0-3]):[0-5]\d$/.test(value);

const toMinutes = (time) => {
  const [hours, minutes] = time.split(":").map(Number);
  return hours * 60 + minutes;
};

// Check therapist availability and appointment conflicts.
async function validateBooking({
  therapistId,
  appointmentDate,
  appointmentTime,
  durationMinutes,
  excludeId,
}) {
  if (!validDate(appointmentDate) || !validTime(appointmentTime)) {
    return "Enter a valid appointment date and time.";
  }

  if (![30, 45, 60, 90].includes(durationMinutes)) {
    return "Duration must be 30, 45, 60 or 90 minutes.";
  }

  const availability = await Availability.findOne({
    therapist_id: therapistId,
  });

  if (!availability) {
    return "Please configure your availability before booking.";
  }

  if (!availability.sessionDurations.includes(durationMinutes)) {
    return "This session duration is not enabled in your availability settings.";
  }

  const start = toMinutes(appointmentTime);
  const end = start + durationMinutes;

  if (end > 24 * 60) {
    return "An appointment cannot extend beyond midnight.";
  }

  const override = availability.overrides.find(
    (item) => item.date === appointmentDate
  );

  let availableStart;
  let availableEnd;

  if (override) {
    if (override.isBlocked) {
      return "This date is blocked by the therapist.";
    }

    if (!validTime(override.startTime) || !validTime(override.endTime)) {
      return "The availability override has invalid times.";
    }

    availableStart = toMinutes(override.startTime);
    availableEnd = toMinutes(override.endTime);
  } else {
    const weekday = new Date(
      `${appointmentDate}T00:00:00.000Z`
    ).getUTCDay();

    const day = availability.weeklySchedule.find(
      (item) => item.dayOfWeek === weekday
    );

    if (!day || !day.isAvailable) {
      return "The therapist is not available on this day.";
    }

    if (!validTime(day.startTime) || !validTime(day.endTime)) {
      return "The weekly availability has invalid times.";
    }

    availableStart = toMinutes(day.startTime);
    availableEnd = toMinutes(day.endTime);
  }

  if (
    availableStart >= availableEnd ||
    start < availableStart ||
    end > availableEnd
  ) {
    return "The appointment is outside the available time window.";
  }

  const buffer = availability.bufferMinutes || 0;

  const existingQuery = {
    therapist_id: therapistId,
    appointmentDate,
    status: { $ne: "Cancelled" },
  };

  if (excludeId) {
    existingQuery._id = { $ne: excludeId };
  }

  const existingAppointments = await Appointment.find(existingQuery);

  for (const appointment of existingAppointments) {
    if (!validTime(appointment.appointmentTime)) continue;

    const existingStart = toMinutes(appointment.appointmentTime);
    const existingDuration = appointment.durationMinutes || 60;
    const existingEnd = existingStart + existingDuration;

    // Apply the configured buffer between sessions.
    if (
      start < existingEnd + buffer &&
      end + buffer > existingStart
    ) {
      return "This slot conflicts with another appointment or its buffer time.";
    }
  }

  return null;
}

// Get appointments for the logged-in therapist.
router.get("/", async (req, res) => {
  try {
    const appointments = await Appointment.find({
      therapist_id: req.therapistId,
    }).sort({ appointmentDate: 1, appointmentTime: 1 });

    return res.json({ success: true, data: appointments });
  } catch (error) {
    console.error("Get appointments error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to load appointments.",
    });
  }
});

// Create appointment with availability validation.
router.post("/", async (req, res) => {
  try {
    const {
      clientName,
      appointmentType = "New Consultation",
      appointmentDate,
      appointmentTime,
      durationMinutes = 60,
    } = req.body;

    if (
      typeof clientName !== "string" ||
      !clientName.trim() ||
      !appointmentDate ||
      !appointmentTime
    ) {
      return res.status(400).json({
        success: false,
        message: "Client name, date and time are required.",
      });
    }

    if (!Number.isInteger(durationMinutes)) {
      return res.status(400).json({
        success: false,
        message: "Duration must be a whole number of minutes.",
      });
    }

    const conflict = await validateBooking({
      therapistId: req.therapistId,
      appointmentDate,
      appointmentTime,
      durationMinutes,
    });

    if (conflict) {
      return res.status(409).json({
        success: false,
        message: conflict,
      });
    }

    const appointment = await Appointment.create({
      therapist_id: req.therapistId,
      clientName: clientName.trim(),
      appointmentType:
        typeof appointmentType === "string"
          ? appointmentType.trim()
          : "New Consultation",
      appointmentDate,
      appointmentTime,
      durationMinutes,
    });

    return res.status(201).json({
      success: true,
      message: "Appointment added successfully.",
      data: appointment,
    });
  } catch (error) {
    console.error("Add appointment error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to add appointment.",
    });
  }
});

// Update appointment and re-check its slot.
router.put("/:id", async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid appointment ID.",
      });
    }

    const current = await Appointment.findOne({
      _id: id,
      therapist_id: req.therapistId,
    });

    if (!current) {
      return res.status(404).json({
        success: false,
        message: "Appointment not found.",
      });
    }

    const clientName = req.body.clientName ?? current.clientName;
    const appointmentType =
      req.body.appointmentType ?? current.appointmentType;
    const appointmentDate =
      req.body.appointmentDate ?? current.appointmentDate;
    const appointmentTime =
      req.body.appointmentTime ?? current.appointmentTime;
    const durationMinutes =
      req.body.durationMinutes ?? current.durationMinutes ?? 60;

    if (typeof clientName !== "string" || !clientName.trim()) {
      return res.status(400).json({
        success: false,
        message: "Client name cannot be empty.",
      });
    }

    if (!Number.isInteger(durationMinutes)) {
      return res.status(400).json({
        success: false,
        message: "Invalid appointment duration.",
      });
    }

    const conflict = await validateBooking({
      therapistId: req.therapistId,
      appointmentDate,
      appointmentTime,
      durationMinutes,
      excludeId: id,
    });

    if (conflict) {
      return res.status(409).json({
        success: false,
        message: conflict,
      });
    }

    current.clientName = clientName.trim();
    current.appointmentType = appointmentType;
    current.appointmentDate = appointmentDate;
    current.appointmentTime = appointmentTime;
    current.durationMinutes = durationMinutes;

    await current.save();

    return res.json({
      success: true,
      message: "Appointment updated successfully.",
      data: current,
    });
  } catch (error) {
    console.error("Update appointment error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to update appointment.",
    });
  }
});

// Change appointment status.
router.patch("/:id/status", async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid appointment ID.",
      });
    }

    const allowedStatuses = [
      "Pending",
      "Confirmed",
      "Completed",
      "Cancelled",
    ];

    if (!allowedStatuses.includes(req.body.status)) {
      return res.status(400).json({
        success: false,
        message: "Invalid appointment status.",
      });
    }

    const appointment = await Appointment.findOneAndUpdate(
      {
        _id: req.params.id,
        therapist_id: req.therapistId,
      },
      { $set: { status: req.body.status } },
      { new: true, runValidators: true }
    );

    if (!appointment) {
      return res.status(404).json({
        success: false,
        message: "Appointment not found.",
      });
    }

    return res.json({
      success: true,
      message: "Appointment status updated.",
      data: appointment,
    });
  } catch (error) {
    console.error("Update status error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to update appointment status.",
    });
  }
});

// Delete appointment.
router.delete("/:id", async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid appointment ID.",
      });
    }

    const appointment = await Appointment.findOneAndDelete({
      _id: req.params.id,
      therapist_id: req.therapistId,
    });

    if (!appointment) {
      return res.status(404).json({
        success: false,
        message: "Appointment not found.",
      });
    }

    return res.json({
      success: true,
      message: "Appointment deleted successfully.",
    });
  } catch (error) {
    console.error("Delete appointment error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to delete appointment.",
    });
  }
});

module.exports = router;
