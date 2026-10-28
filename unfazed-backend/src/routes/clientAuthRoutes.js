
const express = require("express");
const { body } = require("express-validator");

const {
  registerClient,
  loginClient,
} = require("../controllers/clientAuthController");

const router = express.Router();

// Client registration
router.post(
  "/register",
  [
    body("name")
      .trim()
      .notEmpty()
      .withMessage("Name is required"),

    body("email")
      .trim()
      .isEmail()
      .withMessage("Enter a valid email"),

    body("password")
      .isLength({ min: 8 })
      .withMessage("Password must be at least 8 characters"),

    body("therapistSlug")
      .trim()
      .notEmpty()
      .withMessage("Therapist profile slug is required"),
  ],
  registerClient
);

// Client login
router.post(
  "/login",
  [
    body("email")
      .trim()
      .isEmail()
      .withMessage("Enter a valid email"),

    body("password")
      .notEmpty()
      .withMessage("Password is required"),

    body("therapistSlug")
      .trim()
      .notEmpty()
      .withMessage("Therapist profile slug is required"),
  ],
  loginClient
);

module.exports = router;
