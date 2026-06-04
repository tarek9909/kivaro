const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const env = require('../bootstrap/env');

function hashToken(token) {
  return crypto.createHash('sha256').update(token).digest('hex');
}

function createAccessToken(user, permissions = []) {
  const token = jwt.sign(
    {
      roleId: user.role_id,
      permissions
    },
    env.jwt.secret,
    {
      subject: String(user.id),
      expiresIn: env.jwt.expiresIn
    }
  );

  const decoded = jwt.decode(token);
  const expiresAt = decoded && decoded.exp ? new Date(decoded.exp * 1000) : null;

  return {
    token,
    tokenHash: hashToken(token),
    expiresAt
  };
}

module.exports = {
  createAccessToken,
  hashToken
};
