/**
 * Middleware to format and handle Mongoose validation errors.
 * Sends a 400 Bad Request response with structured error messages.
 * @param {Error} err - The error object (expected to be a Mongoose ValidationError).
 * @param {import('express').Response} res - The Express response object.
 */
const handleValidationError = (err, res) => {
  // Default error structure
  const errors = {};
  let message = "Validation failed. Please check your input.";

  if (err.name === "ValidationError") {
    // Extract specific field errors from Mongoose error
    Object.keys(err.errors).forEach((key) => {
      errors[key] = err.errors[key].message;
    });
    // Optionally customize the main message
    // message = `Validation failed for fields: ${Object.keys(errors).join(", ")}`;
  } else {
    // If it's not a Mongoose validation error, pass it on or handle differently
    // For now, we'll just log it and return a generic validation message
    console.error("Non-validation error passed to handleValidationError:", err);
    message = "An unexpected validation error occurred.";
  }

  // Log the formatted errors server-side for debugging
  console.log("Validation Errors Handled:", errors);

  return res.status(400).json({
    success: false,
    message: message,
    errors: errors, // Send structured errors to the client
  });
};

module.exports = handleValidationError;
