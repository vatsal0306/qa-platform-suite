terraform {
  required_version = ">= 1.5"
  required_providers {
    aws = { source = "hashicorp/aws", version = "~> 5.0" }
  }
}

provider "aws" {
  region = var.region
}

# Latest Amazon Linux 2023 AMI
data "aws_ssm_parameter" "al2023" {
  name = "/aws/service/ami-amazon-linux-latest/al2023-ami-kernel-default-x86_64"
}

data "aws_vpc" "default" {
  default = true
}

# The app contains deliberate vulnerabilities (IDOR, user enumeration): only ever open it to YOUR address.
resource "aws_security_group" "qa" {
  name        = "qa-platform-suite"
  description = "QA practice app - restricted to the tester"
  vpc_id      = data.aws_vpc.default.id

  ingress {
    description = "React UI"
    from_port   = 5173
    to_port     = 5173
    protocol    = "tcp"
    cidr_blocks = [var.allowed_cidr]
  }
  ingress {
    description = "Laravel API"
    from_port   = 8000
    to_port     = 8000
    protocol    = "tcp"
    cidr_blocks = [var.allowed_cidr]
  }
  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }
}

resource "aws_instance" "qa" {
  ami                    = data.aws_ssm_parameter.al2023.value
  instance_type          = var.instance_type
  vpc_security_group_ids = [aws_security_group.qa.id]

  # IMDSv2 only
  metadata_options {
    http_tokens = "required"
  }

  root_block_device {
    volume_size = 20
    encrypted   = true
  }

  user_data = templatefile("${path.module}/user_data.sh", {
    repo_url     = var.repo_url
    repo_branch  = var.repo_branch
    seeded_bugs  = var.seeded_bugs
  })
  user_data_replace_on_change = true

  tags = { Name = "qa-platform-suite" }
}
