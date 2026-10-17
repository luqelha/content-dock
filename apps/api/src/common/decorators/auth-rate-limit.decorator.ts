import { SetMetadata } from '@nestjs/common';

export const AUTH_RATE_LIMIT = 'auth-rate-limit';
export const AuthRateLimit = () => SetMetadata(AUTH_RATE_LIMIT, true);
