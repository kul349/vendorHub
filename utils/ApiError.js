class ApiError extends Error {
    constructor(
      statusCode,
      message = "Something went wrong",
      errors = [],
      stack = ''
    ) {
      super(message);  // Error message is passed to the parent class (Error)
      this.statusCode = statusCode;
      this.data = null;
      this.message = message;
      this.success = false;
      this.error = errors;
  
      // If the stack trace is provided, use it, otherwise capture it automatically.
      if (stack) {
        this.stack = stack;
      } else {
        Error.captureStackTrace(this, this.constructor);
      }
    }
  }
  
  export { ApiError };
  