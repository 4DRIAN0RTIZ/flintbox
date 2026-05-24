# FlintBox

A self-hosted, browser-based lab for running real text-processing tools — `jq`, `grep`, `sed`, `awk`, `cut` — directly against pasted or HTTP-fetched data. No local install required. Every command runs as an actual binary inside a hardened Docker container, not a JavaScript mock.

> **Live demo → [flintbox.neanderhub.com](https://flintbox.neanderhub.com)**

---

## Features

- **Real execution** — binaries run via `execFile` with no shell, at hardcoded absolute paths
- **HTTP input source** — fill a form (method, URL, headers, body) or paste a raw `curl` command; the response becomes the tool's stdin automatically on Run
- **curl parser** — handles `-X`, `-H`, `-d`, `--json`, `-L`, `-s` and more
- **Command preview bar** — live `$ tool params < stdin` preview as you type
- **Help drawer** — `--help` output served from the running container binary
- **History** — last 10 commands, persisted in `localStorage`
- **Keyboard shortcut** — `Ctrl+Enter` / `⌘+Enter` to run

---

## Quick start

Requires Docker and Docker Compose v2.

```bash
git clone https://github.com/youruser/flintbox
cd flintbox
docker compose up --build -d
```

Open **http://localhost:3000**.

### Change the host port

```bash
PORT=8080 docker compose up -d
```

Or create a `.env` file (copy from the example):

```bash
cp .env.example .env
# edit PORT as needed
docker compose up -d
```

### Rebuild after making changes

```bash
docker compose up --build -d
```

---

## Reverse proxy

### Traefik

A separate Compose file is provided for Traefik deployments:

```bash
cp .env.example .env
# set DOMAIN, SUBDOMAIN, PROXY_NETWORK in .env
docker compose -f docker-compose.traefik.yml up -d
```

The service will be available at `https://<SUBDOMAIN>.<DOMAIN>` (default: `flintbox.example.com`).

Requires an external Docker network that Traefik is already attached to:

```bash
# one-time setup — skip if the network already exists
docker network create proxy
```

### nginx / Caddy / anything else

The container listens on port 3000. Point your proxy at that port. Example nginx location block:

```nginx
server {
    listen 443 ssl;
    server_name flintbox.example.com;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

---

## Project structure

```
├── Dockerfile
├── docker-compose.yml            # standalone (exposes port)
├── docker-compose.traefik.yml    # Traefik labels, no exposed port
├── .env.example
├── server.js                     # Express API
├── package.json
└── public/
    ├── index.html                # Shell HTML — no inline CSS or JS
    ├── css/
    │   ├── main.css              # Entry point (@import chain)
    │   ├── tokens.css            # Design tokens (CSS custom properties)
    │   ├── base.css              # Reset + grain overlay
    │   ├── layout.css            # App shell, header, workspace grid
    │   ├── tabs.css              # Tool tabs
    │   ├── controls.css          # Params row + command preview bar
    │   ├── panes.css             # Input/output panels + divider
    │   ├── output.css            # <pre>, CRT scanlines, stderr strip
    │   ├── input-source.css      # HTTP panel (fields + curl modes)
    │   ├── ui.css                # Badges, spinner, copy btn, help drawer, history
    │   └── animations.css        # @keyframes + responsive breakpoints
    └── js/
        ├── config.js             # Tool definitions, help sources, constants
        ├── dom.js                # Centralised DOM element registry
        ├── history.js            # localStorage command history
        ├── api.js                # fetch wrappers: /api/run /api/help /api/fetch-input
        ├── ui.js                 # All DOM mutations and render logic
        ├── input-source.js       # Input source module + curl parser
        └── main.js               # Entry point — events + init
```

---

## API

All endpoints are served by the same container. No authentication.

### `POST /api/run`

Execute a CLI tool with stdin input.

```jsonc
// request
{ "tool": "jq", "params": ".[] | .name", "input": "[{\"name\":\"Alice\"}]" }

// response
{ "stdout": "\"Alice\"\n", "stderr": "", "exitCode": 0 }
```

Allowed tools: `jq`, `grep`, `sed`, `awk`, `cut`.
Limits: 100 KB input · 500 char params · 5 s timeout · 2 MB output.

### `GET /api/help/:tool`

Returns `--help` output from the container binary.

```jsonc
{ "text": "jq - commandline JSON processor [version 1.8.1]\n..." }
```

### `POST /api/fetch-input`

Proxy an outbound HTTP request; response body returned as text.
Used by the HTTP input source mode.

```jsonc
// request
{ "method": "GET", "url": "https://api.example.com/users", "headers": [], "body": "" }

// response
{ "text": "...", "status": 200, "statusText": "OK", "contentType": "application/json" }
```

Private/internal addresses are blocked (see [Security](#security)).

---

## Security

| Layer | Measure |
|-------|---------|
| Execution | `execFile` — no shell, no string interpolation |
| Binaries | Hardcoded absolute paths — never resolved from `PATH` |
| Tool whitelist | Only `grep`, `sed`, `awk`, `cut`, `jq` accepted |
| Input limits | 100 KB stdin · 500 char params · 5 s timeout · 2 MB output buffer |
| SSRF protection | Blocks `127.x`, `10.x`, `172.16–31.x`, `192.168.x`, `169.254.x` |
| Container | Non-root user · `--cap-drop ALL` · read-only filesystem · `no-new-privileges` |
| Resources | 0.5 CPU · 128 MB RAM · 10 MB tmpfs at `/tmp` |

---

## Stack

- **Runtime** — Node.js 22 on Alpine Linux
- **Server** — Express 4 + shell-quote
- **Frontend** — Vanilla JS (ES modules), no build step
- **Fonts** — [Martian Mono](https://fonts.google.com/specimen/Martian+Mono) · [Oxanium](https://fonts.google.com/specimen/Oxanium)
