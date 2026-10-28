
const mongoose = require("mongoose");

const weeklyScheduleSchema = new mongoose.Schema(
  {
    dayOfWeek: {
      type: Number,
      required: true,
      min: 0,
      max: 6,
    },
    isAvailable: {
      type: Boolean,
      default: false,
    },
    startTime: {
      type: String,
      default: "09:00",
    },
    endTime: {
      type: String,
      default: "17:00",
    },
  },
  { _id: false }
);

const overrideSchema = new mongoose.Schema(
  {
    date: {
      type: String,
      required: true,
    },
    isBlocked: {
      type: Boolean,
      default: false,
    },
    startTime: {
      type: String,
      default: "",
    },
    endTime: {
      type: String,
      default: "",
    },
    reason: {
      type: String,
      default: "",
    },
  },
  { _id: true }
);

const availabilitySchema = new mongoose.Schema(
  {
    therapist_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Therapist",
      required: true,
      unique: true,
      index: true,
    },

    timezone: {
      type: String,
      default: "Asia/Kolkata",
    },

    weeklySchedule: {
      type: [weeklyScheduleSchema],
      default: [],
    },

    overrides: {
      type: [overrideSchema],
      default: [],
    },

    bufferMinutes: {
      type: Number,
      default: 0,
      min: 0,
      max: 120,
    },

    sessionDurations: {
      type: [Number],
      default: [30, 45, 60, 90],
      validate: {
        validator: (values) =>
          values.every((value) =>
            [30, 45, 60, 90].includes(value)
          ),
        message: "Session durations must be 30, 45, 60 or 90 minutes.",
      },
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model(
  "Availability",
  availabilitySchema
);
