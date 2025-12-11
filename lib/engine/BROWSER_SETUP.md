# Browser Service Setup Guide

This guide explains how to set up and configure the headless browser infrastructure for the GEO Audit Engine.

## Prerequisites

- Node.js 18+ 
- 2GB RAM minimum (4GB recommended)
- npm or yarn package manager

## Installation

### 1. Install Playwright

Playwright is already installed as a dependency. To install the browser binaries:

```bash
npx playwright install chromium
```

This will download the Chromium browser binary (~200MB) needed for headless operations.

### 2. Verify Installation

Check that Playwright is installed correctly:

```bash
npx playwright --version
```

You should see output like: `Version 1.40.0`

## Configuration

### Environment Variables

Add the following variables to your `.env` file:

```bash
# Enable headless browser for JavaScript-rendered content
BROWSER_ENABLED=true

# Browser timeout in milliseconds (default: 30000)
BROWSER_TIMEOUT=30000

# Page load timeout in milliseconds (default: 15000)
BROWSER_PAGE_TIMEOUT=15000

# Maximum concurrent browser instances (default: 5)
BROWSER_MAX_CONCURRENT=5

# Resource blocking for memory optimization
BROWSER_BLOCK_IMAGES=true
BROWSER_BLOCK_CSS=true
BROWSER_BLOCK_FONTS=true

# Headless mode (default: true)
BROWSER_HEADLESS=true
```

### Configuration Options

#### BROWSER_ENABLED
- **Type**: boolean
- **Default**: `true`
- **Description**: Enable or disable headless browser mode. When disabled, falls back to static HTML fetching.

#### BROWSER_TIMEOUT
- **Type**: number (milliseconds)
- **Default**: `30000` (30 seconds)
- **Range**: 1000-60000
- **Description**: Maximum time for browser operations before timeout.

#### BROWSER_PAGE_TIMEOUT
- **Type**: number (milliseconds)
- **Default**: `15000` (15 seconds)
- **Range**: 1000-30000
- **Description**: Maximum time to wait for page load events.

#### BROWSER_MAX_CONCURRENT
- **Type**: number
- **Default**: `5`
- **Range**: 1-10
- **Description**: Maximum number of concurrent browser instances. Limits memory usage.

#### BROWSER_BLOCK_IMAGES
- **Type**: boolean
- **Default**: `true`
- **Description**: Block image loading to reduce memory usage (~60% reduction).

#### BROWSER_BLOCK_CSS
- **Type**: boolean
- **Default**: `true`
- **Description**: Block CSS loading to reduce memory usage (~20% reduction).

#### BROWSER_BLOCK_FONTS
- **Type**: boolean
- **Default**: `true`
- **Description**: Block font loading to reduce memory usage (~10% reduction).

#### BROWSER_HEADLESS
- **Type**: boolean
- **Default**: `true`
- **Description**: Run browser in headless mode. Set to `false` for debugging (shows browser window).

## Usage

### Programmatic Usage

```typescript
import { getBrowserConfig, isBrowserEnabled } from './lib/engine/browser-config';

// Check if browser is enabled
if (isBrowserEnabled()) {
  // Get configuration
  const config = getBrowserConfig();
  
  console.log('Browser timeout:', config.browserTimeout);
  console.log('Max concurrent:', config.maxConcurrentBrowsers);
  console.log('User agents:', config.userAgents);
}
```

### Default Configuration

The system provides sensible defaults optimized for memory efficiency and bot detection evasion:

- **User-Agent Pool**: 4 modern desktop browsers (Chrome, Firefox, Safari)
- **Viewport Sizes**: Common desktop resolutions (1920x1080, 1366x768, 1536x864)
- **Resource Blocking**: All resources blocked by default
- **Stealth Mode**: Webdriver masking and viewport randomization enabled
- **Connection Pool**: Maximum 5 concurrent browsers

## Memory Optimization

The browser service is optimized for memory efficiency:

1. **Resource Blocking**: Disabling images, CSS, and fonts reduces memory by ~90%
2. **Connection Pooling**: Limits concurrent browsers to prevent memory exhaustion
3. **Context Cleanup**: Browser contexts are closed immediately after use
4. **Timeout Management**: Aggressive timeouts prevent hung processes

### Memory Usage Estimates

- **Static Fetching**: ~10MB per request
- **Browser (with blocking)**: ~50MB per request
- **Browser (without blocking)**: ~200MB per request

## Troubleshooting

### Browser Binary Not Found

If you see errors about missing browser binaries:

```bash
npx playwright install chromium --force
```

### Permission Errors (Linux/Mac)

If you encounter permission errors:

```bash
sudo npx playwright install chromium
```

### Memory Issues

If you experience memory issues:

1. Reduce `BROWSER_MAX_CONCURRENT` to 2-3
2. Ensure resource blocking is enabled
3. Increase server RAM to 4GB+

### Timeout Errors

If pages frequently timeout:

1. Increase `BROWSER_PAGE_TIMEOUT` to 20000-30000
2. Check network connectivity
3. Verify target site is accessible

## Testing

Run the property-based tests to verify configuration:

```bash
npm test -- lib/engine/__tests__/browser-config.property.test.ts --run
```

This will run 100+ test iterations to verify:
- Configuration loading
- Environment variable handling
- Default values
- Valid ranges
- Logging requirements

## Production Deployment

### Server Requirements

- **CPU**: 2+ cores recommended
- **RAM**: 4GB minimum, 8GB recommended
- **Disk**: 500MB for browser binaries
- **OS**: Linux (Ubuntu 20.04+), macOS, or Windows Server

### Docker Deployment

If deploying with Docker, ensure Playwright dependencies are installed:

```dockerfile
FROM node:18

# Install Playwright dependencies
RUN npx playwright install-deps chromium

# Install Playwright browsers
RUN npx playwright install chromium

# Copy application
COPY . /app
WORKDIR /app

# Install dependencies
RUN npm install

# Start application
CMD ["npm", "start"]
```

### Monitoring

Monitor these metrics in production:

1. **Browser Success Rate**: % of audits using browser vs fallback
2. **Memory Usage**: Track per-request memory consumption
3. **Timeout Rate**: % of requests that timeout
4. **Error Codes**: Track ERR_CSR_TIMEOUT, ERR_WAF_BLOCK, etc.

## Security Considerations

1. **Sandboxing**: Browsers run in sandboxed mode by default
2. **Resource Limits**: Connection pooling prevents resource exhaustion
3. **Timeout Protection**: Aggressive timeouts prevent hung processes
4. **User-Agent Rotation**: Reduces fingerprinting risk

## Next Steps

After setup is complete:

1. Implement BrowserService class (Task 2)
2. Integrate with ExtractionEngine (Task 5)
3. Add comprehensive logging (Task 10)
4. Run integration tests (Task 11)

## Support

For issues or questions:

1. Check the [Design Document](.kiro/specs/geo-audit-engine-hardening/design.md)
2. Review [Requirements](.kiro/specs/geo-audit-engine-hardening/requirements.md)
3. Run property tests to verify configuration
