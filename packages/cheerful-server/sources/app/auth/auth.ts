import type { FastifyRequest } from 'fastify';
import { db } from '../../storage/db';

export interface AuthUser {
  id: string;
  email: string | null;
}

export const auth = {
  async init(): Promise<void> {
    // Initialize auth module - token validation, key rotation, etc.
  },

  async authenticate(request: FastifyRequest): Promise<AuthUser | null> {
    const authHeader = request.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) return null;

    const token = authHeader.slice(7);
    const user = await db.user.findUnique({ where: { token } });
    if (!user) return null;

    return { id: user.id, email: user.email };
  },
};
