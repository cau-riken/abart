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
        onDone: (iserror: boolean, event: Event|undefined, error?: string) => void,
    ): RegistrationTask {

        const task = new RegistrationTask(taskParams);
        const uploadProm = this.uploadFile(volumeFile, task);

        uploadProm.then(function (response) {
            //console.log(response);
            task.taskId = response.data.taskId;

            setTimeout(() => {
                const logMsgSocket = new WebSocket(
                    RegistrationTask.getApiUrlPrefix("ws://") + '/tasks/' + task.taskId + '/logs'
                );
                logMsgSocket.onmessage = function (event) {
                    loglines(event.data.split("\n"))
                    //console.log(event.data);
                };
                logMsgSocket.onclose = function (event) {
                    //console.debug("logMsgSocket.onclose", event);

                    //Need to check status to know if Task completed succesfully or was canceled
                    task.refreshStatus()
                        .then(
                            () => onDone(!task.hasFinished(), event)
                        ).catch(
                            () => onDone(true, event)
                        );

                };
                logMsgSocket.onerror = function (event) {
                    console.debug("logMsgSocket.onerror", event);
                    onDone(true, undefined, event.toString());
                };

            }, 10);
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
            .catch(function (error) {
                console.log(error);
            });
    };

    downloadRegistered(onDownloaded: (filename:string, data: blob) => void) {
        return axios({
              url: RegistrationTask.getApiUrlPrefix() + '/tasks/' + this.taskId + '/results/registered',
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

    getDownloadResulstUrl() {
        return RegistrationTask.getApiUrlPrefix() + '/tasks/' + this.taskId + '/results/all';
    };

}