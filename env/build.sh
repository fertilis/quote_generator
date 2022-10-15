#!/bin/bash

PROJECT='quote_generator'
IMAGE_NAME=$PROJECT
BUILDDIR=$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )/../

cd $BUILDDIR
echo `pwd`
find ./src -name __pycache__ -print0 | sudo xargs -0 rm -r || true
find ./src -name *.pyc -print0 | sudo xargs -0 rm || true

docker build -t $IMAGE_NAME -f $BUILDDIR/env/Dockerfile $BUILDDIR
