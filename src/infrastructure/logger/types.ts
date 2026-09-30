export interface LogFields {
  [key: string]: unknown;
}

export interface ILogger {
  info(fields: LogFields | string, message?: string): void;
  warn(fields: LogFields | string, message?: string): void;
  error(fields: LogFields | string, message?: string): void;
  debug(fields: LogFields | string, message?: string): void;
  child(fields: LogFields): ILogger;
}
