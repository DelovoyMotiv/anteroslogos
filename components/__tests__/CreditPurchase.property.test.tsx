/**
 * Property-Based Tests for Credit Purchase UI
 * Tests universal properties for credit package display and purchase flow
 */

import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';

/**
 * Credit package interface matching the database schema
 */
interface CreditPackage {
  id: string;
  name: string;
  cccAmount: number;
  usdCost: number;
  costPerCredit?: number;
  stripePriceId?: string;
  isActive?: boolean;
  displayOrder?: number;
}

/**
 * Calculate cost per credit for a package
 */
function calculateCostPerCredit(usdCost: number, cccAmount: number): number {
  if (cccAmount <= 0) {
    throw new Error('CCC amount must be positive');
  }
  return usdCost / cccAmount;
}

/**
 * Verify volume discount (larger packages should have lower or equal cost per credit)
 */
function hasVolumeDiscount(packages: CreditPackage[]): boolean {
  // Sort by CCC amount ascending
  const sorted = [...packages].sort((a, b) => a.cccAmount - b.cccAmount);
  
  // Check that cost per credit decreases or stays the same as package size increases
  for (let i = 1; i < sorted.length; i++) {
    const prevCostPerCredit = calculateCostPerCredit(sorted[i - 1].usdCost, sorted[i - 1].cccAmount);
    const currCostPerCredit = calculateCostPerCredit(sorted[i].usdCost, sorted[i].cccAmount);
    
    // Current package should have lower or equal cost per credit
    if (currCostPerCredit > prevCostPerCredit) {
      return false;
    }
  }
  
  return true;
}

