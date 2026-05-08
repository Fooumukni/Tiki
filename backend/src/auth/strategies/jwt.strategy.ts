import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { passportJwtSecret } from 'jwks-rsa';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { AuthSyncService } from '../auth-sync.service';
import { AuthenticatedUser } from '../authenticated-user.interface';
import { KeycloakJwtPayload } from '../keycloak-jwt-payload.interface';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  constructor(
    configService: ConfigService,
    private readonly authSyncService: AuthSyncService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      issuer: configService.getOrThrow<string>('KEYCLOAK_ISSUER_URL'),
      audience: configService.getOrThrow<string>('KEYCLOAK_AUDIENCE'),
      algorithms: ['RS256'],
      secretOrKeyProvider: passportJwtSecret({
        cache: true,
        rateLimit: true,
        jwksRequestsPerMinute: 5,
        jwksUri: configService.getOrThrow<string>('KEYCLOAK_JWKS_URI'),
      }),
    });
  }

  async validate(payload: KeycloakJwtPayload): Promise<AuthenticatedUser> {
    if (!payload.sub || !payload.email) {
      throw new UnauthorizedException('Missing required identity claims');
    }

    return this.authSyncService.syncUser(payload);
  }
}
