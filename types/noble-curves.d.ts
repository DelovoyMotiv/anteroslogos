// Type declarations for @noble/curves/ed25519.js
declare module '@noble/curves/ed25519.js' {
  export const ed25519: {
    sign(message: Uint8Array, privateKey: Uint8Array): Uint8Array;
    verify(signature: Uint8Array, message: Uint8Array, publicKey: Uint8Array): boolean;
    getPublicKey(privateKey: Uint8Array): Uint8Array;
  };
}
