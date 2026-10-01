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

## Desplegar en GCP

Solo en la cuenta **personal**, con la configuración de gcloud `healthbyte` (ver la Tarea 9 del plan). Terraform se niega a correr con otra cuenta.

```bash
export GOOGLE_OAUTH_ACCESS_TOKEN=$(gcloud auth print-access-token --configuration=healthbyte)
terraform -chdir=infra init && terraform -chdir=infra apply   # infraestructura base (la primera vez)
TAG=$(git rev-parse --short HEAD)                              # imágenes, desde la raíz del repo
gcloud builds submit --config=cloudbuild.yaml --project=<proyecto> --configuration=healthbyte \
  --substitutions=_REGISTRO=us-east1-docker.pkg.dev/<proyecto>/healthbyte,_TAG=$TAG
terraform -chdir=infra apply -var tag=$TAG                     # servicios
```

En PowerShell, el token se exporta con `$env:GOOGLE_OAUTH_ACCESS_TOKEN = gcloud auth print-access-token --configuration=healthbyte`.

Día de la demo (sin arranque en frío): `terraform -chdir=infra apply -var tag=$TAG -var api_min_instancias=1`

## Apagar todo

```bash
terraform -chdir=infra destroy
gcloud projects list --configuration=healthbyte
```

`terraform destroy` borra el proyecto completo, con todo lo que tenga adentro. Después, el proyecto no debe aparecer en la lista (o aparece en estado `DELETE_REQUESTED`).

