import { toNextJsHandler } from 'better-auth/next-js';
import { auth } from '@/modules/auth/infrastructure';

export const { GET, POST } = toNextJsHandler(auth);
