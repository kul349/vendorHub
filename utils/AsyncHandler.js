import { ApiError } from "./ApiError.js";

const asyncHandler = (requestHandler) => {
  return async (req, res, next) => {
    try {
      // Run the request handler (e.g., addProduct)
      await requestHandler(req, res, next);
    } catch (error) {
      // Handle the error by creating an ApiError object
      const statusCode = error.statusCode || 500;
      const apiError = new ApiError(
        statusCode,
        error.message || "Internal server error",
        error.errors || [],  // Ensure that error.errors exists, otherwise set as empty array
        error.stack || ''
      );

      // Log the error to the console for debugging
      console.log("Error occurred:", apiError);

      // Send the error response to the client with the appropriate status code and message
      res.status(statusCode).json(apiError);
    }
  };
};

export { asyncHandler };
