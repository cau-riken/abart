#!/bin/bash
DIRNAME=`dirname $0`
cd ${DIRNAME}

# set environment variable needed by manager
set -o allexport; source abart-manager.env ; set +o allexport;

# create a virtual network to link manager to worker(s) (no access to external network)
sudo docker network rm  ${ABART_PRIVATE_NET}
sudo docker network create --driver bridge ${ABART_PRIVATE_NET}

# start manager (in detached mode) connected to the private virtual network exposing its rest API
printf ' abart-manager\t'
sudo docker run --rm -d  \
 --name abart-manager  \
 --env-file abart-manager.env \
 -v /var/run/docker.sock:/var/run/docker.sock  \
 -v ${ABART_WORK_VOL}:${ABART_BASE_WORKDIR}:rw \
 -p ${ABART_MGR_XPRT_PORT}:${ABART_MGR_LSTN_PORT}  \
 --net ${ABART_PRIVATE_NET} \
 rikencau/abart-manager:latest

# connect manager to default bridge network 
sudo docker network connect bridge abart-manager

# attach console to container to display logs 
sudo docker attach abart-manager

