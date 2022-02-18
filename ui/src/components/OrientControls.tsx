import * as React from "react";
import { useAtom } from "jotai";


import * as THREE from 'three';

import { SVD } from 'svd-js';

import {
    Button,
    Switch,
} from "@blueprintjs/core";


import * as StAtm from '../StateAtoms';


import { LandMark, MarkInstance } from "./LandmarksManager";


function multiply(a: number[][], b: number[][]) {
    var aNumRows = a.length,
        aNumCols = a[0].length,
        bNumRows = b.length,
        bNumCols = b[0].length,
        m = new Array(aNumRows); // initialize array of rows
    for (var r = 0; r < aNumRows; ++r) {
        m[r] = new Array(bNumCols); // initialize the current row
        for (var c = 0; c < bNumCols; ++c) {
            m[r][c] = 0; // initialize the current cell
            for (var i = 0; i < aNumCols; ++i) {
                m[r][c] += a[r][i] * b[i][c];
            }
        }
    }
    return m;
}

function transpose(matrix: number[][]) {
    return matrix[0].map((col, i) => matrix.map((row) => row[i]));
}

//center a set of point around origin : subtract from each element the average of the whole column
function centerPointsSet(m: number[][]) {

    const nbRows = m.length;
    const colAvgs = m
        //sum by columns
        .reduce(
            (acc, row) => {
                row.forEach((w, i) => acc[i] += w);
                return acc;
            },
            [0, 0, 0]
        )
        //average
        .map(w => w / nbRows);

    // inplace modif 
    m.forEach(row => row.forEach((w, i) => row[i] -= colAvgs[i]));
    return colAvgs;
};

const toMatrix3 = (mat: number[][]) => {
    const mat3 = new THREE.Matrix3();
    mat3.set(
        mat[0][0], mat[0][1], mat[0][2],
        mat[1][0], mat[1][1], mat[1][2],
        mat[2][0], mat[2][1], mat[2][2],
    )
    return mat3;
};


//

/* compute the rotation that optimally align user defined landmarks with brain model ones.
* (using Kabsch algorithm that minimizes the Root Mean Squared Deviation (RMSD) between 2 paired sets of points)
* reference: https://towardsdatascience.com/the-definitive-procedure-for-aligning-two-sets-of-3d-points-with-the-kabsch-algorithm-a7ec2126c87e
*/
const getRotationToAlignLandmarks = (markInstances: MarkInstance[], landmarks: LandMark[]) => {

    const minimalNbPoints = 3;

    const rotQuat = new THREE.Quaternion();


    if (markInstances.length >= minimalNbPoints) {

        //P: set of points to align
        const userDefinedPoints = markInstances.map(m => m.coord);

        //Q: set of corresponding reference points
        const referencePoints: number[][] = [];
        markInstances.forEach(m => {
            const lm = landmarks.find(lm => m.landmarkId === lm.id);
            lm && referencePoints.push(lm.coord);
        });

        //center both sets of points around origin
        centerPointsSet(userDefinedPoints);
        centerPointsSet(referencePoints);

        //H: matrix to decompose
        const H = multiply(transpose(referencePoints), userDefinedPoints);

        //Singular Value Decomposition
        const svdH = SVD(H);

        //need to check if the determinant of V x Ut is negative
        //Note: svdH.v is already transposed (=Vt)
        const determinant = toMatrix3(multiply(transpose(svdH.v), transpose(svdH.u))).determinant();

        //R: get the rotation matrix (3x3)
        let rotationMatrix: number[][];
        if (determinant < 0) {
            console.debug('determinant was negative!', determinant);
            const correctingMat = [[1, 0, 0], [0, 1, 0], [0, 0, -1]];
            rotationMatrix = multiply(svdH.v, multiply(correctingMat, transpose(svdH.u)));
        } else {
            rotationMatrix = multiply(svdH.v, transpose(svdH.u));
        }
        //convert to THREE affine transform matrix 
        const rotMatrix3 = new THREE.Matrix4().setFromMatrix3(toMatrix3(rotationMatrix));
        rotQuat.setFromRotationMatrix(rotMatrix3);
    }

    return rotQuat;

}


const OrientControls = () => {

    const [volumeLoaded,] = useAtom(StAtm.volumeLoaded);
    const [knownLandMarksAry,] = useAtom(StAtm.knownLandMarksAry);

    const [markInstances,] = useAtom(StAtm.markInstances);

    const [deltaRotation,] = useAtom(StAtm.deltaRotation);
    const [, setCameraPOV] = useAtom(StAtm.cameraPOV);

    const [showBrainModel, setShowBrainModel] = useAtom(StAtm.showBrainModel);

    const [, setBrainModelInitRotation] = useAtom(StAtm.brainModelInitRotation);
    const [fixedBrainModel, setFixedBrainModel] = useAtom(StAtm.fixedBrainModel);


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

            <div>
                <Button icon="layout-sorted-clusters"
                    disabled={markInstances.size < 3}
                    onClick={() => {
                        const rotationQ = getRotationToAlignLandmarks([...markInstances.values()], knownLandMarksAry)
                        setBrainModelInitRotation(rotationQ);
                    }}

                >Align using landmarks</Button>

            </div>

        </div>
    );

};

export default OrientControls;
