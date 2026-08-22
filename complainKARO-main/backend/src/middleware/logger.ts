import { Request, Response, NextFunction } from 'express';

/**
 * Structured JSON request logger.
 * Logs method, path, status, and latency for every request.
 */
export function requestLogger(req: Request, res: Response, next: NextFunction): void {
  const startTime = Date.now();
  const { method, path, ip } = req;

  res.on('finish', () => {
    const latencyMs = Date.now() - startTime;
    console.log(JSON.stringify({
      level: res.statusCode >= 500 ? 'error' : res.statusCode >= 400 ? 'warn' : 'info',
      stage: 'http',
      method,
      path,
      status: res.statusCode,
      latency_ms: latencyMs,
      ip,
      user_id: (req as any).user?.userId,
      role: (req as any).user?.role,
    }));
  });

  next();
}
