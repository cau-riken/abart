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
    volumeFile: StAtm.LoadedVolumeFile | undefined,
};

const ActionControls = (props: ActionControlsProps) => {

    const [, setAlertMessage] = useAtom(StAtm.alertMessage);

    const [deltaRotation,] = useAtom(StAtm.deltaRotation);

    const [remoteTask, setRemoteTask] = useAtom(StAtm.remoteTask);
    const [showLogs, setShowLogs] = useAtom(StAtm.showLogs);
    const [, setLoglines] = useAtom(StAtm.loglines);

    const [, setLoadOverlay] = useAtom(StAtm.loadOverlay);

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
                        if (props.volumeFile?.fileOrBlob && props.volumeFile.fileOrBlob instanceof File) {
                            const params = { rotation: deltaRotation.slice(0, 3) };
                            const task = RegistrationTask.create(
                                props.volumeFile.fileOrBlob,
                                params,
                                (task) => {
                                    setRemoteTask(task);
                                    if (!task) {
                                        setShowLogs(false);
                                    }
                                },
                                (lines: string[]) => setLoglines(lines),
                                (iserror, event, error) => {
                                    if (iserror) {
                                        setAlertMessage(
                                            <p>
                                                Registration aborted!
                                                {error ? <pre>{error}</pre> : null}
                                            </p>);
                                        task.taskStatus = 'aborted';
                                        setRemoteTask(undefined);
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
                        }
                    }} >Register</Button>

                <br />

                {remoteTask && remoteTask.hasStarted() && !remoteTask.hasFinished()
                    ?
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
                    :
                    null
                }

                {remoteTask && remoteTask.hasFinished() && remoteTask.taskStatus === 'done'
                    ?
                    <Button
                        icon="eye-open"
                        onClick={() => setLoadOverlay(true)} >Preview</Button>
                    :
                    null
                }

                {remoteTask && remoteTask.hasFinished() && remoteTask.taskStatus === 'done'
                    ?
                    <AnchorButton
                        icon="archive"
                        disabled={!remoteTask || !remoteTask.hasFinished()}
                        href={remoteTask ? remoteTask?.getDownloadResulstUrl() : ""}
                        target="_blank"
                    >Download</AnchorButton>
                    :
                    null}

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
            {remoteTask
                ?
                <Switch
                    checked={showLogs}
                    disabled={!remoteTask || !remoteTask.hasStarted()}
                    label="show logs"
                    onChange={() => setShowLogs(!showLogs)}
                />
                :
                null}
        </div>
    );

};

export default ActionControls;
