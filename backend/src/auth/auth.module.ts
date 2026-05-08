import { Module } from '@nestjs/common';
import { PassportModule } from '@nestjs/passport';
import { MembershipsModule } from '../memberships/memberships.module';
import { AuthSyncService } from './auth-sync.service';
import { AuthController } from './auth.controller';
import { JwtStrategy } from './strategies/jwt.strategy';

@Module({
  imports: [PassportModule, MembershipsModule],
  controllers: [AuthController],
  providers: [AuthSyncService, JwtStrategy],
})
export class AuthModule {}
