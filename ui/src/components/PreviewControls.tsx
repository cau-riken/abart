import * as React from "react";
import { useAtom } from "jotai";


import * as THREE from 'three';

import {
    Alignment,
    Button,
    Icon,
    Slider,
    Switch,
    Tab,
    Tabs,
} from "@blueprintjs/core";


import * as StAtm from '../StateAtoms';

import SlicesControls from "./SlicesControls";
import ActionControls from "./ActionControls";


type PreviewControlsProps = {
};

const PreviewControls = (props: PreviewControlsProps) => {

    const [volumeLoaded,] = useAtom(StAtm.volumeLoaded);

    const [viewMode, setViewMode] = useAtom(StAtm.viewMode);

    const [deltaRotation,] = useAtom(StAtm.deltaRotation);
    const [, setCameraPOV] = useAtom(StAtm.cameraPOV);

    const [showBrainModel, setShowBrainModel] = useAtom(StAtm.showBrainModel);

    const [, setBrainModelInitRotation] = useAtom(StAtm.brainModelInitRotation);
    const [fixedBrainModel, setFixedBrainModel] = useAtom(StAtm.fixedBrainModel);

    const [isothreshold, setIsothreshold] = useAtom(StAtm.isothreshold);
    const [clims, setClims] = useAtom(StAtm.clims);
    const [castIso, setCastIso] = useAtom(StAtm.castIso);

    const [volumeValMin,] = useAtom(StAtm.volumeValMin);
    const [volumeValMax,] = useAtom(StAtm.volumeValMax);

    const volumeControls = <>
        <div
            style={{ display: 'flex', flexDirection: 'row', justifyContent: 'space-between', alignItems: "baseline" }}
        >
            <span>Brain Model:</span>
            <Switch
                checked={showBrainModel}
                disabled={!volumeLoaded}
                label="visible"
                onChange={() =>
                    setShowBrainModel(!showBrainModel)}
            />
            <span></span>
        </div>

        <div
            style={{ display: 'flex', flexDirection: 'row', justifyContent: 'space-between', alignItems: "baseline" }}
        >
            <span>Brain Model orientation:</span>
            <Switch
                checked={fixedBrainModel}
                disabled={!volumeLoaded}
                label="fixed"
                onChange={() =>
                    setFixedBrainModel(!fixedBrainModel)
                }
            />
            <Button icon="reset"
                disabled={!volumeLoaded}
                onClick={() =>
                    setBrainModelInitRotation(new THREE.Quaternion())
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
                disabled={!volumeLoaded}

                onClick={() => setCameraPOV(StAtm.CameraPOV.Superior)}

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
    </>;

    const slicesControls =
        <SlicesControls
            extra={viewMode === StAtm.ViewMode.Slice3D}
        />
        ;


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
                    style={{
                        paddingTop: 6,
                    }}
                >
                    <Tabs
                        id="tabs"
                        selectedTabId={viewMode.toString()}
                        onChange={(vm) => {
                            const newViewMode: StAtm.ViewMode = vm as StAtm.ViewMode;
                            setViewMode(newViewMode);
                        }}
                    >
                        <Tab
                            id={StAtm.ViewMode.Volume3D.toString()}
                            disabled={!volumeLoaded}
                            title={<span><Icon icon="cube" /> Volume</span>}
                            panel={
                                <>
                                    {volumeControls}
                                    <div>
                                        <Switch
                                            checked={castIso}
                                            disabled={!volumeLoaded}
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
                                            min={volumeValMin}
                                            max={volumeValMax}
                                            disabled={!volumeLoaded || !castIso}
                                            stepSize={1}
                                            labelValues={[]}
                                            showTrackFill={false}
                                            value={isothreshold}
                                            onChange={setIsothreshold}
                                        />
                                        <span>Colormap boundary 1</span>
                                        <Slider
                                            min={volumeValMin}
                                            max={volumeValMax}
                                            disabled={!volumeLoaded}
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
                                            min={volumeValMin}
                                            max={volumeValMax}
                                            disabled={!volumeLoaded}
                                            stepSize={1}
                                            labelValues={[]}
                                            showTrackFill={false}
                                            value={clims[1]}
                                            onChange={(value: number) =>
                                                setClims([clims[0], value])
                                            }
                                        />

                                    </div>
                                </>
                            } />
                        {/*<Tabs.Expander />*/}
                        <Tab
                            id={StAtm.ViewMode.Slice3D.toString()}
                            disabled={!volumeLoaded}
                            title={<span><Icon icon="layers" /> 3D Slices </span>}

                            panel={
                                <>
                                    {volumeControls}
                                    {slicesControls}
                                </>
                            }
                        />

                        <Tab
                            id={StAtm.ViewMode.Slice2D.toString()}
                            disabled={!volumeLoaded}
                            title={<span><Icon icon="grid-view" /> Slices </span>}
                            panel={
                                slicesControls
                            }
                        />

                    </Tabs>

                </div>
            </div>

            <ActionControls />

        </div>
    );

};

export default PreviewControls;
