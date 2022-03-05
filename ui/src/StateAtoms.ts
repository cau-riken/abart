import { atom } from 'jotai'

import * as THREE from 'three';

import { RegistrationTask } from "./RegistrationTaskHandler";
import { LandMark, MarkInstance } from './components/LandmarksManager';

export const MarmosetLandMarks: LandMark[] = [

    { id: 'ac', color: '#f1c40f', coord: [0.5, 53.5, -9.5], name: 'ac', longname: 'Anterior Commissure', descr: 'Mid-sagittal point at start of ac in coronal view going from anterior to posterior.' },

    { id: 'pc', color: '#9b59b6', coord: [0.5, -11.5, 5.5], name: 'pc', longname: 'Posterior Commissure', descr: 'Mid-sagittal point at start of pc in coronal view going from anterior to posterior.' },

    { id: 'cc-s', color: '#304be4', coord: [0.5, 95.5, 13.5], name: 'cc (start)', longname: 'Corpus Callosum', descr: 'Mid-sagittal point at start of cc in coronal view going from anterior to posterior.' },
    { id: 'cc-e', color: '#6ac3ff', coord: [0.5, -32.5, 26.5], name: 'cc (end)', longname: 'Corpus Callosum', descr: 'Mid-sagittal point at end of cc in coronal view going from anterior to posterior.' },

    { id: 'MB-l', color: '#e71f09', coord: [-8.5, 15.5, -40.5], name: 'MB (left)', longname: 'Mammillary Body', descr: 'Center of the first appearance of the left MB in coronal view going from anterior to posterior.' },
    { id: 'MB-r', color: '#db4b3c', coord: [7.5, 15.5, -40.5], name: 'MB (right)', longname: 'Mammillary Body', descr: 'Center of the first appearance of the right MB in coronal view going from anterior to posterior.' },

    { id: 'DLG-l', color: '#28b463', coord: [-62.5, 11.5, -19.5], name: 'DLG (left)', longname: 'Dorsal Lateral Geniculate Nucleus', descr: 'The point at the first appearance of the left DLG in coronal view, moving from anterior to posterior.' },
    { id: 'DLG-r', color: '#79f853', coord: [60.5, 11.5, -19.5], name: 'DLG (right)', longname: 'Dorsal Lateral Geniculate Nucleus', descr: 'The point at the first appearance of the right DLG in coronal view, moving from anterior to posterior.' },
    { id: '4V-f', color: '#e218d1', coord: [-0.5, -86.5, -38.5], name: '4V (fastigium)', longname: 'Fastigium of the fourth Ventricle', descr: 'Mid-saggital point of the fastigium of the fourth ventricle, identified in the sagittal plane.' },

];

export type LoadedVolumeFile = {
    fileOrBlob: File | Blob | undefined,
    name: string,
};

export enum ViewMode {
    None = 'none',
    Volume3D = 'Volume3D',
    Slice3D = 'Slices3D',
    Slice2D = 'Slices2D',
}

export enum BrainModelMode {
    Volume,
    Clipped,
}

export enum PlaneIndex {
    X = 0,
    Y = 1,
    Z = 2,
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

export const volumeFile = atom<LoadedVolumeFile | undefined>(undefined);

export const isLoading = atom(false);
export const volumeLoaded = atom(false);

export const volumeValMin = atom(0.0);
export const volumeValMax = atom(1.0);

export const viewMode = atom(ViewMode.Slice3D);
export const alertMessage = atom<JSX.Element | undefined>(undefined);

export const deltaRotation = atom([0, 0, 0] as [number, number, number]);
export const cameraRotation = atom({ up: [0, 0, 0] as [number, number, number], position: [0, 0, 0] as [number, number, number] });
export const cameraPOV = atom(CameraPOV.Free);


export const showBrainModel = atom(false);
export const brainModelMode = atom(BrainModelMode.Volume);

export const clipXBrainModel = atom(false);
export const clipYBrainModel = atom(false);
export const clipZBrainModel = atom(false);
export const brainModelInitRotation = atom(new THREE.Quaternion());
export const fixedBrainModel = atom(false);
export const brainModelRelativeRotation = atom(new THREE.Quaternion());

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

export const remoteTask = atom<RegistrationTask | undefined>(undefined);
export const showLogs = atom(false);
export const loglines = atom([] as string[]);


export const knownLandMarks = atom(new Map(MarmosetLandMarks.map(lm => [lm.id, lm])));
//(just in case knownLandMarks is not static in the future...)
export const knownLandMarksAry = atom((get) => [...get(knownLandMarks).values()]);

export const nextLandmarkId = atom('');
export const markInstances = atom(new Map<string, MarkInstance>());
export const highMarks = atom([] as string[]);

