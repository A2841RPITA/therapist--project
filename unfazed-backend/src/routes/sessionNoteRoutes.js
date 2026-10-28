const express = require("express");
const mongoose = require("mongoose");
const SessionNote = require("../models/SessionNote");

const router = express.Router();

// GET: Load notes belonging to the logged-in therapist
router.get("/", async (req, res) => {
  try {
    const notes = await SessionNote.find({
      therapist_id: req.therapistId,
    }).sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      data: notes,
    });
  } catch (error) {
    console.error("Load session notes error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to load session notes.",
    });
  }
});

// POST: Save a new session note
router.post("/", async (req, res) => {
  try {
    const { clientName, note, sessionDate } = req.body;

    if (
      typeof clientName !== "string" ||
      !clientName.trim() ||
      typeof note !== "string" ||
      !note.trim()
    ) {
      return res.status(400).json({
        success: false,
        message: "Client name and session note are required.",
      });
    }

    let parsedSessionDate;

    if (sessionDate) {
      parsedSessionDate = new Date(sessionDate);

      if (Number.isNaN(parsedSessionDate.getTime())) {
        return res.status(400).json({
          success: false,
          message: "Please provide a valid session date.",
        });
      }
    }

    const newNote = await SessionNote.create({
      therapist_id: req.therapistId,
      clientName: clientName.trim(),
      note: note.trim(),
      ...(parsedSessionDate
        ? { sessionDate: parsedSessionDate }
        : {}),
    });

    return res.status(201).json({
      success: true,
      message: "Session note saved successfully.",
      data: newNote,
    });
  } catch (error) {
    console.error("Save session note error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to save session note.",
    });
  }
});

// DELETE: Delete a note owned by the logged-in therapist
router.delete("/:id", async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid session note ID.",
      });
    }

    const deletedNote = await SessionNote.findOneAndDelete({
      _id: id,
      therapist_id: req.therapistId,
    });

    if (!deletedNote) {
      return res.status(404).json({
        success: false,
        message: "Session note not found.",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Session note deleted successfully.",
      data: deletedNote,
    });
  } catch (error) {
    console.error("Delete session note error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to delete session note.",
    });
  }
});

module.exports = router;