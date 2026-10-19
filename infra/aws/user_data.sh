#!/bin/bash
set -euxo pipefail
dnf install -y docker git
systemctl enable --now docker
mkdir -p /usr/local/lib/docker/cli-plugins
curl -fsSL https://github.com/docker/compose/releases/download/v2.29.7/docker-compose-linux-x86_64 \
  -o /usr/local/lib/docker/cli-plugins/docker-compose
chmod +x /usr/local/lib/docker/cli-plugins/docker-compose

git clone --branch "${repo_branch}" "${repo_url}" /opt/qa
cd /opt/qa
echo "SEEDED_BUGS=${seeded_bugs}" > .env
docker compose up -d --build mysql api web
