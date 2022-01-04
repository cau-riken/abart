# (ANTs based) Atlas Registration Tool - UI tier

Web SPA allowing to visualize MRI volume (NIfTI-1 format), interactively reorient it (to allow correct registration), then submit registration, and finally retrieve registered volume.

 (Depending on Manager's configuration, the actual registration process is performed locally or on a remote server)


# build 
```sh
sudo docker build  --force-rm --no-cache --network=host -f Dockerfile.ui -t rikencau/abart-ui .
```

# Run in "Desktop" mode 

In this mode, all containers are running on the same machine.

⚠️ **Important Note** : Manager container should be started at this point

```sh
#global settings
ABART_PRIVATE_NET=abart-net
ABART_MGR_LSTN_PORT=10000
ABART_UPLOAD_MAXSIZE='50M'

#retrieve Manager IP address on private network
ABART_MGR_IP=`sudo docker inspect --format='{{(index .NetworkSettings.Networks "'${ABART_PRIVATE_NET}'").IPAddress}}' abart-manager`

sudo docker run -it --rm -d --name abart-ui \
  --net abart-net -p 9090:80 \
  --env ABART_MGR_IP=${ABART_MGR_IP} \
  --env ABART_MGR_PORT=${ABART_MGR_LSTN_PORT} \
  --env ABART_UPLOAD_MAXSIZE=${ABART_UPLOAD_MAXSIZE} \
  rikencau/abart-ui

sudo docker network connect bridge abart-ui

sudo docker attach abart-ui
```


Open the UI in your web-browser: http://localhost:9090/index.html
