const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const env = require('../../bootstrap/env');
const ApiError = require('../../utils/ApiError');
const { withTransaction } = require('../../utils/transaction');
const { createAccessToken, hashToken } = require('../../utils/token');
const authModel = require('./auth.model');

function serializeUser(user, permissions = []) {
  const isSuperadmin = permissions.includes('superadmin.manage');
  return {
    id: user.id,
    store_id: user.store_id,
    store: user.store_id
      ? {
          id: user.store_id,
          name: user.store_name,
          code: user.store_code,
          slug: user.store_slug,
          status: user.store_status,
          currency_code: user.store_currency_code
        }
      : null,
    role_id: user.role_id,
    role: {
      id: user.role_id,
      name: user.role_name,
      display_name: user.role_display_name
    },
    full_name: user.full_name,
    username: user.username,
    email: user.email,
    phone: user.phone,
    status: user.status,
    last_login_at: user.last_login_at,
    permissions,
    is_superadmin: isSuperadmin,
    enabled_modules: user.enabled_modules || []
  };
}

function assertActiveUser(user) {
  if (!user || user.deleted_at) {
    throw ApiError.unauthorized('Invalid login credentials');
  }

  if (user.status !== 'active' || user.role_status !== 'active') {
    throw ApiError.unauthorized('User account is not active');
  }

  if (user.store_id && user.store_status !== 'active') {
    throw ApiError.unauthorized('Store is not active');
  }
}

async function login(credentials, context = {}) {
  const users = await authModel.findUsersByLogin(credentials.login, credentials.store_code);
  const globalUsers = users.filter((candidate) => candidate.store_id === null || candidate.store_id === undefined);
  let user = users[0] || null;

  if (!credentials.store_code && users.length > 1) {
    if (globalUsers.length === 1) {
      [user] = globalUsers;
    } else {
      throw ApiError.badRequest('Validation failed', [
        { field: 'store_code', message: 'Store code is required for this login' }
      ]);
    }
  }

  if (!user) {
    throw ApiError.unauthorized('Invalid login credentials');
  }

  assertActiveUser(user);

  const passwordMatches = await bcrypt.compare(credentials.password, user.password_hash);

  if (!passwordMatches) {
    throw ApiError.unauthorized('Invalid login credentials');
  }

  const permissions = await authModel.getUserPermissionsByUserId(user.id);
  user.enabled_modules = await authModel.getEnabledModulesByStoreId(user.store_id);
  const tokenPayload = createAccessToken(user, permissions);

  await withTransaction(async (connection) => {
    await authModel.createSession(connection, {
      userId: user.id,
      tokenHash: tokenPayload.tokenHash,
      ipAddress: context.ipAddress || null,
      userAgent: context.userAgent || null,
      expiresAt: tokenPayload.expiresAt
    });
    await authModel.updateLastLogin(connection, user.id);
  });

  return {
    token: tokenPayload.token,
    token_type: 'Bearer',
    expires_at: tokenPayload.expiresAt,
    user: serializeUser(user, permissions)
  };
}

async function issueTokenForUser(userId, context = {}) {
  const user = await authModel.findUserById(userId);
  assertActiveUser(user);

  const permissions = await authModel.getUserPermissionsByUserId(user.id);
  user.enabled_modules = await authModel.getEnabledModulesByStoreId(user.store_id);
  const tokenPayload = createAccessToken(user, permissions);

  await withTransaction(async (connection) => {
    await authModel.createSession(connection, {
      userId: user.id,
      tokenHash: tokenPayload.tokenHash,
      ipAddress: context.ipAddress || null,
      userAgent: context.userAgent || null,
      expiresAt: tokenPayload.expiresAt
    });
  });

  return {
    token: tokenPayload.token,
    token_type: 'Bearer',
    expires_at: tokenPayload.expiresAt,
    user: serializeUser(user, permissions)
  };
}

async function logout(userId, token) {
  if (!token) {
    throw ApiError.unauthorized();
  }

  await withTransaction(async (connection) => {
    await authModel.revokeSession(connection, {
      userId,
      tokenHash: hashToken(token)
    });
  });
}

async function verifyToken(token) {
  if (!token) {
    throw ApiError.unauthorized();
  }

  let payload;

  try {
    payload = jwt.verify(token, env.jwt.secret);
  } catch (error) {
    throw ApiError.unauthorized('Invalid or expired token');
  }

  const userId = Number(payload.sub || payload.id);

  if (!userId) {
    throw ApiError.unauthorized('Invalid or expired token');
  }

  const [session, user] = await Promise.all([
    authModel.findActiveSession({
      userId,
      tokenHash: hashToken(token)
    }),
    authModel.findUserById(userId)
  ]);

  if (!session) {
    throw ApiError.unauthorized('Invalid or expired token');
  }

  assertActiveUser(user);

  const permissions = await authModel.getUserPermissionsByUserId(user.id);
  user.enabled_modules = await authModel.getEnabledModulesByStoreId(user.store_id);

  return {
    token,
    user: serializeUser(user, permissions)
  };
}

async function getCurrentUser(userId) {
  const user = await authModel.findUserById(userId);
  assertActiveUser(user);

  const permissions = await authModel.getUserPermissionsByUserId(user.id);
  user.enabled_modules = await authModel.getEnabledModulesByStoreId(user.store_id);
  return serializeUser(user, permissions);
}

async function updateCurrentUser(userId, data) {
  const user = await authModel.findUserById(userId);
  assertActiveUser(user);

  await authModel.updateUserProfile(userId, {
    full_name: data.full_name,
    username: data.username,
    email: data.email,
    phone: data.phone
  });

  return getCurrentUser(userId);
}

async function updateCurrentUserPassword(userId, data) {
  const user = await authModel.findUserById(userId);
  assertActiveUser(user);

  const passwordMatches = await bcrypt.compare(data.current_password, user.password_hash);

  if (!passwordMatches) {
    throw ApiError.badRequest('Validation failed', [
      { field: 'current_password', message: 'Current password is incorrect' }
    ]);
  }

  const passwordHash = await bcrypt.hash(data.new_password, 12);
  await authModel.updatePasswordHash(userId, passwordHash);
}

module.exports = {
  getCurrentUser,
  issueTokenForUser,
  login,
  logout,
  serializeUser,
  updateCurrentUser,
  updateCurrentUserPassword,
  verifyToken
};
