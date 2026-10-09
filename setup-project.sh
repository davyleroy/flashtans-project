#!/bin/bash

mkdir -p app \
docker \
swarm \
k8s \
mysql \
azure \
scripts \
docs \
report \
evidence/{azure,docker,compose,swarm,kubernetes-local,aks,mysql,hpa,failure-tests,final}

touch flashtans-app/Dockerfile \
docker-compose.yml \
flashtans-app/docker-compose.yml \
k8s/00-namespace.yaml \
k8s/app-configmap.yaml \
k8s/app-deployment.yaml \
k8s/app-service.yaml \
k8s/app-hpa.yaml \
k8s/secret.yaml \
k8s/mysql-configmap.yaml \
k8s/mysql-headless-svc.yaml \
k8s/mysql-router.yaml \
k8s/mysql-statefulset.yaml \
mysql/my.cnf

echo "Project structure created."
