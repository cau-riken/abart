import * as React from "react";
import { useAtom } from "jotai";


import * as THREE from 'three';

import {
    Button,
    Switch,
} from "@blueprintjs/core";


import * as StAtm from '../StateAtoms';
import { getRotationToAlignLandmarks } from "../Align";

const OrientControls = () => {

    const [volumeLoaded,] = useAtom(StAtm.volumeLoaded);
    const [knownLandMarksAry,] = useAtom(StAtm.knownLandMarksAry);

    const [markInstances,] = useAtom(StAtm.markInstances);

    const [deltaRotation,] = useAtom(StAtm.deltaRotation);
    const [, setCameraPOV] = useAtom(StAtm.cameraPOV);

    const [showBrainModel, setShowBrainModel] = useAtom(StAtm.showBrainModel);
    const [brainModelMode, setBrainModelMode] = useAtom(StAtm.brainModelMode);

    const [, setBrainModelInitRotation] = useAtom(StAtm.brainModelInitRotation);
    const [fixedBrainModel, setFixedBrainModel] = useAtom(StAtm.fixedBrainModel);
    const [, setBrainModelRelativeRot] = useAtom(StAtm.brainModelRelativeRotation);

    return (
        <div
            style={{
                marginTop: 16, borderTop: "solid 1px #d1d1d1", paddingTop: 6,
            }}
        >
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
                <Switch
                    checked={brainModelMode === StAtm.BrainModelMode.Volume}
                    disabled={!volumeLoaded || !showBrainModel}
                    innerLabel="clipped"
                    innerLabelChecked="volume"
                    onChange={() =>
                        setBrainModelMode(
                            brainModelMode === StAtm.BrainModelMode.Volume
                                ?
                                StAtm.BrainModelMode.Clipped
                                :
                                StAtm.BrainModelMode.Volume
                        )
                    }
                />
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

                    display: 'flex', flexDirection: 'row', justifyContent: 'space-between', alignItems: "baseline"
                }}
            >
                <span>Orientation diff. :</span>
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

            <div>
                <Button icon="layout-sorted-clusters"
                    disabled={markInstances.size < 3}
                    onClick={() => {
                        const rotationQ = getRotationToAlignLandmarks([...markInstances.values()], knownLandMarksAry)
                        setBrainModelRelativeRot(rotationQ);
                    }}

                >Align using landmarks</Button>

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

        </div>
    );

};

export default OrientControls;
