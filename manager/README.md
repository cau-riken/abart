# ([ANTs](https://github.com/ANTsX/ANTs.git) based) Atlas Registration Tool - Manager tier

This is the backend in charge of performing registration.
It exposes a Rest API used by the I to manage/monitor registration tasks.
It create sibling docker container on-demand for the actual registration processing

## Build the Docker image

This 2 stage Dockerfile will build the manager from sources within a transient container

```sh
sudo docker build  --force-rm --no-cache -f Dockerfile.build -t rikencau/abart-manager .
```

## Run Manager 

Open a terminal to start Manager container :

```sh
#go to the cloned repo directory
cd abart
manager/manager_start.sh
```

**Note** : Manager will produce logs on the console while it is running; It can be stopped by hitting [Ctrl]-[C] key in its terminal window.




Using `bash` command line interpreter :

```bash
cd manager

# set environment variable needed by manager
set -o allexport; source abart-manager.env ; set +o allexport;

# create a private virtual network to link manager to worker(s) (no access to external network)
sudo docker network create --driver bridge --internal ${ABART_PRIVATE_NET}

# start manager (in detached mode) connected to the private virtual network exposing its rest API
sudo docker run --rm -d  \
 --name abart-manager  \
 --env-file abart-manager.env \
 -v /var/run/docker.sock:/var/run/docker.sock  \
 -v ${ABART_WORK_VOL}:${ABART_BASE_WORKDIR}:rw \
 -p ${ABART_MGR_XPRT_PORT}:${ABART_MGR_LSTN_PORT}  \
 --net ${ABART_PRIVATE_NET} \
 rikencau/abart-manager:latest
```

### for debug mode, in order to be able to reach API, connect manager to default bridge network 

```bash
# connect manager to default bridge network 
sudo docker network connect bridge abart-manager

sudo docker attach abart-manager
```

### check if it's accessible

```bash
curl -X GET -i http://localhost:${ABART_MGR_XPRT_PORT}/api/version
```
