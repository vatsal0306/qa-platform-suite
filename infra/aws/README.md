# AWS deployment (EC2 + Docker Compose)

Single EC2 instance running the same `docker-compose.yml` (MySQL + Laravel + React). Cheapest option that still gives
a real cloud environment to test against.

```bash
cd infra/aws
terraform init
terraform apply -var 'allowed_cidr=<your.public.ip>/32' -var 'repo_url=https://github.com/<you>/qa-platform-suite.git'
# outputs: web_url, api_url  (allow ~5 minutes for the first docker build)
```
Then run **Actions > Test deployed AWS environment** with the two URLs (`expect=fail` for the seeded build,
`expect=pass` after redeploying with `-var seeded_bugs=false`). Destroy when done: `terraform destroy`.

Notes
- The app has deliberate vulnerabilities, so `allowed_cidr` has no default and should be your own IP.
- Upgrade path: swap the MySQL container for **RDS MySQL** (set `DB_HOST` to the RDS endpoint) or move the services to **ECS Fargate**;
  the test suites only need the two URLs.
- Oracle XE is not deployed to AWS: the PL/SQL validation runs against the Oracle XE container in CI (or locally), using data exported from the API.
