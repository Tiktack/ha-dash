import {
  createConnection,
  getAuth,
  subscribeEntities,
  type Auth,
  type AuthData,
  type Connection,
  type HassEntities,
} from "home-assistant-js-websocket";

const TOKEN_STORAGE_KEY = "ha-dash:home-assistant-auth";

export interface RuntimeConfig {
  homeAssistantUrl: string;
}

export interface AreaRegistryEntry {
  area_id: string;
  name: string;
}

export interface DeviceRegistryEntry {
  area_id: string | null;
  config_entries: string[];
  disabled_by: string | null;
  id: string;
  manufacturer: string | null;
  model: string | null;
  name: string | null;
  name_by_user: string | null;
}

export interface EntityRegistryEntry {
  area_id: string | null;
  device_id: string | null;
  disabled_by: string | null;
  entity_id: string;
  hidden_by: string | null;
  name: string | null;
  original_name: string | null;
}

export interface HomeAssistantSnapshot {
  areas: AreaRegistryEntry[];
  devices: DeviceRegistryEntry[];
  entities: EntityRegistryEntry[];
}

export interface ConnectedHomeAssistant extends HomeAssistantSnapshot {
  auth: Auth;
  connection: Connection;
  subscribeToEntities: (callback: (entities: HassEntities) => void) => () => void;
}

export async function loadRuntimeConfig(): Promise<RuntimeConfig> {
  if (import.meta.env.DEV) {
    return {
      homeAssistantUrl:
        import.meta.env.VITE_HOME_ASSISTANT_URL ?? "http://homeassistant.local:8123",
    };
  }

  const response = await fetch("/runtime-config.json", { cache: "no-store" });
  if (!response.ok) throw new Error("Unable to load the add-on configuration.");
  return response.json() as Promise<RuntimeConfig>;
}

async function authenticate(homeAssistantUrl: string): Promise<Auth> {
  return getAuth({
    hassUrl: homeAssistantUrl,
    clientId: window.location.origin,
    redirectUrl: window.location.origin,
    limitHassInstance: true,
    loadTokens: async () => {
      const stored = window.localStorage.getItem(TOKEN_STORAGE_KEY);
      if (!stored) return undefined;

      try {
        return JSON.parse(stored) as AuthData;
      } catch {
        window.localStorage.removeItem(TOKEN_STORAGE_KEY);
        return undefined;
      }
    },
    saveTokens: (tokens) => {
      if (tokens) {
        window.localStorage.setItem(TOKEN_STORAGE_KEY, JSON.stringify(tokens));
      } else {
        window.localStorage.removeItem(TOKEN_STORAGE_KEY);
      }
    },
  });
}

export function hasStoredAuthentication(homeAssistantUrl: string): boolean {
  const stored = window.localStorage.getItem(TOKEN_STORAGE_KEY);
  if (!stored) return false;

  try {
    const tokens = JSON.parse(stored) as AuthData;
    return tokens.hassUrl === homeAssistantUrl.replace(/\/$/, "");
  } catch {
    window.localStorage.removeItem(TOKEN_STORAGE_KEY);
    return false;
  }
}

export async function connectToHomeAssistant(
  homeAssistantUrl: string,
): Promise<ConnectedHomeAssistant> {
  const auth = await authenticate(homeAssistantUrl.replace(/\/$/, ""));
  const connection = await createConnection({ auth });

  const [areas, devices, entities] = await Promise.all([
    connection.sendMessagePromise<AreaRegistryEntry[]>({ type: "config/area_registry/list" }),
    connection.sendMessagePromise<DeviceRegistryEntry[]>({ type: "config/device_registry/list" }),
    connection.sendMessagePromise<EntityRegistryEntry[]>({ type: "config/entity_registry/list" }),
  ]);

  return {
    areas,
    auth,
    connection,
    devices,
    entities,
    subscribeToEntities: (callback) => subscribeEntities(connection, callback),
  };
}
