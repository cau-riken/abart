package dockerhandler

import (
	"context"
	"fmt"
	"io"
	"os"
	"strings"
	"sync"
	"time"

	"github.com/docker/docker/api/types"
	"github.com/docker/docker/api/types/container"
	"github.com/docker/docker/api/types/network"
	"github.com/docker/docker/client"
)

func FollowContainerLogs(
	containerRef string,
) io.ReadCloser {
	fmt.Println("enter FollowContainerLogs : ", containerRef)

	ctx := context.Background()

	cli, err := client.NewClientWithOpts(client.FromEnv, client.WithAPIVersionNegotiation())
	if err != nil {
		panic(err)
	}
	rc, err := cli.ContainerLogs(ctx, containerRef,
		types.ContainerLogsOptions{
			Follow:     true,
			ShowStdout: true,
			ShowStderr: true,
		})
	if err != nil {
		fmt.Println("Couldn't obtain container logs, error : ", err)
		return nil
	} else {

		return rc
	}
}

//should be called before ContainerStart() to be abled to read streams from beginning
func AttachContainerAndStream(
	containerRef string,
) {
	fmt.Println("enter AttachContainerAndStream : ", containerRef)

	ctx := context.Background()

	cli, err := client.NewClientWithOpts(client.FromEnv, client.WithAPIVersionNegotiation())
	if err != nil {
		panic(err)
	}
	resp, err := cli.ContainerAttach(ctx, containerRef,
		types.ContainerAttachOptions{
			Stream: true,
			Stdout: true,
			Stderr: true,
		})
	if err != nil {
		panic(err)
	}

	var wg sync.WaitGroup
	wg.Add(2)

	go func() {
		defer wg.Done()
		_, err := io.Copy(os.Stdout, resp.Reader)
		if err == nil {
			fmt.Println("Stream reading finished in error : ", err)
		}
	}()
	go func() {
		defer wg.Done()
		_, err := io.Copy(os.Stderr, resp.Reader)
		if err == nil {
			fmt.Println("Stream reading finished in error : ", err)
		}
	}()

	go func() {
		//wait for both streams to be closed before closing attach response
		defer resp.Close()
		wg.Wait()
		fmt.Println("end of streams : ", containerRef)
	}()

}

func RunContainer(
	imageName string,
	volumeName string,
	networkName string,
	workingDirBasePath string,
	workingDir string,
	containerName string,
	onStarted func(),
) {
	ctx := context.Background()

	fmt.Println("imageName : ", imageName)
	cli, err := client.NewClientWithOpts(client.FromEnv, client.WithAPIVersionNegotiation())
	if err != nil {
		panic(err)
	}
	//fmt.Println("client : ", cli)

	//check if image exists in Docker daemon repository
	histResp, err := cli.ImageHistory(ctx, imageName)
	if err != nil {
		fmt.Println("Err image : ", err)
	}

	fmt.Println("Image History : ", histResp)

	//task ID passed as environment variable
	newEnv := []string{
		//"TaskID=" + taskID,
	}

	//create container
	resp, err := cli.ContainerCreate(
		ctx,
		&container.Config{
			Image:        imageName,
			AttachStderr: true,
			Tty:          true,
			AttachStdout: true,
			Env:          newEnv,
			WorkingDir:   workingDir,
		},
		//volume binding
		&container.HostConfig{
			Binds: []string{strings.Join([]string{volumeName, workingDirBasePath, "rw"}, ":")},
		},
		nil,
		nil,
		containerName)
	if err != nil {
		panic(err)
	}
	fmt.Println("Container Created!")

	//disconnect from default "bridge" network
	cli.NetworkDisconnect(ctx, "bridge", resp.ID, true)
	//connect to supplied network
	if err := cli.NetworkConnect(ctx, networkName, resp.ID, &network.EndpointSettings{}); err != nil {
		panic(err)
	}

	AttachContainerAndStream(resp.ID)
	//start newly created container
	if err := cli.ContainerStart(ctx, resp.ID, types.ContainerStartOptions{}); err != nil {
		panic(err)
	}

	//signal that container started
	onStarted()

	//wait for the container to stop
	statusCh, errCh := cli.ContainerWait(ctx, resp.ID, container.WaitConditionNotRunning)
	select {
	case err := <-errCh:
		if err != nil {
			fmt.Println("Container ended in Error!")
		}
	case <-statusCh:
		fmt.Println("Container ended statusCh :", statusCh)
	}

}

func StopNRemoveContainer(
	containerName string,
) {
	ctx := context.Background()

	cli, err := client.NewClientWithOpts(client.FromEnv, client.WithAPIVersionNegotiation())
	if err != nil {
		panic(err)
	}
	contJson, err := cli.ContainerInspect(ctx, containerName)
	if err != nil {
		//container not found, most likely already stopped?
		fmt.Println("Could not inspect container :", err)
	} else {

		fmt.Println("container info : ", contJson)

		timeout := 10 * time.Second
		err = cli.ContainerStop(ctx, containerName, &timeout)
		if err != nil {
			fmt.Println("Could not stop container :", err)
		}
		err = cli.ContainerRemove(ctx, containerName, types.ContainerRemoveOptions{})
		if err != nil {
			fmt.Println("Could not remove container :", err)
		}
	}
}
