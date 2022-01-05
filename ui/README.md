# ([ANTs](https://github.com/ANTsX/ANTs.git) based) Atlas Registration Tool - UI tier

Web SPA allowing to visualize MRI volume (NIfTI-1 format), interactively reorient it (to allow correct registration), then submit registration, and finally retrieve registered volume.

 (Depending on Manager's configuration, the actual registration process is performed locally or on a remote server)


# build 
```sh
sudo docker build  --force-rm --no-cache --network=host -f Dockerfile.ui -t rikencau/abart-ui .
```

# Run in "Desktop" mode 

In this mode, all containers are running on the same machine.

⚠️ **Important Note** : Manager container should be started at this point


Open a terminal to start UI server :
```sh
#go to the cloned repo directory
cd abart
ui/ui_start.sh
```

Open the UI in your web-browser : http://localhost:9090/index.html

**Note** : UI server will produce logs on the console while it is running; It can be stopped by hitting [Ctrl]-[C] key in the terminal window.
