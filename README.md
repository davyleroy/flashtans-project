# flashtans-project

Flash Tans e-commerce app (Node.js + MySQL) deployed with Docker Compose, Docker Swarm on Azure, and Kubernetes (Docker Desktop, then AKS).

| Path | Purpose |
| --- | --- |
| `flashtans-app/Dockerfile` | Multi-stage image, runs as non-root `node` |
| `docker-compose.yml` | Local single-node stack (Part 3) |
| `docker-compose-swarm.yml` | Swarm stack: replicas, overlay network, external secrets (Part 4) |
| `mysql/my.cnf` | Group Replication config (mirrored in `k8s/mysql-configmap.yaml`) |
| `k8s/` | Namespace, ConfigMaps, Secret, MySQL StatefulSet + Services, app Deployment, LoadBalancer Service, HPA (Part 5) |

## How passwords are handled

No password is stored in a compose file or image.

| Environment | Mechanism | Where values come from |
| --- | --- | --- |
| Docker Compose | Compose secrets mounted at `/run/secrets/*` | `secrets/*.txt` (git-ignored) |
| Docker Swarm | External Swarm secrets (encrypted in the Raft log), mounted at `/run/secrets/*` | `docker secret create` on the manager |
| Kubernetes | `Secret/mysql-secret`, injected with `secretKeyRef` | `k8s/mysql-secret.yaml` |

MySQL reads `MYSQL_ROOT_PASSWORD_FILE` / `MYSQL_PASSWORD_FILE`; the app reads `DB_PASSWORD_FILE` and falls back to `DB_PASSWORD`.

## 1. Local stack (Docker Compose)

```bash
mkdir -p secrets
printf '%s' 'choose-a-root-password' > secrets/db_root_password.txt
printf '%s' 'choose-an-app-password' > secrets/db_password.txt

docker compose up -d --build     # app on http://localhost:3000
docker compose down && docker compose up -d   # data persists in the mysql_data volume
```

## 2. Build and push the image

```bash
docker build -t htugume/kane-flashtans-app:latest ./flashtans-app
docker push htugume/kane-flashtans-app:latest
```

## 3. Docker Swarm on Azure

Run against the manager (`docker context use swarm-manager`, or SSH in):

```bash
docker secret create db_root_password secrets/db_root_password.txt
docker secret create db_password secrets/db_password.txt
docker stack deploy -c docker-compose-swarm.yml group-kane-flashtans
docker stack services group-kane-flashtans
```

MySQL only reads its passwords when it initializes an empty volume. If `group-kane-flashtans_mysql_data` already exists on `swarm-db`, create the secrets with the passwords it was first started with, or remove that volume to re-initialize.

## 4. Kubernetes (Docker Desktop, then AKS)

Replace the `CHANGE_ME` values in `k8s/mysql-secret.yaml`, then:

```bash
kubectl apply -f k8s/
kubectl get pods,svc,hpa -n flashtans
```

Bootstrap Group Replication by exec-ing into `mysql-0`, then join `mysql-1` and `mysql-2`. The app is exposed by the `flashtans-app` LoadBalancer Service (`localhost` on Docker Desktop, a public IP on AKS).

For AKS, run `az aks get-credentials --resource-group <rg> --name <cluster>` and the same `kubectl apply -f k8s/`. The HPA needs metrics-server: AKS includes it, but Docker Desktop does not.

### Flash-sale simulation

```bash
ab -n 20000 -c 500 http://<aks-lb-ip>/
kubectl get hpa -n flashtans -w
kubectl delete pod -n flashtans <app-pod-name>
kubectl delete pod -n flashtans mysql-1
```
