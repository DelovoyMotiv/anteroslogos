/**
 * Migration Service - Legacy Subscription to CCC Economy
 * Handles conversion of existing subscriptions to CCC credits
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { BillingService } from './BillingService';
import { MigrationError } from './errors';

export interface MigrationResult {
  success: boolean;
  creditsGranted: number;
  error?: string;
}

export interface SubscriptionInfo {
  id: string;
  user_id: string;
  plan_name: string;
  price_usd: number;
  current_period_start: string | null;
  current_period_end: string | null;
  status: string;
}

export class MigrationService {
  private supabase: SupabaseClient;
  private billingService: BillingService;

  constructor(supabaseUrl?: string, supabaseServiceKey?: string) {
    // Use provided credentials or fall back to environment variables
    const url = supabaseUrl || process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.VITE_SUPABASE_URL;
    const key = supabaseServiceKey || process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!url || !key) {
      throw new Error(
        'Missing Supabase configuration. Provide supabaseUrl and supabaseServiceKey or set environment variables.'
      );
    }

    this.supabase = createClient(url, key, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    this.billingService = new BillingService(url, key);
  }

  /**
   * Migrate a legacy subscription to CCC
   * Calculate equivalent credits based on tier and remaining time
   */
  async migrateSubscription(userId: string): Promise<MigrationResult> {
    try {
      // Check if already migrated
      const alreadyMigrated = await this.isAlreadyMigrated(userId);
      if (alreadyMigrated) {
        return {
          success: false,
          creditsGranted: 0,
          error: 'Subscription already migrated',
        };
      }

      // Get active subscription
      const subscription = await this.getActiveSubscription(userId);
      if (!subscription) {
        return {
          success: false,
          creditsGranted: 0,
          error: 'No active subscription found',
        };
      }

      // Calculate CCC credits
      const creditsGranted = this.calculateSubscriptionValue(
        subscription.plan_name as 'free' | 'starter' | 'pro' | 'enterprise',
        subscription.current_period_start,
        subscription.current_period_end
      );

      if (creditsGranted <= 0) {
        return {
          success: false,
          creditsGranted: 0,
          error: 'Calculated credits are zero or negative',
        };
      }

      // Insert MIGRATION_CREDIT into ledger
      await this.billingService.depositCredits(
        userId,
        creditsGranted,
        'MIGRATION_CREDIT',
        {
          plan_id: subscription.plan_name,
          plan_price_usd: subscription.price_usd,
          subscription_id: subscription.id,
          period_start: subscription.current_period_start,
          period_end: subscription.current_period_end,
        }
      );

      // Mark subscription as migrated
      await this.markAsMigrated(subscription.id);

      // Send email notification (placeholder - implement with your email service)
      await this.sendMigrationNotification(userId, creditsGranted, subscription.plan_name);

      console.log(
        `Successfully migrated user ${userId} from ${subscription.plan_name} plan. Granted ${creditsGranted} CCC.`
      );

      return {
        success: true,
        creditsGranted,
      };
    } catch (error) {
      console.error('Migration error:', error);
      throw new MigrationError(
        userId,
        error instanceof Error ? error.message : String(error)
      );
    }
  }

  /**
   * Calculate CCC equivalent for a subscription
   * Based on tier value and remaining time in the billing period
   */
  calculateSubscriptionValue(
    tier: 'free' | 'starter' | 'pro' | 'enterprise',
    periodStart: string | null,
    periodEnd: string | null
  ): number {
    // Tier monthly values in USD
    const tierValues: Record<string, number> = {
      free: 0,
      starter: 19,
      pro: 49,
      enterprise: 199,
    };

    const monthlyValue = tierValues[tier] || 0;

    // If no period dates, give full month value
    if (!periodStart || !periodEnd) {
      return this.usdToCCC(monthlyValue);
    }

    // Calculate remaining days
    const now = new Date();
    const endDate = new Date(periodEnd);
    const startDate = new Date(periodStart);

    // If period already ended, no credits
    if (endDate < now) {
      return 0;
    }

    // Calculate total period days and remaining days
    const totalPeriodDays = Math.max(
      1,
      Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24))
    );
    const remainingDays = Math.max(
      0,
      Math.ceil((endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
    );

    // Pro-rate based on remaining days
    const proRatedValue = (monthlyValue * remainingDays) / totalPeriodDays;

    // Convert to CCC (anchor price: 100 CCC ≈ $20, so 1 USD = 5 CCC)
    return Math.floor(this.usdToCCC(proRatedValue));
  }

  /**
   * Convert USD to CCC using anchor price
   * 100 CCC ≈ $20, so 1 USD = 5 CCC
   */
  private usdToCCC(usd: number): number {
    const CCC_PER_USD = 5;
    return usd * CCC_PER_USD;
  }

  /**
   * Check if user's subscription has already been migrated
   */
  private async isAlreadyMigrated(userId: string): Promise<boolean> {
    try {
      // Check if there's a MIGRATION_CREDIT entry in the ledger
      const { data, error } = await this.supabase
        .from('billing_ledger')
        .select('id')
        .eq('user_id', userId)
        .eq('event_type', 'MIGRATION_CREDIT')
        .limit(1);

      if (error) {
        console.error('Error checking migration status:', error);
        return false;
      }

      return data && data.length > 0;
    } catch (error) {
      console.error('Error in isAlreadyMigrated:', error);
      return false;
    }
  }

  /**
   * Get active subscription for user
   */
  private async getActiveSubscription(userId: string): Promise<SubscriptionInfo | null> {
    try {
      const { data, error } = await this.supabase
        .from('user_subscriptions')
        .select(
          `
          id,
          user_id,
          status,
          current_period_start,
          current_period_end,
          plan:subscription_plans!plan_id (
            plan_name,
            price_usd
          )
        `
        )
        .eq('user_id', userId)
        .eq('status', 'active')
        .single();

      if (error || !data) {
        return null;
      }

      // Type assertion for the joined data
      const planData = data.plan as any;

      return {
        id: data.id,
        user_id: data.user_id,
        plan_name: planData.plan_name,
        price_usd: Number(planData.price_usd),
        current_period_start: data.current_period_start,
        current_period_end: data.current_period_end,
        status: data.status,
      };
    } catch (error) {
      console.error('Error fetching subscription:', error);
      return null;
    }
  }

  /**
   * Mark subscription as migrated
   * Changes status to prevent duplicate migrations
   */
  private async markAsMigrated(subscriptionId: string): Promise<void> {
    try {
      // Update subscription status to 'expired' to prevent reuse
      // The migration credit in the ledger serves as the primary tracking mechanism
      const { error } = await this.supabase
        .from('user_subscriptions')
        .update({
          status: 'expired',
          updated_at: new Date().toISOString(),
        })
        .eq('id', subscriptionId);

      if (error) {
        console.error('Error marking subscription as migrated:', error);
        throw new Error(`Failed to mark subscription as migrated: ${error.message}`);
      }
    } catch (error) {
      console.error('Error in markAsMigrated:', error);
      throw error;
    }
  }

  /**
   * Send email notification to user about migration
   * Placeholder - implement with your email service (SendGrid, Resend, etc.)
   */
  private async sendMigrationNotification(
    userId: string,
    creditsGranted: number,
    planName: string
  ): Promise<void> {
    try {
      // Get user email
      const { data: userData, error: userError } = await this.supabase.auth.admin.getUserById(
        userId
      );

      if (userError || !userData?.user?.email) {
        console.warn(`Could not fetch email for user ${userId}`);
        return;
      }

      const email = userData.user.email;

      // TODO: Implement actual email sending
      // For now, just log
      console.log(`
        [EMAIL NOTIFICATION]
        To: ${email}
        Subject: Your subscription has been migrated to CCC credits
        
        Hello,
        
        Your ${planName} subscription has been successfully migrated to our new CCC credit system.
        You have been credited with ${creditsGranted} CCC based on your remaining subscription period.
        
        You can now use these credits for all platform services on a pay-per-use basis.
        
        Thank you for being a valued user!
      `);

      // Example integration with email service:
      // await emailService.send({
      //   to: email,
      //   subject: 'Your subscription has been migrated to CCC credits',
      //   template: 'migration-notification',
      //   data: { creditsGranted, planName }
      // });
    } catch (error) {
      console.error('Error sending migration notification:', error);
      // Don't throw - email failure shouldn't fail the migration
    }
  }
}

// Export singleton instance for convenience
let migrationServiceInstance: MigrationService | null = null;

export function getMigrationService(): MigrationService {
  if (!migrationServiceInstance) {
    migrationServiceInstance = new MigrationService();
  }
  return migrationServiceInstance;
}
