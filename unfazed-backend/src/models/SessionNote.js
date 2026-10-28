const mongoose = require("mongoose");

const sessionNoteSchema = new mongoose.Schema(
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

    note: {
      type: String,
      required: true,
      trim: true,
    },

    sessionDate: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("SessionNote", sessionNoteSchema);