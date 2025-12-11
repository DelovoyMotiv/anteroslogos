# Browser Configuration Guide

This document describes the browser configuration system for the GEO Audit Engine's headless browser functionality.

## Overview

The browser configuration system provides flexible control over headless browser behavior through:
- Default configuration values optimized for production use
- Environment variable overrides for deployment-specific settings
- Programmatic overrides for testing and custom scenarios
- Comprehensive validation to catch configuration errors early

## Configuration Options

### User-Agent Pool

**Field**: `userAgents: string[]`

**Description**: Array of User-Agent strings to rotate through for bot detection evasion.

**Default**: 4 modern desktop browser User-Agents (Chrome, Firefox, Safari)

**Validation**:
- Must be a non-empty array
- Each User-Agent must be a non-empty string

**Example**:
```typescript
userAgents: [
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
]
```

### Viewport Sizes

**Field**: `viewportSizes: Array<{ width: number; height: number }>`

**Description**: Array of viewport dimensions to rotate through for bot detection evasion.

**Default**: 3 common desktop resolutions (1920x1080, 1366x768, 1536x864)

**Validation**:
- Must be a non-empty array
- Width must be between 320 and 3840 pixels
- Height must be between 240 and 2160 pixels

**Example**:
```typescript
viewportSizes: [
  { width: 1920, height: 1080 },
  { width: 1366, height: 768 },
]
```

### Resource Blocking

**Field**: `blockResources: { images, stylesheets, fonts, media }`

**Description**: Controls which resource types are blocked to reduce memory usage and improve performance.

**Default**: All resource types blocked (true)

**Environment Variables**:
- `BROWSER_BLOCK_IMAGES` - Block image loading (default: true)
- `BROWSER_BLOCK_CSS` - Block CSS loading (default: true)
- `BROWSER_BLOCK_FONTS` - Block font loading (default: true)
- `BROWSER_BLOCK_MEDIA` - Block media loading (default: true)

**Validation**: Each field must be a boolean

**Example**:
```typescript
blockResources: {
  images: true,      // Block images
  stylesheets: true, // Block CSS
  fonts: true,       // Block fonts
  media: true,       // Block video/audio
}
```

**Environment Example**:
```bash
BROWSER_BLOCK_IMAGES=false  # Allow images
BROWSER_BLOCK_CSS=true      # Block CSS
```

### Stealth Settings

**Field**: `stealth: { maskWebdriver, randomizeViewport, injectMouseMovement }`

**Description**: Controls anti-detection techniques to evade bot detection systems.

**Default**:
- `maskWebdriver`: true (sets navigator.webdriver = false)
- `randomizeViewport`: true (adds ±50px variation to viewport)
- `injectMouseMovement`: false (not implemented in MVP)

**Environment Variables**:
- `BROWSER_MASK_WEBDRIVER` - Mask navigator.webdriver property (default: true)
- `BROWSER_RANDOMIZE_VIEWPORT` - Randomize viewport dimensions (default: true)

**Validation**: Each field must be a boolean

**Example**:
```typescript
stealth: {
  maskWebdriver: true,
  randomizeViewport: true,
  injectMouseMovement: false,
}
```

### Performance Settings

#### Max Concurrent Browsers

**Field**: `maxConcurrentBrowsers: number`

**Description**: Maximum number of browser instances in the connection pool.

**Default**: 5

**Environment Variable**: `BROWSER_MAX_CONCURRENT`

**Validation**: Must be between 1 and 20

**Example**:
```bash
BROWSER_MAX_CONCURRENT=10  # Allow up to 10 concurrent browsers
```

#### Browser Timeout

**Field**: `browserTimeout: number` (milliseconds)

**Description**: Timeout for browser instance operations.

**Default**: 30000 (30 seconds)

**Environment Variable**: `BROWSER_TIMEOUT`

**Validation**: Must be between 1000 and 300000 ms (1-300 seconds)

**Example**:
```bash
BROWSER_TIMEOUT=60000  # 60 second timeout
```

#### Page Load Timeout

**Field**: `pageLoadTimeout: number` (milliseconds)

**Description**: Timeout for page navigation and loading.

**Default**: 15000 (15 seconds)

**Environment Variable**: `BROWSER_PAGE_TIMEOUT`

**Validation**: Must be between 1000 and 300000 ms (1-300 seconds)

**Example**:
```bash
BROWSER_PAGE_TIMEOUT=30000  # 30 second page load timeout
```

## Browser Mode Control

**Environment Variable**: `BROWSER_ENABLED`

**Description**: Master switch to enable/disable browser mode entirely.

**Default**: true (enabled)

**Values**:
- `true`, `1`, `yes` - Enable browser mode
- `false`, `0`, `no` - Disable browser mode (fallback to static fetching)

**Example**:
```bash
BROWSER_ENABLED=false  # Disable browser mode, use static fetching only
```

## Usage Examples

### Using Default Configuration

```typescript
import { getBrowserConfig } from './browser-config';

const config = getBrowserConfig();
// Uses defaults + environment variable overrides
```

### Using Configuration Overrides (Testing)

```typescript
import { getBrowserConfigWithOverrides } from './browser-config';

const config = getBrowserConfigWithOverrides({
  maxConcurrentBrowsers: 2,
  pageLoadTimeout: 5000,
  blockResources: {
    images: false, // Allow images for this test
  },
});
```

### Checking Browser Mode Status

```typescript
import { isBrowserEnabled } from './browser-config';

if (isBrowserEnabled()) {
  // Use browser-based extraction
} else {
  // Use static fetching
}
```

### Handling Configuration Errors

