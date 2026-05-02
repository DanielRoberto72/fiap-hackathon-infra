import pino, { type LoggerOptions } from 'pino';

export interface BuildLoggerOptions {
  serviceName: string;
  level?: pino.LevelWithSilent;
  env?: 'development' | 'test' | 'production';
}

const REDACT_PATHS = [
  'req.headers.authorization',
  'req.headers.cookie',
  'req.headers["x-api-key"]',
  'req.body.password',
  'req.body.token',
  'res.headers["set-cookie"]',
  '*.password',
  '*.apiKey',
  '*.api_key',
  '*.secret',
  '*.token',
  '*.authorization',
  '*.cpf',
];

export function buildLogger(opts: BuildLoggerOptions): pino.Logger {
  const env = opts.env ?? (process.env.NODE_ENV as 'development' | 'test' | 'production' | undefined) ?? 'development';
  const level = opts.level ?? (env === 'production' ? 'info' : 'debug');

  const base: LoggerOptions = {
    name: opts.serviceName,
    level,
    base: {
      service: opts.serviceName,
      env,
    },
    timestamp: pino.stdTimeFunctions.isoTime,
    redact: {
      paths: REDACT_PATHS,
      censor: '[REDACTED]',
    },
    formatters: {
      level: (label) => ({ level: label }),
    },
  };

  if (env === 'development') {
    return pino({
      ...base,
      transport: {
        target: 'pino-pretty',
        options: {
          colorize: true,
          translateTime: 'SYS:HH:MM:ss.l',
          ignore: 'pid,hostname',
        },
      },
    });
  }

  return pino(base);
}
