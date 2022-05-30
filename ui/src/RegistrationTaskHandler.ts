import axios from 'axios';


export type TaskParams = {

};

type StartTaskResponse = {
    taskId: string,
    message: string
}


export class RegistrationTask {


    //from local host, without container
    /*
    static ApiProtocol = "http://";    
    static ApiHost = "localhost";
    static ApiPort = "10000";
    static ApiPrefix = "/api";    
    */

    //from local host (direct to Manager container)
    static ApiProtocol = "http://";
    static ApiHost = "localhost";
    static ApiPort = "10200";
    static ApiPrefix = "/api";

    //from containerized UI (through reverse proxy)
    /*
    static ApiHost = "";
    static ApiPort = "";
    static ApiPrefix = "/abart/api";
    */

    static getApiUrlPrefix(protocol: string = "") {
        return (
            (protocol ? protocol : RegistrationTask.ApiProtocol)
            + RegistrationTask.ApiHost
            + (RegistrationTask.ApiPort ? ":" + RegistrationTask.ApiPort : "")
            + RegistrationTask.ApiPrefix
        );
    }

    static create(
        volumeFile: File, taskParams: TaskParams,
        onSubmitted: (task?: RegistrationTask) => void,
        loglines: (lines: string[]) => void,
        onDone: (iserror: boolean, event: Event | undefined, error?: string) => void,
    ): RegistrationTask {

        const task = new RegistrationTask(taskParams);
        const uploadProm = this.uploadFile(volumeFile, task);

        //allow limited number of retries after a disconnection
        const MaxRetries = 5;
        const RetryInterval = 2500;

        let retries = 0;

        const connectSocketAndStream = () => {
            const logMsgSocket = new WebSocket(
                RegistrationTask.getApiUrlPrefix(window.location.protocol === "https:" ? "wss://" : "ws://") + '/tasks/' + task.taskId + '/logs'
            );
            logMsgSocket.onopen = function (event) {
                //reset retry count after connection is (re)established
                retries = 0;
            }

            logMsgSocket.onmessage = function (event) {
                loglines(event.data.split("\n"))
                //console.log(event.data);
            };
            logMsgSocket.onclose = function (event) {
                retries += 1;

                //FIXME: Manager does not gracefully close websocket (in lib github.com/gorilla/websocket), 
                // thus CloseEvent.wasClean can not be used to determine what caused closing event ("natural" termination of worker after computation completed or after user's trigerred cancelation; or "unexpected" loss of network connectivity)

                //Need to check status to know if Task completed succesfully or was canceled/aborted
                task.refreshStatus()
                    .then(
                        () => {
                            //Could retrieve task status, network is up and working

                            if (task.isOngoing()) {
                                //try reconnecting
                                setTimeout(connectSocketAndStream, RetryInterval);

                            } else {
                                const finishedInError = !task.hasFinished();
                                onDone(finishedInError, event)
                            }

                        }
                    ).catch(
                        () => {
                            //Error while retrieving task status : network connectivity not restored yet
                            if (retries > MaxRetries) {
                                logMsgSocket.close(1001, 'Remote task assumed aborted');
                                onDone(true, event)
                            } else {
                                //try reconnecting
                                setTimeout(connectSocketAndStream, RetryInterval);
                            }
                        }
                    );

            };
            logMsgSocket.onerror = function (event) {
                console.debug("logMsgSocket.on ERROR", retries, event);
            };

        };

        uploadProm.then(function (response) {
            //console.log(response);
            task.taskId = response.data.taskId;

            setTimeout(connectSocketAndStream, 10);
            onSubmitted(task);
        })
            .catch(function (error) {
                onSubmitted(undefined);
                console.log(error);
                onDone(true, undefined, error.toString());
            });

        return task;
    }


    static getApiVersion() {
        axios.get<string>(RegistrationTask.getApiUrlPrefix() + '/version')
            .then(function (response) {
                console.log(response);
            })
            .catch(function (error) {
                console.log(error);
            });
    }

    static uploadFile(
        file: File,
        task: RegistrationTask
    ) {
        const formData = new FormData();
        formData.append("inputDataFile", file);
        formData.append("params", JSON.stringify(task.taskParams));

        return axios.post<StartTaskResponse>(
            RegistrationTask.getApiUrlPrefix() + '/tasks',
            formData,
            {
                headers: {
                    'Content-Type': 'multipart/form-data'
                }
            }
        );
    }

    static downloadAsBlob(url: string,
        onDownloaded: (filename: string, data: Blob) => void) {
        return axios({
            url,
            method: 'GET',
            responseType: 'blob',
        }).then((response) => {
            const filename = response.headers['content-disposition']?.split(/;\s+filename=/)[1];
            onDownloaded?.call(null, filename, response.data);
        })
            .catch(function (error) {
                console.log(error);
            });
    };


    constructor(taskParams: {}) {
        this.taskParams = taskParams;
    }

    //-------------------------------------------------------------------------
    taskId: string | null = null;
    taskStatus: string = 'pending';
    taskParams: TaskParams;

    hasStarted() {
        return this.taskId != null;
    };

    isOngoing() {
        return this.taskStatus === 'pending' || this.taskStatus === 'started';
    };

    hasFinished() {
        return this.taskStatus.startsWith('done');
    };

    isCanceled() {
        return this.taskStatus.startsWith('cancel');
    };

    cancel(onDone: () => void) {
        axios.put(
            RegistrationTask.getApiUrlPrefix() + '/tasks/' + this.taskId + '/cancel'
        )
            .then((response) => {
                this.taskStatus = response.data.status;
                onDone();
            })
            .catch(function (error) {
                console.log(error);
                onDone();
            });
        this.taskStatus = 'canceling';
        return this;
    };

    refreshStatus() {
        return axios.get(
            RegistrationTask.getApiUrlPrefix() + '/tasks/' + this.taskId + '/status'
        )
            .then((response) => {
                this.taskStatus = response.data.status;
            })
    };

    downloadRegistered(onDownloaded: (filename: string, data: Blob) => void) {
        return axios({
            url: this.getDownloadRegisteredtUrl(),
            method: 'GET',
            responseType: 'blob',
        }).then((response) => {
            let filename = response.headers['content-disposition']?.split(/;\s+filename=/)[1];
            if (!filename) {
                filename = 'result.nii'
            }
            onDownloaded?.call(null, filename, response.data);
        })
            .catch(function (error) {
                console.log(error);
            });
    };

    getDownloadRegisteredtUrl() {
        return RegistrationTask.getApiUrlPrefix() + '/tasks/' + this.taskId + '/results/registered';
    };

    getDownloadColorLUTUrl() {
        return RegistrationTask.getApiUrlPrefix() + '/tasks/' + this.taskId + '/results/colorlut';
    };

    getDownloadLabelsUrl() {
        return RegistrationTask.getApiUrlPrefix() + '/tasks/' + this.taskId + '/results/labels';
    };

    getDownloadResulstUrl() {
        return RegistrationTask.getApiUrlPrefix() + '/tasks/' + this.taskId + '/results/all';
    };

}