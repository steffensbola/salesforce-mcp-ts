// Debug logging helper - only logs when DEBUG is enabled
export const debugLog = (message: string): void => {
  if (process.env.DEBUG === 'true' || process.env.NODE_ENV === 'development') {
    console.log(message); // Use stderr to avoid interfering with MCP protocol
  }
};

export const errorLog = (...args: unknown[]): void => {
  if (process.env.DEBUG === 'true' || process.env.NODE_ENV === 'development') {
    console.error(...args); // Use stderr to avoid interfering with MCP protocol
  }
};
