terraform {
  required_version = ">= 1.6"
  required_providers {
    google = { source = "hashicorp/google", version = "~> 7.0" }
    random = { source = "hashicorp/random", version = "~> 3.7" }
    time   = { source = "hashicorp/time", version = "~> 0.12" }
  }
}

# Credenciales: GOOGLE_OAUTH_ACCESS_TOKEN de la configuración de gcloud "healthbyte" (ver README).
provider "google" {
  region = var.region
}

# Solo para el presupuesto: la API de presupuestos exige un proyecto de cuota.
provider "google" {
  alias                 = "facturacion"
  region                = var.region
  user_project_override = true
  billing_project       = var.project_id
}

locals {
  etiquetas = { proyecto = "healthbyte" }
  apis = [
    "run.googleapis.com", "sqladmin.googleapis.com", "secretmanager.googleapis.com", "artifactregistry.googleapis.com",
    "speech.googleapis.com", "aiplatform.googleapis.com", "cloudbuild.googleapis.com", "compute.googleapis.com", "billingbudgets.googleapis.com", "iam.googleapis.com",
  ]
}

# Guardia: aborta antes de crear nada si la sesión de Google no es la cuenta personal.
data "google_client_openid_userinfo" "yo" {}

resource "terraform_data" "guardia_cuenta" {
  input = data.google_client_openid_userinfo.yo.email
  lifecycle {
    precondition {
      condition     = data.google_client_openid_userinfo.yo.email == var.cuenta_esperada
      error_message = "La sesión de Google no es la cuenta personal. Exporta GOOGLE_OAUTH_ACCESS_TOKEN con --configuration=healthbyte."
    }
  }
}

# Proyecto personal existente: se importa y se conserva su organización.
resource "google_project" "p" {
  project_id      = var.project_id
  name            = "HealthByte"
  billing_account = var.billing_account
  deletion_policy = "PREVENT"
  labels          = local.etiquetas
  depends_on      = [terraform_data.guardia_cuenta]
  lifecycle {
    ignore_changes = [org_id]
  }
}

resource "google_project_service" "apis" {
  for_each           = toset(local.apis)
  project            = google_project.p.project_id
  service            = each.value
  disable_on_destroy = false
}

# Las APIs recién activadas tardan en propagarse.
resource "time_sleep" "apis" {
  depends_on      = [google_project_service.apis]
  create_duration = "60s"
}

resource "google_artifact_registry_repository" "repo" {
  project       = google_project.p.project_id
  location      = var.region
  repository_id = "healthbyte"
  format        = "DOCKER"
  labels        = local.etiquetas
  depends_on    = [time_sleep.apis]
}

# Reutiliza la cuenta de construcción de la primera publicación.
data "google_service_account" "construccion" {
  project    = var.project_id
  account_id = "healthbyte-build"
}

resource "google_artifact_registry_repository_iam_member" "construccion" {
  project    = var.project_id
  location   = var.region
  repository = google_artifact_registry_repository.repo.repository_id
  role       = "roles/artifactregistry.writer"
  member     = "serviceAccount:${data.google_service_account.construccion.email}"
}

resource "google_sql_database_instance" "db" {
  project             = google_project.p.project_id
  name                = "healthbyte-db"
  region              = var.region
  database_version    = "POSTGRES_16"
  deletion_protection = false
  settings {
    edition           = "ENTERPRISE"
    tier              = "db-f1-micro"
    availability_type = "ZONAL"
    disk_type         = "PD_HDD"
    disk_size         = 10
    disk_autoresize   = false
    user_labels       = local.etiquetas
    backup_configuration {
      enabled = false
    }
    ip_configuration {
      ipv4_enabled = true # sin redes autorizadas: Cloud Run entra por el conector de Cloud SQL
    }
  }
  depends_on = [time_sleep.apis]
}

resource "google_sql_database" "app" {
  project  = google_project.p.project_id
  instance = google_sql_database_instance.db.name
  name     = "healthbyte"
}

resource "random_password" "db" {
  length  = 24
  special = false
}

resource "random_password" "sesion" {
  length  = 48
  special = false
}

resource "google_sql_user" "app" {
  project  = google_project.p.project_id
  instance = google_sql_database_instance.db.name
  name     = "healthbyte"
  password = random_password.db.result
}

resource "google_secret_manager_secret" "jev" {
  project   = google_project.p.project_id
  secret_id = "jev-api-key" # el valor se carga a mano con gcloud: nunca pasa por el estado de Terraform
  labels    = local.etiquetas
  replication {
    auto {}
  }
  depends_on = [time_sleep.apis]
}

resource "google_secret_manager_secret" "db" {
  project   = google_project.p.project_id
  secret_id = "db-password"
  labels    = local.etiquetas
  replication {
    auto {}
  }
  depends_on = [time_sleep.apis]
}

resource "google_secret_manager_secret_version" "db" {
  secret      = google_secret_manager_secret.db.id
  secret_data = random_password.db.result
}

resource "google_secret_manager_secret" "sesion" {
  project   = google_project.p.project_id
  secret_id = "sesion-secreto"
  labels    = local.etiquetas
  replication {
    auto {}
  }
  depends_on = [time_sleep.apis]
}

resource "google_secret_manager_secret_version" "sesion" {
  secret      = google_secret_manager_secret.sesion.id
  secret_data = random_password.sesion.result
}

resource "google_service_account" "api" {
  project      = google_project.p.project_id
  account_id   = "healthbyte-api"
  display_name = "API de HealthByte"
  depends_on   = [time_sleep.apis]
}

resource "google_project_iam_member" "api" {
  for_each = toset(["roles/cloudsql.client", "roles/speech.client", "roles/secretmanager.secretAccessor", "roles/aiplatform.user"])
  project  = google_project.p.project_id
  role     = each.value
  member   = "serviceAccount:${google_service_account.api.email}"
}

resource "google_billing_budget" "tope" {
  provider        = google.facturacion
  billing_account = var.billing_account
  display_name    = "healthbyte-hackathon"
  budget_filter {
    projects = ["projects/${google_project.p.number}"]
  }
  amount {
    specified_amount {
      currency_code = var.moneda_presupuesto
      units         = tostring(var.presupuesto)
    }
  }
  threshold_rules {
    threshold_percent = 0.5
  }
  threshold_rules {
    threshold_percent = 0.9
  }
  threshold_rules {
    threshold_percent = 1.0
  }
  depends_on = [time_sleep.apis]
}
