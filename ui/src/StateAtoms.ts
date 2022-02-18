import { atom } from 'jotai'

import * as THREE from 'three';

import { RegistrationTask } from "./RegistrationTaskHandler";
import { LandMark, MarkInstance } from './components/LandmarksManager';

const MarmosetLandMarks: LandMark[] = [

    { id: 'ac', color: '#f1c40f', coord: [0, 25, -10], name: 'ac', longname: 'Anterior Commissure', descr: 'Mid-sagittal left point at start of ac in coronal view going from anterior to posterior.' },

    { id: 'pc', color: '#9b59b6', coord: [0, -5, -10], name: 'pc', longname: 'Posterior Commissure', descr: 'Mid-sagittal left point at start of pc in coronal view going from anterior to posterior.' },

    { id: 'cc-s', color: '#3498db', coord: [0, 0, 0], name: 'cc (start)', longname: 'Corpus Callosum', descr: 'Mid-sagittal left point at start of cc in coronal view going from anterior to posterior.' },
    { id: 'cc-e', color: '#3498db', coord: [0, 0, 0], name: 'cc (end)', longname: 'Corpus Callosum', descr: 'Mid-sagittal left point at end of cc in coronal view going from anterior to posterior.' },

    { id: 'MB-l', color: '#c0392b', coord: [0, 0, 0], name: 'MB (left)', longname: 'Mammillary Body', descr: 'Center of the first appearance of the left MB in coronal view going from anterior to posterior.' },
    { id: 'MB-r', color: '#c0392b', coord: [0, 0, 0], name: 'MB (right)', longname: 'Mammillary Body', descr: 'Center of the first appearance of the right MB in coronal view going from anterior to posterior.' },

    { id: 'DLG-l', color: '#28b463', coord: [0, 0, 0], name: 'DLG (left)', longname: 'Dorsal Lateral Geniculate Nucleus', descr: 'The point at the first appearance of the left DLG in coronal view, moving from anterior to posterior.' },
    { id: 'DLG-r', color: '#28b463', coord: [0, 0, 0], name: 'DLG (right)', longname: 'Dorsal Lateral Geniculate Nucleus', descr: 'The point at the first appearance of the right DLG in coronal view, moving from anterior to posterior.' },
    { id: '4V-f', color: '#dc7633', coord: [20, -43, -10], name: '4V (fastigium)', longname: 'Fastigium of the fourth Ventricle', descr: 'Mid-saggital point of the fastigium of the fourth ventricle, identified in the sagittal plane.' },

];


export enum ViewMode {
    None = 'none',
    Volume3D = 'Volume3D',
    Slice3D = 'Slices3D',
    Slice2D = 'Slices2D',
}

export enum BrainModelMode {
    Wire,
    Clipped,
}

export enum ClipBrainModelMode {
    None = 'none',
    ClipX = 'x',
    ClipY = 'y',
    ClipZ = 'z',
}
    
export enum CameraPOV {
    Free,
    Left,
    Right,
    Anterior,
    Posterior,
    Superior,
    Inferior,
}


export const isLoading = atom(false);
export const volumeLoaded = atom(false);

export const volumeValMin = atom(0.0);
export const volumeValMax = atom(1.0);

export const viewMode = atom(ViewMode.Slice3D);
export const alertMessage = atom(undefined as unknown as JSX.Element);

export const deltaRotation = atom([0, 0, 0] as [number, number, number]);
export const cameraRotation = atom({up: [0, 0, 0] as [number, number, number], position: [0, 0, 0] as [number, number, number]});
export const cameraPOV = atom(CameraPOV.Superior);


export const showBrainModel = atom(false);
export const brainModelMode = atom(BrainModelMode.Wire);

export const clipBrainModel = atom(ClipBrainModelMode.None);
export const brainModelInitRotation = atom(new THREE.Quaternion());
export const fixedBrainModel = atom(false);

export const isothreshold = atom(0.5);
export const clims = atom([0, 1]);
export const castIso = atom(true);

export const showXSlice = atom(false);
export const showYSlice = atom(false);
export const showZSlice = atom(true);
export const volumeRange = atom([0, 0] as [number, number]);

export const indexX = atom(0);
export const indexY = atom(0);
export const indexZ = atom(0);

export const maxIndexX = atom(0);
export const maxIndexY = atom(0);
export const maxIndexZ = atom(0);

export const remoteTask = atom(undefined as unknown as RegistrationTask);
export const showLogs = atom(false);
export const loglines = atom([] as string[]);


export const knownLandMarks = atom(new Map(MarmosetLandMarks.map(lm => [lm.id, lm])));
//(just in case knownLandMarks is not static in the future...)
export const knownLandMarksAry = atom((get) => [...get(knownLandMarks).values()]);

export const nextLandmarkId = atom('');
export const markInstances = atom(new Map<string, MarkInstance>());
export const highMarks = atom([] as string[]);


//state used in listeners 
export type RealTimeState = {
    fixedBrainModel: boolean,
    brainModelInitRotation: THREE.Quaternion,
    deltaRotation: number[],
    stopQ: THREE.Quaternion,
    camDistance: number,
    viewMode: ViewMode,
    normPointer: THREE.Vector2,
    indexX : number,
    indexY : number,
    indexZ : number,
};
