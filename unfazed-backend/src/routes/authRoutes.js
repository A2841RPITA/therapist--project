const express = require("express");
const router = express.Router();

const { body } = require("express-validator");

const {
  registerTherapist,
  loginTherapist,
} = require("../controllers/authController");

// Therapist registration
router.post(
  "/register",
  [
    body("name")
      .trim()
      .notEmpty()
      .withMessage("Name is required"),

    body("email")
      .isEmail()
      .withMessage("Enter a valid email"),

    body("password")
      .isLength({ min: 8 })
      .withMessage("Password must be at least 8 characters"),

    body("slug")
      .trim()
      .notEmpty()
      .withMessage("Profile slug is required"),
  ],
  registerTherapist
);

// Therapist login
router.post(
  "/login",
  [
    body("email")
      .isEmail()
      .withMessage("Enter a valid email"),

    body("password")
      .notEmpty()
      .withMessage("Password is required"),
  ],
  loginTherapist
);

module.exports = router;