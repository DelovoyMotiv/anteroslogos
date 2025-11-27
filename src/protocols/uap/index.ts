/**
 * Universal Agent Protocol (UAP) v1.0
 * Main export module
 * 
 * @module src/protocols/uap
 * @version 1.0.0
 */

// Constants
export * from './constants';

// Types
export * from './types';

// Schemas
export * from './schemas';

// Server (selective export to avoid conflicts)
export { startUAPServer, stopUAPServer, getUAPServer } from './server';

// Discovery
export * from './discovery';

// Transport (selective export)
export { UAPServer } from './transport/uapServer';
export type { MessageContext, RouteConfig } from './transport/messageRouter';

// Client (selective export to avoid ConnectionState conflict)
export { UAPClient } from './client/uapClient';
export { ConnectionManager } from './client/connectionManager';
export { SessionManager } from './client/sessionManager';

// Re-export for convenience
export {
  UAP_VERSION,
  UAP_PROTOCOL_ID,
  UAPErrorCode,
  UAPMessageType,
  TRUST_CONFIG,
  ENDPOINTS,
} from './constants';

export type {
  DIDString,
  UAPMessage,
  UAPHeader,
  TrustAttestation,
  HandshakeSYNPayload,
  HandshakeACKPayload,
  AgentCapabilities,
} from './types';
