import nacl from 'tweetnacl';

let serverKeyPair: nacl.BoxKeyPair | null = null;

export async function initEncrypt(): Promise<void> {
  serverKeyPair = nacl.box.keyPair();
}

export function getServerPublicKey(): Uint8Array {
  if (!serverKeyPair) throw new Error('Encryption not initialized');
  return serverKeyPair.publicKey;
}

export function decryptMessage(
  ciphertext: Uint8Array,
  nonce: Uint8Array,
  senderPublicKey: Uint8Array,
): Uint8Array | null {
  if (!serverKeyPair) throw new Error('Encryption not initialized');
  return nacl.box.open(ciphertext, nonce, senderPublicKey, serverKeyPair.secretKey) ?? null;
}

export function encryptMessage(
  message: Uint8Array,
  nonce: Uint8Array,
  recipientPublicKey: Uint8Array,
): Uint8Array {
  if (!serverKeyPair) throw new Error('Encryption not initialized');
  return nacl.box(message, nonce, recipientPublicKey, serverKeyPair.secretKey);
}
