const dotenv = require('dotenv');
const { z } = require('zod');

dotenv.config();

const envBoolean = z.preprocess((value) => {
  if (typeof value === 'string') {
    return ['1', 'true', 'yes', 'on'].includes(value.toLowerCase());
  }

  return value;
}, z.boolean());

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(3000),
  DB_HOST: z.string().min(1).default('localhost'),
  DB_PORT: z.coerce.number().int().positive().default(3306),
  DB_NAME: z.string().min(1).default('charcoal_erp'),
  DB_USER: z.string().min(1).default('root'),
  DB_PASSWORD: z.string().default(''),
  DB_CONNECTION_LIMIT: z.coerce.number().int().positive().default(10),
  DB_CONNECT_TIMEOUT_MS: z.coerce.number().int().positive().default(2000),
  JWT_SECRET: z.string().min(32).default('development_secret_change_me_for_real_usage'),
  JWT_EXPIRES_IN: z.string().min(1).default('1d'),
  CORS_ORIGIN: z.string().min(1).default('*'),
  REQUEST_BODY_LIMIT: z.string().min(1).default('3mb'),
  RATE_LIMIT_WINDOW_MS: z.coerce.number().int().positive().default(900000),
  RATE_LIMIT_MAX: z.coerce.number().int().positive().default(10000),
  AUTH_RATE_LIMIT_WINDOW_MS: z.coerce.number().int().positive().default(900000),
  AUTH_RATE_LIMIT_MAX: z.coerce.number().int().positive().default(200)
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  const message = parsed.error.issues
    .map((issue) => `${issue.path.join('.')}: ${issue.message}`)
    .join('; ');

  throw new Error(`Invalid environment configuration: ${message}`);
}

const values = parsed.data;

if (
  values.NODE_ENV === 'production' &&
  values.JWT_SECRET === 'development_secret_change_me_for_real_usage'
) {
  throw new Error('JWT_SECRET must be configured in production.');
}

module.exports = {
  nodeEnv: values.NODE_ENV,
  isDevelopment: values.NODE_ENV === 'development',
  isTest: values.NODE_ENV === 'test',
  isProduction: values.NODE_ENV === 'production',
  port: values.PORT,
  jwt: {
    secret: values.JWT_SECRET,
    expiresIn: values.JWT_EXPIRES_IN
  },
  corsOrigin: values.CORS_ORIGIN,
  requestBodyLimit: values.REQUEST_BODY_LIMIT,
  rateLimit: {
    api: {
      windowMs: values.RATE_LIMIT_WINDOW_MS,
      max: values.RATE_LIMIT_MAX
    },
    auth: {
      windowMs: values.AUTH_RATE_LIMIT_WINDOW_MS,
      max: values.AUTH_RATE_LIMIT_MAX
    }
  },
  db: {
    host: values.DB_HOST,
    port: values.DB_PORT,
    database: values.DB_NAME,
    user: values.DB_USER,
    password: values.DB_PASSWORD,
    waitForConnections: true,
    connectionLimit: values.DB_CONNECTION_LIMIT,
    queueLimit: 0,
    connectTimeout: values.DB_CONNECT_TIMEOUT_MS,
    decimalNumbers: false,
    namedPlaceholders: true
  }
};
