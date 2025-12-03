/**
 * Tests for Config Builder Pattern
 */

import { describe, it, expect } from 'vitest';
import {
  PoolConfigBuilder,
  SandboxConfigBuilder,
  RoutingOptionsBuilder,
  CircuitBreakerConfigBuilder,
  RetryConfigBuilder,
} from '../ConfigBuilder';

describe('PoolConfigBuilder', () => {
  it('should build config with defaults', () => {
    const config = new PoolConfigBuilder().build();

    expect(config.minConnections).toBe(2);
    expect(config.maxConnections).toBe(10);
    expect(config.idleTimeoutMs).toBe(30000);
  });

  it('should build config with custom values', () => {
    const config = new PoolConfigBuilder()
      .setMinConnections(5)
      .setMaxConnections(20)
      .setIdleTimeout(60000)
      .build();

    expect(config.minConnections).toBe(5);
    expect(config.maxConnections).toBe(20);
    expect(config.idleTimeoutMs).toBe(60000);
  });

  it('should build config for specific plan', () => {
    const config = new PoolConfigBuilder().forPlan('pro').build();

    expect(config.minConnections).toBe(5);
    expect(config.maxConnections).toBe(20);
  });

  it('should validate min connections', () => {
    expect(() => {
      new PoolConfigBuilder().setMinConnections(0);
    }).toThrow('Minimum connections must be at least 1');
  });

  it('should validate max connections', () => {
    expect(() => {
      new PoolConfigBuilder()
        .setMinConnections(10)
        .setMaxConnections(5);
    }).toThrow('Maximum connections must be >= minimum connections');
  });

  it('should reset builder', () => {
    const builder = new PoolConfigBuilder()
      .setMinConnections(5)
      .reset();

    const config = builder.build();
    expect(config.minConnections).toBe(2); // Default
  });
});

describe('SandboxConfigBuilder', () => {
  it('should build config with defaults', () => {
    const config = new SandboxConfigBuilder().build();

    expect(config.memoryLimitMB).toBe(256);
    expect(config.cpuTimeoutMs).toBe(2000);
    expect(config.enableSignatureVerification).toBe(true);
  });

  it('should build lightweight config', () => {
    const config = new SandboxConfigBuilder().forLightweight().build();

    expect(config.memoryLimitMB).toBe(64);
    expect(config.cpuTimeoutMs).toBe(1000);
    expect(config.enableSignatureVerification).toBe(false);
  });

  it('should build enterprise config', () => {
    const config = new SandboxConfigBuilder().forEnterprise().build();

    expect(config.memoryLimitMB).toBe(256);
    expect(config.enableSignatureVerification).toBe(true);
    expect(config.enableBillingHooks).toBe(true);
  });

  it('should validate memory limit', () => {
    expect(() => {
      new SandboxConfigBuilder().setMemoryLimit(1000);
    }).toThrow('Memory limit must be between 32MB and 512MB');
  });

  it('should validate CPU timeout', () => {
    expect(() => {
      new SandboxConfigBuilder().setCpuTimeout(10000);
    }).toThrow('CPU timeout must be between 100ms and 5000ms');
  });
});

describe('RoutingOptionsBuilder', () => {
  it('should build options with defaults', () => {
    const options = new RoutingOptionsBuilder().build();

    expect(options.maxHops).toBe(3);
    expect(options.minTrustScore).toBe(50);
    expect(options.maxCost).toBe(1.0);
  });

  it('should build high-trust options', () => {
    const options = new RoutingOptionsBuilder().forHighTrust().build();

    expect(options.minTrustScore).toBe(80);
    expect(options.maxHops).toBe(2);
  });

  it('should build cost-optimized options', () => {
    const options = new RoutingOptionsBuilder().forCostOptimized().build();

    expect(options.maxCost).toBe(0.1);
    expect(options.maxHops).toBe(5);
  });

  it('should add preferred nodes', () => {
    const options = new RoutingOptionsBuilder()
      .addPreferredNode('node1')
      .addPreferredNode('node2')
      .build();

    expect(options.preferredNodes).toEqual(['node1', 'node2']);
  });

  it('should validate trust score', () => {
    expect(() => {
      new RoutingOptionsBuilder().setMinTrustScore(150);
    }).toThrow('Trust score must be between 0 and 100');
  });
});

describe('CircuitBreakerConfigBuilder', () => {
  it('should build config with defaults', () => {
    const config = new CircuitBreakerConfigBuilder().build();

    expect(config.failureThreshold).toBe(5);
    expect(config.timeout).toBe(60000);
    expect(config.successThreshold).toBe(2);
  });

  it('should build aggressive config', () => {
    const config = new CircuitBreakerConfigBuilder().forAggressive().build();

    expect(config.failureThreshold).toBe(3);
    expect(config.timeout).toBe(30000);
  });

  it('should build lenient config', () => {
    const config = new CircuitBreakerConfigBuilder().forLenient().build();

    expect(config.failureThreshold).toBe(10);
    expect(config.timeout).toBe(120000);
  });

  it('should set callbacks', () => {
    let opened = false;
    const config = new CircuitBreakerConfigBuilder()
      .onOpen(() => { opened = true; })
      .build();

    expect(config.onOpen).toBeDefined();
    config.onOpen!();
    expect(opened).toBe(true);
  });
});

describe('RetryConfigBuilder', () => {
  it('should build config with defaults', () => {
    const config = new RetryConfigBuilder().build();

    expect(config.maxAttempts).toBe(3);
    expect(config.baseDelay).toBe(1000);
    expect(config.jitter).toBe(true);
  });

  it('should build aggressive config', () => {
    const config = new RetryConfigBuilder().forAggressive().build();

    expect(config.maxAttempts).toBe(5);
    expect(config.baseDelay).toBe(500);
  });

  it('should build conservative config', () => {
    const config = new RetryConfigBuilder().forConservative().build();

    expect(config.maxAttempts).toBe(2);
    expect(config.baseDelay).toBe(2000);
  });

  it('should add retryable errors', () => {
    const config = new RetryConfigBuilder()
      .setRetryableErrors([])
      .addRetryableError('CUSTOM_ERROR')
      .build();

    expect(config.retryableErrors).toContain('CUSTOM_ERROR');
  });

  it('should validate exponential base', () => {
    expect(() => {
      new RetryConfigBuilder().setExponentialBase(1);
    }).toThrow('Exponential base must be > 1');
  });
});
