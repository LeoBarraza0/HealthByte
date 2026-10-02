variable "project_id" {
  type        = string
  description = "ID nuevo y único, por ejemplo healthbyte-hack-1001. Un ID borrado no se puede reusar durante 30 días."
}

variable "billing_account" {
  type        = string
  description = "Cuenta de facturación personal (gcloud billing accounts list)."
}

variable "cuenta_esperada" {
  type        = string
  description = "Correo de la cuenta personal. Si Terraform corre con otra cuenta, aborta."
}

variable "region" {
  type    = string
  default = "us-east1"
}

variable "tag" {
  type        = string
  default     = ""
  description = "Tag de las imágenes. Vacío: no se crean los servicios de Cloud Run."
}

variable "jev_version" {
  type        = string
  default     = "latest"
  description = "Versión habilitada de Jev; el script fija su número para desplegar las rotaciones."
}

variable "api_min_instancias" {
  type        = number
  default     = 0
  description = "1 el día de la demo, para evitar el arranque en frío."
}

variable "moneda_presupuesto" {
  type        = string
  default     = "USD"
  description = "Debe coincidir con la moneda de la cuenta de facturación."
}

variable "presupuesto" {
  type    = number
  default = 25
}
