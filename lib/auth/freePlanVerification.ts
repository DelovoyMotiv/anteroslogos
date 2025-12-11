/**
 * Free Plan Activation Verification
 * Utilities to verify free plan auto-activation flow
 * Used for testing and debugging signup process
 */

import { supabase } from '../supabase';

export interface FreePlanStatus {
  hasSubscription: boolean;
  subscriptionId: string | null;
  planName: string | null;
  status: string | null;
  quotaTotal: number;
  quotaUsed: number;
  quotaRemaining: number;
  currentPeriodStart: string | null;
  currentPeriodEnd: string | null;
  error: string | null;
}

export interface SignupFlowStatus {
  step: string;
  completed: boolean;
  timestamp: Date;
  details?: Record<string, unknown>;
}

export interface ComprehensiveSignupCheck {
  userId: string;
  email: string;
  emailVerified: boolean;
  
  // Profile check
  hasProfile: boolean;
  profileCreatedAt: string | null;
  
  // Subscription check
  subscription: FreePlanStatus;
  
  // Tenant check
  hasTenant: boolean;
  tenantId: string | null;
  tenantSlug: string | null;
  
  // Onboarding check
  onboardingCompleted: boolean;
  
  // Overall status
  signupComplete: boolean;
  missingSteps: string[];
  
  // Timestamps
  userCreatedAt: string;
  checkPerformedAt: Date;
}

/**
 * Check user's free plan subscription status
 */
