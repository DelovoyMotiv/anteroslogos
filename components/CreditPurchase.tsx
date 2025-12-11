/**
 * Credit Purchase Component
 * Displays credit packages and handles Stripe checkout flow
 */

import React, { useState, useEffect } from 'react';
import { useAuth } from '../lib/dashboard/auth-guard';
import { supabase } from '../lib/supabase';
import { CreditCard, Check, Loader2, AlertCircle } from 'lucide-react';
import { CreditPackageSchema, type CreditPackage } from '../lib/dashboard/schemas';
import { parseDbResults } from '../lib/utils/typeGuards';

interface CreditPurchaseProps {
  onBalanceRefresh?: () => void;
}

/**
 * CreditPurchase Component
 * Displays available credit packages and initiates Stripe checkout
 */
export const CreditPurchase: React.FC<CreditPurchaseProps> = ({
  onBalanceRefresh,
}) => {
  const { user } = useAuth();
  const [packages, setPackages] = useState<CreditPackage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [processingPackageId, setProcessingPackageId] = useState<string | null>(null);

  // Load credit packages from database
  useEffect(() => {
    loadPackages();
  }, []);

  const loadPackages = async () => {
    try {
      setLoading(true);
      setError(null);

      if (!supabase) {
        throw new Error('Database connection not available');
      }

      const { data: rawData, error: fetchError } = await supabase
        .from('credit_packages')
        .select('*')
        .eq('is_active', true)
        .order('display_order', { ascending: true });

      if (fetchError) {
        throw new Error(`Failed to load packages: ${fetchError.message}`);
      }

      // Validate and parse results using schema
      const validatedPackages = parseDbResults(rawData || [], CreditPackageSchema);
      
      // Calculate cost_per_credit for each package if not present
      const packagesWithCost = validatedPackages.map(pkg => ({
        ...pkg,
        cost_per_credit: pkg.cost_per_credit || pkg.usd_cost / pkg.ccc_amount,
      }));

      setPackages(packagesWithCost);
    } catch (err) {
      console.error('Error loading packages:', err);
      setError(err instanceof Error ? err.message : 'Failed to load credit packages');
    } finally {
      setLoading(false);
    }
  };

  /**
   * Handle package selection and initiate Stripe checkout
   */
  const handlePurchase = async (pkg: CreditPackage) => {
    if (!user) {
      setError('You must be logged in to purchase credits');
      return;
    }

    try {
      setProcessingPackageId(pkg.id);
      setError(null);

      // Call API to create Stripe checkout session
      const response = await fetch('/api/create-checkout-session', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: user.id,
          packageId: pkg.id,
          packageName: pkg.name,
          cccAmount: pkg.ccc_amount,
          usdCost: pkg.usd_cost,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create checkout session');
      }

      const { url } = await response.json();

      // Redirect to Stripe checkout
      window.location.href = url;
    } catch (err) {
      console.error('Error creating checkout session:', err);
      setError(err instanceof Error ? err.message : 'Failed to initiate purchase');
      setProcessingPackageId(null);
    }
  };

  // Check for purchase success in URL params
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const purchaseStatus = params.get('purchase');

    if (purchaseStatus === 'success') {
      // Refresh balance
      if (onBalanceRefresh) {
        onBalanceRefresh();
      }

      // Clear URL params
      window.history.replaceState({}, '', window.location.pathname);
    }
  }, [onBalanceRefresh]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 text-brand-accent animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4">
        <div className="flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
          <div>
            <h3 className="text-sm font-semibold text-red-500 mb-1">Error</h3>
            <p className="text-sm text-red-400">{error}</p>
            <button
              onClick={loadPackages}
              className="mt-2 text-sm text-red-400 hover:text-red-300 underline"
            >
              Try again
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (packages.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-brand-text/60">No credit packages available at this time.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="text-center mb-8">
        <h2 className="text-2xl font-display font-bold text-brand-text mb-2">
          Purchase CCC Credits
        </h2>
        <p className="text-brand-text/70">
          Choose a package that fits your needs. Larger packages offer better value.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {packages.map((pkg, index) => {
          const isProcessing = processingPackageId === pkg.id;
          const isPopular = index === 1; // Mark second package as popular

          return (
            <div
              key={pkg.id}
              className={`relative bg-brand-secondary/50 border rounded-xl p-6 transition-all duration-300 hover:shadow-lg hover:shadow-brand-accent/10 ${
                isPopular
                  ? 'border-brand-accent shadow-lg shadow-brand-accent/20'
                  : 'border-brand-text/10'
              }`}
            >
              {isPopular && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <span className="bg-brand-accent text-white text-xs font-semibold px-3 py-1 rounded-full">
                    Most Popular
                  </span>
                </div>
              )}

              <div className="text-center mb-6">
                <h3 className="text-lg font-display font-bold text-brand-text mb-2">
                  {pkg.name}
                </h3>
                <div className="mb-4">
                  <div className="text-3xl font-bold text-brand-accent">
                    {pkg.ccc_amount.toLocaleString()}
                  </div>
                  <div className="text-sm text-brand-text/60">CCC Credits</div>
                </div>
                <div className="text-2xl font-bold text-brand-text mb-1">
                  ${pkg.usd_cost.toFixed(2)}
                </div>
                <div className="text-xs text-brand-text/60">
                  ${pkg.cost_per_credit.toFixed(4)} per credit
                </div>
              </div>

              <button
                onClick={() => handlePurchase(pkg)}
                disabled={isProcessing || !user}
                className={`w-full py-3 px-4 rounded-lg font-semibold text-sm transition-all duration-300 flex items-center justify-center gap-2 ${
                  isPopular
                    ? 'bg-brand-accent hover:bg-blue-500 text-white'
                    : 'bg-brand-secondary border border-brand-text/20 hover:bg-brand-secondary/80 text-brand-text'
                } disabled:opacity-50 disabled:cursor-not-allowed`}
              >
                {isProcessing ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Processing...
                  </>
                ) : (
                  <>
                    <CreditCard className="w-4 h-4" />
                    Purchase
                  </>
                )}
              </button>

              {/* Value indicators */}
              <div className="mt-4 pt-4 border-t border-brand-text/10">
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-xs text-brand-text/70">
                    <Check className="w-3 h-3 text-green-500" />
                    <span>Instant delivery</span>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-brand-text/70">
                    <Check className="w-3 h-3 text-green-500" />
                    <span>No expiration</span>
                  </div>
                  {index > 0 && (
                    <div className="flex items-center gap-2 text-xs text-green-500 font-semibold">
                      <Check className="w-3 h-3" />
                      <span>
                        Save{' '}
                        {(
                          ((packages[0].cost_per_credit - pkg.cost_per_credit) /
                            packages[0].cost_per_credit) *
                          100
                        ).toFixed(0)}
                        %
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="bg-brand-secondary/30 border border-brand-text/10 rounded-lg p-4 mt-8">
        <div className="flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-brand-accent flex-shrink-0 mt-0.5" />
          <div className="text-sm text-brand-text/70">
            <p className="mb-2">
              <strong className="text-brand-text">Secure Payment:</strong> All transactions are
              processed securely through Stripe. Your payment information is never stored on our
              servers.
            </p>
            <p>
              <strong className="text-brand-text">Credits Never Expire:</strong> Your CCC credits
              remain in your account indefinitely and can be used for any platform service.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CreditPurchase;
