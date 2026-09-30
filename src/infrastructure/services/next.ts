import { createRequestContext } from '@/infrastructure/context/next-factory';
import { createWithAuth } from './base';

export const withAuth = createWithAuth(createRequestContext);
