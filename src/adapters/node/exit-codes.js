export const EXIT_CODES = {
  OK: 0,
  OPERATION_FAILED: 1,
  INVALID_ARGUMENTS: 2,
  INVALID_FILE: 3,
  RUNTIME_ERROR: 4
};

export function structuredError(code, message, details = {}) {
  return {
    success: false,
    error: {
      code,
      message,
      file: details.file || null,
      line: details.line || null,
      details
    }
  };
}

