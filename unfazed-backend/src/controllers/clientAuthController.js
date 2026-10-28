
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { validationResult } = require("express-validator");
const mongoose = require("mongoose");

const Client = require("../models/Client");
const Therapist = require("../models/Therapist");

// Client registration
const registerClient = async (req, res) => {
  try {
    const errors = validationResult(req);

    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array(),
      });
    }

    const { name, email, password, therapistSlug } = req.body;

    if (
      typeof name !== "string" ||
      typeof email !== "string" ||
      typeof password !== "string" ||
      typeof therapistSlug !== "string" ||
      !name.trim() ||
      !email.trim() ||
      !password ||
      !therapistSlug.trim()
    ) {
      return res.status(400).json({
        success: false,
        message: "All registration fields are required.",
      });
    }

    if (!process.env.JWT_SECRET) {
      return res.status(500).json({
        success: false,
        message: "Server configuration error.",
      });
    }

    const normalizedEmail = email.trim().toLowerCase();
    const normalizedSlug = therapistSlug.trim().toLowerCase();

    const therapist = await Therapist.findOne({
      slug: normalizedSlug,
    });

    if (!therapist) {
      return res.status(404).json({
        success: false,
        message: "Therapist profile was not found.",
      });
    }

    // A client must already have been added by this therapist.
    const client = await Client.findOne({
      therapist_id: therapist._id,
      email: normalizedEmail,
    });

    if (!client) {
      return res.status(403).json({
        success: false,
        message:
          "No matching client record was found. Please contact your therapist.",
      });
    }

    if (client.password_hash) {
      return res.status(409).json({
        success: false,
        message: "This client account is already registered. Please log in.",
      });
    }

    const password_hash = await bcrypt.hash(password, 12);

    client.name = client.name || name.trim();
    client.password_hash = password_hash;

    await client.save();

    const token = jwt.sign(
      {
        id: client._id.toString(),
        role: "client",
        therapistId: therapist._id.toString(),
      },
      process.env.JWT_SECRET,
      { expiresIn: "1d" }
    );

    return res.status(201).json({
      success: true,
      message: "Client account registered successfully.",
      token,
      data: {
        id: client._id,
        name: client.name,
        email: client.email,
        therapistId: therapist._id,
        role: "client",
      },
    });
  } catch (error) {
    console.error("Client registration error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to register client account.",
    });
  }
};

// Client login
const loginClient = async (req, res) => {
  try {
    const errors = validationResult(req);

    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array(),
      });
    }

    const { email, password, therapistSlug } = req.body;

    if (
      typeof email !== "string" ||
      typeof password !== "string" ||
      typeof therapistSlug !== "string" ||
      !email.trim() ||
      !password ||
      !therapistSlug.trim()
    ) {
      return res.status(400).json({
        success: false,
        message: "Email, password, and therapist profile are required.",
      });
    }

    if (!process.env.JWT_SECRET) {
      return res.status(500).json({
        success: false,
        message: "Server configuration error.",
      });
    }

    const therapist = await Therapist.findOne({
      slug: therapistSlug.trim().toLowerCase(),
    });

    if (!therapist) {
      return res.status(401).json({
        success: false,
        message: "Invalid login details.",
      });
    }

    const client = await Client.findOne({
      therapist_id: therapist._id,
      email: email.trim().toLowerCase(),
      status: "Active",
    }).select("+password_hash");

    if (!client || !client.password_hash) {
      return res.status(401).json({
        success: false,
        message: "Invalid login details.",
      });
    }

    const passwordMatches = await bcrypt.compare(
      password,
      client.password_hash
    );

    if (!passwordMatches) {
      return res.status(401).json({
        success: false,
        message: "Invalid login details.",
      });
    }

    const token = jwt.sign(
      {
        id: client._id.toString(),
        role: "client",
        therapistId: therapist._id.toString(),
      },
      process.env.JWT_SECRET,
      { expiresIn: "1d" }
    );

    return res.status(200).json({
      success: true,
      message: "Client login successful.",
      token,
      data: {
        id: client._id,
        name: client.name,
        email: client.email,
        therapistId: therapist._id,
        role: "client",
      },
    });
  } catch (error) {
    console.error("Client login error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to log in.",
    });
  }
};

module.exports = {
  registerClient,
  loginClient,
};
