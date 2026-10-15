import { ExtractJwt, Strategy } from 'passport-jwt';
import { PassportStrategy } from '@nestjs/passport';
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Request } from 'express';

@Injectable()
export class JwtRefreshStrategy extends PassportStrategy(Strategy, 'jwt-refresh') {
  constructor(private readonly configService: ConfigService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      issuer: 'atlas-platform',
      audience: 'atlas-api',
      algorithms: ['HS256'],
      secretOrKey: configService.get<string>('JWT_REFRESH_SECRET'),
      passReqToCallback: true,
    });
  }

  async validate(req: Request, payload: any) {
    if (payload.token_use !== 'refresh' || typeof payload.sub !== 'string' || !payload.sub) {
      throw new UnauthorizedException('Invalid refresh token');
    }
    const refreshToken = req.get('Authorization')?.replace('Bearer', '')?.trim();
    if (!refreshToken) {
      throw new UnauthorizedException('Refresh token is malformed');
    }
    return { ...payload, refreshToken };
  }
}
