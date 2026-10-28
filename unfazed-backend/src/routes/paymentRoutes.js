
const express = require("express");
const mongoose = require("mongoose");
const Payment = require("../models/Payment");

const router = express.Router();

// GET: Load payments for the logged-in therapist
router.get("/", async (req, res) => {
  try {
    const payments = await Payment.find({
      therapist_id: req.therapistId,
    }).sort({ paymentDate: -1, createdAt: -1 });

    return res.status(200).json({
      success: true,
      data: payments,
    });
  } catch (error) {
    console.error("Load payments error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to load payments.",
    });
  }
});

// POST: Add a new payment
router.post("/", async (req, res) => {
  try {
    const {
      clientName,
      amount,
      paymentDate,
      status,
      description,
      paymentMethod,
    } = req.body;

    if (
      typeof clientName !== "string" ||
      !clientName.trim()
    ) {
      return res.status(400).json({
        success: false,
        message: "Client name is required.",
      });
    }

    const parsedAmount = Number(amount);

    if (
      amount === undefined ||
      amount === null ||
      amount === "" ||
      !Number.isFinite(parsedAmount) ||
      parsedAmount <= 0
    ) {
      return res.status(400).json({
        success: false,
        message: "Please enter a valid payment amount.",
      });
    }

    const parsedDate = paymentDate
      ? new Date(paymentDate)
      : new Date();

    if (Number.isNaN(parsedDate.getTime())) {
      return res.status(400).json({
        success: false,
        message: "Please enter a valid payment date.",
      });
    }

    if (
      status !== undefined &&
      !["Paid", "Pending"].includes(status)
    ) {
      return res.status(400).json({
        success: false,
        message: "Status must be Paid or Pending.",
      });
    }

    if (
      paymentMethod !== undefined &&
      ![
        "Cash",
        "UPI",
        "Card",
        "Bank Transfer",
        "Other",
      ].includes(paymentMethod)
    ) {
      return res.status(400).json({
        success: false,
        message: "Invalid payment method.",
      });
    }

    const payment = await Payment.create({
      therapist_id: req.therapistId,
      clientName: clientName.trim(),
      amount: parsedAmount,
      paymentDate: parsedDate,
      status: status || "Pending",
      description:
        typeof description === "string"
          ? description.trim()
          : "",
      paymentMethod: paymentMethod || "Other",
    });

    return res.status(201).json({
      success: true,
      message: "Payment added successfully.",
      data: payment,
    });
  } catch (error) {
    console.error("Add payment error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to add payment.",
    });
  }
});

// PATCH: Update payment status (Pending <-> Paid)
router.patch("/:id/status", async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    // Validate payment ID
    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid payment ID.",
      });
    }

    // Validate status
    if (!["Paid", "Pending"].includes(status)) {
      return res.status(400).json({
        success: false,
        message: "Status must be Paid or Pending.",
      });
    }

    // Update only the logged-in therapist's payment
    const payment = await Payment.findOneAndUpdate(
      {
        _id: id,
        therapist_id: req.therapistId,
      },
      {
        $set: { status },
      },
      {
        new: true,
        runValidators: true,
      }
    );

    if (!payment) {
      return res.status(404).json({
        success: false,
        message: "Payment not found.",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Payment status updated successfully.",
      data: payment,
    });
  } catch (error) {
    console.error("Update payment status error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to update payment status.",
    });
  }
});

// DELETE: Delete a payment belonging to the logged-in therapist
router.delete("/:id", async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid payment ID.",
      });
    }

    const deletedPayment = await Payment.findOneAndDelete({
      _id: id,
      therapist_id: req.therapistId,
    });

    if (!deletedPayment) {
      return res.status(404).json({
        success: false,
        message: "Payment not found.",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Payment deleted successfully.",
      data: deletedPayment,
    });
  } catch (error) {
    console.error("Delete payment error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to delete payment.",
    });
  }
});

module.exports = router;
