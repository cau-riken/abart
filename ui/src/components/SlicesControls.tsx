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
    const [loadOverlay,] = useAtom(StAtm.loadOverlay);

    const setCameraPOV = useSetAtom(StAtm.cameraPOV);

    const [clipXBrainModel, setClipXBrainModel] = useAtom(StAtm.clipXBrainModel);
    const [clipYBrainModel, setClipYBrainModel] = useAtom(StAtm.clipYBrainModel);
    const [clipZBrainModel, setClipZBrainModel] = useAtom(StAtm.clipZBrainModel);

    const [showXSlice, setShowXSlice] = useAtom(StAtm.showXSlice);
    const [showYSlice, setShowYSlice] = useAtom(StAtm.showYSlice);
    const [showZSlice, setShowZSlice] = useAtom(StAtm.showZSlice);

    const [volumeValMin,] = useAtom(StAtm.volumeValMin);
    const [volumeValMax,] = useAtom(StAtm.volumeValMax);

    const [volumeRange, setVolumeRange] = useAtom(StAtm.volumeRange);
    const [volumeMixRatio, setVolumeMixRatio] = useAtom(StAtm.volumeMixRatio);

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
                <div style={{ marginTop: 0, borderTop: "solid 1px #d1d1d1", paddingTop: 6 }}>
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
                                checked={clipXBrainModel}
                                disabled={maxIndexX <= 0}
                                label="clip brainModel"
                                onChange={() =>
                                    setClipXBrainModel(!clipXBrainModel)
                                }
                            />
                            :
                            null
                        }
                    </div>

                    <div
                        style={{ display: 'flex', flexDirection: 'row', justifyContent: 'space-between' }}
                    >
                        {props.extra ?
                            <div style={{ marginRight: 10, fontSize: 'small' }}>
                                <Button
                                    disabled={!volumeLoaded}
                                    small
                                    onClick={() =>
                                        setCameraPOV(StAtm.CameraPOV.Left)
                                    }
                                >L</Button>
                            </div>
                            :
                            null
                        }
                        <Slider
                            className="x-slider"
                            min={0}
                            max={maxIndexX}
                            disabled={maxIndexX <= 0}
                            labelValues={[]}
                            showTrackFill={false}
                            value={indexX}
                            onChange={setIndexX}
                        />
                        {props.extra ?
                            <div style={{ marginLeft: 10, fontSize: 'small' }}>

                                <Button
                                    disabled={!volumeLoaded}
                                    small
                                    onClick={() =>
                                        setCameraPOV(StAtm.CameraPOV.Right)
                                    }
                                >R</Button>
                            </div>
                            :
                            null
                        }

                    </div>
                </div>

                <div style={{ marginTop: 2, borderTop: "solid 1px #d1d1d1", paddingTop: 6 }}>
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
                        {props.extra ?

                            <Switch
                                checked={clipYBrainModel}
                                disabled={maxIndexY <= 0}
                                label="clip brainModel"
                                onChange={() =>
                                    setClipYBrainModel(!clipYBrainModel)
                                }
                            />
                            :
                            null
                        }

                    </div>
                </div>


                <div
                    style={{ display: 'flex', flexDirection: 'row', justifyContent: 'space-between' }}
                >
                    {props.extra ?
                        <div style={{ marginRight: 10, fontSize: 'small' }}>
                            <Button
                                disabled={!volumeLoaded}
                                small
                                onClick={() =>
                                    setCameraPOV(StAtm.CameraPOV.Posterior)
                                }
                            >P</Button>
                        </div>
                        :
                        null
                    }
                    <Slider
                        className="y-slider"
                        min={0}
                        max={maxIndexY}
                        disabled={maxIndexY <= 0}
                        labelValues={[]}
                        showTrackFill={false}
                        value={indexY}
                        onChange={setIndexY}
                    />
                    {props.extra ?
                        <div style={{ marginLeft: 10, fontSize: 'small' }}>
                            <Button
                                disabled={!volumeLoaded}
                                small
                                onClick={() =>
                                    setCameraPOV(StAtm.CameraPOV.Anterior)
                                }
                            >A</Button>
                        </div>
                        :
                        null
                    }
                </div>

                <div style={{ marginTop: 2, borderTop: "solid 1px #d1d1d1", paddingTop: 6 }}>
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
                                checked={clipZBrainModel}
                                disabled={maxIndexZ <= 0}
                                label="clip brainModel"
                                onChange={() =>
                                    setClipZBrainModel(!clipZBrainModel)
                                }
                            />
                            :
                            null
                        }

                    </div>
                </div>

                <div
                    style={{ display: 'flex', flexDirection: 'row', justifyContent: 'space-between' }}
                >
                    {props.extra ?
                        <div style={{ marginRight: 10, fontSize: 'small' }}>
                            <Button
                                disabled={!volumeLoaded}
                                small
                                onClick={() =>
                                    setCameraPOV(StAtm.CameraPOV.Inferior)
                                }
                            >I</Button>
                        </div>
                        :
                        null
                    }
                    <Slider
                        className="z-slider"
                        min={0}
                        max={maxIndexZ}
                        disabled={maxIndexZ <= 0}
                        labelValues={[]}
                        showTrackFill={false}
                        value={indexZ}
                        onChange={setIndexZ}
                    />

                    {props.extra ?
                        <div style={{ marginLeft: 10, fontSize: 'small' }}>
                            <Button
                                disabled={!volumeLoaded}
                                small
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
                    stepSize={(volumeValMax - volumeValMin) / 255}
                    labelPrecision={(volumeValMax - volumeValMin) > 100 ? 0 : 2}
                    labelValues={[]}
                    onChange={setVolumeRange}
                    value={volumeRange}
                />
            </div>
            {
                loadOverlay ?
                    <div
                        style={{
                            marginTop: 16, borderTop: "solid 1px #d1d1d1", padding: 10,
                            display: 'grid',
                            gridTemplateColumns: '30px 1fr',
                        }}
                        title={"mix source volume and result preview"}
                    >
                        <Icon
                            style={
                                (!volumeLoaded ? { color: 'rgba(92, 112, 128, 0.2)' } : {})
                            }
                            icon="segmented-control"
                        />
                        <Slider
                            disabled={!volumeLoaded}
                            min={0}
                            max={1}
                            stepSize={1 / 255}
                            labelValues={[]}
                            labelPrecision={2}
                            showTrackFill={false}
                            onChange={setVolumeMixRatio}
                            value={volumeMixRatio}
                        />
                    </div>
                    :
                    null
            }
        </>
    );

};

export default SlicesControls;
