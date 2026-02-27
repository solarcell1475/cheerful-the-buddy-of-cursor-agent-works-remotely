import { z } from 'zod';

export const EncryptedPayload = z.object({
  nonce: z.string(),
  ciphertext: z.string(),
});
export type EncryptedPayload = z.infer<typeof EncryptedPayload>;

export const KeyExchangeRequest = z.object({
  publicKey: z.string(),
  deviceId: z.string(),
  deviceName: z.string().optional(),
});
export type KeyExchangeRequest = z.infer<typeof KeyExchangeRequest>;

export const KeyExchangeResponse = z.object({
  publicKey: z.string(),
  sessionId: z.string(),
});
export type KeyExchangeResponse = z.infer<typeof KeyExchangeResponse>;

export const EncryptedMessage = z.object({
  id: z.string(),
  sessionId: z.string(),
  payload: EncryptedPayload,
  timestamp: z.number(),
});
export type EncryptedMessage = z.infer<typeof EncryptedMessage>;
