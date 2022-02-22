# ([ANTs](https://github.com/ANTsX/ANTs.git) based) Atlas Registration Tool - Manager tier

This is the backend in charge of performing registration.
It exposes a Rest API used by the I to manage/monitor registration tasks.
It create sibling docker container on-demand for the actual registration processing

## Build the Docker image

This 2 stage Dockerfile will build the manager from sources within a transient container

```sh
sudo docker build  --force-rm --no-cache -f Dockerfile.manager -t rikencau/abart-manager .
```

## Run Manager 

Open a terminal to start Manager container :

```sh
#go to the cloned repo directory
cd abart
manager/manager_start.sh
```

**Note** : Manager will produce logs on the console while it is running; It can be stopped by hitting [Ctrl]-[C] key in its terminal window.

