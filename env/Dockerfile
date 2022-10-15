FROM ubuntu:18.04

RUN set -ex \
    && apt-get update \
    \
    \
    && echo "Setting up locale" \
    && apt-get install -y --no-install-recommends \
	locales \
    && locale-gen en_US.utf8 \
    \
    \
    && echo "Installing python and pip" \
    && apt-get install -y --no-install-recommends \
        software-properties-common \
        curl \
    && DEBIAN_FRONTEND=noninteractive add-apt-repository ppa:deadsnakes/ppa \
    && apt-get update \
    && apt-get install -y --no-install-recommends \
        python3.10 \
        python3.10-distutils \
    && curl -sS https://bootstrap.pypa.io/get-pip.py | python3.10 \
    \
    \
    && echo "Installing python packages" \
    && pip3 install \
        flask \
        flask-socketio \
        numpy \
        simple-websocket \
    \
    \
    && rm -rf /var/lib/apt/lists/*  

ENV LANG=en_US.UTF-8

WORKDIR /app

#CMD ["python3.10", "/app/main.py", "--port=80"]

COPY src /app
