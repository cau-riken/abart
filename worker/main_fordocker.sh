#!/bin/bash

#registration script invoked from Docker container
reference_dir='/abart'
moving_image=`cat config.json | jq -r '.moving_image'`
pre_transform=`cat config.json | jq -r '.pre_transform'`
overrride_fixed_image=`cat config.json | jq -r '.fixed_image'`

# ANTs transformation
echo "ANTs transformation"
${reference_dir}/do_registration.sh ${reference_dir} ${moving_image} ${pre_transform} ${overrride_fixed_image}

ret=$?
if [ ! $ret -eq 0 ]; then
	echo "ANTs transformation failed"
else
	echo "ANTs transformation completed successfully"
fi
echo $ret > finished

#archiving results
zip -r abartResults.zip results/

exit $ret
