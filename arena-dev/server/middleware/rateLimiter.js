import rateLimit, { ipKeyGenerator } from "express-rate-limit";

export const createRateLimiter = ({ max, windowMinutes, message }) =>
  rateLimit({
    windowMs: windowMinutes * 60 * 1000,
    max,
    keyGenerator: (req) => {
      if (req.sessionID) return `sid:${req.sessionID}`;
      return `ip:${ipKeyGenerator(req)}`;
    },
    standardHeaders: true,
    legacyHeaders: false,
    message: { success: false, error: message },
  });

export const videoLimiter = createRateLimiter({
  max: 3,
  windowMinutes: 60,
  message: "Too many generation requests, try again in an hour",
});
export const imageLimiter = createRateLimiter({
  max: 5,
  windowMinutes: 60,
  message: "Too many generation requests, try again in an hour",
});
export const ttsLimiter = createRateLimiter({
  max: 5,
  windowMinutes: 60,
  message: "Too many generation requests, try again in an hour",
});
export const textLimiter = createRateLimiter({
  max: 10,
  windowMinutes: 60,
  message: "Too many generation requests, try again in an hour",
});
