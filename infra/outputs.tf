output "proyecto" {
  value = google_project.p.project_id
}

output "registro" {
  value = "${var.region}-docker.pkg.dev/${google_project.p.project_id}/healthbyte"
}

output "conexion_sql" {
  value = google_sql_database_instance.db.connection_name
}
