import { Request, Response, NextFunction } from "express";

// Simple logger implementation - in production you might want to use a library like Winston
const logLevels = {
  error: 0,
  warn: 1,
  info: 2,
  http: 3,
  debug: 4,
};

type LogLevel = keyof typeof logLevels;

const getLogLevel = (): LogLevel => {
  const env = process.env.NODE_ENV || "development";
  const level =
    (process.env.LOG_LEVEL as LogLevel) ||
    (env === "development" ? "debug" : "info");
  return level;
};

const shouldLog = (level: LogLevel): boolean => {
  const currentLevel = getLogLevel();
  return logLevels[level] <= logLevels[currentLevel];
};

const formatLog = (level: LogLevel, message: string, meta?: any): string => {
  const timestamp = new Date().toISOString();
  let logMessage = `${timestamp} [${level.toUpperCase()}] ${message}`;

  if (meta) {
    try {
      const metaString = typeof meta === "object" ? JSON.stringify(meta) : meta;
      logMessage += ` - ${metaString}`;
    } catch (error) {
      logMessage += ` - [Circular or Non-Serializable Data]`;
    }
  }

  return logMessage;
};

export const logger = {
  error: (message: string, meta?: any) => {
    if (shouldLog("error")) {
      console.error(formatLog("error", message, meta));
    }
  },

  warn: (message: string, meta?: any) => {
    if (shouldLog("warn")) {
      console.warn(formatLog("warn", message, meta));
    }
  },

  info: (message: string, meta?: any) => {
    if (shouldLog("info")) {
      console.info(formatLog("info", message, meta));
    }
  },

  http: (message: string, meta?: any) => {
    if (shouldLog("http")) {
      console.log(formatLog("http", message, meta));
    }
  },

  debug: (message: string, meta?: any) => {
    if (shouldLog("debug")) {
      console.debug(formatLog("debug", message, meta));
    }
  },
};

// Middleware for logging HTTP requests
export const requestLogger = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const start = Date.now();

  res.on("finish", () => {
    const duration = Date.now() - start;
    const message = `${req.method} ${req.originalUrl} ${res.statusCode} - ${duration}ms`;

    // Log request details based on status code
    if (res.statusCode >= 500) {
      logger.error(message, {
        body: req.body,
        query: req.query,
        params: req.params,
      });
    } else if (res.statusCode >= 400) {
      logger.warn(message, {
        body: req.body,
        query: req.query,
        params: req.params,
      });
    } else {
      logger.http(message);
    }
  });

  next();
};
