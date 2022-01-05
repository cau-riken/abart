#!/bin/bash
DIRNAME=`dirname $0`
cd ${DIRNAME}

#global settings
ABART_PRIVATE_NET=abart-net
ABART_MGR_LSTN_PORT=10000
ABART_UPLOAD_MAXSIZE='50M'

#retrieve Manager IP address on private network
ABART_MGR_IP=`sudo docker inspect --format='{{(index .NetworkSettings.Networks "'${ABART_PRIVATE_NET}'").IPAddress}}' abart-manager`
if  [ -z ${ABART_MGR_IP} ] 
then
    echo "Manager not found, please check it is correctly started!"
    exit 1
fi

sudo docker run -it --rm -d --name abart-ui \
  --net abart-net -p 9090:80 \
  --env ABART_MGR_IP=${ABART_MGR_IP} \
  --env ABART_MGR_PORT=${ABART_MGR_LSTN_PORT} \
  --env ABART_UPLOAD_MAXSIZE=${ABART_UPLOAD_MAXSIZE} \
  rikencau/abart-ui

sudo docker network connect bridge abart-ui

# attach console to container to display logs 
sudo docker attach abart-ui

