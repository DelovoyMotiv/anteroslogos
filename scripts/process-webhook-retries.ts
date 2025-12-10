/**
 * Webhook Retry Background Worker
 * Processes pending webhook retries with exponential backoff
 * 
 * Usage:
 *   npm run process-webhook-retries
 *   
 * Or for continuous processing:
 *   npm run process-webhook-retries -- --continuous
 */

import { WebhookRetryService } from '../lib/billing/webhookRetry';
import { BillingService } from '../lib/billing/BillingService';

async function main() {
  const args = process.argv.slice(2);
  const continuous = args.includes('--continuous');
  const intervalMs = 5000; // 5 seconds

  console.log('='.repeat(80));
  console.log('Webhook Retry Background Worker');
  console.log('='.repeat(80));
  console.log(`Mode: ${continuous ? 'Continuous' : 'Single run'}`);
  console.log(`Interval: ${intervalMs}ms`);
  console.log('='.repeat(80));

  const billingService = new BillingService();
  const retryService = new WebhookRetryService(billingService);

  if (continuous) {
    console.log('Starting continuous processing...');
    
    // Start auto-processing
    retryService.startAutoProcessing(intervalMs);
    
    // Keep process alive
    process.on('SIGINT', () => {
      console.log('\nReceived SIGINT, shutting down gracefully...');
      retryService.stopAutoProcessing();
      process.exit(0);
    });
    
    process.on('SIGTERM', () => {
      console.log('\nReceived SIGTERM, shutting down gracefully...');
      retryService.stopAutoProcessing();
      process.exit(0);
    });
    
    // Print stats every minute
    setInterval(async () => {
      const stats = await retryService.getRetryStats();
      console.log(`[Stats] Pending: ${stats.pending}, Failed: ${stats.failed}, Total: ${stats.totalInQueue}`);
    }, 60000);
    
  } else {
    console.log('Processing pending retries (single run)...');
    
    try {
      const processed = await retryService.processPendingRetries();
      console.log(`Processed ${processed} webhook retries`);
      
      const stats = await retryService.getRetryStats();
      console.log(`Stats: Pending: ${stats.pending}, Failed: ${stats.failed}, Total: ${stats.totalInQueue}`);
      
      // Check for alerts
      const alertInfo = await retryService.checkAndAlert();
      if (alertInfo.shouldAlert) {
        console.error(`⚠️ ALERT: ${alertInfo.failedCount} webhooks have failed repeatedly!`);
      }
      
      process.exit(0);
    } catch (error) {
      console.error('Error processing retries:', error);
      process.exit(1);
    }
  }
}

main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
