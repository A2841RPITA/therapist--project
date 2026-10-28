const express = require("express");
const mongoose = require("mongoose");
const Client = require("../models/Client");

const router = express.Router();

// GET: Logged-in therapist's clients
router.get("/", async (req, res) => {
  try {
    const clients = await Client.find({
      therapist_id: req.therapistId,
    }).sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      data: clients,
    });
  } catch (error) {
    console.error("Get clients error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to load clients",
    });
  }
});

// POST: Add a client with intake details and consent
router.post("/", async (req, res) => {
  try {
    const {
      name,
      email = "",
      phone = "",
      dateOfBirth,
      address = "",
      presentingConcern = "",
      history = "",
      tags = [],
      consentAccepted = false,
    } = req.body;

    if (typeof name !== "string" || !name.trim()) {
      return res.status(400).json({
        success: false,
        message: "Client name is required",
      });
    }

    if (
      typeof email !== "string" ||
      typeof phone !== "string" ||
      typeof address !== "string" ||
      typeof presentingConcern !== "string" ||
      typeof history !== "string"
    ) {
      return res.status(400).json({
        success: false,
        message: "Please enter valid client details",
      });
    }

    if (!Array.isArray(tags) || !tags.every(
      (tag) => typeof tag === "string"
    )) {
      return res.status(400).json({
        success: false,
        message: "Tags must be a list of text values",
      });
    }

    if (typeof consentAccepted !== "boolean") {
      return res.status(400).json({
        success: false,
        message: "Invalid consent value",
      });
    }

    let parsedDate = null;

    if (dateOfBirth) {
      parsedDate = new Date(dateOfBirth);

      if (Number.isNaN(parsedDate.getTime())) {
        return res.status(400).json({
          success: false,
          message: "Invalid date of birth",
        });
      }
    }

    const client = await Client.create({
      therapist_id: req.therapistId,
      name: name.trim(),
      email: email.trim().toLowerCase(),
      phone: phone.trim(),
      dateOfBirth: parsedDate,
      address: address.trim(),
      presentingConcern: presentingConcern.trim(),
      history: history.trim(),
      tags: [...new Set(
        tags.map((tag) => tag.trim()).filter(Boolean)
      )],
      consent: {
        accepted: consentAccepted,
        acceptedAt: consentAccepted ? new Date() : null,
        consentVersion: "v1",
      },
    });

    return res.status(201).json({
      success: true,
      message: "Client added successfully",
      data: client,
    });
  } catch (error) {
    console.error("Add client error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to add client",
    });
  }
});

// PUT: Update a client belonging to this therapist
router.put("/:id", async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid client ID",
      });
    }

    const allowedFields = [
      "name",
      "email",
      "phone",
      "status",
      "dateOfBirth",
      "address",
      "presentingConcern",
      "history",
      "tags",
    ];

    const updates = {};

    for (const field of allowedFields) {
      if (req.body[field] === undefined) continue;

      const value = req.body[field];

      if (field === "name") {
        if (typeof value !== "string" || !value.trim()) {
          return res.status(400).json({
            success: false,
            message: "Client name cannot be empty",
          });
        }

        updates.name = value.trim();
      } else if (field === "email") {
        if (typeof value !== "string") {
          return res.status(400).json({
            success: false,
            message: "Invalid email",
          });
        }

        updates.email = value.trim().toLowerCase();
      } else if (field === "phone" || field === "address" ||
                 field === "presentingConcern" || field === "history") {
        if (typeof value !== "string") {
          return res.status(400).json({
            success: false,
            message: `Invalid ${field}`,
          });
        }

        updates[field] = value.trim();
      } else if (field === "status") {
        if (!["Active", "Inactive"].includes(value)) {
          return res.status(400).json({
            success: false,
            message: "Invalid client status",
          });
        }

        updates.status = value;
      } else if (field === "dateOfBirth") {
        if (value === null || value === "") {
          updates.dateOfBirth = null;
        } else {
          const parsedDate = new Date(value);

          if (Number.isNaN(parsedDate.getTime())) {
            return res.status(400).json({
              success: false,
              message: "Invalid date of birth",
            });
          }

          updates.dateOfBirth = parsedDate;
        }
      } else if (field === "tags") {
        if (!Array.isArray(value) ||
            !value.every((tag) => typeof tag === "string")) {
          return res.status(400).json({
            success: false,
            message: "Tags must be a list of text values",
          });
        }

        updates.tags = [...new Set(
          value.map((tag) => tag.trim()).filter(Boolean)
        )];
      }
    }

    const client = await Client.findOneAndUpdate(
      {
        _id: req.params.id,
        therapist_id: req.therapistId,
      },
      { $set: updates },
      {
        new: true,
        runValidators: true,
      }
    );

    if (!client) {
      return res.status(404).json({
        success: false,
        message: "Client not found",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Client updated successfully",
      data: client,
    });
  } catch (error) {
    console.error("Update client error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to update client",
    });
  }
});

// POST: Record explicit consent for an existing client
router.post("/:id/consent", async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid client ID",
      });
    }

    if (req.body.accepted !== true) {
      return res.status(400).json({
        success: false,
        message: "Consent must be explicitly accepted",
      });
    }

    const client = await Client.findOneAndUpdate(
      {
        _id: req.params.id,
        therapist_id: req.therapistId,
      },
      {
        $set: {
          "consent.accepted": true,
          "consent.acceptedAt": new Date(),
          "consent.consentVersion": "v1",
        },
      },
      {
        new: true,
        runValidators: true,
      }
    );

    if (!client) {
      return res.status(404).json({
        success: false,
        message: "Client not found",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Consent recorded successfully",
      data: client,
    });
  } catch (error) {
    console.error("Save consent error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to record consent",
    });
  }
});

// DELETE: Delete only this therapist's client
router.delete("/:id", async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid client ID",
      });
    }

    const client = await Client.findOneAndDelete({
      _id: req.params.id,
      therapist_id: req.therapistId,
    });

    if (!client) {
      return res.status(404).json({
        success: false,
        message: "Client not found",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Client deleted successfully",
    });
  } catch (error) {
    console.error("Delete client error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to delete client",
    });
  }
});

module.exports = router;