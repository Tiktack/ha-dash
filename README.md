# HA Dash prototype

This repository contains a deliberately small Home Assistant app/add-on proof
of concept. It serves a standalone Solid 2 web application on port `8099`; it
does not embed itself in the Home Assistant dashboard.

The browser authenticates directly with Home Assistant through its OAuth flow,
opens a Home Assistant WebSocket connection, reads the device, entity, and area
registries, and displays live entity states grouped by device. The prototype
does not expose any service-call or write controls.

## Configure the GitHub repository

After creating an empty GitHub repository and before the first push, replace
the portable publishing placeholders:

```powershell
./scripts/configure-repository.ps1 -Owner YOUR_GITHUB_USERNAME -Repository ha-dash
```

Push the result to the `main` branch. Pull requests and pushes run frontend,
Home Assistant metadata, container, and runtime smoke checks.

To publish version `0.1.0`, create a GitHub Release whose tag is `v0.1.0`.
The release workflow verifies that the tag matches `ha_dash/config.yaml`,
builds all configured architectures, signs them, and publishes versioned and
`latest` multi-architecture images to GitHub Container Registry.

See [`ha_dash/DOCS.md`](ha_dash/DOCS.md) for installation and usage.