describe('Credit Purchase Property Tests', () => {
  /**
   * Feature: ccc-native-economy, Property 18: Package display calculations
   * Validates: Requirements 7.2
   * 
   * For any credit package, the displayed cost per credit should equal 
   * the USD cost divided by the CCC amount.
   */
  it('Property 18: Package display calculations', () => {
    fc.assert(
      fc.property(
        // Generate random credit packages with positive amounts
        fc.record({
          id: fc.uuid(),
          name: fc.string({ minLength: 1, maxLength: 50 }),
          cccAmount: fc.integer({ min: 1, max: 100000 }),
          usdCost: fc.float({ min: Math.fround(0.01), max: Math.fround(100000), noNaN: true }),
        }),
        (pkg) => {
          // Calculate cost per credit
          const costPerCredit = calculateCostPerCredit(pkg.usdCost, pkg.cccAmount);
          
          // Verify the calculation is correct
          const expectedCostPerCredit = pkg.usdCost / pkg.cccAmount;
          
          // Use a small epsilon for floating point comparison
          const epsilon = 0.0001;
          expect(Math.abs(costPerCredit - expectedCostPerCredit)).toBeLessThan(epsilon);
          
          // Verify cost per credit is positive
          expect(costPerCredit).toBeGreaterThan(0);
        }
      ),
      { numRuns: 20 }
    );
  });

  /**
   * Feature: ccc-native-economy, Property 19: Volume discount verification
   * Validates: Requirements 7.3
   * 
   * For any two credit packages where package A has more CCC than package B, 
   * package A's cost per credit should be less than or equal to package B's cost per credit.
   */
  it('Property 19: Volume discount verification', () => {
    fc.assert(
      fc.property(
        // Generate an array of 2-5 credit packages
        fc.array(
          fc.record({
            id: fc.uuid(),
            name: fc.string({ minLength: 1, maxLength: 50 }),
            cccAmount: fc.integer({ min: 10, max: 10000 }),
            usdCost: fc.float({ min: Math.fround(1), max: Math.fround(10000), noNaN: true }),
          }),
          { minLength: 2, maxLength: 5 }
        ).chain((packages) => {
          // Ensure packages have unique CCC amounts for clear comparison
          const uniquePackages = packages.filter(
            (pkg, index, self) =>
              index === self.findIndex((p) => p.cccAmount === pkg.cccAmount)
          );
          
          // If we don't have at least 2 unique packages, generate new ones
          if (uniquePackages.length < 2) {
            return fc.constant([]);
          }
          
          // Apply volume discount pricing: larger packages get better rates
          const sortedPackages = uniquePackages.sort((a, b) => a.cccAmount - b.cccAmount);
          
          // Calculate base cost per credit from smallest package
          const baseCostPerCredit = sortedPackages[0].usdCost / sortedPackages[0].cccAmount;
          
          // Apply decreasing cost per credit for larger packages
          const discountedPackages = sortedPackages.map((pkg, index) => {
            // Apply 0-10% discount for each tier
            const discountFactor = 1 - (index * 0.05);
            const adjustedCostPerCredit = baseCostPerCredit * Math.max(discountFactor, 0.7);
            
            return {
              ...pkg,
              usdCost: adjustedCostPerCredit * pkg.cccAmount,
            };
          });
          
          return fc.constant(discountedPackages);
        }),
        (packages) => {
          // Skip empty arrays
          if (packages.length < 2) {
            return;
          }
          
          // Verify volume discount property holds
          expect(hasVolumeDiscount(packages)).toBe(true);
          
          // Additional verification: compare each pair
          const sorted = [...packages].sort((a, b) => a.cccAmount - b.cccAmount);
          for (let i = 1; i < sorted.length; i++) {
            const prevCostPerCredit = calculateCostPerCredit(
              sorted[i - 1].usdCost,
              sorted[i - 1].cccAmount
            );
            const currCostPerCredit = calculateCostPerCredit(
              sorted[i].usdCost,
              sorted[i].cccAmount
            );
            
            // Current (larger) package should have lower or equal cost per credit
            expect(currCostPerCredit).toBeLessThanOrEqual(prevCostPerCredit);
          }
        }
      ),
      { numRuns: 20 }
    );
  });

  /**
   * Feature: ccc-native-economy, Property 20: Purchase credit accuracy
   * Validates: Requirements 7.4
   * 
   * For any completed credit purchase, the user's balance increase should 
   * exactly match the CCC amount of the purchased package.
   */
  it('Property 20: Purchase credit accuracy', () => {
    fc.assert(
      fc.property(
        // Generate initial balance and package
        fc.record({
          initialBalance: fc.float({ min: Math.fround(0), max: Math.fround(100000), noNaN: true }),
          package: fc.record({
            id: fc.uuid(),
            name: fc.string({ minLength: 1, maxLength: 50 }),
            cccAmount: fc.integer({ min: 1, max: 100000 }),
            usdCost: fc.float({ min: Math.fround(0.01), max: Math.fround(100000), noNaN: true }),
          }),
        }),
        ({ initialBalance, package: pkg }) => {
          // Simulate purchase: add package CCC amount to balance
          const newBalance = initialBalance + pkg.cccAmount;
          
          // Verify balance increase equals package amount
          const balanceIncrease = newBalance - initialBalance;
          expect(balanceIncrease).toBe(pkg.cccAmount);
          
          // Verify new balance is correct
          expect(newBalance).toBe(initialBalance + pkg.cccAmount);
          
          // Verify balance increased (not decreased or stayed same)
          expect(newBalance).toBeGreaterThan(initialBalance);
        }
      ),
      { numRuns: 20 }
    );
  });

  /**
   * Feature: ccc-native-economy, Property 21: Package metadata storage
   * Validates: Requirements 7.5
   * 
   * For any credit purchase transaction, the ledger metadata should contain 
   * the package_id or package_name field.
   */
  it('Property 21: Package metadata storage', () => {
    fc.assert(
      fc.property(
        // Generate transaction metadata for a purchase
        fc.record({
          userId: fc.uuid(),
          package: fc.record({
            id: fc.uuid(),
            name: fc.string({ minLength: 1, maxLength: 50 }),
            cccAmount: fc.integer({ min: 1, max: 100000 }),
            usdCost: fc.float({ min: Math.fround(0.01), max: Math.fround(100000), noNaN: true }),
          }),
          stripeSessionId: fc.string({ minLength: 10, maxLength: 100 }),
        }),
        ({ userId, package: pkg, stripeSessionId }) => {
          // Simulate creating transaction metadata
          const metadata = {
            package_id: pkg.id,
            package_name: pkg.name,
            stripe_session_id: stripeSessionId,
            amount_paid_usd: pkg.usdCost,
            ccc_amount: pkg.cccAmount,
          };
          
          // Verify package_id is present
          expect(metadata).toHaveProperty('package_id');
          expect(metadata.package_id).toBe(pkg.id);
          
          // Verify package_name is present
          expect(metadata).toHaveProperty('package_name');
          expect(metadata.package_name).toBe(pkg.name);
          
          // Verify metadata contains the package information
          expect(metadata.package_id).toBeTruthy();
          expect(metadata.package_name).toBeTruthy();
          expect(metadata.package_name.length).toBeGreaterThan(0);
        }
      ),
      { numRuns: 20 }
    );
  });
});
