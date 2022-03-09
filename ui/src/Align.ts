import * as THREE from 'three';
import { SVD } from 'svd-js';

import { LandMark, MarkInstance } from "./components/LandmarksManager";
import { rowArrayToMatrix3 } from './components/Utils';


/* compute the rotation that optimally align user defined landmarks with brain model ones.
* (using Kabsch algorithm that minimizes the Root Mean Squared Deviation (RMSD) between 2 paired sets of points)
* reference: https://towardsdatascience.com/the-definitive-procedure-for-aligning-two-sets-of-3d-points-with-the-kabsch-algorithm-a7ec2126c87e
*/
export const getRotationToAlignLandmarks = (markInstances: MarkInstance[], landmarks: LandMark[]) => {

    const minimalNbPoints = 3;

    const rotQuat = new THREE.Quaternion();

    if (markInstances.length >= minimalNbPoints) {

        //P: set of points to align
        const userDefinedPoints = markInstances.map(m => [...m.coord]);

        //Q: set of corresponding reference points
        const referencePoints: number[][] = [];
        markInstances.forEach(m => {
            const lm = landmarks.find(lm => m.landmarkId === lm.id);
            lm && referencePoints.push([...lm.coord]);
        });

        //perform point alignment
        const rotationMatrix = getRotationToAlignPoints(userDefinedPoints, referencePoints);
        //convert to THREE affine transform matrix 
        const rotMatrix3 = new THREE.Matrix4().setFromMatrix3(rowArrayToMatrix3(rotationMatrix));
        //
        rotQuat.setFromRotationMatrix(rotMatrix3);
    }

    return rotQuat;

};


export const getRotationToAlignPoints = (userDefinedPoints: number[][], referencePoints: number[][]) => {

    //center both sets of points around origin
    centerPointsSet(userDefinedPoints);
    const offsets = centerPointsSet(referencePoints);

    //H: matrix to decompose
    const H = multiply(transpose(referencePoints), userDefinedPoints);

    //Singular Value Decomposition
    const svdH = SVD(H);

    //need to check if the determinant of V x Ut is negative
    //Note: svdH.v is already transposed (=Vt)
    const determinant = rowArrayToMatrix3(multiply(transpose(svdH.v), transpose(svdH.u))).determinant();

    //R: get the rotation matrix (3x3)
    let rotationMatrix: number[][];
    if (determinant < 0) {
        console.error('determinant was negative!', determinant);
        const correctingMat = [[1, 0, 0], [0, 1, 0], [0, 0, -1]];
        rotationMatrix = multiply(svdH.v, multiply(correctingMat, transpose(svdH.u)));
    } else {
        rotationMatrix = multiply(svdH.v, transpose(svdH.u));
    }
    //
    return rotationMatrix;

};

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
}