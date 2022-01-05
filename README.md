# AbART - [ANTs](https://github.com/ANTsX/ANTs.git) based Atlas Registration Tool

## Overview

This is a web based interactive tool to register MRI volumes to the Marmoset Atlas.

Users can load and visualize their MRI volumes (NIfTI-1 format), interactively reorient them (to allow correct registration), then submit registration, and finally retrieve registered volume.

It is implemented following a multi-container architecture, since actual registration process are intended to run remotely, but it can also be used in "Desktop" mode where all components run on the same machine.

<br/>

## Run in "Desktop" mode 

**Prerequisite**: `git` and `docker` must be installed and working.

1. clone this repo to get the scripts :

```sh
#shallow clone this repo
git clone --depth 1 https://github.com/cau-riken/abart.git

# pull published images before starting 
sudo docker pull rikencau/abart-worker:latest
sudo docker pull rikencau/abart-manager:latest
sudo docker pull rikencau/abart-ui:latest
```

2. Open a terminal to start manager back-end :

```sh
#go to the cloned repo directory
cd abart
manager/manager_start.sh
```

3. Open another terminal to start UI server :

```sh
#go to the cloned repo directory
cd abart
ui/ui_start.sh
```

4. Open the UI in your web-browser : http://localhost:9090/index.html

```sh
xdg-open http://localhost:9090/index.html
```

**Note** : both Manager and UI server will produce logs on the console while they are running; They can be stopped by hitting [Ctrl]-[C] key in their terminal window.



