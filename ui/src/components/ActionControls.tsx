import * as React from "react";
import { useAtom } from "jotai";


import {
    AnchorButton,
    Button,
    Intent,
    ProgressBar,
    Switch,
} from "@blueprintjs/core";


import * as StAtm from '../StateAtoms';

import { RegistrationTask } from "../RegistrationTaskHandler";

type ActionControlsProps = {
};

const ActionControls = (props: ActionControlsProps) => {

    const [, setAlertMessage] = useAtom(StAtm.alertMessage);

    const [deltaRotation,] = useAtom(StAtm.deltaRotation);

    const [remoteTask, setRemoteTask] = useAtom(StAtm.remoteTask);
    const [showLogs, setShowLogs] = useAtom(StAtm.showLogs);
    const [, setLoglines] = useAtom(StAtm.loglines);

    return (
        <div
            style={{
                marginTop: 16, borderTop: "solid 1px #d1d1d1", paddingTop: 6,
            }}
        >

            <div
                style={{ marginTop: 20, display: 'flex', flexDirection: 'row', justifyContent: 'space-evenly' }}
            >

                <Button
                    className="big-button"
                    icon="confirm"
                    disabled={!props.volumeFile || (remoteTask && remoteTask.hasStarted())}
                    onClick={() => {
                        const params = { rotation: deltaRotation.slice(0, 3) };
                        const task = RegistrationTask.create(
                            props.volumeFile?.file,
                            params,
                            (task) => {
                                setRemoteTask(task);
                                if (!task) {
                                    setShowLogs(false);
                                }
                            },
                            (lines: string[]) => setLoglines(lines),
                            (iserror, event) => {
                                if (iserror) {
                                    setAlertMessage(
                                        <p>
                                            Registration aborted!
                                        </p>);
                                    task.taskStatus = 'aborted';
                                } else {
                                    setAlertMessage(
                                        <p>
                                            Registration done!
                                        </p>);
                                    task.taskStatus = 'done';
                                }
                                setShowLogs(false);
                            },

                        );
                        setRemoteTask(task)
                        setShowLogs(true);
                    }} >Register</Button>

                <br />

                <Button
                    icon="delete"
                    disabled={!remoteTask || !remoteTask.hasStarted() || remoteTask.hasFinished()}
                    onClick={() => {
                        const updatedTask = remoteTask?.cancel(
                            () => {
                                setRemoteTask(undefined);
                                setShowLogs(false);
                            });
                        setRemoteTask(updatedTask);
                    }} >Cancel</Button>
                <AnchorButton
                    icon="archive"
                    disabled={!remoteTask || !remoteTask.hasFinished()}
                    href={remoteTask ? remoteTask?.getDownloadResultUrl() : ""}
                    target="_blank"
                >Download</AnchorButton>

            </div>
            <div style={{ height: 10, margin: "4px 6px", padding: "0 10px" }}>
                {
                    remoteTask && !remoteTask.hasFinished()
                        ?
                        <ProgressBar
                            intent={remoteTask.isCanceled() ? Intent.WARNING : (remoteTask.hasStarted() ? Intent.PRIMARY : Intent.NONE)}
                        />
                        :
                        null
                }
            </div>
            <Switch
                checked={showLogs}
                disabled={!remoteTask || !remoteTask.hasStarted()}
                label="show logs"
                onChange={() => setShowLogs(!showLogs)}
            />
        </div>
    );

};

export default ActionControls;
