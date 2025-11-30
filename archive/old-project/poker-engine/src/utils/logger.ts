/**
 * Structured logging system for migration debugging
 */

export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  SUCCESS = 2,
  WARN = 3,
  ERROR = 4,
  CRITICAL = 5
}

export enum LogCategory {
  STARTUP = 'STARTUP',
  DATABASE = 'DATABASE',
  MIGRATION = 'MIGRATION',
  GAME = 'GAME',
  SOCKET = 'SOCKET',
  AUTH = 'AUTH',
  API = 'API',
  RECOVERY = 'RECOVERY',
  PERSIST = 'PERSIST',
  EVENT = 'EVENT'
}

interface LogContext {
  [key: string]: any;
}

class StructuredLogger {
  private minLevel: LogLevel;
  private enableColors: boolean;

  constructor() {
    this.minLevel = process.env.LOG_LEVEL === 'debug' ? LogLevel.DEBUG : LogLevel.INFO;
    this.enableColors = process.env.NO_COLOR !== 'true';
  }

  private formatTimestamp(): string {
    const now = new Date();
    return now.toISOString().split('T')[1].slice(0, -1);
  }

  private colorize(text: string, level: LogLevel): string {
    if (!this.enableColors) return text;
    
    const colors: Record<LogLevel, string> = {
      [LogLevel.DEBUG]: '\x1b[90m',
      [LogLevel.INFO]: '\x1b[36m',
      [LogLevel.SUCCESS]: '\x1b[32m',
      [LogLevel.WARN]: '\x1b[33m',
      [LogLevel.ERROR]: '\x1b[31m',
      [LogLevel.CRITICAL]: '\x1b[35m'
    };
    const reset = '\x1b[0m';
    return `${colors[level]}${text}${reset}`;
  }

  private formatContext(context: LogContext): string {
    if (Object.keys(context).length === 0) return '';
    
    const formatted = Object.entries(context)
      .map(([key, value]) => {
        const val = typeof value === 'object' ? JSON.stringify(value) : value;
        return `${key}=${val}`;
      })
      .join(' ');
    
    return ` | ${formatted}`;
  }

  private log(level: LogLevel, category: LogCategory, message: string, context: LogContext = {}): void {
    if (level < this.minLevel) return;

    const timestamp = this.formatTimestamp();
    const levelName = LogLevel[level].padEnd(8);
    const categoryName = category.padEnd(10);
    const contextStr = this.formatContext(context);

    const logLine = `[${timestamp}] ${levelName} [${categoryName}] ${message}${contextStr}`;
    const coloredLine = this.colorize(logLine, level);

    if (level >= LogLevel.ERROR) {
      console.error(coloredLine);
    } else {
      console.log(coloredLine);
    }
  }

  debug(category: LogCategory, message: string, context: LogContext = {}): void {
    this.log(LogLevel.DEBUG, category, message, context);
  }

  info(category: LogCategory, message: string, context: LogContext = {}): void {
    this.log(LogLevel.INFO, category, message, context);
  }

  success(category: LogCategory, message: string, context: LogContext = {}): void {
    this.log(LogLevel.SUCCESS, category, message, context);
  }

  warn(category: LogCategory, message: string, context: LogContext = {}): void {
    this.log(LogLevel.WARN, category, message, context);
  }

  error(category: LogCategory, message: string, context: LogContext = {}): void {
    this.log(LogLevel.ERROR, category, message, context);
  }

  critical(category: LogCategory, message: string, context: LogContext = {}): void {
    this.log(LogLevel.CRITICAL, category, message, context);
  }
}

export const Logger = new StructuredLogger();

