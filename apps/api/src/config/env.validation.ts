import * as Joi from 'joi';

export const envValidationSchema = Joi.object({
  NODE_ENV: Joi.string()
    .valid('development', 'production', 'test', 'provision')
    .default('development'),
  PORT: Joi.number().default(4000),
  STORAGE_RETENTION_ENABLED: Joi.string().valid('true', 'false').default('false'),
  STORAGE_RETENTION_DRY_RUN: Joi.string().valid('true', 'false').default('true'),
  DATABASE_URL: Joi.string().required(),
  RABBITMQ_URL: Joi.string().required(),
  QUEUE_NAME: Joi.string().default('log_export_queue'),
  REDIS_URL: Joi.string().required(),
  JWT_SECRET: Joi.string().min(32).required(),
  JWT_EXPIRATION: Joi.string().default('15m'),
  JWT_REFRESH_SECRET: Joi.string().min(32).invalid(Joi.ref('JWT_SECRET')).required(),
  JWT_REFRESH_EXPIRATION: Joi.string().default('7d'),
  AUTH_PROXY_SECRET: Joi.string()
    .min(32)
    .invalid(Joi.ref('JWT_SECRET'), Joi.ref('JWT_REFRESH_SECRET'))
    .when('NODE_ENV', { is: 'production', then: Joi.required() }),
});
