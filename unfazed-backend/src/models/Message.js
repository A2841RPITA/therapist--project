
const mongoose = require("mongoose");

const messageSchema = new mongoose.Schema(
  {
    therapistId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      index: true,
    },

    clientId: {
      type: mongoose.Schema.Types.ObjectId,
      default: null,
      index: true,
    },

    sender: {
      type: String,
      enum: ["therapist", "client"],
      required: true,
    },

    senderName: {
      type: String,
      required: true,
      trim: true,
    },

    text: {
      type: String,
      required: true,
      trim: true,
      maxlength: 5000,
    },

    read: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

module.exports =
  mongoose.models.Message ||
  mongoose.model("Message", messageSchema);
