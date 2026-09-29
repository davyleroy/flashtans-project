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

touch Dockerfile \
docker-compose.yml \
docker-compose-swarm.yml \
k8s/namespace.yaml \
k8s/app-configmap.yaml \
k8s/app-deployment.yaml \
k8s/app-service.yaml \
k8s/app-hpa.yaml \
k8s/mysql-secret.yaml \
k8s/mysql-configmap.yaml \
k8s/mysql-headless-service.yaml \
k8s/mysql-service.yaml \
k8s/mysql-statefulset.yaml \
mysql/my.cnf

echo "Project structure created."
