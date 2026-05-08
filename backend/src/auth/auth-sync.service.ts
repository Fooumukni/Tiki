import { Injectable, UnauthorizedException } from '@nestjs/common';
import { Prisma, UserProfile } from '@prisma/client';
import { MembershipsService } from '../memberships/memberships.service';
import { PrismaService } from '../prisma/prisma.service';
import { AuthenticatedUser } from './authenticated-user.interface';
import { KeycloakJwtPayload } from './keycloak-jwt-payload.interface';

type UserProfileIdentity = Pick<UserProfile, 'id' | 'keycloakUserId' | 'email' | 'fullName'>;

@Injectable()
export class AuthSyncService {
  constructor(
    private readonly prismaService: PrismaService,
    private readonly membershipsService: MembershipsService,
  ) {}

  async syncUser(payload: KeycloakJwtPayload): Promise<AuthenticatedUser> {
    if (!payload.sub || !payload.email) {
      throw new UnauthorizedException('Missing required identity claims');
    }

    const fullName = payload.name ?? payload.preferred_username ?? payload.email;
    const userProfile = await this.findOrCreateUserProfile({
      keycloakUserId: payload.sub,
      email: payload.email,
      fullName,
    });
    const memberships = await this.membershipsService.findUserMemberships(userProfile.id);

    return {
      id: userProfile.id,
      keycloakUserId: userProfile.keycloakUserId,
      email: userProfile.email,
      fullName: userProfile.fullName ?? userProfile.email,
      preferredUsername: payload.preferred_username,
      memberships,
    };
  }

  private async findOrCreateUserProfile(input: {
    keycloakUserId: string;
    email: string;
    fullName: string;
  }): Promise<UserProfileIdentity> {
    const existingProfile = await this.prismaService.userProfile.findUnique({
      where: { keycloakUserId: input.keycloakUserId },
      select: this.userProfileIdentitySelect(),
    });

    if (existingProfile) {
      return this.updateUserProfileIfNeeded(existingProfile, input.email, input.fullName);
    }

    try {
      return await this.prismaService.userProfile.create({
        data: {
          keycloakUserId: input.keycloakUserId,
          email: input.email,
          fullName: input.fullName,
        },
        select: this.userProfileIdentitySelect(),
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        const userProfile = await this.prismaService.userProfile.findUniqueOrThrow({
          where: { keycloakUserId: input.keycloakUserId },
          select: this.userProfileIdentitySelect(),
        });

        return this.updateUserProfileIfNeeded(userProfile, input.email, input.fullName);
      }

      throw error;
    }
  }

  private async updateUserProfileIfNeeded(
    userProfile: UserProfileIdentity,
    email: string,
    fullName: string,
  ): Promise<UserProfileIdentity> {
    if (userProfile.email === email && userProfile.fullName === fullName) {
      return userProfile;
    }

    return this.prismaService.userProfile.update({
      where: { id: userProfile.id },
      data: { email, fullName },
      select: this.userProfileIdentitySelect(),
    });
  }

  private userProfileIdentitySelect(): Prisma.UserProfileSelect {
    return {
      id: true,
      keycloakUserId: true,
      email: true,
      fullName: true,
    };
  }
}
