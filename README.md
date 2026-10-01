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

Proyecto personal **healthbyte-510314**, cuenta **juniorrdsr12@gmail.com**, configuración de gcloud **healthbyte**. Nunca se usa la configuración corporativa. Terraform mantiene la guardia `cuenta_esperada`.

La infraestructura existente en `infra/main.tf` y `infra/servicios.tf` administra la base, el registro, los secretos y los servicios. El proyecto existente se importó al estado; no se crea otro proyecto ni se cambia su organización. Cloud SQL tarda varios minutos en estar disponible. El proyecto usa `deletion_policy = "PREVENT"`; no ejecutar `terraform destroy`.

Conserva `infra/terraform.tfvars` y el estado local de Terraform fuera de Git. La cuenta de facturación está en COP; el presupuesto configurado es una alerta de 100.000 COP, no un límite que apague recursos.

Antes de publicar desde main:

```powershell
git pull --rebase origin main
Push-Location web
npm run tipos
npm test
npm run build
Pop-Location
./infra/desplegar.ps1
```

El script obtiene el token personal, usa el commit actual como etiqueta, construye API y web con `cloudbuild.yaml`, aplica Terraform e imprime `web_url`. Comprueba que el estado sea del proyecto autorizado, exige fuentes sin cambios pendientes y detiene el despliegue si el plan propone borrar recursos. Reutiliza la cuenta `healthbyte-build` y el bucket privado de fuentes de la primera publicación; no usa la cuenta Compute por defecto. La cuenta de construcción tiene permiso de escritura en el registro `healthbyte`.

`jev-api-key` requiere una versión habilitada. El usuario carga la clave directamente en Secret Manager, nunca en el repositorio:

```powershell
gcloud secrets versions add jev-api-key --data-file=- --project=healthbyte-510314 --configuration=healthbyte --account=juniorrdsr12@gmail.com
```

Introducir la clave por stdin y terminar la entrada. El script selecciona la versión habilitada más reciente y fija su número en la revisión de API; una rotación se incorpora en el siguiente despliegue. No lee ni imprime la clave.

Servicio público: **healthbyte-web**, con `/` para la landing sin sesión y el inicio con sesión, y `/entrar` para el login. `/sesion/:id`, `/panel` y `/trazabilidad/:id` conservan sus rutas. La primera publicación está en [HealthByte](https://healthbyte-web-xt22k54faa-ue.a.run.app/). El script mantiene el nombre del servicio y actualiza su imagen.

La revisión programada de este chat corre cada 20 minutos: trae main, verifica tipos, pruebas y compilación, despliega con el script y avisa el commit publicado. Si un chequeo falla, conserva la revisión anterior y comunica el bloqueo. Antes de aplicar servicios por primera vez se incorpora al estado principal el servicio `healthbyte-web` existente; el módulo anterior de publicación no se vuelve a aplicar.

Para verificar la API: `Invoke-RestMethod "$(terraform -chdir=infra output -raw web_url)/api/salud"`. Después, abrir la web y comprobar el acceso y el flujo de cirugía con datos ficticios.
