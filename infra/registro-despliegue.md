# Publicación coordinada de HealthByte

1 de octubre de 2026. Código publicado: `e7bdc5f`.

[Web pública](https://healthbyte-web-xt22k54faa-ue.a.run.app/) · [Acceso](https://healthbyte-web-xt22k54faa-ue.a.run.app/entrar).

## Archivos de esta entrega

- `web/src/Landing.tsx`, `landing.css`: presentación comercial y ejemplo interactivo, estilos limitados a la landing; enlaces a `/entrar`.
- `web/src/Login.tsx`, `login.css`: diseño de `Diseño/pantallas/Login.html`, Conti en `greeting`, acceso por API, mensaje exacto solicitado y ajuste móvil.
- `web/src/App.tsx`: landing sin sesión en `/`, inicio existente con sesión y redirección desde `/entrar` cuando hay sesión. Se conservaron las rutas clínicas y de gestión.
- `docs/presentacion-comercial.md`: relato para el cliente y evidencia de las capacidades, con ejemplos ficticios y sin cifras inventadas.
- `infra/main.tf`: se reutilizó la base existente; se importó el proyecto personal, se conservó su organización y se protegió su borrado. Se reutilizó la cuenta de construcción existente y se le concedió escritura en el registro principal.
- `infra/servicios.tf`, `variables.tf`: nombre `healthbyte-web` y referencia explícita a la versión habilitada de Jev.
- `infra/desplegar.ps1`, `cloudbuild.yaml`: construcción de las dos imágenes con cuenta personal, comprobación del estado y rechazo de planes que borren recursos.
- Sección de despliegue de `README.md` y este registro.

No se editaron componentes de sesión, bloques, gestión ni `api/src`. Sus cambios llegaron por `git pull --rebase origin main`. El trabajo previo al reparto se conservó en el stash `respaldo-presentacion-antes-coordinacion`; no se aplicó sobre los archivos de los demás carriles.

## Infraestructura y despliegue

Proyecto: `healthbyte-510314`. Cuenta: `juniorrdsr12@gmail.com`. Configuración de gcloud: `healthbyte`. Región: `us-east1`. Se mantuvo la guardia `cuenta_esperada`; no se utilizó la configuración corporativa ni `emuclient`.

La base se aplicó con el módulo existente: 27 recursos añadidos, un cambio de metadatos del proyecto y ningún borrado. Cloud SQL tardó 10 minutos y 18 segundos en crearse. La facturación usa COP; la alerta de presupuesto quedó en 100.000 COP y no constituye un límite de consumo.

Se creó una versión ficticia de `jev-api-key` por petición del usuario. El usuario cargó después la versión real, **2**, directamente en GCP. La API referencia esa versión; no se leyó su contenido ni se guardó en un archivo del repo.

El estado del servicio `healthbyte-web` se movió de la publicación inicial al estado principal de `infra/`, conservando su URL. Los recursos auxiliares de aquella publicación mantienen su estado local anterior; no volver a aplicar el módulo anterior. La cuenta de construcción y el bucket privado de fuentes se reutilizan.

Se ejecutó `infra/desplegar.ps1` y ambas construcciones finalizaron correctamente. La construcción final fue `83af8000-b60b-478b-8d34-509b20b0836b`. La aplicación final cambió las dos revisiones sin crear ni borrar recursos:

- API: `api-00002-nc2`, imagen `healthbyte/api:e7bdc5f`.
- Web: `healthbyte-web-00003-n5p`, imagen `healthbyte/web:e7bdc5f`.

Ambas imágenes están en `us-east1-docker.pkg.dev/healthbyte-510314/`. El script está en main. La revisión de este chat se programó cada 20 minutos para traer main, verificar y redesplegar, informando el commit y la URL.

## Comprobaciones

- Antes de cada push: `npm run tipos`, `npm test` y `npm run build` en `web/`, todos correctos; la versión integrada tiene **21 pruebas**.
- `terraform -chdir=infra fmt -check`, `terraform -chdir=infra validate`, análisis de sintaxis de PowerShell y `git diff --check`: correctos.
- `/entrar` se observó vacío antes de implementar el login. Después, el botón público abre el formulario y el acceso directo también funciona.
- Login real con usuarios ficticios de la siembra: abre `/` y muestra las cirugías de la clínica. Con sesión, `/entrar` redirige a `/`. Se cerró la sesión de prueba.
- Credenciales incorrectas: aparece «La clínica, el usuario o la contraseña no coinciden. Revise los tres y vuelva a intentar.»
- Login de 390 px: ancho de contenido y viewport iguales, sin desbordamiento horizontal. Revisión de escritorio de 1280 px correcta.
- `/api/salud` responde `{"ok":true}` a través del proxy de la web. La referencia de Jev en la revisión de API apunta a la versión 2.

## Desviaciones y límites

El plan original asumía crear un proyecto nuevo; se importó el proyecto existente en lugar de duplicarlo. El permiso de construcción se aplicó de forma puntual antes de construir las imágenes. El servicio existente se incorporó al estado principal para actualizarlo sin reemplazar su URL. No se ejecutó `terraform destroy`.

La interpretación con Jev y la captura de micrófono no se ensayaron en esta entrega; el login, la base y el proxy sí. Sus pruebas de extremo a extremo corresponden al ensayo del sistema completo. Se deben conservar el estado local y `infra/terraform.tfvars`, ambos fuera de Git, para las próximas actualizaciones.
