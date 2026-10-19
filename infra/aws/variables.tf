variable "region" {
  type    = string
  default = "us-east-1"
}

variable "instance_type" {
  type        = string
  default     = "t3.medium" # Laravel + MySQL + Vite build need ~2 GB RAM
  description = "EC2 size"
}

variable "allowed_cidr" {
  type        = string
  description = "CIDR allowed to reach the app, e.g. \"203.0.113.7/32\" (your public IP). No default on purpose."
}

variable "repo_url" {
  type        = string
  description = "Git URL of this repository (must be cloneable from the instance)"
}

variable "repo_branch" {
  type    = string
  default = "main"
}

variable "seeded_bugs" {
  type        = bool
  default     = true
  description = "true = deploy the build with seeded bugs, false = fixed build"
}
