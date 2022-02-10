import * as React from "react";
import { useAtom } from "jotai";


import * as THREE from 'three';

import {
    Alignment,
    AnchorButton,
    Button,
    Icon,
    Intent,
    ProgressBar,
    Slider,
    Switch,
    Tab,
    Tabs,
    RangeSlider,
} from "@blueprintjs/core";


import * as StAtm from '../StateAtoms';
import { ViewMode } from "../StateAtoms";


import { RegistrationTask } from "../RegistrationTaskHandler";

import "./VolumePreview.scss";


type PreviewControlsProps = {
};

const PreviewControls = (props: PreviewControlsProps) => {

    const [viewMode, setViewMode] = useAtom(StAtm.viewMode);

    const [, setAlertMessage] = useAtom(StAtm.alertMessage);

    const [deltaRotation,] = useAtom(StAtm.deltaRotation);
    const [, setCameraRotation] = useAtom(StAtm.cameraRotation);

    const [showBrainModel, setShowBrainModel] = useAtom(StAtm.showBrainModel);

    const [clipWire, setClipWire] = useAtom(StAtm.clipWire);

    const [, setBrainWireInitRotation] = useAtom(StAtm.brainWireInitRotation);
    const [fixedWire, setFixedWire] = useAtom(StAtm.fixedWire);

    const [isothreshold, setIsothreshold] = useAtom(StAtm.isothreshold);
    const [clims, setClims] = useAtom(StAtm.clims);
    const [castIso, setCastIso] = useAtom(StAtm.castIso);

    const [showXSlice, setShowXSlice] = useAtom(StAtm.showXSlice);
    const [showYSlice, setShowYSlice] = useAtom(StAtm.showYSlice);
    const [showZSlice, setShowZSlice] = useAtom(StAtm.showZSlice);
    const [volumeRange, setVolumeRange] = useAtom(StAtm.volumeRange);

    const [indexX, setIndexX] = useAtom(StAtm.indexX);
    const [indexY, setIndexY] = useAtom(StAtm.indexY);
    const [indexZ, setIndexZ] = useAtom(StAtm.indexZ);

    const [remoteTask, setRemoteTask] = useAtom(StAtm.remoteTask);
    const [showLogs, setShowLogs] = useAtom(StAtm.showLogs);
    const [, setLoglines] = useAtom(StAtm.loglines);

    const [knownLandMarksAry,] = useAtom(StAtm.knownLandMarksAry);

    const [markInstances,] = useAtom(StAtm.markInstances);


    const rtState = props.rtState;
    const obj3d = props.obj3d;

    return (

        <div
            style={{
                backgroundColor: "#EEE",
                padding: 6,
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
            }}
        >
            <div>

                <div
                    style={{ display: 'flex', flexDirection: 'row', justifyContent: 'space-between', alignItems: "baseline" }}
                >
                    <span>Brain wire:</span>
                    <Switch
                        checked={showBrainModel}
                        disabled={!obj3d.current.volume}
                        label="visible"
                        onChange={() => 
                            setShowBrainModel(!showBrainModel)}
                    />
                    <span></span>
                </div>

                <div
                    style={{ display: 'flex', flexDirection: 'row', justifyContent: 'space-between', alignItems: "baseline" }}
                >
                    <span>Brain wire orientation:</span>
                    <Switch
                        checked={fixedWire}
                        disabled={!obj3d.current.volume}
                        label="fixed"
                        onChange={() => 
                            setFixedWire(!fixedWire)
                        }
                    />
                    <Button icon="reset"
                        disabled={!obj3d.current.volume}
                        onClick={() => 
                            setBrainWireInitRotation(new THREE.Quaternion())
                        }

                    >Reset</Button>
                </div>

                <div
                    style={{
                        marginTop: 16, borderTop: "solid 1px #d1d1d1", paddingTop: 6,
                        display: 'flex', flexDirection: 'row', justifyContent: 'space-between', alignItems: "baseline"
                    }}
                >

                    <span>Volume orientation :</span>
                    <Button icon="reset"
                        disabled={!obj3d.current.volume}

                        onClick={() => {
                            if (obj3d.current.controls) {
                                obj3d.current.controls.reset();
                            }
                        }}

                    >Reset</Button>
                </div>

                <div
                    style={{

                        display: 'flex', flexDirection: 'row', justifyContent: 'space-between', alignItems: "baseline"
                    }}
                >

                    <span>Orientation difference:</span>

                    <>
                        <span
                        >{THREE.MathUtils.radToDeg(deltaRotation[0]).toFixed(2) + '°'}</span>
                        <span
                        >{THREE.MathUtils.radToDeg(deltaRotation[1]).toFixed(2) + '°'}</span>
                        <span
                        >{THREE.MathUtils.radToDeg(deltaRotation[2]).toFixed(2) + '°'}</span>
                    </>
                    <span></span>
                </div>

                <div
                    style={{
                        marginTop: 16, borderTop: "solid 1px #d1d1d1", paddingTop: 6,
                    }}
                >
                    <Tabs
                        id="tabs"
                        selectedTabId={viewMode.toString()}
                        onChange={(vm) => {
                            const newViewMode: ViewMode = vm as ViewMode;
                            setViewMode(newViewMode);
                        }}
                    >
                        <Tab
                            id={ViewMode.Volume3D.toString()}
                            disabled={!obj3d.current.volume}
                            title={<span><Icon icon="cube" /> Volume</span>}
                            panel={
                                <div>
                                    <Switch
                                        checked={castIso}
                                        disabled={!obj3d.current.volume}
                                        label="Ray Casting method"
                                        alignIndicator={Alignment.RIGHT}
                                        innerLabel="Maximum Intensity Projection"
                                        innerLabelChecked="ISO"
                                        onChange={() =>
                                            setCastIso(!castIso)
                                        }
                                    />
                                    <span>Render threshold (ISO)</span>
                                    <Slider
                                        min={obj3d.current.volume ? obj3d.current.volume.min : 0}
                                        max={obj3d.current.volume ? obj3d.current.volume.max : 1}
                                        disabled={!obj3d.current.volume || !castIso}
                                        stepSize={1}
                                        labelValues={[]}
                                        showTrackFill={false}
                                        value={isothreshold}
                                        onChange={setIsothreshold}
                                    />
                                    <span>Colormap boundary 1</span>
                                    <Slider
                                        min={obj3d.current.volume ? obj3d.current.volume.min : 0}
                                        max={obj3d.current.volume ? obj3d.current.volume.max : 1}
                                        disabled={!obj3d.current.volume}
                                        stepSize={1}
                                        labelValues={[]}
                                        showTrackFill={false}
                                        value={clims[0]}
                                        onChange={(value: number) =>
                                            setClims([value, clims[1]])
                                        }
                                    />
                                    <span>Colormap boundary 2</span>
                                    <Slider
                                        min={obj3d.current.volume ? obj3d.current.volume.min : 0}
                                        max={obj3d.current.volume ? obj3d.current.volume.max : 1}
                                        disabled={!obj3d.current.volume}
                                        stepSize={1}
                                        labelValues={[]}
                                        showTrackFill={false}
                                        value={clims[1]}
                                        onChange={(value: number) =>
                                            setClims([clims[0], value])
                                        }
                                    />

                                </div>
                            } />
                        {/*<Tabs.Expander />*/}
                        <Tab
                            id={ViewMode.Slice3D.toString()}
                            disabled={!obj3d.current.volume}
                            title={<span><Icon icon="layers" /> 3D Slices </span>}

                            panel={
                                <>
                                    <div
                                    >


                                        <div style={{ marginTop: 16, borderTop: "solid 1px #d1d1d1", paddingTop: 6 }}>
                                            <div
                                                style={{ display: 'flex', flexDirection: 'row', justifyContent: 'space-between' }}
                                            >

                                                <Switch
                                                    checked={showXSlice}
                                                    disabled={!obj3d.current.sliceX}
                                                    label="Sagittal (X) slices"
                                                    onChange={() =>
                                                        setShowXSlice(!showXSlice)
                                                    }
                                                />

                                                <Switch
                                                    checked={clipWire === StAtm.ClipWireMode.ClipX}
                                                    disabled={!obj3d.current.sliceX || !showXSlice}
                                                    label="clip brainwire"
                                                    onChange={() =>
                                                        setClipWire(clipWire === StAtm.ClipWireMode.ClipX ? StAtm.ClipWireMode.None : StAtm.ClipWireMode.ClipX)
                                                    }
                                                />
                                            </div>
                                            <Slider
                                                className="x-slider"
                                                min={0}
                                                max={obj3d.current.volume ? obj3d.current.volume.dimensions[0] - 1 : 0}
                                                disabled={!obj3d.current.sliceX || !showXSlice}
                                                labelValues={[]}
                                                showTrackFill={false}
                                                value={indexX}
                                                onChange={setIndexX}
                                            />
                                            <div
                                                style={{ display: 'flex', flexDirection: 'row', justifyContent: 'space-between' }}
                                            >
                                                <Button
                                                    disabled={!obj3d.current.volume}

                                                    onClick={() =>
                                                        setCameraRotation({ up: [0, 0, 1], position: [- rtState.current.camDistance, 0, 0] })
                                                    }
                                                >L</Button>
                                                <Button
                                                    disabled={!obj3d.current.volume}
                                                    onClick={() =>
                                                        setCameraRotation({ up: [0, 0, 1], position: [rtState.current.camDistance, 0, 0] })
                                                    }
                                                >R</Button>

                                            </div>

                                        </div>
                                        <div style={{ marginTop: 16, borderTop: "solid 1px #d1d1d1", paddingTop: 6 }}>
                                            <div
                                                style={{ display: 'flex', flexDirection: 'row', justifyContent: 'space-between' }}
                                            >

                                                <Switch
                                                    checked={showYSlice}
                                                    disabled={!obj3d.current.sliceY}
                                                    label="Coronal (Y) slices"
                                                    onChange={() =>
                                                        setShowYSlice(!showYSlice)
                                                    }
                                                />

                                                <Switch
                                                    checked={clipWire === StAtm.ClipWireMode.ClipY}
                                                    disabled={!obj3d.current.sliceY || !showYSlice}
                                                    label="clip brainwire"
                                                    onChange={() =>
                                                        setClipWire(clipWire === StAtm.ClipWireMode.ClipY ? StAtm.ClipWireMode.None : StAtm.ClipWireMode.ClipY)
                                                    }
                                                />
                                            </div>

                                            <Slider
                                                className="y-slider"
                                                min={0}
                                                max={obj3d.current.volume ? obj3d.current.volume.dimensions[1] - 1 : 0}
                                                disabled={!obj3d.current.sliceY || !showYSlice}
                                                labelValues={[]}
                                                showTrackFill={false}
                                                value={indexY}
                                                onChange={setIndexY}
                                            />

                                            <div
                                                style={{ display: 'flex', flexDirection: 'row', justifyContent: 'space-between' }}
                                            >
                                                <Button
                                                    disabled={!obj3d.current.volume}

                                                    onClick={() =>
                                                        setCameraRotation({ up: [0, 0, 1], position: [0, - rtState.current.camDistance, 0] })
                                                    }
                                                >P</Button>
                                                <Button
                                                    disabled={!obj3d.current.volume}
                                                    onClick={() =>
                                                        setCameraRotation({ up: [0, 0, 1], position: [0, rtState.current.camDistance, 0] })
                                                    }
                                                >A</Button>

                                            </div>

                                        </div>
                                        <div style={{ marginTop: 16, borderTop: "solid 1px #d1d1d1", paddingTop: 6 }}>
                                            <div
                                                style={{ display: 'flex', flexDirection: 'row', justifyContent: 'space-between' }}
                                            >

                                                <Switch
                                                    checked={showZSlice}
                                                    disabled={!obj3d.current.sliceZ}
                                                    label="Axial (Z) slices"
                                                    onChange={() =>
                                                        setShowZSlice(!showZSlice)
                                                    }
                                                />
                                                <Switch
                                                    checked={clipWire === StAtm.ClipWireMode.ClipZ}
                                                    disabled={!obj3d.current.sliceZ || !showZSlice}
                                                    label="clip brainwire"
                                                    onChange={() =>
                                                        setClipWire(clipWire === StAtm.ClipWireMode.ClipZ ? StAtm.ClipWireMode.None : StAtm.ClipWireMode.ClipZ)
                                                    }
                                                />
                                            </div>
                                            <Slider
                                                className="z-slider"
                                                min={0}
                                                max={obj3d.current.volume ? obj3d.current.volume.dimensions[2] - 1 : 0}
                                                disabled={!obj3d.current.sliceZ || !showZSlice}
                                                labelValues={[]}
                                                showTrackFill={false}
                                                value={indexZ}
                                                onChange={setIndexZ}
                                            />

                                            <div
                                                style={{ display: 'flex', flexDirection: 'row', justifyContent: 'space-between' }}
                                            >
                                                <Button
                                                    disabled={!obj3d.current.volume}

                                                    onClick={() =>
                                                        setCameraRotation({ up: [0, 1, 0], position: [0, 0, - rtState.current.camDistance] })
                                                    }
                                                >I</Button>
                                                <Button
                                                    disabled={!obj3d.current.volume}
                                                    onClick={() =>
                                                        setCameraRotation({ up: [0, 1, 0], position: [0, 0, rtState.current.camDistance] })
                                                    }
                                                >S</Button>

                                            </div>
                                        </div>

                                    </div>

                                    <div
                                        style={{
                                            marginTop: 16, borderTop: "solid 1px #d1d1d1", padding: 10,
                                            display: 'grid',
                                            gridTemplateColumns: '30px 1fr',
                                        }}>
                                        <Icon
                                            style={
                                                (!obj3d.current.volume ? { color: 'rgba(92, 112, 128, 0.2)' } : {})
                                            }
                                            icon="contrast"
                                        />
                                        <RangeSlider
                                            disabled={!obj3d.current.volume}
                                            min={obj3d.current.volume ? obj3d.current.volume.min : 0}
                                            max={obj3d.current.volume ? obj3d.current.volume.max : 100}
                                            stepSize={2}
                                            labelStepSize={obj3d.current.volume ? obj3d.current.volume.max : 20}
                                            onChange={setVolumeRange}
                                            value={volumeRange}
                                        />
                                    </div>
                                </>
                            } />


                    </Tabs>

                </div>
            </div>
            <div>
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
        </div>
    );

};

export default PreviewControls;