export async function checkFreePlanStatus(userId: string): Promise<FreePlanStatus> {
  try {
    if (!supabase) {
      return {
        hasSubscription: false,
        subscriptionId: null,
        planName: null,
        status: null,
        quotaTotal: 0,
        quotaUsed: 0,
        quotaRemaining: 0,
        currentPeriodStart: null,
        currentPeriodEnd: null,
        error: 'Supabase not configured',
      };
    }

    // Query subscription status summary view
    const { data, error } = await supabase
      .from('subscription_status_summary')
      .select('*')
      .eq('user_id', userId)
      .eq('status', 'active')
      .single();

    if (error) {
      if (error.code === 'PGRST116') { // No rows returned
        return {
          hasSubscription: false,
          subscriptionId: null,
          planName: null,
          status: null,
          quotaTotal: 0,
          quotaUsed: 0,
          quotaRemaining: 0,
          currentPeriodStart: null,
          currentPeriodEnd: null,
          error: 'No active subscription found',
        };
      }

      return {
        hasSubscription: false,
        subscriptionId: null,
        planName: null,
        status: null,
        quotaTotal: 0,
        quotaUsed: 0,
        quotaRemaining: 0,
        currentPeriodStart: null,
        currentPeriodEnd: null,
        error: error.message,
      };
    }

    type SubscriptionRow = {
      subscription_id: string;
      plan_name: string;
      status: string;
      audit_quota: number;
      usage_count: number;
      quota_remaining: number;
      current_period_start: string;
      current_period_end: string;
    };
    
    const row = data as SubscriptionRow;
    
    return {
      hasSubscription: true,
      subscriptionId: row.subscription_id,
      planName: row.plan_name,
      status: row.status,
      quotaTotal: row.audit_quota || 0,
      quotaUsed: Number(row.usage_count) || 0,
      quotaRemaining: row.quota_remaining || 0,
      currentPeriodStart: row.current_period_start,
      currentPeriodEnd: row.current_period_end,
      error: null,
    };
  } catch (error) {
    console.error('Error checking free plan status:', error);
    return {
      hasSubscription: false,
      subscriptionId: null,
      planName: null,
      status: null,
      quotaTotal: 0,
      quotaUsed: 0,
      quotaRemaining: 0,
      currentPeriodStart: null,
      currentPeriodEnd: null,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Perform comprehensive signup flow verification
 */
export async function verifySignupFlow(userId: string): Promise<ComprehensiveSignupCheck> {
  const missingSteps: string[] = [];
  const checkPerformedAt = new Date();

  try {
    if (!supabase) {
      throw new Error('Supabase not configured');
    }

    // 1. Get user from auth.users
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (userError || !user) {
      throw new Error('User not found or not authenticated');
    }

    // 2. Check profile
    type ProfileRow = { created_at: string };
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('created_at')
      .eq('id', userId)
      .single();

    const hasProfile = !profileError && !!profile;
    if (!hasProfile) missingSteps.push('profile');

    // 3. Check subscription
    const subscription = await checkFreePlanStatus(userId);
    if (!subscription.hasSubscription) missingSteps.push('subscription');

    // 4. Check tenant
    type TenantMemberRow = {
      tenant_id: string;
      tenants: { slug: string } | null;
    };
    const { data: tenantMember, error: tenantError } = await supabase
      .from('tenant_members')
      .select('tenant_id, tenants(slug)')
      .eq('user_id', userId)
      .limit(1)
      .single();

    // Type guard to check if tenantMember has the expected structure
    const isValidTenantMember = (data: unknown): data is TenantMemberRow => {
      if (!data || typeof data !== 'object') return false;
      const obj = data as Record<string, unknown>;
      return 'tenant_id' in obj && typeof obj.tenant_id === 'string';
    };

    const hasTenant = !tenantError && !!tenantMember && isValidTenantMember(tenantMember);
    if (!hasTenant) missingSteps.push('tenant');

    // 5. Check onboarding
    type OnboardingRow = { onboarding_completed: boolean };
    const { data: profileData, error: onboardingError } = await supabase
      .from('profiles')
      .select('onboarding_completed')
      .eq('id', userId)
      .single();

    const onboardingRow = profileData as OnboardingRow | null;
    const onboardingCompleted = !onboardingError && onboardingRow?.onboarding_completed === true;
    if (!onboardingCompleted) missingSteps.push('onboarding');

    return {
      userId: user.id,
      email: user.email || '',
      emailVerified: !!user.email_confirmed_at,
      
      hasProfile,
      profileCreatedAt: (profile as ProfileRow | null)?.created_at || null,
      
      subscription,
      
      hasTenant,
      tenantId: hasTenant && tenantMember && isValidTenantMember(tenantMember) ? tenantMember.tenant_id : null,
      tenantSlug: hasTenant && tenantMember && isValidTenantMember(tenantMember) && tenantMember.tenants ? tenantMember.tenants.slug : null,
      
      onboardingCompleted,
      
      signupComplete: missingSteps.length === 0 && onboardingCompleted,
      missingSteps,
      
      userCreatedAt: user.created_at,
      checkPerformedAt,
    };
  } catch (error) {
    console.error('Error verifying signup flow:', error);
    throw error;
  }
}

/**
 * Log signup flow status (development only)
 */
export function logSignupStatus(status: ComprehensiveSignupCheck): void {
  if (import.meta.env.MODE !== 'development') {
    return;
  }

  console.group('🔍 Signup Flow Verification');
  console.log('User ID:', status.userId);
  console.log('Email:', status.email);
  console.log('Email Verified:', status.emailVerified ? '✅' : '❌');
  
  console.group('Profile');
  console.log('Created:', status.hasProfile ? '✅' : '❌');
  if (status.profileCreatedAt) {
    console.log('Created At:', new Date(status.profileCreatedAt).toLocaleString());
  }
  console.groupEnd();
  
  console.group('Subscription');
  console.log('Has Subscription:', status.subscription.hasSubscription ? '✅' : '❌');
  if (status.subscription.hasSubscription) {
    console.log('Plan:', status.subscription.planName);
    console.log('Status:', status.subscription.status);
    console.log('Quota:', `${status.subscription.quotaRemaining}/${status.subscription.quotaTotal} remaining`);
    console.log('Period:', status.subscription.currentPeriodStart, 'to', status.subscription.currentPeriodEnd);
  } else if (status.subscription.error) {
    console.warn('Error:', status.subscription.error);
  }
  console.groupEnd();
  
  console.group('Tenant');
  console.log('Created:', status.hasTenant ? '✅' : '❌');
  if (status.hasTenant) {
    console.log('Tenant ID:', status.tenantId);
    console.log('Slug:', status.tenantSlug);
  }
  console.groupEnd();
  
  console.log('Onboarding:', status.onboardingCompleted ? '✅' : '❌');
  
  console.group('Summary');
  console.log('Signup Complete:', status.signupComplete ? '✅' : '❌');
  if (status.missingSteps.length > 0) {
    console.warn('Missing Steps:', status.missingSteps.join(', '));
  }
  console.log('User Created:', new Date(status.userCreatedAt).toLocaleString());
  console.log('Check Performed:', status.checkPerformedAt.toLocaleString());
  console.groupEnd();
  
  console.groupEnd();
}

/**
 * Manually trigger free plan activation (fallback for testing)
 * WARNING: Should never be needed in production if trigger is working
 */
export async function manuallyActivateFreePlan(userId: string): Promise<{
  success: boolean;
  subscriptionId: string | null;
  error: string | null;
}> {
  try {
    if (!supabase) {
      return {
        success: false,
        subscriptionId: null,
        error: 'Supabase not configured',
      };
    }

    // Check if already has subscription
    const existing = await checkFreePlanStatus(userId);
    if (existing.hasSubscription) {
      return {
        success: true,
        subscriptionId: existing.subscriptionId,
        error: null,
      };
    }

    // Get free plan ID
    type PlanRow = { id: string };
    const { data: plan, error: planError } = await supabase
      .from('subscription_plans')
      .select('id')
      .eq('plan_name', 'free')
      .eq('is_active', true)
      .single();

    if (planError || !plan) {
      return {
        success: false,
        subscriptionId: null,
        error: 'Free plan not found',
      };
    }
    
    const freePlan = plan as PlanRow;

    // Create subscription
    const periodStart = new Date();
    const periodEnd = new Date(periodStart);
    periodEnd.setDate(periodEnd.getDate() + 30);

    type SubscriptionInsertRow = { id: string };
    // Type assertion needed until Supabase types are generated
    const { data: subscription, error: subError } = await supabase
      .from('user_subscriptions')
      .insert({
        user_id: userId,
        plan_id: freePlan.id,
        status: 'active',
        current_period_start: periodStart.toISOString(),
        current_period_end: periodEnd.toISOString(),
        cancel_at_period_end: false,
      } as never)
      .select('id')
      .single();

    if (subError) {
      return {
        success: false,
        subscriptionId: null,
        error: subError.message,
      };
    }

    const newSubscription = subscription as SubscriptionInsertRow;

    return {
      success: true,
      subscriptionId: newSubscription.id,
      error: null,
    };
  } catch (error) {
    return {
      success: false,
      subscriptionId: null,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Get human-readable status message
 */
export function getSignupStatusMessage(status: ComprehensiveSignupCheck): string {
  if (status.signupComplete) {
    return '✅ Signup complete! All systems operational.';
  }

  const steps = {
    profile: 'Profile not created',
    subscription: 'Free plan not activated',
    tenant: 'Tenant workspace not provisioned',
    onboarding: 'Onboarding not completed',
  };

  const missing = status.missingSteps.map(step => steps[step as keyof typeof steps]).filter(Boolean);
  
  return `⚠️ Signup incomplete. Missing: ${missing.join(', ')}`;
}
