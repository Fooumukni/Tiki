interface RuntimeKeycloakConfig {
  url?: string;
  realm?: string;
  clientId?: string;
}

interface RuntimeAppConfig {
  apiBaseUrl?: string;
  keycloak?: RuntimeKeycloakConfig;
}

const runtimeConfig = (globalThis as typeof globalThis & { __APP_CONFIG__?: RuntimeAppConfig }).__APP_CONFIG__;

export const environment = {
  production: false,
  apiBaseUrl: runtimeConfig?.apiBaseUrl ?? 'http://localhost:3100/api',
  keycloak: {
    url: runtimeConfig?.keycloak?.url ?? 'http://localhost:8180',
    realm: runtimeConfig?.keycloak?.realm ?? 'tiki',
    clientId: runtimeConfig?.keycloak?.clientId ?? 'tiki-frontend',
  },
};
