# HA Dash Prototype

This is a standalone proof of concept, served from the add-on on its own port.
It uses Home Assistant's standard browser OAuth and WebSocket APIs. No Home
Assistant password or long-lived access token is stored in the add-on.

## Installation from GitHub

After the repository owner publishes the first GitHub Release:

1. In Home Assistant, open **Settings → Apps → App store**.
2. Open the repository menu and add the GitHub repository URL.
3. Find and install **HA Dash Prototype**.
4. Ensure the corresponding `ha-dash` package in GitHub Container Registry is
   public so Home Assistant can pull it without registry credentials.
5. On the app's **Configuration** tab, set `home_assistant_url` to a URL that
   the browser running HA Dash can reach. For the current test instance, use
   `https://ha.aleh-lab.com`.
6. Save, start the app, and press **Open Web UI**. If port `8099` is already in
   use, change the host-side port in the app's Network settings.
7. Select **Connect to Home Assistant** and sign in with the read-only test
   account. Home Assistant redirects the browser back to HA Dash after consent.

The app repository contains source and metadata, but Home Assistant installs
the prebuilt multi-architecture image from GHCR. It does not build the frontend
on the Home Assistant machine.

## Local development installation

1. Copy the entire `ha_dash` directory to `/addons/ha_dash` on the Home
   Assistant host.
2. In Home Assistant, open **Settings → Apps → App store** and refresh the
   local apps list.
3. Install **HA Dash Prototype**. Local apps are built by Home Assistant.
4. On its **Configuration** tab, set `home_assistant_url` to a URL that the
   browser running HA Dash can reach. For the current test instance, use
   `https://ha.aleh-lab.com`.
5. Save, start the app, and press **Open Web UI**. If port `8099` is already in
   use, change the host-side port in the app's Network settings.
6. Select **Connect to Home Assistant** and sign in with the read-only test
   account. Home Assistant redirects the browser back to HA Dash after consent.

## What the prototype proves

- A fully custom Solid UI can run independently of the Home Assistant frontend.
- Standard Home Assistant OAuth works without collecting credentials in this
  application.
- Device, entity, and area registries can be discovered automatically.
- Entity states update live over one WebSocket subscription.

The UI intentionally contains no entity toggles or service calls. Authentication
tokens are kept in browser local storage through the official Home Assistant
client's token persistence hooks and can be revoked from Home Assistant.

## Development

From `ha_dash/frontend`:

```sh
npm ci
npm run dev
```

The development server defaults the Home Assistant URL to
`http://homeassistant.local:8123`. Override it by setting
`VITE_HOME_ASSISTANT_URL` when starting Vite.

To build the same container Home Assistant will install:

```sh
docker build -t ha-dash-prototype:local ha_dash
```
