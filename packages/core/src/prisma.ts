import { PrismaClient } from '@prisma/client';

// Create a singleton instance of PrismaClient
const prisma = new PrismaClient({
  log: process.env.DEBUG === 'prisma:query' ? ['query'] : [],
});

export default prisma;

// Example function to demonstrate Prisma usage
export async function testDatabaseConnection(): Promise<boolean> {
  try {
    // Execute a simple query to test the connection
    await prisma.$queryRaw`SELECT 1`;
    console.log('Database connection successful');
    return true;
  } catch (error) {
    console.error('Database connection failed:', error);
    return false;
  }
}