# Reglas para agentes en HealthByte

Este archivo lo leen todos los agentes que trabajan en el repo (Codex, Antigravity, Claude Code). Léelo completo antes de tocar código.

## Qué es

Tablero inteligente de seguridad quirúrgica para una hackathon: el equipo dicta en voz alta, Chirp 3 (Google Speech-to-Text V2) transcribe, Jev (TypeSafe AI) interpreta y el sistema registra cada verificación como un evento inmutable. Es multi-clínica y se despliega en GCP.

- **Fuente de verdad del producto:** [spec](docs/superpowers/specs/2026-10-01-tablero-seguridad-quirurgica-design.md).
- **Tareas con el código completo:** [plan](docs/superpowers/plans/2026-10-01-tablero-seguridad-quirurgica.md). Tu prompt te dice qué tarea o pasos te tocan.
- **Marca y pantallas:** [documento de diseño](Diseño/HealthByte_especificaciones_diseno.md). Si contradice el spec, manda el spec.

## Módulos

| Carpeta | Qué contiene |
| --- | --- |
| `api/` | Backend: Node 24 + TypeScript, Fastify, WebSocket, Jev y Chirp 3. `api/src/tipos.ts` es el **contrato** con el front. |
| `web/` | Front: React + Vite. Solo importa **tipos** de `api/src/tipos.ts`, nunca código. |
| `db/` | Base de datos: `schema.sql` (tablas, rol y Row-Level Security) y el Postgres local en Docker. |
| `infra/` | Terraform para GCP y la construcción de imágenes. |
| `docs/` | Spec, plan y prompts de los agentes. |
| `Notas/`, `Diseño/` | Investigación y marca. No se tocan desde las tareas de código. |

## Reglas

1. **Solo toca los archivos de tu tarea.** Varios agentes trabajan en paralelo. Si necesitas cambiar un archivo que no está en tu tarea, detente y repórtalo; no lo cambies.
2. **Archivos compartidos, solo con permiso del orquestador:** `api/src/tipos.ts`, `api/package.json`, `web/package.json`, los `package-lock.json`, `db/schema.sql`, `AGENTS.md`, el spec y el plan.
3. **No agregues dependencias.** Ya están declaradas e instaladas. Usa `npm ci` (nunca `npm install <paquete>`); si el plan dice `npm install <paquete>`, sáltate ese paso.
4. **Sigue el código del plan.** Si algo no compila o una prueba no pasa, corrige lo mínimo y explica la desviación en tu reporte.
5. **TDD:** escribe la prueba, mírala fallar, implementa y mírala pasar. Antes de terminar corre `npm test` y `npm run tipos` en el módulo.
6. **TypeScript sin compilar** (Node 24 con *type stripping*): nada de `enum`, `namespace` ni propiedades en parámetros de constructor; los imports relativos llevan la extensión `.ts`; los tipos se importan con `import type`.
7. **Español** en nombres, textos de interfaz y mensajes de commit.
8. **Datos:** solo ficticios. Nunca datos reales de pacientes, ni claves o tokens en el repo (`.env` está ignorado).
9. **GCP:** no ejecutes `terraform apply`, `terraform destroy` ni comandos de `gcloud` que creen, cambien o borren recursos. Solo `terraform fmt` y `terraform validate`. El despliegue lo hace el usuario.
10. **Git:** se trabaja en `main`. Haz `git pull --rebase` antes de cada `git push`. En un worktree con rama propia: `git pull --rebase origin main` y luego `git push origin HEAD:main`. Los commits siguen Conventional Commits en español (`feat(api): …`, `test(web): …`) y **no llevan atribución a IA**: nada de `Co-authored-by` de un asistente ni «Generated with».

## Al terminar, reporta

- Los archivos creados o modificados.
- Los comandos de verificación que corriste y su resultado.
- Cualquier desviación del plan y el motivo.
- Lo que quedó pendiente o bloqueado.

## Comandos

```bash
docker compose -f db/docker-compose.yml up -d   # Postgres local
cd api && npm ci && npm test                     # pruebas de lógica
cd api && npm run test:db                        # pruebas con Postgres (requiere api/.env)
cd api && npm run tipos                          # chequeo de tipos
cd web && npm ci && npm test && npm run tipos
```
