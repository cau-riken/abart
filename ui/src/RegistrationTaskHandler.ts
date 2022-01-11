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

    static create(volumeFile: File, taskParams: TaskParams, onDone: (task?: RegistrationTask) => void, loglines: (lines: string[]) => void): RegistrationTask {

        const task = new RegistrationTask(taskParams);
        this.uploadFile(volumeFile, task, onDone, loglines);
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
        task: RegistrationTask,
        onDone: (task?: RegistrationTask) => void,
        loglines: (lines: string[]) => void
    ) {
        const formData = new FormData();
        formData.append("inputDataFile", file);
        formData.append("params", JSON.stringify(task.taskParams));

        axios.post<StartTaskResponse>(
            RegistrationTask.getApiUrlPrefix() + '/tasks',
            formData,
            {
                headers: {
                    'Content-Type': 'multipart/form-data'
                }
            }
        )
            .then(function (response) {
                console.log(response);
                task.taskId = response.data.taskId;

                setTimeout(() => {
                    const exampleSocket = new WebSocket(
                        RegistrationTask.getApiUrlPrefix("ws://") + '/tasks/' + task.taskId + '/logs'
                    );
                    exampleSocket.onmessage = function (event) {
                        loglines(event.data.split("\n"))
                        //console.log(event.data);
                    }
                }, 10);
                onDone(task);
            })
            .catch(function (error) {
                onDone(undefined);
                console.log(error);
            });
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

}