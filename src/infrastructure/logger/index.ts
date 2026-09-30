import pino from 'pino';
import type { ILogger } from './types';

const logger: ILogger = pino({});

export { logger };
export type { ILogger };
