/**
 * Core package entry point
 */

// Export existing functionality
export const greet = (): string => {
  return 'Hello from Steam Web Parser!';
};

// Export Prisma client and utilities
export { default as prisma, testDatabaseConnection } from './prisma';

// Log greeting on import (consider removing this in production)
console.log(greet());
