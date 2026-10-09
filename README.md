# flashtans-project

Flash Tans e-commerce app (Node.js + MySQL) deployed with Docker Compose, Docker Swarm on Azure, and Kubernetes (Minikube, then AKS). The full write-up is in `FlashTans_Project_Part_II_Report_Kane.pdf`.

| Path | Purpose |
| --- | --- |
| `flashtans-app/Dockerfile` | Multi-stage image: `node:22-alpine`, curl health check, non-root `node` user (Part 2) |
| `flashtans-app/docker-compose.yml` | Local stack: app + single MySQL with a named volume (Part 3) |
| `docker-compose.yml` | Swarm stack: 2 app replicas, overlay network, MySQL pinned to `swarm-db`, external secrets (Part 4) |
| `mysql/my.cnf` | Group Replication config (shipped to Kubernetes as `k8s/mysql-configmap.yaml`) |
| `k8s/` | Kubernetes manifests (Part 5), listed below |

| Manifest | Object | Purpose |
| --- | --- | --- |
| `00-namespace.yaml` | Namespace | `flashtans` namespace, applied first |
| `secret.yaml` | Secret | MySQL root and application credentials |
| `mysql-configmap.yaml` | ConfigMap | `my.cnf` enabling Group Replication |
| `mysql-headless-svc.yaml` | Headless Service | DNS discovery between MySQL pods |
| `mysql-statefulset.yaml` | StatefulSet | Three MySQL replicas with persistent storage |
| `mysql-router.yaml` | Service | ClusterIP Service `mysql` selecting the primary pod (`mysql-0`) |
| `app-configmap.yaml` | ConfigMap | Non-secret app settings (DB host, port, name) |
| `app-deployment.yaml` | Deployment | Stateless Node.js application pods |
| `app-service.yaml` | Service (LoadBalancer) | Exposes the application to the internet |
| `app-hpa.yaml` | HorizontalPodAutoscaler | Scales the app between 3 and 10 pods at 70% CPU |

## How passwords are handled

No password is stored in a compose file or image.

| Environment | Mechanism | Where values come from |
| --- | --- | --- |
| Docker Compose | Compose secrets mounted at `/run/secrets/*` | `secrets/*.txt` (git-ignored) |
| Docker Swarm | External secrets `db_root_password`, `db_password` (encrypted in the Raft log), mounted at `/run/secrets/*` | `docker secret create` on the manager |
| Kubernetes | `Secret/mysql-secret`, injected with `secretKeyRef` | `k8s/secret.yaml` |

MySQL reads `MYSQL_ROOT_PASSWORD_FILE` / `MYSQL_PASSWORD_FILE`; the app reads `DB_PASSWORD_FILE` and falls back to `DB_PASSWORD`.

## 1. Build and push the image

```bash
cd flashtans-app
docker build -t sifen23/kane-flashtans-app:latest --push .
```

## 2. Local stack (Docker Compose)

```bash
mkdir -p secrets
printf '%s' 'choose-a-root-password' > secrets/db_root_password.txt
printf '%s' 'choose-an-app-password' > secrets/db_password.txt

cd flashtans-app
docker compose up -d --build                  # app on http://localhost:3000
docker compose down && docker compose up -d   # data persists in the mysql_data volume
```

## 3. Docker Swarm on Azure

Point the local Docker client at the manager, create the secrets, and deploy from the project root:

```bash
docker context create kane-swarm-flashtans --docker "host=ssh://flashtans@<swarm-manager-public-ip>"
docker context use kane-swarm-flashtans

docker secret create db_root_password secrets/db_root_password.txt
docker secret create db_password secrets/db_password.txt
docker stack deploy -c docker-compose.yml group-kane-flashtans   # "Ignoring unsupported options: build" is expected
docker stack services group-kane-flashtans
```

The app is published on port 80 of every node, behind `swarm-lb`. The image must be built from this repo, because older images cannot read `DB_PASSWORD_FILE`. To deploy a different tag, set `APP_IMAGE=<image>` before `docker stack deploy`.

MySQL only reads its passwords when it initializes an empty volume. If `group-kane-flashtans_mysql_data` already exists on `swarm-db`, create the secrets with the passwords it was first started with, or remove that volume to re-initialize.

## 4. Kubernetes (Minikube, then AKS)

Replace the `CHANGE_ME` values in `k8s/secret.yaml`, then from `k8s/`:

```bash
kubectl apply -f .
kubectl get pods,svc,hpa -n flashtans
```

Bootstrap Group Replication by exec-ing into `mysql-0`, then join `mysql-1` and `mysql-2`. Minikube has no cloud load balancer, so expose the app there with NodePort or `minikube tunnel`.

On AKS, the same manifests apply unchanged:

```bash
az aks get-credentials -g Flashtans -n miniAKSversion
kubectl apply -f .
```

### Flash-sale simulation

```bash
kubectl run ab-load -n flashtans --rm -it --restart=Never --image=httpd:2.4-alpine -- \
  /usr/local/apache2/bin/ab -n 20000 -c 500 http://<aks-lb-ip>/
kubectl get hpa -n flashtans -w
kubectl delete pod -n flashtans <app-pod-name>
kubectl delete pod -n flashtans mysql-1
```
