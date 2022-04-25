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

https://user-images.githubusercontent.com/64643044/165005907-79406434-4d7c-478a-a578-e546b8788040.mp4


### 2D slices view mode

https://user-images.githubusercontent.com/64643044/165005933-e27635f4-7ae2-4647-94da-7a37a74ad937.mp4


### 3D slices view mode and brain model

https://user-images.githubusercontent.com/64643044/165005944-136eeefc-7e92-436e-901f-6040f750cd83.mp4


### Registration to Brain Atlas

https://user-images.githubusercontent.com/64643044/165005960-5882149c-8d59-494d-800f-18b6b8eb5f2d.mp4


### Guided alignment using Landmarks

https://user-images.githubusercontent.com/64643044/165005974-605304c1-a6cd-4a38-86af-93f18a7780cb.mp4


