import nacl from 'tweetnacl';
import { encodeBase64, decodeBase64, encodeUTF8, decodeUTF8 } from 'tweetnacl-util';

let keyPair: nacl.BoxKeyPair | null = null;

export function initKeyPair(): nacl.BoxKeyPair {
  if (!keyPair) {
    keyPair = nacl.box.keyPair();
  }
  return keyPair;
}

export function getPublicKey(): string {
  const kp = initKeyPair();
  return encodeBase64(kp.publicKey);
}

export function encrypt(
  message: string,
  recipientPublicKey: string,
): { nonce: string; ciphertext: string } {
  const kp = initKeyPair();
  const nonce = nacl.randomBytes(nacl.box.nonceLength);
  const messageBytes = decodeUTF8(message);
  const recipientKeyBytes = decodeBase64(recipientPublicKey);

  const ciphertext = nacl.box(messageBytes, nonce, recipientKeyBytes, kp.secretKey);

  return {
    nonce: encodeBase64(nonce),
    ciphertext: encodeBase64(ciphertext),
  };
}

export function decrypt(
  ciphertext: string,
  nonce: string,
  senderPublicKey: string,
): string | null {
  const kp = initKeyPair();
  const ciphertextBytes = decodeBase64(ciphertext);
  const nonceBytes = decodeBase64(nonce);
  const senderKeyBytes = decodeBase64(senderPublicKey);

  const decrypted = nacl.box.open(ciphertextBytes, nonceBytes, senderKeyBytes, kp.secretKey);
  if (!decrypted) return null;

  return encodeUTF8(decrypted);
}
