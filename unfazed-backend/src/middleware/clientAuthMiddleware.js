
const jwt = require("jsonwebtoken");

const authenticateClient = (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({
        success: false,
        message: "Please log in to access the client portal.",
      });
    }

    const token = authHeader.split(" ")[1];

    if (!token || !process.env.JWT_SECRET) {
      return res.status(401).json({
        success: false,
        message: "Invalid authentication token.",
      });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Only accept client tokens, not therapist tokens.
    if (
      decoded.role !== "client" ||
      !decoded.id ||
      !decoded.therapistId
    ) {
      return res.status(403).json({
        success: false,
        message: "Client access only.",
      });
    }

    req.clientId = decoded.id;
    req.therapistId = decoded.therapistId;
    req.client = decoded;

    next();
  } catch (error) {
    if (
      error.name === "TokenExpiredError" ||
      error.name === "JsonWebTokenError"
    ) {
      return res.status(401).json({
        success: false,
        message: "Your session has expired. Please log in again.",
      });
    }

    console.error("Client authentication error:", error);

    return res.status(500).json({
      success: false,
      message: "Client authentication failed.",
    });
  }
};

module.exports = authenticateClient;
