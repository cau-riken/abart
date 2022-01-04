# ANTs based Atlas Registration Tool - Worker tier

Script used to register images to the Marmoset Atlas using the Advanced Normalization Tools (ANTs).

This is a wrapper to containerise the Brainlife.io App [app-ants-marmosetatlas-registration](https://github.com/cau-riken/app-ants-marmosetatlas-registration.git) that performs the same processing.


# build 
sudo docker build  --force-rm --no-cache -f Dockerfile.worker -t rikencau/abart-worker .

