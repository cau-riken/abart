import * as React from "react";
import { useAtom, useSetAtom } from "jotai";

import {
    Button,
    Icon,
    Slider,
    Switch,
    RangeSlider,
} from "@blueprintjs/core";


import * as StAtm from '../StateAtoms';

import "./VolumePreview.scss";


type SlicesControlsProps = {
    extra?: boolean,
};

const SlicesControls = (props: SlicesControlsProps) => {

    const [volumeLoaded,] = useAtom(StAtm.volumeLoaded);

    const setCameraPOV = useSetAtom(StAtm.cameraPOV);

    const [clipWire, setClipWire] = useAtom(StAtm.clipBrainModel);

    const [showXSlice, setShowXSlice] = useAtom(StAtm.showXSlice);
    const [showYSlice, setShowYSlice] = useAtom(StAtm.showYSlice);
    const [showZSlice, setShowZSlice] = useAtom(StAtm.showZSlice);

    const [volumeValMin,] = useAtom(StAtm.volumeValMin);
    const [volumeValMax,] = useAtom(StAtm.volumeValMax);

    const [volumeRange, setVolumeRange] = useAtom(StAtm.volumeRange);

    const [indexX, setIndexX] = useAtom(StAtm.indexX);
    const [indexY, setIndexY] = useAtom(StAtm.indexY);
    const [indexZ, setIndexZ] = useAtom(StAtm.indexZ);
    const [maxIndexX,] = useAtom(StAtm.maxIndexX);
    const [maxIndexY,] = useAtom(StAtm.maxIndexY);
    const [maxIndexZ,] = useAtom(StAtm.maxIndexZ);


    return (

        <>
            <div
            >
                <div style={{ marginTop: 16, borderTop: "solid 1px #d1d1d1", paddingTop: 6 }}>
                    <div
                        style={{ display: 'flex', flexDirection: 'row', justifyContent: 'space-between' }}
                    >

                        <Switch
                            checked={showXSlice}
                            disabled={maxIndexX <= 0}
                            label="Sagittal (X) slices"
                            onChange={() =>
                                setShowXSlice(!showXSlice)
                            }
                        />
                        {props.extra
                            ?

                            <Switch
                                checked={clipWire === StAtm.ClipBrainModelMode.ClipX}
                                disabled={maxIndexX <= 0 || !showXSlice}
                                label="clip brainModel"
                                onChange={() =>
                                    setClipWire(clipWire === StAtm.ClipBrainModelMode.ClipX ? StAtm.ClipBrainModelMode.None : StAtm.ClipBrainModelMode.ClipX)
                                }
                            />
                            :
                            null
                        }
                    </div>

                    <Slider
                        className="x-slider"
                        min={0}
                        max={maxIndexX}
                        disabled={maxIndexX <= 0 || !showXSlice}
                        labelValues={[]}
                        showTrackFill={false}
                        value={indexX}
                        onChange={setIndexX}
                    />
                    {props.extra
                        ?
                        <div
                            style={{ display: 'flex', flexDirection: 'row', justifyContent: 'space-between' }}
                        >
                            <Button
                                disabled={!volumeLoaded}

                                onClick={() =>
                                    setCameraPOV(StAtm.CameraPOV.Left)
                                }
                            >L</Button>
                            <Button
                                disabled={!volumeLoaded}
                                onClick={() =>
                                    setCameraPOV(StAtm.CameraPOV.Right)
                                }
                            >R</Button>

                        </div>
                        :
                        null
                    }

                </div>
                <div style={{ marginTop: 16, borderTop: "solid 1px #d1d1d1", paddingTop: 6 }}>
                    <div
                        style={{ display: 'flex', flexDirection: 'row', justifyContent: 'space-between' }}
                    >

                        <Switch
                            checked={showYSlice}
                            disabled={maxIndexY <= 0}
                            label="Coronal (Y) slices"
                            onChange={() =>
                                setShowYSlice(!showYSlice)
                            }
                        />
                        {props.extra
                            ?

                            <Switch
                                checked={clipWire === StAtm.ClipBrainModelMode.ClipY}
                                disabled={maxIndexY <= 0 || !showYSlice}
                                label="clip brainModel"
                                onChange={() =>
                                    setClipWire(clipWire === StAtm.ClipBrainModelMode.ClipY ? StAtm.ClipBrainModelMode.None : StAtm.ClipBrainModelMode.ClipY)
                                }
                            />
                            :
                            null
                        }

                    </div>

                    <Slider
                        className="y-slider"
                        min={0}
                        max={maxIndexY}
                        disabled={maxIndexY <= 0 || !showYSlice}
                        labelValues={[]}
                        showTrackFill={false}
                        value={indexY}
                        onChange={setIndexY}
                    />
                    {props.extra
                        ?

                        <div
                            style={{ display: 'flex', flexDirection: 'row', justifyContent: 'space-between' }}
                        >
                            <Button
                                disabled={!volumeLoaded}

                                onClick={() =>
                                    setCameraPOV(StAtm.CameraPOV.Posterior)
                                }
                            >P</Button>
                            <Button
                                disabled={!volumeLoaded}
                                onClick={() =>
                                    setCameraPOV(StAtm.CameraPOV.Anterior)
                                }
                            >A</Button>

                        </div>
                        :
                        null
                    }

                </div>
                <div style={{ marginTop: 16, borderTop: "solid 1px #d1d1d1", paddingTop: 6 }}>
                    <div
                        style={{ display: 'flex', flexDirection: 'row', justifyContent: 'space-between' }}
                    >

                        <Switch
                            checked={showZSlice}
                            disabled={maxIndexZ <= 0}
                            label="Axial (Z) slices"
                            onChange={() =>
                                setShowZSlice(!showZSlice)
                            }
                        />
                        {props.extra
                            ?

                            <Switch
                                checked={clipWire === StAtm.ClipBrainModelMode.ClipZ}
                                disabled={maxIndexZ <= 0 || !showZSlice}
                                label="clip brainModel"
                                onChange={() =>
                                    setClipWire(clipWire === StAtm.ClipBrainModelMode.ClipZ ? StAtm.ClipBrainModelMode.None : StAtm.ClipBrainModelMode.ClipZ)
                                }
                            />
                            :
                            null
                        }

                    </div>
                    <Slider
                        className="z-slider"
                        min={0}
                        max={maxIndexZ}
                        disabled={maxIndexZ <= 0 || !showZSlice}
                        labelValues={[]}
                        showTrackFill={false}
                        value={indexZ}
                        onChange={setIndexZ}
                    />
                    {props.extra
                        ?

                        <div
                            style={{ display: 'flex', flexDirection: 'row', justifyContent: 'space-between' }}
                        >
                            <Button
                                disabled={!volumeLoaded}

                                onClick={() =>
                                    setCameraPOV(StAtm.CameraPOV.Inferior)
                                }
                            >I</Button>
                            <Button
                                disabled={!volumeLoaded}
                                onClick={() =>
                                    setCameraPOV(StAtm.CameraPOV.Superior)
                                }
                            >S</Button>

                        </div>
                        :
                        null
                    }

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
                        (!volumeLoaded ? { color: 'rgba(92, 112, 128, 0.2)' } : {})
                    }
                    icon="contrast"
                />
                <RangeSlider
                    disabled={!volumeLoaded}
                    min={volumeValMin}
                    max={volumeValMax}
                    stepSize={2}
                    labelValues={[]}
                    onChange={setVolumeRange}
                    value={volumeRange}
                />
            </div>
        </>
    );

};

export default SlicesControls;
