
const mongoose = require("mongoose");

const appointmentSchema = new mongoose.Schema(
  {
    therapist_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Therapist",
      required: true,
      index: true,
    },

    clientName: {
      type: String,
      required: true,
      trim: true,
    },

    appointmentType: {
      type: String,
      default: "New Consultation",
    },

    appointmentDate: {
      type: String,
      required: true,
    },

    appointmentTime: {
      type: String,
      required: true,
    },

    // Session duration in minutes
    durationMinutes: {
      type: Number,
      enum: [30, 45, 60, 90],
      default: 60,
      required: true,
    },

    status: {
      type: String,
      enum: ["Pending", "Confirmed", "Completed", "Cancelled"],
      default: "Pending",
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Appointment", appointmentSchema);
