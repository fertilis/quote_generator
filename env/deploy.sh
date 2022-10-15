#!/bin/bash

HOST="${1:-185.105.89.11}"
REGISTRY_PREFIX="${2:-fertilis}"
DIR=$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )/

$DIR/build.sh

docker tag quote_generator $REGISTRY_PREFIX/quote_generator:latest
docker push $REGISTRY_PREFIX/quote_generator:latest

cat <<EOM | ssh root@$HOST -T
docker stop quote_generator || true
docker rmi $REGISTRY_PREFIX/quote_generator:latest || true
docker pull $REGISTRY_PREFIX/quote_generator:latest
docker run --name=quote_generator --rm -d -p 80:80 $REGISTRY_PREFIX/quote_generator python3.10 /app/main.py --port=80
EOM
