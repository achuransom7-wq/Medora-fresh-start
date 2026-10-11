const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
  throw new Error('JWT_SECRET must be set in environment variables');
}
if (process.env.NODE_ENV === 'production' && Buffer.byteLength(JWT_SECRET, 'utf8') < 32) {
  throw new Error('JWT_SECRET must be at least 32 bytes in production');
}

function authenticate(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Missing or invalid authorization header' });
  }

  const token = authHeader.split(' ')[1];
  try {
    const payload = jwt.verify(token, JWT_SECRET, { algorithms: ['HS256'] });
    if (payload.type !== 'access') {
      return res.status(401).json({ error: 'Invalid access token' });
    }
    req.userId = payload.sub;
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
}

function signAccessToken(userId) {
  return jwt.sign({ sub: userId, type: 'access' }, JWT_SECRET, { expiresIn: '15m', algorithm: 'HS256' });
}

function signRefreshToken(userId) {
  return jwt.sign({ sub: userId, type: 'refresh' }, JWT_SECRET, { expiresIn: '30d', algorithm: 'HS256' });
}

module.exports = { authenticate, signAccessToken, signRefreshToken, JWT_SECRET };
