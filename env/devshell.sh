#!/bin/bash

SRC_DIR=$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )/../src

docker run \
    -it \
    --rm \
    --name quote_generator \
    -v $SRC_DIR:/app \
    -e COLUMNS="`tput cols`" -e LINES="`tput lines`" \
    -e TERM=$TERM \
    --network=host \
    quote_generator:latest
