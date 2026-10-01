# HealthByte

Tablero inteligente de seguridad quirúrgica que se llena por voz.

- Diseño del producto: [spec](docs/superpowers/specs/2026-10-01-tablero-seguridad-quirurgica-design.md)
- Tareas de implementación: [plan](docs/superpowers/plans/2026-10-01-tablero-seguridad-quirurgica.md)
- Reglas para agentes: [AGENTS.md](AGENTS.md)

## Estructura

```
api/      backend (Node 24 + TypeScript): API, WebSocket, Jev y Chirp 3
web/      front (React + Vite): sesión del quirófano y panel de gestión
db/       esquema de Postgres y base local en Docker
infra/    Terraform para GCP
docs/     spec, plan y prompts de los agentes
Notas/    investigación
Diseño/   marca y pantallas
```

## Correr en local

Requisitos: Node 24 o superior y Docker Desktop.

```bash
docker compose -f db/docker-compose.yml up -d
cd api && cp .env.example .env && npm ci && npm run dev
```

En otra terminal:

```bash
cd web && npm ci && npm run dev
```

Abre http://localhost:5173. La clínica es `caribe` o `norte`, el usuario `circulante` o `coordinador`, y la clave de prueba está en `CLAVE_DEMO` dentro de `api/src/siembra.ts`. Todos los datos son ficticios.
