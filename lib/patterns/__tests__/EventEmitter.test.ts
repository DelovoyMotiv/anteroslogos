/**
 * Tests for Event Emitter (Observer Pattern)
 */

import { describe, it, expect, vi } from 'vitest';
import { TypedEventEmitter, createEventEmitter } from '../EventEmitter';

interface TestEvents {
  'user:created': { id: string; email: string };
  'user:deleted': { id: string };
  'error': Error;
}

describe('TypedEventEmitter', () => {
  describe('on/emit', () => {
    it('should subscribe and emit events', async () => {
      const emitter = new TypedEventEmitter<TestEvents>();
      const handler = vi.fn();

      emitter.on('user:created', handler);
      await emitter.emit('user:created', { id: '123', email: 'test@example.com' });

      expect(handler).toHaveBeenCalledWith({ id: '123', email: 'test@example.com' });
    });

    it('should support multiple handlers', async () => {
      const emitter = new TypedEventEmitter<TestEvents>();
      const handler1 = vi.fn();
      const handler2 = vi.fn();

      emitter.on('user:created', handler1);
      emitter.on('user:created', handler2);
      await emitter.emit('user:created', { id: '123', email: 'test@example.com' });

      expect(handler1).toHaveBeenCalled();
      expect(handler2).toHaveBeenCalled();
    });

    it('should support async handlers', async () => {
      const emitter = new TypedEventEmitter<TestEvents>();
      let executed = false;

      emitter.on('user:created', async () => {
        await new Promise(resolve => setTimeout(resolve, 10));
        executed = true;
      });

      await emitter.emit('user:created', { id: '123', email: 'test@example.com' });
      expect(executed).toBe(true);
    });
  });

  describe('once', () => {
    it('should fire handler only once', async () => {
      const emitter = new TypedEventEmitter<TestEvents>();
      const handler = vi.fn();

      emitter.once('user:created', handler);
      await emitter.emit('user:created', { id: '123', email: 'test@example.com' });
      await emitter.emit('user:created', { id: '456', email: 'test2@example.com' });

      expect(handler).toHaveBeenCalledTimes(1);
    });
  });

  describe('off', () => {
    it('should unsubscribe handler', async () => {
      const emitter = new TypedEventEmitter<TestEvents>();
      const handler = vi.fn();

      emitter.on('user:created', handler);
      emitter.off('user:created', handler);
      await emitter.emit('user:created', { id: '123', email: 'test@example.com' });

      expect(handler).not.toHaveBeenCalled();
    });
  });

  describe('subscription.unsubscribe', () => {
    it('should unsubscribe via subscription object', async () => {
      const emitter = new TypedEventEmitter<TestEvents>();
      const handler = vi.fn();

      const subscription = emitter.on('user:created', handler);
      subscription.unsubscribe();
      await emitter.emit('user:created', { id: '123', email: 'test@example.com' });

      expect(handler).not.toHaveBeenCalled();
    });
  });

  describe('emitSync', () => {
    it('should emit synchronously', () => {
      const emitter = new TypedEventEmitter<TestEvents>();
      const handler = vi.fn();

      emitter.on('user:created', handler);
      emitter.emitSync('user:created', { id: '123', email: 'test@example.com' });

      expect(handler).toHaveBeenCalled();
    });

    it('should not wait for async handlers', () => {
      const emitter = new TypedEventEmitter<TestEvents>();
      let executed = false;

      emitter.on('user:created', async () => {
        await new Promise(resolve => setTimeout(resolve, 100));
        executed = true;
      });

      emitter.emitSync('user:created', { id: '123', email: 'test@example.com' });
      expect(executed).toBe(false); // Not executed yet
    });
  });

  describe('removeAllListeners', () => {
    it('should remove all listeners for event', async () => {
      const emitter = new TypedEventEmitter<TestEvents>();
      const handler1 = vi.fn();
      const handler2 = vi.fn();

      emitter.on('user:created', handler1);
      emitter.on('user:created', handler2);
      emitter.removeAllListeners('user:created');
      await emitter.emit('user:created', { id: '123', email: 'test@example.com' });

      expect(handler1).not.toHaveBeenCalled();
      expect(handler2).not.toHaveBeenCalled();
    });

    it('should remove all listeners for all events', async () => {
      const emitter = new TypedEventEmitter<TestEvents>();
      const handler1 = vi.fn();
      const handler2 = vi.fn();

      emitter.on('user:created', handler1);
      emitter.on('user:deleted', handler2);
      emitter.removeAllListeners();
      
      await emitter.emit('user:created', { id: '123', email: 'test@example.com' });
      await emitter.emit('user:deleted', { id: '123' });

      expect(handler1).not.toHaveBeenCalled();
      expect(handler2).not.toHaveBeenCalled();
    });
  });

  describe('listenerCount', () => {
    it('should return listener count', () => {
      const emitter = new TypedEventEmitter<TestEvents>();

      emitter.on('user:created', () => {});
      emitter.on('user:created', () => {});
      emitter.once('user:created', () => {});

      expect(emitter.listenerCount('user:created')).toBe(3);
    });
  });

  describe('eventNames', () => {
    it('should return all event names', () => {
      const emitter = new TypedEventEmitter<TestEvents>();

      emitter.on('user:created', () => {});
      emitter.on('user:deleted', () => {});

      const names = emitter.eventNames();
      expect(names).toContain('user:created');
      expect(names).toContain('user:deleted');
    });
  });

  describe('error handling', () => {
    it('should capture rejections by default', async () => {
      const emitter = new TypedEventEmitter<TestEvents>();
      const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});

      emitter.on('user:created', async () => {
        throw new Error('Handler error');
      });

      await emitter.emit('user:created', { id: '123', email: 'test@example.com' });

      expect(consoleError).toHaveBeenCalled();
      consoleError.mockRestore();
    });

    it('should throw if captureRejections is false', async () => {
      const emitter = new TypedEventEmitter<TestEvents>({ captureRejections: false });

      emitter.on('user:created', async () => {
        throw new Error('Handler error');
      });

      await expect(
        emitter.emit('user:created', { id: '123', email: 'test@example.com' })
      ).rejects.toThrow('Handler error');
    });
  });

  describe('max listeners warning', () => {
    it('should warn when max listeners exceeded', () => {
      const emitter = new TypedEventEmitter<TestEvents>({ maxListeners: 2 });
      const consoleWarn = vi.spyOn(console, 'warn').mockImplementation(() => {});

      emitter.on('user:created', () => {});
      emitter.on('user:created', () => {});
      emitter.on('user:created', () => {}); // Should warn

      expect(consoleWarn).toHaveBeenCalled();
      consoleWarn.mockRestore();
    });
  });

  describe('createEventEmitter', () => {
    it('should create typed event emitter', async () => {
      const emitter = createEventEmitter<TestEvents>();
      const handler = vi.fn();

      emitter.on('user:created', handler);
      await emitter.emit('user:created', { id: '123', email: 'test@example.com' });

      expect(handler).toHaveBeenCalled();
    });
  });
});
