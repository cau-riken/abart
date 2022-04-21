#!/bin/bash
DIRNAME=`dirname $0`
cd ${DIRNAME}


function cleanup()
{
    #stop running instances (started as auto remove)
    sudo docker container stop abart-ui abart-manager 2> /dev/null
}

function cleanupAndExit()
{
    echo -e "\n\nStopping AbART..."
    cleanup
    echo -e "\n"
    exit 0
}

#remove any running instances before starting anew
cleanup
echo -e "\nStarting AbART...\n"
(trap cleanupAndExit SIGINT; ui/ui_start.sh & manager/manager_start.sh)