```typescript
import { getBrowserConfig, BrowserConfigurationError } from './browser-config';

try {
  const config = getBrowserConfig();
} catch (error) {
  if (error instanceof BrowserConfigurationError) {
    console.error(`Configuration error in ${error.field}: ${error.message}`);
  }
}
```

## Environment Variable Reference

| Variable | Type | Default | Range | Description |
|----------|------|---------|-------|-------------|
| `BROWSER_ENABLED` | boolean | true | - | Enable/disable browser mode |
| `BROWSER_TIMEOUT` | number | 30000 | 1000-300000 | Browser instance timeout (ms) |
| `BROWSER_PAGE_TIMEOUT` | number | 15000 | 1000-300000 | Page load timeout (ms) |
| `BROWSER_MAX_CONCURRENT` | number | 5 | 1-20 | Max concurrent browsers |
| `BROWSER_BLOCK_IMAGES` | boolean | true | - | Block image loading |
| `BROWSER_BLOCK_CSS` | boolean | true | - | Block CSS loading |
| `BROWSER_BLOCK_FONTS` | boolean | true | - | Block font loading |
| `BROWSER_BLOCK_MEDIA` | boolean | true | - | Block media loading |
| `BROWSER_MASK_WEBDRIVER` | boolean | true | - | Mask navigator.webdriver |
| `BROWSER_RANDOMIZE_VIEWPORT` | boolean | true | - | Randomize viewport sizes |

## Production Deployment

### Recommended Settings

For production deployments, use these environment variables:

```bash
# Enable browser mode
BROWSER_ENABLED=true

# Conservative timeouts for reliability
BROWSER_TIMEOUT=30000
BROWSER_PAGE_TIMEOUT=15000

# Moderate concurrency for memory efficiency
BROWSER_MAX_CONCURRENT=5

# Block resources for memory efficiency
BROWSER_BLOCK_IMAGES=true
BROWSER_BLOCK_CSS=true
BROWSER_BLOCK_FONTS=true
BROWSER_BLOCK_MEDIA=true

# Enable stealth features
BROWSER_MASK_WEBDRIVER=true
BROWSER_RANDOMIZE_VIEWPORT=true
```

### High-Traffic Settings

For high-traffic scenarios with adequate server resources:

```bash
BROWSER_MAX_CONCURRENT=10
BROWSER_TIMEOUT=60000
BROWSER_PAGE_TIMEOUT=30000
```

### Memory-Constrained Settings

For memory-constrained environments:

```bash
BROWSER_MAX_CONCURRENT=2
BROWSER_BLOCK_IMAGES=true
BROWSER_BLOCK_CSS=true
BROWSER_BLOCK_FONTS=true
BROWSER_BLOCK_MEDIA=true
```

### Development Settings

For local development and testing:

```bash
BROWSER_ENABLED=true
BROWSER_MAX_CONCURRENT=2
BROWSER_TIMEOUT=60000
BROWSER_PAGE_TIMEOUT=30000
# Allow resources for visual debugging
BROWSER_BLOCK_IMAGES=false
BROWSER_BLOCK_CSS=false
```

## Validation Rules

The configuration system validates all settings to prevent runtime errors:

1. **User-Agents**: Must be non-empty array of non-empty strings
2. **Viewports**: Must be non-empty array with valid dimensions (320-3840 x 240-2160)
3. **Resource Blocking**: All fields must be booleans
4. **Stealth Settings**: All fields must be booleans
5. **Max Concurrent**: Must be between 1 and 20
6. **Timeouts**: Must be between 1000 and 300000 ms

Invalid configurations throw `BrowserConfigurationError` with details about the invalid field.

## Testing Support

The configuration system provides special support for testing:

### Override Configuration

```typescript
import { getBrowserConfigWithOverrides } from './browser-config';

// Test with custom settings
const testConfig = getBrowserConfigWithOverrides({
  maxConcurrentBrowsers: 1,
  pageLoadTimeout: 5000,
});
```

### Disable Browser Mode

```typescript
// Set environment variable before tests
process.env.BROWSER_ENABLED = 'false';

import { isBrowserEnabled } from './browser-config';
expect(isBrowserEnabled()).toBe(false);
```

### Test Configuration Validation

```typescript
import { validateBrowserConfig, BrowserConfigurationError } from './browser-config';

const invalidConfig = {
  maxConcurrentBrowsers: 100, // Too high
  // ... other fields
};

expect(() => validateBrowserConfig(invalidConfig))
  .toThrow(BrowserConfigurationError);
```

## Troubleshooting

### Configuration Validation Errors

If you see `BrowserConfigurationError`, check:
1. Environment variable values are within valid ranges
2. Boolean environment variables use valid values (true/false/1/0/yes/no)
3. Numeric environment variables are valid integers

### Browser Not Launching

If browsers fail to launch:
1. Check `BROWSER_ENABLED` is not set to false
2. Verify Playwright is installed: `npx playwright install chromium`
3. Check server has sufficient memory for `maxConcurrentBrowsers`

### Memory Issues

If experiencing memory issues:
1. Reduce `BROWSER_MAX_CONCURRENT`
2. Enable all resource blocking options
3. Reduce `BROWSER_TIMEOUT` and `BROWSER_PAGE_TIMEOUT`

### Timeout Issues

If pages frequently timeout:
1. Increase `BROWSER_PAGE_TIMEOUT`
2. Increase `BROWSER_TIMEOUT`
3. Check network connectivity to target sites

## See Also

- [Browser Setup Guide](./BROWSER_SETUP.md) - Installation and setup instructions
- [Error Handler Usage](./ERROR_HANDLER_USAGE.md) - Error handling and retry logic
- [Design Document](../../.kiro/specs/geo-audit-engine-hardening/design.md) - Architecture overview
