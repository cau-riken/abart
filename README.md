# AbART - [ANTs](https://github.com/ANTsX/ANTs.git) based Atlas Registration Tool

## Overview

This is a web based interactive tool to register MRI volumes to the Marmoset Atlas.

Users can load and visualize their MRI volumes (NIfTI-1 format), interactively reorient them (to allow correct registration), then submit for registration & transformation, and finally retrieve their image volume transformed in the Atlas space.

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

2. Start the Docker stack :

```sh
#go to the cloned repo directory
cd abart
./start.sh
```

**Notes** :

* the UI should automatically open in your web-browser, at this url: http://localhost:9090/index.html
* The containers can be stopped by pressing `[Ctrl]+[C]` key in the terminal window.
* Manager process will produce logs on the terminal console while it is running.

## Usage

### Basics: load a NIfTI file, and switch view modes

### 2D slices view mode

### 3D slices view mode and brain model

### Registration to Brain Atlas

### Guided alignment using Landmarks




