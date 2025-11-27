/**
 * UAP Client SDK
 * Exports all client components
 * 
 * @module src/protocols/uap/client
 * @version 1.0.0
 */

// Main client
export { UAPClient } from './uapClient';
export type { UAPClientConfig, RequestOptions } from './uapClient';

// Connection manager
export { ConnectionManager } from './connectionManager';
export type {
  ConnectionConfig,
  ConnectionState,
  ConnectionMetrics,
} from './connectionManager';

// Session manager
export { SessionManager } from './sessionManager';
export type {
  SessionConfig,
  SessionInfo,
  SessionState,
} from './sessionManager';

// Default export
import { UAPClient as UAPClientClass } from './uapClient';
import { ConnectionManager as ConnectionManagerClass } from './connectionManager';
import { SessionManager as SessionManagerClass } from './sessionManager';

export default {
  UAPClient: UAPClientClass,
  ConnectionManager: ConnectionManagerClass,
  SessionManager: SessionManagerClass,
};
