# AbART - [ANTs](https://github.com/ANTsX/ANTs.git) based Atlas Registration Tool

## Overview

This is a web based interactive tool to register MRI volumes to the Marmoset Atlas.

Users can load and visualize their MRI volumes (NIfTI-1 format), interactively reorient them (to allow correct registration), then submit for registration & transformation, and finally retrieve their image volume transformed in the Atlas space.

It is implemented following a multi-container architecture, since actual registration process are intended to run remotely, but it can also be used in "Desktop" mode where all components run on the same machine.

<br/>

## Run in "Desktop" mode

### **Prerequisites**, that must be installed and working

* For linux Users:  
 `git` and `docker`

* For macOS Users:  
 `git` and **Docker Desktop**

* For Windows Users:  
 `wsl2` and **Docker Desktop**


**Important note:**

Be sure that you and your organization comply with the licensing terms of Docker, especially if you are intending to use **Docker Desktop**.

see: 
* https://www.docker.com/pricing/faq/#subscriptionandlicensing
* https://www.docker.com/legal/docker-subscription-service-agreement/
___

#### **Extra steps for MS-Windows user only**

AbART is run under WSL (Windows Subsystem for Linux), allowing to use the same commands as the Linux and macOS ones (described in next section).  
Therefore, a few extra steps are necessary to properly setup `wsl` and Docker Desktop, as follow:

* Install `wsl` (see <https://docs.microsoft.com/en-us/windows/wsl/install>), then set default version to 2 (`wsl --set-default-version 2`).
* Then install a linux distro from Microsoft store (<https://aka.ms/wslstore>).
Note: Since Docker WSL integration relies on `glibc`, we recommend to use **Ubuntu 22.04LTS** over the lighter Alpine distro that won't work by default for our purpose.
* Set the linux distro including glibc as the default one (e.g. `wsl --set-default Ubuntu-22.04`), and ensure that Docker integration WSL with default distro is enabled (see <https://docs.docker.com/desktop/windows/wsl/#enabling-docker-support-in-wsl-2-distros>).

* Note: Several reboots might be necessary after installation of the different components.

* Start a new terminal running the default distro (shortcut [Windows]+R, then type `wsl`),
* ( Depending on the distro used, `git` needs to be installed if not shipped by default. )

* Execute the following commands in at the `wsl` terminal prompt.

___

### Steps to follow

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

**Tested configurations:**

* Linux Ubuntu 22.04lts, Docker Engine v20.10.8 / Firefox 100 & Chromium 101.
* macOs Big Sur 11.6.6, Docker Desktop v4.8.2 (Docker Engine v20.10.14) / Firefox 91.9.1esr & Chrome 101 & Safari 15.5, but for performance reasons, the use of **Safari is not recommended**.
* Windows 10.0 (build 19043), Docker Desktop v4.9.0 (WSL2) / Firefox v101.0.1 & Edge v102.0.1245.39


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


