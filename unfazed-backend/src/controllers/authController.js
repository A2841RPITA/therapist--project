
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { validationResult } = require("express-validator");
const Therapist = require("../models/Therapist");

// Register a new therapist
const registerTherapist = async (req, res) => {
  try {
    const errors = validationResult(req);

    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array(),
      });
    }

    const { name, email, password, slug } = req.body;

    const normalizedEmail = email.trim().toLowerCase();
    const normalizedSlug = slug.trim().toLowerCase();

    const existingTherapist = await Therapist.findOne({
      $or: [
        { email: normalizedEmail },
        { slug: normalizedSlug },
      ],
    });

    if (existingTherapist) {
      return res.status(409).json({
        success: false,
        message: "Email or profile slug already exists",
      });
    }

    const password_hash = await bcrypt.hash(password, 12);

    const therapist = await Therapist.create({
      name: name.trim(),
      email: normalizedEmail,
      password_hash,
      slug: normalizedSlug,
    });

    return res.status(201).json({
      success: true,
      message: "Therapist registered successfully",
      data: {
        id: therapist._id,
        name: therapist.name,
        email: therapist.email,
        slug: therapist.slug,
      },
    });
  } catch (error) {
    console.error("Registration error:", error);

    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        message: "Email or profile slug already exists",
      });
    }

    return res.status(500).json({
      success: false,
      message: "Failed to register therapist",
    });
  }
};

// Login therapist
const loginTherapist = async (req, res) => {
  try {
    const errors = validationResult(req);

    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array(),
      });
    }

    const { email, password } = req.body;

    if (
      typeof email !== "string" ||
      typeof password !== "string" ||
      !email.trim() ||
      !password
    ) {
      return res.status(400).json({
        success: false,
        message: "Email and password are required",
      });
    }

    if (!process.env.JWT_SECRET) {
      console.error("Login error: JWT_SECRET is not configured");

      return res.status(500).json({
        success: false,
        message: "Server configuration error",
      });
    }

    const normalizedEmail = email.trim().toLowerCase();

    const therapist = await Therapist.findOne({
      email: normalizedEmail,
    });

    if (!therapist) {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password",
      });
    }

    const isMatch = await bcrypt.compare(
      password,
      therapist.password_hash
    );

    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password",
      });
    }

    const token = jwt.sign(
      { id: therapist._id.toString() },
      process.env.JWT_SECRET,
      { expiresIn: "1d" }
    );

    return res.status(200).json({
      success: true,
      message: "Login successful",
      token,
      data: {
        id: therapist._id,
        name: therapist.name,
        email: therapist.email,
        slug: therapist.slug,
      },
    });
  } catch (error) {
    console.error("Login error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to log in",
    });
  }
};

module.exports = {
  registerTherapist,
  loginTherapist,
};
