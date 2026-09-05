import { For, Show, createMemo, createSignal, onSettled } from "solid-js";
import type { HassEntities } from "home-assistant-js-websocket";
import {
  connectToHomeAssistant,
  hasStoredAuthentication,
  loadRuntimeConfig,
  type AreaRegistryEntry,
  type DeviceRegistryEntry,
  type EntityRegistryEntry,
} from "./home-assistant";

type Status = "loading" | "ready" | "connecting" | "connected" | "error";

interface DeviceView extends DeviceRegistryEntry {
  areaName: string;
  displayName: string;
  entities: EntityRegistryEntry[];
}

function friendlyState(entityId: string, entities: HassEntities): string {
  const entity = entities[entityId];
  if (!entity) return "unavailable";

  const unit = typeof entity.attributes.unit_of_measurement === "string"
    ? ` ${entity.attributes.unit_of_measurement}`
    : "";
  return `${entity.state}${unit}`;
}

export default function App() {
  const [areas, setAreas] = createSignal<AreaRegistryEntry[]>([]);
  const [devices, setDevices] = createSignal<DeviceRegistryEntry[]>([]);
  const [entityRegistry, setEntityRegistry] = createSignal<EntityRegistryEntry[]>([]);
  const [states, setStates] = createSignal<HassEntities>({});
  const [homeAssistantUrl, setHomeAssistantUrl] = createSignal("");
  const [status, setStatus] = createSignal<Status>("loading");
  const [error, setError] = createSignal("");
  let unsubscribe: (() => void) | undefined;

  const deviceViews = createMemo<DeviceView[]>(() => {
    const areaNames = new Map(areas().map((area) => [area.area_id, area.name]));
    const entitiesByDevice = new Map<string, EntityRegistryEntry[]>();

    for (const entity of entityRegistry()) {
      if (!entity.device_id || entity.disabled_by || entity.hidden_by) continue;
      const bucket = entitiesByDevice.get(entity.device_id) ?? [];
      bucket.push(entity);
      entitiesByDevice.set(entity.device_id, bucket);
    }

    return devices()
      .filter((device) => !device.disabled_by)
      .map((device) => ({
        ...device,
        areaName: device.area_id ? areaNames.get(device.area_id) ?? "Unknown area" : "No area",
        displayName: device.name_by_user ?? device.name ?? device.model ?? "Unnamed device",
        entities: (entitiesByDevice.get(device.id) ?? []).sort((a, b) =>
          a.entity_id.localeCompare(b.entity_id),
        ),
      }))
      .sort((a, b) =>
        a.areaName.localeCompare(b.areaName) || a.displayName.localeCompare(b.displayName),
      );
  });

  const activeEntityCount = createMemo(() =>
    entityRegistry().filter((entity) => !entity.disabled_by && !entity.hidden_by).length,
  );

  onSettled(() => {
    void initialize();
    return () => unsubscribe?.();
  });

  async function initialize() {
    try {
      const config = await loadRuntimeConfig();
      setHomeAssistantUrl(config.homeAssistantUrl);
      setStatus("ready");

      if (
        new URLSearchParams(window.location.search).has("auth_callback") ||
        hasStoredAuthentication(config.homeAssistantUrl)
      ) {
        await connect(config.homeAssistantUrl);
      }
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause));
      setStatus("error");
    }
  }

  async function connect(url = homeAssistantUrl()) {
    if (!url) return;
    setStatus("connecting");
    setError("");

    try {
      const homeAssistant = await connectToHomeAssistant(url);
      setAreas(homeAssistant.areas);
      setDevices(homeAssistant.devices);
      setEntityRegistry(homeAssistant.entities);
      unsubscribe = homeAssistant.subscribeToEntities((nextStates) => {
        setStates({ ...nextStates });
      });
      window.history.replaceState({}, document.title, window.location.pathname);
      setStatus("connected");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause));
      setStatus("error");
    }
  }

  return (
    <main>
      <header class="hero">
        <div>
          <p class="eyebrow">Standalone proof of concept</p>
          <h1>HA Dash</h1>
          <p class="subtitle">Automatic device discovery with live Home Assistant state.</p>
        </div>
        <span class={`status status--${status()}`}>
          <span class="status__dot" />
          {status() === "connected" ? "Live" : status()}
        </span>
      </header>

      <Show when={status() !== "connected"}>
        <section class="connect-panel">
          <label for="ha-url">Home Assistant URL</label>
          <input
            id="ha-url"
            type="url"
            value={homeAssistantUrl()}
            onInput={(event) => setHomeAssistantUrl(event.currentTarget.value)}
            placeholder="https://home.example.com"
            disabled={status() === "connecting" || status() === "loading"}
          />
          <button
            type="button"
            onClick={() => void connect()}
            disabled={!homeAssistantUrl() || status() === "connecting" || status() === "loading"}
          >
            {status() === "connecting" ? "Connecting…" : "Connect to Home Assistant"}
          </button>
          <p class="hint">You will sign in on Home Assistant. This app never receives your password.</p>
          <Show when={error()}>
            <p class="error" role="alert">{error()}</p>
          </Show>
        </section>
      </Show>

      <Show when={status() === "connected"}>
        <section class="summary" aria-label="Home summary">
          <div><strong>{areas().length}</strong><span>areas</span></div>
          <div><strong>{deviceViews().length}</strong><span>devices</span></div>
          <div><strong>{activeEntityCount()}</strong><span>entities</span></div>
        </section>

        <section class="device-list">
          <For each={deviceViews()} fallback={<p class="empty">No devices were returned.</p>}>
            {(device) => (
              <article class="device-card">
                <div class="device-card__heading">
                  <div>
                    <p class="area">{device.areaName}</p>
                    <h2>{device.displayName}</h2>
                  </div>
                  <span class="entity-count">{device.entities.length}</span>
                </div>
                <Show when={device.manufacturer || device.model}>
                  <p class="model">{[device.manufacturer, device.model].filter(Boolean).join(" · ")}</p>
                </Show>
                <ul>
                  <For each={device.entities} fallback={<li class="muted">No visible entities</li>}>
                    {(entity) => (
                      <li>
                        <span title={entity.entity_id}>
                          {entity.name ?? entity.original_name ?? entity.entity_id}
                        </span>
                        <strong>{friendlyState(entity.entity_id, states())}</strong>
                      </li>
                    )}
                  </For>
                </ul>
              </article>
            )}
          </For>
        </section>
      </Show>
    </main>
  );
}
