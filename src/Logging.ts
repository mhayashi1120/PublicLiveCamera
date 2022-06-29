// This `Logging` module provides to server side program logging output to stdout, stderr

export interface LoggingSettings {
  level: 'verbose' | 'debug' | 'info';
}

let loggingSettings: LoggingSettings = {
  level: 'info',
};

export function OpenLogging(opts?: LoggingSettings) {
  loggingSettings = opts || {
    level: 'info',
  };
}

export function INFO(... args: any[]) {
  console.log('[INFO]', ...args);
}

export function D(... args: any[]) {
  if (!['verbose', 'debug'].includes(loggingSettings.level)) {
    return;
  }

  console.debug('[DEBUG]', ...args);
}

export function VERB(... args: any[]) {
  if (!['verbose'].includes(loggingSettings.level)) {
    return;
  }

  console.debug('[VERB]', ...args);
}

export function WARN(... args: any[]) {
  console.warn('[WARN]', ...args);
}

export function ERROR(... args: any[]) {
  console.error('[ERROR]', ...args);
}
