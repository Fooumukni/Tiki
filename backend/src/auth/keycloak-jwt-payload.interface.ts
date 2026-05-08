export interface KeycloakJwtPayload {
  sub: string;
  aud?: string | string[];
  preferred_username?: string;
  email?: string;
  name?: string;
  realm_access?: {
    roles?: string[];
  };
}
