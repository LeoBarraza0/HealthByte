locals {
  imagen        = "${var.region}-docker.pkg.dev/${var.project_id}/healthbyte"
  con_servicios = var.tag != ""
}

resource "google_cloud_run_v2_service" "api" {
  count                = local.con_servicios ? 1 : 0
  project              = google_project.p.project_id
  name                 = "api"
  location             = var.region
  ingress              = "INGRESS_TRAFFIC_ALL"
  deletion_protection  = false
  invoker_iam_disabled = true # público: la app tiene su propio login
  labels               = local.etiquetas

  template {
    service_account = google_service_account.api.email
    timeout         = "3600s" # WebSocket de una cirugía larga
    scaling {
      min_instance_count = var.api_min_instancias
      max_instance_count = 1 # las salas viven en memoria
    }
    volumes {
      name = "cloudsql"
      cloud_sql_instance {
        instances = [google_sql_database_instance.db.connection_name]
      }
    }
    containers {
      image = "${local.imagen}/api:${var.tag}"
      resources {
        limits = { cpu = "1", memory = "512Mi" }
      }
      env {
        name  = "NODE_ENV"
        value = "production"
      }
      env {
        name  = "PGHOST"
        value = "/cloudsql/${google_sql_database_instance.db.connection_name}"
      }
      env {
        name  = "PGUSER"
        value = google_sql_user.app.name
      }
      env {
        name  = "PGDATABASE"
        value = google_sql_database.app.name
      }
      env {
        name  = "GOOGLE_CLOUD_PROJECT"
        value = var.project_id
      }
      env {
        name = "PGPASSWORD"
        value_source {
          secret_key_ref {
            secret  = google_secret_manager_secret.db.secret_id
            version = "latest"
          }
        }
      }
      env {
        name = "SESION_SECRETO"
        value_source {
          secret_key_ref {
            secret  = google_secret_manager_secret.sesion.secret_id
            version = "latest"
          }
        }
      }
      env {
        name = "JEV_API_KEY"
        value_source {
          secret_key_ref {
            secret  = google_secret_manager_secret.jev.secret_id
            version = var.jev_version
          }
        }
      }
      volume_mounts {
        name       = "cloudsql"
        mount_path = "/cloudsql"
      }
    }
  }
  depends_on = [
    google_project_iam_member.api,
    google_secret_manager_secret_version.db,
    google_secret_manager_secret_version.sesion,
  ]
}

resource "google_cloud_run_v2_service" "web" {
  count                = local.con_servicios ? 1 : 0
  project              = google_project.p.project_id
  name                 = "healthbyte-web"
  location             = var.region
  ingress              = "INGRESS_TRAFFIC_ALL"
  deletion_protection  = false
  invoker_iam_disabled = true
  labels               = local.etiquetas

  template {
    timeout = "3600s"
    scaling {
      max_instance_count = 2
    }
    containers {
      image = "${local.imagen}/web:${var.tag}"
      resources {
        limits = { cpu = "1", memory = "512Mi" }
      }
      env {
        name  = "API_URL"
        value = google_cloud_run_v2_service.api[0].uri
      }
      env {
        name  = "API_HOST"
        value = trimprefix(google_cloud_run_v2_service.api[0].uri, "https://")
      }
    }
  }
}

output "web_url" {
  value = try(google_cloud_run_v2_service.web[0].uri, null)
}
