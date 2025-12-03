/**
 * Test setup file for JWT authentication tests
 * Sets environment variables before any modules are imported
 */

// Set test environment variables
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-secret-key-for-jwt-testing-only';
process.env.JWT_REFRESH_SECRET = 'test-refresh-secret-key-for-jwt-testing-only';
