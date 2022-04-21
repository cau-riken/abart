#!/bin/bash
DIRNAME=`dirname $0`
cd ${DIRNAME}

function openBrowser()
{
  URL=$1
  if [[ "$OSTYPE" == "linux"* ]];
  then

    if which xdg-open > /dev/null
    then
      xdg-open $URL
    elif which gnome-open > /dev/null
    then
      gnome-open $URL
    else
      #display URL if could not open it automatically
      echo URL
    fi

  elif [[ "$OSTYPE" == "darwin"* ]]; 
  then

    open $URL

  else
    #display URL if could not open it automatically
    echo URL
  fi
}


#global settings
ABART_PRIVATE_NET=abart-net
ABART_MGR_LSTN_PORT=10000
ABART_UPLOAD_MAXSIZE='50M'
ABART_UI_URL='http://localhost:9090/'


echo "Looking for abart-manager ..."
#number of retry
retry="2"

while [ $retry -gt 0 ]
do
  retry=$[$retry-1]

  #retrieve Manager IP address on private network
  ABART_MGR_IP=$(sudo docker inspect --format='{{(index .NetworkSettings.Networks "'${ABART_PRIVATE_NET}'").IPAddress}}' abart-manager 2> /dev/null)
  if  [ -z ${ABART_MGR_IP} ] 
  then
      if [ $retry -le 0 ]
      then
        echo "Manager not found, please check it is correctly started!"
        exit 1
      else
        #wait a litle and retry silently
        sleep 2
      fi
  fi
done

printf ' abart-ui\t'
sudo docker run -it --rm -d --name abart-ui \
  --net abart-net -p 9090:80 \
  --env ABART_MGR_IP=${ABART_MGR_IP} \
  --env ABART_MGR_PORT=${ABART_MGR_LSTN_PORT} \
  --env ABART_UPLOAD_MAXSIZE=${ABART_UPLOAD_MAXSIZE} \
  rikencau/abart-ui

sudo docker network connect bridge abart-ui

# attach console to container to display logs 
sudo docker attach abart-ui

openBrowser $ABART_UI_URL