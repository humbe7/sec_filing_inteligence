/**
 * Structured logger for SEC Filing Intelligence Actor
 */

export interface LogContext {
  runId?: string;
  ticker?: string;
  cik?: string;
  form?: string;
  accessionNumber?: string;
  phase?: string;
  [key: string]: string | number | boolean | undefined;
}

export enum LogLevel {
  DEBUG = 'DEBUG',
  INFO = 'INFO',
  WARN = 'WARN',
  ERROR = 'ERROR',
}

export class Logger {
  private context: LogContext = {};

  constructor(initialContext: LogContext = {}) {
    this.context = initialContext;
  }

  withContext(context: Partial<LogContext>): Logger {
    const logger = new Logger({ ...this.context, ...context });
    return logger;
  }

  private formatLog(level: LogLevel, message: string, data?: unknown): void {
    const timestamp = new Date().toISOString();
    const log: Record<string, unknown> = {
      timestamp,
      level,
      message,
      ...this.context,
    };
    if (data) {
      log.data = this.serializeError(data);
    }
    console.log(JSON.stringify(log));
  }

  debug(message: string, data?: unknown): void {
    this.formatLog(LogLevel.DEBUG, message, data);
  }

  info(message: string, data?: unknown): void {
    this.formatLog(LogLevel.INFO, message, data);
  }

  warn(message: string, data?: unknown): void {
    this.formatLog(LogLevel.WARN, message, data);
  }

  error(message: string, error?: Error | unknown): void {
    this.formatLog(LogLevel.ERROR, message, error);
  }

  private serializeError(data: unknown): unknown {
    return data instanceof Error
      ? {
          errorName: data.name,
          errorMessage: data.message,
          errorStack: data.stack,
        }
      : data;
  }
}

export const createLogger = (context?: LogContext): Logger => new Logger(context);
