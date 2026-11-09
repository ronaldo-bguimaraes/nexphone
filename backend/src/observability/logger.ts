import pino, { type DestinationStream, type Logger } from "pino";

const REDACT_PATHS = [
  "token",
  "code",
  "password",
  "authorization",
  "req.headers.authorization",
  "*.token",
  "*.code",
  "*.tokenHash",
  "*.codeHash",
  "*.password",
  "pairingCode",
  "sessionToken",
];

export function createLogger(level = "info", destination?: DestinationStream): Logger {
  const options = {
    level,
    base: undefined,
    timestamp: pino.stdTimeFunctions.isoTime,
    redact: {
      paths: REDACT_PATHS,
      censor: "[redacted]",
    },
    formatters: {
      level(label: string) {
        return { level: label };
      },
    },
  };
  return destination ? pino(options, destination) : pino(options);
}

export function createSilentLogger(): Logger {
  return pino({ level: "silent" });
}
