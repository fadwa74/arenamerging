const SESSION_LIMITS = {
  video: 5,
  image: 20,
  text: 50,
  tts: 20,
};

export const sessionGenerateLimit = (type) => (req, res, next) => {
  if (!req.session) return next();

  // initialise counts object if first request
  req.session.generateCounts = req.session.generateCounts || {};

  const limit = SESSION_LIMITS[type];
  const current = req.session.generateCounts[type] || 0;

  if (current >= limit) {
    return res.status(429).json({
      success: false,
      error: `Session limit reached for ${type} generation (${limit} per session)`,
    });
  }

  req.session.generateCounts[type]++;
  next();
};
