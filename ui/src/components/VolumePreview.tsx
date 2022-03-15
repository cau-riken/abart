import * as React from "react";
import { useAtom } from "jotai";


import * as THREE from 'three';

import Stats from 'three/examples/jsm/libs/stats.module.js';

import { VolumeRenderShader1 } from 'three/examples/jsm/shaders/VolumeShader.js';
import { ArcballControls } from 'three/examples/jsm/controls/ArcballControls.js';
import { PLYLoader } from 'three/examples/jsm/loaders/PLYLoader';
import { DragControls } from 'three/examples/jsm/controls/DragControls';

import { NIfTILoader } from '../loaders/NIfTILoader';

import {
    Alert,
    Spinner,
    SpinnerSize,
    ResizeEntry,
    Icon,
} from "@blueprintjs/core";

import {
    ResizeSensor2,
} from "@blueprintjs/popover2";

import * as StAtm from '../StateAtoms';


import SinkLogger from "./SinkLogger";
import LandMarksList from "./LandMarksList";
import { PickingMode } from "./LandmarksManager";

import "./VolumePreview.scss";

import { newXRayGlowingMaterial, setupAxesHelper } from './Utils';
import { Volume } from "../misc/Volume";
import { VolumeSlice } from "../misc/VolumeSlice";
import LandmarksManager, { CreateLandMarkOptions } from "./LandmarksManager";
import PreviewControls from "./PreviewControls";
import { EventDispatcher } from "three";
import HelpNavigation from "./HelpNavigation";


type ListenerInfo = {
    event: string,
    listener: any,
    dispatcher: EventDispatcher,
}

type VolumePreviewProps = {
};

const setupInset = (insetAspect: number, camera: THREE.Camera) => {
    // scene
    const insetScene = new THREE.Scene();

    // camera
    const insetCamera = new THREE.PerspectiveCamera(50, insetAspect, 1, 1000);
    insetCamera.name = 'inset-cam';
    insetCamera.up = camera.up; // important!

    // axes
    setupAxesHelper(100, insetScene)

    return { insetScene, insetCamera };
}

//references of ThreeJS objects not created by React
export type Obj3dRefs = {

    stats?: Stats | undefined,

    //main scene (volume 3D & slices in 3D)
    renderer?: THREE.WebGLRenderer | undefined,
    camera?: THREE.OrthographicCamera | undefined,
    scene?: THREE.Scene | undefined,
    controls?: ArcballControls | undefined,

    //insets related  
    renderer2?: THREE.Renderer | undefined,
    aspect2?: number,
    camera2?: THREE.PerspectiveCamera | undefined,
    scene2?: THREE.Scene | undefined,

    //for slices rendering
    volume?: Volume | undefined,
    sliceX?: VolumeSlice | undefined,
    sliceY?: VolumeSlice | undefined,
    sliceZ?: VolumeSlice | undefined,

    //for volume rendering
    vol3D?: THREE.Group | undefined,
    materialVol3D?: THREE.ShaderMaterial | undefined,

    //brain model
    brainModel?: THREE.Group | undefined,
    //materials for brain model
    brModelPlainMats?: THREE.Material[] | undefined,
    brModelXRayMat?: THREE.ShaderMaterial | undefined,

    //groups for user created landmarks
    marksGroup?: THREE.Group | undefined,

    //volume bounding box 
    cube?: THREE.Mesh | undefined,

    boxAniMixer?: THREE.AnimationMixer | undefined,
    boxAninAction?: THREE.AnimationAction | undefined,

    //standard planes scenes (slices in 2D)
    rendX?: THREE.WebGLRenderer | undefined,
    camX?: THREE.OrthographicCamera | undefined,
    sliceXCtrl?: ArcballControls | undefined,
    dragCtrlX?: DragControls | undefined,

    rendY?: THREE.WebGLRenderer | undefined,
    camY?: THREE.OrthographicCamera | undefined,
    sliceYCtrl?: ArcballControls | undefined,
    dragCtrlY?: DragControls | undefined,

    rendZ?: THREE.WebGLRenderer | undefined,
    camZ?: THREE.OrthographicCamera | undefined,
    sliceZCtrl?: ArcballControls | undefined,
    dragCtrlZ?: DragControls | undefined,


    //others ThreeJS objects which need to be released when undloading volume 
    disposable: (THREE.BufferGeometry | THREE.Material | THREE.Texture)[],

    listeners: ListenerInfo[],

};


//Part of the state used within ThreeJs listeners. 
//Note: Because ThreeJs is updated more frequently than React, the state managed by the latter might 
//      not be up-to-date when needed by ThreeJs; 
//      Hence part of the state is also handled as regular instance variable.
export type RealTimeState = {
    fixedBrainModel?: boolean,
    brainModelInitRotation?: THREE.Quaternion,
    deltaRotation?: number[],
    stopQ?: THREE.Quaternion,
    camDistance?: number,
    viewMode?: StAtm.ViewMode,
    normPointer: THREE.Vector2,
    indexX?: number,
    indexY?: number,
    indexZ?: number,
};


const SELECTED_FILE_FAKEURL = "selected_file";

const VolumePreview = (props: VolumePreviewProps) => {

    const [viewMode, setViewMode] = useAtom(StAtm.viewMode);

    const [isLoading, setIsLoading] = useAtom(StAtm.isLoading);
    const [volumeLoaded, setVolumeLoaded] = useAtom(StAtm.volumeLoaded);
    const [volumeFile,] = useAtom(StAtm.volumeFile);
    const [overlayUrl, ] = useAtom(StAtm.overlayUrl);

    const [alertMessage, setAlertMessage] = useAtom(StAtm.alertMessage);

    const [deltaRotation, setDeltaRotation] = useAtom(StAtm.deltaRotation);
    const [cameraPOV, setCameraPOV] = useAtom(StAtm.cameraPOV);

    const [showBrainModel, setShowBrainModel] = useAtom(StAtm.showBrainModel);
    const [brainModelMode, setBrainModelMode] = useAtom(StAtm.brainModelMode);

    const [clipXBrainModel, setClipXBrainModel] = useAtom(StAtm.clipXBrainModel);
    const [clipYBrainModel, setClipYBrainModel] = useAtom(StAtm.clipYBrainModel);
    const [clipZBrainModel, setClipZBrainModel] = useAtom(StAtm.clipZBrainModel);
    const [brainModelInitRotation, setBrainModelInitRotation] = useAtom(StAtm.brainModelInitRotation);
    const [fixedBrainModel, setFixedBrainModel] = useAtom(StAtm.fixedBrainModel);
    const [brainModelRelativeRot,] = useAtom(StAtm.brainModelRelativeRotation);

    const [isothreshold, setIsothreshold] = useAtom(StAtm.isothreshold);
    const [clims, setClims] = useAtom(StAtm.clims);
    const [castIso, setCastIso] = useAtom(StAtm.castIso);

    const [showXSlice, setShowXSlice] = useAtom(StAtm.showXSlice);
    const [showYSlice, setShowYSlice] = useAtom(StAtm.showYSlice);
    const [showZSlice, setShowZSlice] = useAtom(StAtm.showZSlice);

    const [volumeRange, setVolumeRange] = useAtom(StAtm.volumeRange);
    const [volumeMixRatio, setVolumeMixRatio] = useAtom(StAtm.volumeMixRatio);
    const [, setVolumeValMin] = useAtom(StAtm.volumeValMin);
    const [, setVolumeValMax] = useAtom(StAtm.volumeValMax);

    const [indexX, setIndexX] = useAtom(StAtm.indexX);
    const [indexY, setIndexY] = useAtom(StAtm.indexY);
    const [indexZ, setIndexZ] = useAtom(StAtm.indexZ);

    const [maxIndexX, setMaxIndexX] = useAtom(StAtm.maxIndexX);
    const [maxIndexY, setMaxIndexY] = useAtom(StAtm.maxIndexY);
    const [maxIndexZ, setMaxIndexZ] = useAtom(StAtm.maxIndexZ);

    const [showLogs,] = useAtom(StAtm.showLogs);
    const [loglines,] = useAtom(StAtm.loglines);

    const [knownLandMarks,] = useAtom(StAtm.knownLandMarks);
    const [knownLandMarksAry,] = useAtom(StAtm.knownLandMarksAry);

    const [nextLandmarkId, setNextLandmarkId] = useAtom(StAtm.nextLandmarkId);
    const [markInstances, setMarkInstances] = useAtom(StAtm.markInstances);
    const [highMarks, setHighMarks] = useAtom(StAtm.highMarks);

    const [sliceRendPosIndices, setSliceRendPosIndices] = React.useState([2, 0, 1]);

    const [mriBoxMinMax, setMRIBoxMinMax] = React.useState({ min: [0, 0, 0], max: [0, 0, 0] });
    const [landmarksManager, setLandmarksManager] = React.useState<LandmarksManager>();


    const volRendererContainer = React.useRef<HTMLDivElement>(null);
    const clock = React.useRef(new THREE.Clock());

    const objectURLs = React.useRef<string[]>([]);
    const volRendererInset = React.useRef<HTMLDivElement>(null);

    const sliceXRendererContainer = React.useRef<HTMLDivElement>(null);
    const sliceYRendererContainer = React.useRef<HTMLDivElement>(null);
    const sliceZRendererContainer = React.useRef<HTMLDivElement>(null);

    const sliceRendPlaceholder1 = React.useRef<HTMLDivElement>(null);
    const sliceRendPlaceholder2 = React.useRef<HTMLDivElement>(null);
    const sliceRendPlaceholder3 = React.useRef<HTMLDivElement>(null);


    const obj3d = React.useRef<Obj3dRefs>({
        disposable: [],
        listeners: []
    });



    const rtState = React.useRef<RealTimeState>({
        normPointer: new THREE.Vector2()
    });

    React.useEffect(() => {

        rtState.current = {
            ...rtState.current,
            fixedBrainModel,
            deltaRotation,
            brainModelInitRotation,
            viewMode,
            indexX,
            indexY,
            indexZ,
        };
        renderAll();

    });

    React.useEffect(() => {

        if (obj3d.current.vol3D) {

            if (StAtm.ViewMode.Volume3D === viewMode) {
                obj3d.current.vol3D.visible = true;

                obj3d.current.sliceX.mesh.visible = false;
                obj3d.current.sliceY.mesh.visible = false;
                obj3d.current.sliceZ.mesh.visible = false;
            } else {
                obj3d.current.vol3D.visible = false;

                //slice object is visible to allow its children being visible,
                //slice material might be hidden though to hide the slice in Slice3D view.

                obj3d.current.sliceX.mesh.visible = true;
                obj3d.current.sliceY.mesh.visible = true;
                obj3d.current.sliceZ.mesh.visible = true;

                obj3d.current.sliceX.mesh.material.visible = showXSlice;
                obj3d.current.sliceY.mesh.material.visible = showYSlice;
                obj3d.current.sliceZ.mesh.material.visible = showZSlice;
            }
        }

        //stop animation when rendering volume (as the shader becomes slow when the animation is processed)
        if (StAtm.ViewMode.Volume3D === viewMode && obj3d.current?.boxAninAction) {
            obj3d.current.boxAninAction.stop();
        }

        if (viewMode != StAtm.ViewMode.Slice2D) {

            landmarksManager?.showAllMarkBullets();

        } else {
            //show at least one slice
            if (!showXSlice && !showYSlice && !showZSlice) {
                setShowXSlice(true);
            }

            const sliceXRendCont = sliceXRendererContainer.current;
            if (sliceXRendCont && obj3d.current.rendX) {
                obj3d.current.rendX.setSize(sliceXRendCont.offsetWidth, sliceXRendCont.offsetHeight);
            }
            const sliceYRendCont = sliceYRendererContainer.current;
            if (sliceYRendCont && obj3d.current.rendY) {
                obj3d.current.rendY.setSize(sliceYRendCont.offsetWidth, sliceYRendCont.offsetHeight);
            }
            const sliceZRendCont = sliceZRendererContainer.current;
            if (sliceZRendCont && obj3d.current.rendZ) {
                obj3d.current.rendZ.setSize(sliceZRendCont.offsetWidth, sliceZRendCont.offsetHeight);
            }
            landmarksManager?.showMarkBulletsBySlices([0, 1, 2], [indexX, indexY, indexZ]);
        }

        handleResize();

    }, [viewMode]);


    React.useEffect(() => {

        updateInset();
        renderAll();

    }, [deltaRotation]);


    const refreshBrainModelVisibility = () => {
        if (obj3d.current.brainModel?.children) {
            const isVolume = brainModelMode === StAtm.BrainModelMode.Volume;
            [
                !isVolume && clipXBrainModel,
                !isVolume && clipYBrainModel,
                !isVolume && clipZBrainModel,
                isVolume,
            ].forEach((visible, index) =>
                obj3d.current.brainModel.children[index].visible = visible);
        }
    };

    React.useEffect(() => {
        refreshBrainModelVisibility();
        renderAll();
    }, [brainModelMode]);


    React.useEffect(() => {
        if (obj3d.current.controls && rtState.current.camDistance) {

            let cameraRotation;
            switch (cameraPOV) {
                default:
                case StAtm.CameraPOV.Free:
                    cameraRotation = undefined;
                    break;
                case StAtm.CameraPOV.Left:
                    cameraRotation = { up: [0, 0, 1], position: [- rtState.current.camDistance, 0, 0] };
                    break;
                case StAtm.CameraPOV.Right:
                    cameraRotation = { up: [0, 0, 1], position: [rtState.current.camDistance, 0, 0] };
                    break;
                case StAtm.CameraPOV.Posterior:
                    cameraRotation = { up: [0, 0, 1], position: [0, - rtState.current.camDistance, 0] };
                    break;
                case StAtm.CameraPOV.Anterior:
                    cameraRotation = { up: [0, 0, 1], position: [0, rtState.current.camDistance, 0] };
                    break;
                case StAtm.CameraPOV.Inferior:
                    cameraRotation = { up: [0, 1, 0], position: [0, 0, - rtState.current.camDistance] };
                    break;
                case StAtm.CameraPOV.Superior:
                    cameraRotation = { up: [0, 1, 0], position: [0, 0, rtState.current.camDistance] };
                    break;

            }
            if (cameraRotation) {
                obj3d.current.controls.reset();
                obj3d.current.camera?.up.fromArray(cameraRotation.up);
                obj3d.current.camera?.position.fromArray(cameraRotation.position);
                obj3d.current.camera?.lookAt(0, 0, 0);

                updateBrainModelRotation();
                setCameraPOV(StAtm.CameraPOV.Free);

                renderAll();
            }
        }
    }, [cameraPOV]);



    React.useEffect(() => {

        if (obj3d.current.sliceX) {
            obj3d.current.sliceX.mesh.material.visible = showXSlice;
            if (viewMode === StAtm.ViewMode.Slice2D) {
                if (!showXSlice && !showYSlice && !showZSlice) {
                    setShowYSlice(true);
                }
                handleResize();
            }
            renderAll();
        }

    }, [showXSlice]);

    React.useEffect(() => {

        if (obj3d.current.sliceY) {
            obj3d.current.sliceY.mesh.material.visible = showYSlice;
            if (viewMode === StAtm.ViewMode.Slice2D) {
                if (!showXSlice && !showYSlice && !showZSlice) {
                    setShowZSlice(true);
                }
                handleResize();
            }
            renderAll();
        }

    }, [showYSlice]);

    React.useEffect(() => {

        if (obj3d.current.sliceZ) {
            obj3d.current.sliceZ.mesh.material.visible = showZSlice;
            if (viewMode === StAtm.ViewMode.Slice2D) {
                if (!showXSlice && !showYSlice && !showZSlice) {
                    setShowXSlice(true);
                }
                handleResize();
            }
            renderAll();
        }

    }, [showZSlice]);


    React.useEffect(() => {

        if (obj3d.current.renderer) {
            if (clipXBrainModel) {
                refreshClippingPlanes(StAtm.PlaneIndex.X);
            }
            refreshBrainModelVisibility();
            renderAll();
        }

    }, [clipXBrainModel]);

    React.useEffect(() => {

        if (obj3d.current.renderer) {
            if (clipYBrainModel) {
                refreshClippingPlanes(StAtm.PlaneIndex.Y);
            }
            refreshBrainModelVisibility();
            renderAll();
        }

    }, [clipYBrainModel]);

    React.useEffect(() => {

        if (obj3d.current.renderer) {
            if (clipZBrainModel) {
                refreshClippingPlanes(StAtm.PlaneIndex.Z);
            }
            refreshBrainModelVisibility();
            renderAll();
        }

    }, [clipZBrainModel]);

    React.useEffect(() => {

        if (volumeLoaded && obj3d.current.sliceX) {
            obj3d.current.sliceX.index = indexX;
            obj3d.current.sliceX.repaint.call(obj3d.current.sliceX);
            if (brainModelMode === StAtm.BrainModelMode.Clipped) {
                refreshClippingPlanes(StAtm.PlaneIndex.X);
            }

            landmarksManager?.showMarkBulletsBySlices([0], [indexX, indexY, indexZ])

            renderAll();
        }

    }, [indexX]);


    React.useEffect(() => {

        if (volumeLoaded && obj3d.current.sliceY) {
            obj3d.current.sliceY.index = indexY;
            obj3d.current.sliceY.repaint.call(obj3d.current.sliceY);
            if (brainModelMode === StAtm.BrainModelMode.Clipped) {
                refreshClippingPlanes(StAtm.PlaneIndex.Y);
            }

            landmarksManager?.showMarkBulletsBySlices([1], [indexX, indexY, indexZ])

            renderAll();
        }

    }, [indexY]);


    React.useEffect(() => {

        if (volumeLoaded && obj3d.current.sliceZ) {
            obj3d.current.sliceZ.index = indexZ;
            obj3d.current.sliceZ.repaint.call(obj3d.current.sliceZ);
            if (brainModelMode === StAtm.BrainModelMode.Clipped) {
                refreshClippingPlanes(StAtm.PlaneIndex.Z);
            }

            landmarksManager?.showMarkBulletsBySlices([2], [indexX, indexY, indexZ])

            renderAll();
        }

    }, [indexZ]);


    React.useEffect(() => {

        if (volumeLoaded && StAtm.ViewMode.Slice2D === viewMode) {
            handleResize();
        }

    }, [sliceRendPosIndices]);


    React.useEffect(() => {
        if (landmarksManager) {
            landmarksManager.resetDraggable(obj3d.current.dragCtrlX, 1);
            landmarksManager.resetDraggable(obj3d.current.dragCtrlY, 2);
            landmarksManager.resetDraggable(obj3d.current.dragCtrlZ, 3);
        }
    }, [markInstances]);



    React.useEffect(() => {

        if (volumeLoaded && obj3d.current.volume) {
            obj3d.current.volume.windowLow = volumeRange[0];
            obj3d.current.volume.windowHigh = volumeRange[1];
            obj3d.current.volume.repaintAllSlices();
        }

    }, [volumeRange]);

    React.useEffect(() => {

        if (volumeLoaded && obj3d.current.volume) {
            obj3d.current.volume.mixRatio = volumeMixRatio;
            obj3d.current.volume.repaintAllSlices();
        }

    }, [volumeMixRatio]);


    React.useEffect(() => {

        if (obj3d.current.materialVol3D) {
            obj3d.current.materialVol3D.uniforms['u_renderstyle'].value = castIso ? 1 : 0;
            renderAll();
        }

    }, [castIso]);

    React.useEffect(() => {

        if (obj3d.current.materialVol3D) {
            obj3d.current.materialVol3D.uniforms['u_renderthreshold'].value = isothreshold;
        }

    }, [isothreshold]);

    React.useEffect(() => {

        if (obj3d.current.materialVol3D) {
            obj3d.current.materialVol3D.uniforms['u_clim'].value.set(clims[0], clims[1]);
        }

    }, [clims]);


    React.useEffect(() => {

        if (volumeLoaded && obj3d.current.brainModel) {
            obj3d.current.brainModel.visible = showBrainModel;
            renderAll();
        }

    }, [showBrainModel]);

    React.useEffect(() => {
        if (obj3d.current.camera && rtState.current.stopQ) {
            if (!fixedBrainModel) {
                //from now on brainModel will look like it's moving along the camera
                //(but it is actually static)

                //camera rotation when stoping updating brainModel rotation
                obj3d.current.camera.getWorldQuaternion(rtState.current.stopQ);

            } else {
                //from now on brainModel will look like it's fixed in its current pos
                //(but it is actually being rotated)

                //offset with last updated brainModel rotation 
                setBrainModelInitRotation(getRotationOffset(rtState.current.brainModelInitRotation));
            }
            renderAll();
        }
    }, [fixedBrainModel]);

    React.useEffect(() => {

        const updatedQ = getRotationOffset(brainModelRelativeRot);
        setBrainModelInitRotation(updatedQ);

    }, [brainModelRelativeRot]);

    React.useEffect(() => {
        updateBrainModelRotation(true);
        renderAll();
    }, [brainModelInitRotation]);

    React.useEffect(() => {

        rtState.current.brainModelInitRotation = brainModelInitRotation;
        renderAll();

    }, [brainModelInitRotation]);


    //when Volume changed (as a result of local file selection) 
    React.useEffect(() => {

        clearBeforeVolumeChange();

        setVolumeLoaded(false);
        setViewMode(StAtm.ViewMode.None);
        setCameraPOV(StAtm.CameraPOV.Free);

        setDeltaRotation([0, 0, 0]);
        rtState.current.stopQ = new THREE.Quaternion();

        setShowBrainModel(false);
        setBrainModelMode(StAtm.BrainModelMode.Volume);
        setClipXBrainModel(false);
        setClipYBrainModel(false);
        setClipZBrainModel(false);

        setBrainModelInitRotation(new THREE.Quaternion());
        setFixedBrainModel(false);

        setIndexX(0);
        setIndexY(0);
        setIndexZ(0);
        setMaxIndexX(0);
        setMaxIndexY(0);
        setMaxIndexZ(0);

        setVolumeValMin(0);
        setVolumeValMax(1);
        setVolumeRange([0, 1]);

        setShowXSlice(false);
        setShowYSlice(false);
        setShowZSlice(true);

        setMarkInstances(new Map());

        if (volumeFile && volumeFile?.fileOrBlob) {

            setIsLoading(true);

            //reset ThreeJS object references, except renderers which are conserved
            obj3d.current = {
                renderer: obj3d.current.renderer,
                stats: obj3d.current.stats,
                renderer2: obj3d.current.renderer2,
                aspect2: obj3d.current.aspect2,
                rendX: obj3d.current.rendX,
                rendY: obj3d.current.rendY,
                rendZ: obj3d.current.rendZ,
                disposable: [],
                listeners: [],
            };


            objectURLs.current.forEach((url) => URL.revokeObjectURL(url));

            const manager = new THREE.LoadingManager();
            //url modifier to allow manager to read already loaded file 
            manager.setURLModifier((url) => {
                if (url == SELECTED_FILE_FAKEURL) {
                    url = URL.createObjectURL(volumeFile?.fileOrBlob);
                    objectURLs.current.push(url);
                }
                return url;
            });

            if (volRendererContainer.current) {

                initSceneBeforeVolumeLoad();

                const niftiloadr = new NIfTILoader(manager);
                //use already selected & loaded file 
                const filename = SELECTED_FILE_FAKEURL;

                niftiloadr.load(filename,
                    function onload(volume) {
                        if (volume) {
                            initSceneOnVolumeLoaded(volume);
                        }

                        setViewMode(StAtm.ViewMode.Volume3D);
                        setVolumeLoaded(true);
                        setIsLoading(false);
                        setTimeout(renderAll, 150);


                    },
                    function onProgress(request: ProgressEvent) {
                        //console.log('onProgress', request)
                    },
                    function onError(e: ErrorEvent) {
                        console.error(e);
                        setAlertMessage(
                            <p>
                                Couldn't load the selected file.
                                <br />

                                {
                                    e.message
                                        ?
                                        <p>Reason:<pre>{e.message}</pre></p>
                                        :
                                        <span>"Please check it is a valid NIFTi file."</span>
                                }


                            </p>);
                        setIsLoading(false);
                    },

                );
                initSceneAfterVolumeLoaded();

            }
            objectURLs.current.forEach((url) => URL.revokeObjectURL(url));

        }


    }, [volumeFile]
    );

    React.useEffect(() => {
        if (obj3d.current.volume && overlayUrl) {
            setIsLoading(true);
            const niftiloadr = new NIfTILoader();
            niftiloadr.load(overlayUrl,
                function onload(overlayVol) {
                    if (overlayVol) {
                        //FIXME check that overlay has same geometry as main volume
                        //i.e. same nb of slices, same spacings (?)
                        obj3d.current.volume.overlays.push(overlayVol);
                        setVolumeMixRatio(0.5);
                        obj3d.current.volume.repaintAllSlices();
                    }
                    setIsLoading(false);

                },
                function onProgress(request: ProgressEvent) {
                    //console.log('onProgress', request)
                },
                function onError(e: ErrorEvent) {
                    setIsLoading(false);
                    console.error(e);
                    setAlertMessage(
                        <p>
                            Couldn't load the result for preview.
                            <br />
                            {
                                e.message
                                    ?
                                    <p>Reason:<pre>{e.message}</pre></p>
                                    :
                                    null
                            }
                        </p>);
                },

            );
        }

    }, [overlayUrl]
    );

    const adjustSliceCamOnResize = (
        renderer: THREE.Renderer | undefined,
        width: number,
        height: number,
        camera: THREE.OrthographicCamera | undefined,
        dimNum: number,
    ) => {
        if (renderer && camera) {
            renderer.setSize(width, height);

            const sAspect = width / height;
            const horiz = (dimNum === 2) ? 1 : 2;
            const vert = (dimNum === 0) ? 1 : 0;

            const iLeft = mriBoxMinMax.min[horiz];
            const iRight = mriBoxMinMax.max[horiz];
            const iTop = mriBoxMinMax.max[vert];
            const iBottom = mriBoxMinMax.min[vert];
            const iWidth = iRight - iLeft;
            const iHeight = iTop - iBottom;
            const iAspect = iWidth / iHeight;

            const margin = (iWidth * sAspect / iAspect - iWidth) / 2;

            camera.left = iLeft - margin;
            camera.right = iRight + margin;
            camera.top = iTop;
            camera.bottom = iBottom;
            camera.updateProjectionMatrix();
        }
    };


    //handle resize
    const handleResize = (entries?: ResizeEntry[] | null) => {
        if (viewMode != StAtm.ViewMode.Slice2D) {
            if (obj3d.current.renderer) {
                const renderer = obj3d.current.renderer;
                const volRendCont = volRendererContainer.current;
                if (volRendCont) {
                    renderer.setSize(volRendCont.offsetWidth, volRendCont.offsetHeight);

                    const aspect = volRendCont.offsetWidth / volRendCont.offsetHeight;
                    if (obj3d.current.camera) {
                        const { left, right, top, bottom } = getFrustumPlanes(aspect);
                        obj3d.current.camera.left = left;
                        obj3d.current.camera.right = right;
                        obj3d.current.camera.top = top;
                        obj3d.current.camera.bottom = bottom;
                        obj3d.current.camera.updateProjectionMatrix();
                    }
                }
            }
        } else {

            const sliceRendPlaceholders = [sliceRendPlaceholder1, sliceRendPlaceholder2, sliceRendPlaceholder3]
            const showISlices = [showXSlice, showYSlice, showZSlice];

            let nextPlaceholderIdx = 0;
            sliceRendPosIndices.forEach(plane => {

                if (showISlices[plane]) {
                    const placeholder = sliceRendPlaceholders[nextPlaceholderIdx];
                    nextPlaceholderIdx++;
                    if (placeholder.current) {
                        const width = placeholder.current.offsetWidth;
                        const height = placeholder.current.offsetHeight;
                        let rendContainer: HTMLDivElement | null = null;
                        if (plane == 0) {
                            rendContainer = sliceXRendererContainer.current;
                            adjustSliceCamOnResize(obj3d.current.rendX, width, height, obj3d.current.camX, 0);
                        } else if (plane == 1) {
                            rendContainer = sliceYRendererContainer.current;
                            adjustSliceCamOnResize(obj3d.current.rendY, width, height, obj3d.current.camY, 1);
                        } else if (plane == 2) {
                            rendContainer = sliceZRendererContainer.current;
                            adjustSliceCamOnResize(obj3d.current.rendZ, width, height, obj3d.current.camZ, 2);
                        }
                        if (rendContainer) {
                            rendContainer.style.top = placeholder.current.offsetTop + 'px';
                            rendContainer.style.left = placeholder.current.offsetLeft + 'px';
                        }
                    }
                }
            });
        }

        renderAll();
    };


    //after component is mounted
    React.useEffect(() => {

        //set-up renderers
        const volRendCont = volRendererContainer.current;
        if (volRendCont) {
            const renderer = new THREE.WebGLRenderer({
                antialias: true,
            });
            renderer.setSize(volRendCont.offsetWidth, volRendCont.offsetHeight);
            renderer.setClearColor(0x333333, 1);
            renderer.setPixelRatio(window.devicePixelRatio);
            volRendCont.appendChild(renderer.domElement);

            renderer.localClippingEnabled = true;
            obj3d.current.renderer = renderer;

            /*
            const stats = new Stats();
            volRendCont.appendChild(stats.dom);
            obj3d.current.stats = stats;
            */

            const renderer2 = new THREE.WebGLRenderer({ alpha: true });
            renderer2.setClearColor(0x000000, 0);

            //set-up inset
            let aspect2 = 1;
            const insetCont = volRendererInset.current;
            if (insetCont) {
                const insetWidth = insetCont.offsetWidth;
                const insetHeight = insetCont.offsetHeight;
                aspect2 = insetWidth / insetHeight;

                renderer2.setSize(insetWidth, insetHeight);
                insetCont.appendChild(renderer2.domElement);
            }


            obj3d.current.renderer2 = renderer2;
            obj3d.current.aspect2 = aspect2;

            const createSliceRenderer = (rendContainer: HTMLDivElement | null) => {
                let renderer: THREE.WebGLRenderer | undefined;
                if (rendContainer) {
                    renderer = new THREE.WebGLRenderer({
                        antialias: true,
                    });
                    renderer.setSize(rendContainer.offsetWidth, rendContainer.offsetHeight);
                    renderer.setClearColor(0x333333, 1);
                    renderer.setPixelRatio(window.devicePixelRatio);
                    rendContainer.appendChild(renderer.domElement);
                }
                return renderer;
            }

            obj3d.current.rendX = createSliceRenderer(sliceXRendererContainer.current);
            obj3d.current.rendY = createSliceRenderer(sliceYRendererContainer.current);
            obj3d.current.rendZ = createSliceRenderer(sliceZRendererContainer.current);

        }

        //dispose renderers
        return () => {
            clearBeforeVolumeChange();

            const removeRendererDom = (domElement: HTMLDivElement | HTMLCanvasElement | undefined, container: HTMLDivElement | null) => {
                domElement && container && container.removeChild(domElement);
            }
            removeRendererDom(obj3d.current.renderer?.domElement, volRendererContainer.current);
            removeRendererDom(obj3d.current.stats?.dom, volRendererContainer.current);

            removeRendererDom(obj3d.current.renderer2?.domElement, volRendererInset.current);

            removeRendererDom(obj3d.current.rendX?.domElement, sliceXRendererContainer.current);
            removeRendererDom(obj3d.current.rendY?.domElement, sliceYRendererContainer.current);
            removeRendererDom(obj3d.current.rendZ?.domElement, sliceZRendererContainer.current);

            obj3d.current = {
                disposable: [],
                listeners: []
            };
        }

    }, []);

    const clearBeforeVolumeChange = () => {
        if (obj3d.current.volume) {
            //explicitely release slices to prevent leak (since the hold a back reference to the volume)
            obj3d.current.volume.sliceList.length = 0;
        }
        obj3d.current.volume = undefined;

        obj3d.current.sliceX?.dispose();
        obj3d.current.sliceY?.dispose();
        obj3d.current.sliceZ?.dispose();
        obj3d.current.sliceXCtrl?.dispose();
        obj3d.current.sliceYCtrl?.dispose();
        obj3d.current.sliceZCtrl?.dispose();
        obj3d.current.dragCtrlX?.dispose();
        obj3d.current.dragCtrlY?.dispose();
        obj3d.current.dragCtrlZ?.dispose();

        obj3d.current.controls?.dispose();


        landmarksManager?.dispose();

        obj3d.current.disposable.forEach(d => d.dispose());
        obj3d.current.listeners.forEach(li => li.dispatcher.removeEventListener(li.event, li.listener));

    };


    const updateInset = () => {
        if (obj3d.current.controls && obj3d.current.camera && obj3d.current.camera2 && obj3d.current.scene2) {
            //copy position of the camera into inset
            obj3d.current.camera2.position.copy(obj3d.current.camera.position);
            obj3d.current.camera2.position.sub(obj3d.current.controls.target);
            obj3d.current.camera2.position.setLength(300);
            obj3d.current.camera2.lookAt(obj3d.current.scene2.position);

            obj3d.current.renderer2?.render(obj3d.current.scene2, obj3d.current.camera2);
        }
    }

    const renderSliceX = function () {
        if (obj3d.current.rendX && obj3d.current.scene && obj3d.current.camX) {
            obj3d.current.rendX.render(obj3d.current.scene, obj3d.current.camX);
        }
    };
    const renderSliceY = function () {
        if (obj3d.current.rendY && obj3d.current.scene && obj3d.current.camY) {
            obj3d.current.rendY.render(obj3d.current.scene, obj3d.current.camY);
        }
    };
    const renderSliceZ = function () {
        if (obj3d.current.rendZ && obj3d.current.scene && obj3d.current.camZ) {
            obj3d.current.rendZ.render(obj3d.current.scene, obj3d.current.camZ);
        }
    };

    const renderAll = function () {
        if (obj3d.current.scene) {

            if (viewMode != StAtm.ViewMode.Slice2D) {
                if (obj3d.current.camera) {

                    updateInset();
                    if (obj3d.current.boxAniMixer) {
                        const delta = clock.current.getDelta();
                        obj3d.current.boxAniMixer.update(delta);
                        //as long as animation isn't finished...
                        if (obj3d.current.boxAninAction?.isRunning()) {
                            //reiterate another rendering
                            //(don't need 60FPS for this animation!)
                            setTimeout(renderAll, 40);
                        }
                    }
                    obj3d.current.renderer?.render(obj3d.current.scene, obj3d.current.camera);

                    obj3d.current.stats?.update();
                }
            } else {
                renderSliceX();
                renderSliceY();
                renderSliceZ();
                obj3d.current.stats?.update();
            }
        }
    }

    const onCameraChanged = () => {

        //keep the brainModel in sync with camera rotation to make it look like it's static
        updateBrainModelRotation();

        //show Volume's bounding-box while rotating
        if (StAtm.ViewMode.Volume3D != rtState.current.viewMode && obj3d.current.boxAninAction) {
            obj3d.current.boxAninAction.stop();
            obj3d.current.boxAninAction.play();
        }
        renderAll();
    };
    //-------------------------------------------------------------------------
    //-------------------------------------------------------------------------
    const initVol3D = (scene: THREE.Scene, volume: Volume, initVisibility: boolean) => {
        // Colormap texture
        const cm_viridis = new THREE.TextureLoader().load('resources/cm_viridis.png');

        //FIXME: only limited combinations of (format + type) is supported by WebGL
        //(see https://webgl2fundamentals.org/webgl/lessons/webgl-data-textures.html)
        //For instance Nifti 64bits Float data can not be used for volume rendering
        let data = volume.data;
        if (volume.datatype == Float64Array) {
            data = new Float32Array(volume.data.length);
            (volume.data as Float64Array).forEach((e, i) => data[i] = e / 2);
        } else if (volume.datatype == Int16Array || volume.datatype == Uint16Array) {
            data = new Float32Array(volume.data.length);
            (volume.data as Float64Array).forEach((e, i) => data[i] = e * 1.0);
        }

        const texture = new THREE.DataTexture3D(data, volume.xLength, volume.yLength, volume.zLength);

        texture.format = THREE.RedFormat;
        texture.type = THREE.FloatType;

        texture.minFilter = texture.magFilter = THREE.LinearFilter;
        texture.unpackAlignment = 1;
        texture.needsUpdate = true;

        const shader = VolumeRenderShader1;

        const uniforms = THREE.UniformsUtils.clone(shader.uniforms);

        uniforms['u_data'].value = texture;
        uniforms['u_size'].value.set(volume.xLength, volume.yLength, volume.zLength);
        //FIXME magic values
        const valSpan = volume.max - volume.min;
        uniforms['u_clim'].value.set(volume.min + valSpan * .2, volume.min + valSpan * .5);
        setClims([volume.min + valSpan * .2, volume.min + valSpan * .5]);
        uniforms['u_renderstyle'].value = 1; // 0: MIP, 1: ISO
        setCastIso(true);
        uniforms['u_renderthreshold'].value = volume.min + valSpan * .15; // For ISO renderstyle
        setIsothreshold(volume.min + valSpan * .15);
        uniforms['u_cmdata'].value = cm_viridis;

        const material = new THREE.ShaderMaterial({
            uniforms: uniforms,
            vertexShader: shader.vertexShader,
            fragmentShader: shader.fragmentShader,
            side: THREE.BackSide // The volume shader uses the backface as its "reference point"
        });

        const geometry = new THREE.BoxGeometry(volume.xLength, volume.yLength, volume.zLength);
        //locally center at middle of volume
        geometry.translate(volume.xLength / 2 - 0.5, volume.yLength / 2 - 0.5, volume.zLength / 2 - 0.5);
        geometry.name = 'vol3D-geom';

        const mesh = new THREE.Mesh(geometry, material);
        //center back on the origin
        mesh.translateZ(-volume.zLength / 2 + 0.5);
        mesh.translateY(-volume.yLength / 2 + 0.5);
        mesh.translateX(-volume.xLength / 2 + 0.5);
        //orient & relocate as in RAS space        
        mesh.applyMatrix4(volume.matrix);

        mesh.visible = initVisibility;
        mesh.name = 'vol3D-mesh';

        //wrap 3D volume in a group to allow rescaling         
        const wrapper = new THREE.Group();
        wrapper.add(mesh);
        //resize to RAS space
        wrapper.scale.set(volume.spacing[0], volume.spacing[1], volume.spacing[2]);

        scene.add(wrapper);
        obj3d.current.vol3D = wrapper;
        obj3d.current.materialVol3D = material;

        obj3d.current.disposable.push(geometry, material, texture, cm_viridis);
    }

    const initSlices = (scene: THREE.Scene, volume: Volume) => {

        //the MRI box in RAS space
        const geometry = new THREE.BoxGeometry(...volume.RASDimensions);

        const material = new THREE.MeshBasicMaterial({ color: 0x00ff00 });
        //const material = new THREE.LineBasicMaterial( { color: 0x8080ff, fog: false, transparent: true, opacity: 0.6 } );
        const cube = new THREE.Mesh(geometry, material);
        cube.visible = false;
        //box helper to see the extend of the volume
        const box = new THREE.BoxHelper(cube, 0xffff00);
        box.name = 'volMRI-box';
        obj3d.current.cube = cube;

        scene.add(box);
        box.applyMatrix4(volume.matrix);
        scene.add(cube);

        //animation to make the box visible only when camera is moved (rotation, "zoom")
        const visibilityKF = new THREE.BooleanKeyframeTrack('.visible', [0, 0.2], [true, false]);
        const clip = new THREE.AnimationClip('InAndOut', -1, [visibilityKF]);
        const mixer = new THREE.AnimationMixer(box);
        const action = mixer.clipAction(clip);
        action.setLoop(THREE.LoopOnce, 1);
        obj3d.current.boxAniMixer = mixer;
        obj3d.current.boxAninAction = action;

        box.visible = false;

        //z plane
        const initSliceZ = Math.floor(volume.zLength / 4);
        const sliceZ = volume.extractSlice('z', initSliceZ);
        sliceZ.mesh.material.visible = showZSlice;
        sliceZ.mesh.layers.enable(3);

        {
            sliceZ.mesh.name = 'sliceZ-mesh';
            sliceZ.mesh.userData = { isSlice: true, isBorder: true, axis: 'z' };
            const border = new THREE.LineSegments(new THREE.EdgesGeometry(sliceZ.mesh.geometry),
                new THREE.LineBasicMaterial({ color: 0x0000ff, transparent: true, opacity: 0.4 })
            );
            border.layers.enable(1);
            border.layers.enable(2);
            sliceZ.mesh.add(border);
        }

        scene.add(sliceZ.mesh);
        obj3d.current.sliceZ = sliceZ;
        setIndexZ(obj3d.current.sliceZ.index);
        setMaxIndexZ(volume.zLength - 1);

        //y plane
        const initSliceY = Math.floor(volume.yLength / 2);
        const sliceY = volume.extractSlice('y', initSliceY);
        sliceY.mesh.material.visible = showYSlice;
        sliceY.mesh.layers.enable(2);

        {
            sliceY.mesh.name = 'sliceY-mesh';
            sliceY.mesh.userData = { isSlice: true, isBorder: true, axis: 'y' };
            const border = new THREE.LineSegments(new THREE.EdgesGeometry(sliceY.mesh.geometry),
                new THREE.LineBasicMaterial({ color: 0x00ff00, transparent: true, opacity: 0.4 })
            );
            border.layers.enable(1);
            border.layers.enable(3);
            sliceY.mesh.add(border);
        }


        scene.add(sliceY.mesh);
        obj3d.current.sliceY = sliceY;
        setIndexY(obj3d.current.sliceY.index);
        setMaxIndexY(volume.yLength - 1);

        //x plane
        const initSliceX = Math.floor(volume.xLength / 2);
        const sliceX = volume.extractSlice('x', initSliceX);
        sliceX.mesh.material.visible = showXSlice;
        sliceX.mesh.layers.enable(1);

        {
            sliceX.mesh.name = 'sliceX-mesh';
            sliceX.mesh.userData = { isSlice: true, isBorder: true, axis: 'x' };
            const border = new THREE.LineSegments(new THREE.EdgesGeometry(sliceX.mesh.geometry),
                new THREE.LineBasicMaterial({ color: 0xff0000, transparent: true, opacity: 0.4 })
            );
            border.layers.enable(2);
            border.layers.enable(3);
            sliceX.mesh.add(border);
        }

        scene.add(sliceX.mesh);
        obj3d.current.sliceX = sliceX;
        setIndexX(obj3d.current.sliceX.index);
        setMaxIndexX(volume.xLength - 1);

        //obj3d.current.sceneX.add(sliceX.mesh);
        setVolumeValMin(volume.min);
        setVolumeValMax(volume.max);
        setVolumeRange([
            volume.windowLow,
            volume.windowHigh
        ]);
    };


    const initBrainModel = (scene: THREE.Scene, cameraPos: THREE.Vector3, bboxMax: number[], initVisibility: boolean) => {

        const [mboxXLen, mboxYLen, mboxZLen] = bboxMax;

        const plyloader = new PLYLoader()
        const brainModelClippedColors = [
            new THREE.Color(0xFF0000),
            new THREE.Color(0x00FF00),
            new THREE.Color(0x0000FF),
        ];
        const brainModelXRayColor = new THREE.Color(0x0087ff);

        const clipPlanes: THREE.Plane[] = [];

        const clippedMats: THREE.Material[] = [];
        [0, 1, 2].forEach(planeIndex => {
            const plainMat = new THREE.MeshLambertMaterial({
                color: brainModelClippedColors[planeIndex],
                side: THREE.DoubleSide,
                clippingPlanes: clipPlanes,
                clipIntersection: false,
            });
            clippedMats.push(plainMat);
            obj3d.current.disposable.push(plainMat);
        });
        obj3d.current.brModelPlainMats = clippedMats;

        const xrayMat = newXRayGlowingMaterial(brainModelXRayColor, cameraPos);
        obj3d.current.disposable.push(xrayMat);
        obj3d.current.brModelXRayMat = xrayMat;

        plyloader.load(
            'models/bma_sp2.lh.surf_20kf.ply',
            (lhGeom) => plyloader.load(
                'models/bma_sp2.rh.surf_20kf.ply',
                (rhGeom) => {

                    const createBrainModelMesh = (material: THREE.Material) => {
                        const brainModel = new THREE.Group();
                        lhGeom.computeVertexNormals()
                        const lhMesh = new THREE.Mesh(lhGeom, material)

                        rhGeom.computeVertexNormals()
                        const rhMesh = new THREE.Mesh(rhGeom, material)

                        //group both hemisphere
                        brainModel.add(lhMesh);
                        brainModel.add(rhMesh);
                        return brainModel;
                    };

                    const brainModel = new THREE.Group();
                    brainModel.name = 'brainModel-group';


                    [0, 1, 2].forEach(planeIndex => {
                        const clipXShell = createBrainModelMesh(clippedMats[planeIndex]);
                        clipXShell.visible = false;
                        brainModel.add(clipXShell);
                    });

                    const brainShell = createBrainModelMesh(xrayMat);
                    brainModel.add(brainShell);


                    //scale brainModel to roughly fit image dimension 
                    const sf = 0.8;
                    var templBbox = new THREE.Box3().setFromObject(brainModel);

                    const [brainboxXLen, brainboxYLen, brainboxZLen] = templBbox.max.toArray();
                    const scaleTemplMatrix = new THREE.Matrix4().set(
                        sf * mboxXLen / brainboxXLen, 0, 0, 0,
                        0, sf * mboxYLen / brainboxYLen, 0, 0,
                        0, 0, sf * mboxZLen / brainboxZLen, 0,
                        0, 0, 0, 1
                    );

                    brainModel.applyMatrix4(scaleTemplMatrix);

                    brainModel.visible = initVisibility;

                    scene.add(brainModel);
                    obj3d.current.brainModel = brainModel;

                    const landmarks = LandmarksManager.createLandMarkPlaceholders(knownLandMarksAry);
                    brainModel.add(landmarks);

                    const initialQ = new THREE.Quaternion();
                    brainModel.getWorldQuaternion(initialQ);
                    setBrainModelInitRotation(initialQ);


                })
        );
    };

    const getClippingPlanes = (planeIndex: StAtm.PlaneIndex, pos: number) => {
        const planeNorms: THREE.Vector3[] = [];
        switch (planeIndex) {
            case StAtm.PlaneIndex.X:
                planeNorms.push(new THREE.Vector3(-1, 0, 0));
                planeNorms.push(new THREE.Vector3(1, 0, 0));
                break;
            case StAtm.PlaneIndex.Y:
                planeNorms.push(new THREE.Vector3(0, -1, 0));
                planeNorms.push(new THREE.Vector3(0, 1, 0));
                break;
            case StAtm.PlaneIndex.Z:
                planeNorms.push(new THREE.Vector3(0, 0, -1));
                planeNorms.push(new THREE.Vector3(0, 0, 1));
                break;
        }
        const clipPlanes: THREE.Plane[] = [];
        if (!isNaN(pos)) {
            const thickness = 1.5;

            clipPlanes.push(
                new THREE.Plane(planeNorms[0], pos + thickness)
            );
            clipPlanes.push(
                new THREE.Plane(planeNorms[1], -pos + thickness)
            );

        }
        return clipPlanes;
    };

    const refreshClippingPlanes = (planeIndex?: StAtm.PlaneIndex) => {
        if (obj3d.current.brModelPlainMats) {

            if (typeof planeIndex === 'undefined' || planeIndex === StAtm.PlaneIndex.X) {
                obj3d.current.brModelPlainMats[0].clippingPlanes =
                    getClippingPlanes(StAtm.PlaneIndex.X, obj3d.current.sliceX.mesh.matrix.elements[12]);
            }
            if (typeof planeIndex === 'undefined' || planeIndex === StAtm.PlaneIndex.Y) {
                obj3d.current.brModelPlainMats[1].clippingPlanes =
                    getClippingPlanes(StAtm.PlaneIndex.Y, obj3d.current.sliceY.mesh.matrix.elements[13]);
            }
            if (typeof planeIndex === 'undefined' || planeIndex === StAtm.PlaneIndex.Z) {
                obj3d.current.brModelPlainMats[2].clippingPlanes =
                    getClippingPlanes(StAtm.PlaneIndex.Z, obj3d.current.sliceZ.mesh.matrix.elements[14]);
            }

        }
    };

    //-------------------------------------------------------------------------


    const getRotationOffset = (withQ: THREE.Quaternion | undefined) => {
        //current camera rotation
        const camQ = new THREE.Quaternion();
        if (obj3d.current.camera && withQ && rtState.current.stopQ) {
            obj3d.current.camera.getWorldQuaternion(camQ);
            const initQ = new THREE.Quaternion().copy(withQ)
            const updatedQ = camQ.invert().multiply(rtState.current.stopQ).multiply(initQ);
            return updatedQ;
        } else {
            return camQ;
        }
    };

    const getBWRotationOffset = () => {
        //concatenate initial rotation of brainModel to camera rotation
        const camQ = new THREE.Quaternion();
        if (obj3d.current.camera && rtState.current.brainModelInitRotation) {
            obj3d.current.camera.getWorldQuaternion(camQ);
            return camQ.multiply(rtState.current.brainModelInitRotation);
        } else {
            return camQ;
        }
    };

    const updateBrainModelRotation = (force: boolean = false) => {
        if (obj3d.current.brainModel && obj3d.current.camera) {
            if (rtState.current.fixedBrainModel || force) {

                obj3d.current.brainModel.up.copy(obj3d.current.camera.up);
                const rotOffset = getBWRotationOffset();
                obj3d.current.brainModel.setRotationFromQuaternion(rotOffset);
                setDeltaRotation(
                    obj3d.current.brainModel.rotation.toArray() as [number, number, number]
                );
            }

            //update view vector for brain model's XRay material
            if (obj3d.current.brModelXRayMat && obj3d.current.camera && obj3d.current.brainModel) {
                const subV = new THREE.Vector3().subVectors(obj3d.current.camera?.position, obj3d.current.brainModel?.position)
                obj3d.current.brModelXRayMat.uniforms.viewVector.value = subV;
            }

        }

    };

    const getFrustumPlanes = (aspect: number) => {
        const frustumHeight = rtState.current.camDistance ? rtState.current.camDistance : 128;
        return {
            left: - frustumHeight * aspect / 2,
            right: frustumHeight * aspect / 2,
            top: frustumHeight / 2,
            bottom: - frustumHeight / 2,
        };
    }

    const initSceneBeforeVolumeLoad = () => {
        const volRendCont = volRendererContainer.current;
        if (volRendCont) {
            const aspect = volRendCont.offsetWidth / volRendCont.offsetHeight;

            const { left, right, top, bottom } = getFrustumPlanes(aspect);
            const camera = new THREE.OrthographicCamera(left, right, top, bottom, 1, 1000);
            camera.name = 'main-cam';

            obj3d.current.camera = camera;

            //main scene
            const scene = new THREE.Scene();
            scene.add(camera);
            obj3d.current.scene = scene;

            // light
            const hemiLight = new THREE.HemisphereLight(0xffffff, 0x000000, 1);
            scene.add(hemiLight);


        }

    };

    const initSceneOnVolumeLoaded = (volume: Volume) => {

        if (obj3d.current.renderer && obj3d.current.scene && obj3d.current.camera
            && sliceXRendererContainer.current && sliceYRendererContainer.current && sliceZRendererContainer.current
            && rtState.current.stopQ) {
            obj3d.current.volume = volume;

            initVol3D(obj3d.current.scene, volume, true);
            initSlices(obj3d.current.scene, volume);

            if (obj3d.current.cube) {
                const mriBbox = new THREE.Box3().setFromObject(obj3d.current.cube);
                const mriBoxMinMax = { min: mriBbox.min.toArray(), max: mriBbox.max.toArray() };
                setMRIBoxMinMax(mriBoxMinMax);
                const mriBoxSize = new THREE.Vector3();
                mriBbox.getSize(mriBoxSize);

                const mboxZLen = mriBoxSize.toArray()[2];
                const camDistance = 2 * mboxZLen;
                obj3d.current.camera.position.z = camDistance;
                rtState.current.camDistance = camDistance;
                obj3d.current.camera.getWorldQuaternion(rtState.current.stopQ);


                //group for landmarks
                obj3d.current.marksGroup = new THREE.Group();
                obj3d.current.marksGroup.name = 'marks-group'
                obj3d.current.scene.add(obj3d.current.marksGroup);

                //-- controls for 2D slice view : Pan & Zoom ----------------------
                const sliceXCamDistance = mriBoxMinMax.max[0] - mriBoxMinMax.min[0];
                obj3d.current.camX = new THREE.OrthographicCamera();
                obj3d.current.camX.layers.set(1);
                obj3d.current.camX.name = 'viewX-cam';
                obj3d.current.scene.add(obj3d.current.camX);

                obj3d.current.camX.up.fromArray([0, 0, 1]);
                obj3d.current.camX.position.fromArray([- sliceXCamDistance, 0, 0]);
                obj3d.current.camX.lookAt(0, 0, 0);

                const sliceYCamDistance = mriBoxMinMax.max[1] - mriBoxMinMax.min[1];
                obj3d.current.camY = new THREE.OrthographicCamera();
                obj3d.current.camY.layers.set(2);
                obj3d.current.camY.name = 'viewY-cam';
                obj3d.current.scene.add(obj3d.current.camY);

                obj3d.current.camY.up.fromArray([0, 0, 1]);
                obj3d.current.camY.position.fromArray([0, sliceYCamDistance, 0, 0]);
                obj3d.current.camY.lookAt(0, 0, 0);

                const sliceZCamDistance = mriBoxMinMax.max[2] - mriBoxMinMax.min[2];
                obj3d.current.camZ = new THREE.OrthographicCamera();
                obj3d.current.camZ.layers.set(3);
                obj3d.current.camZ.name = 'viewZ-cam';
                obj3d.current.scene.add(obj3d.current.camZ);

                obj3d.current.camZ.up.fromArray([0, 1, 0]);
                obj3d.current.camZ.position.fromArray([0, 0, sliceZCamDistance]);
                obj3d.current.camZ.lookAt(0, 0, 0);
                //-----------------------------------------------------------------


                const landmarksManager = new LandmarksManager(
                    obj3d.current.marksGroup,
                    [volume.xLength - 1, volume.yLength - 1, volume.zLength - 1],
                    volume.spacing,
                );
                setLandmarksManager(landmarksManager);


                //-- controls for 2D slice view : Pan & Zoom ----------------------
                if (obj3d.current.rendX) {
                    const sliceCtrl = new ArcballControls(obj3d.current.camX, obj3d.current.rendX.domElement);
                    sliceCtrl.enableRotate = false;
                    sliceCtrl.addEventListener('change', renderSliceX);
                    obj3d.current.listeners.push({ event: 'change', listener: renderSliceX, dispatcher: sliceCtrl });
                    obj3d.current.sliceXCtrl = sliceCtrl;
                }
                if (obj3d.current.rendY) {
                    const sliceCtrl = new ArcballControls(obj3d.current.camY, obj3d.current.rendY.domElement);
                    sliceCtrl.enableRotate = false;
                    sliceCtrl.addEventListener('change', renderSliceY);
                    obj3d.current.listeners.push({ event: 'change', listener: renderSliceY, dispatcher: sliceCtrl });
                    obj3d.current.sliceYCtrl = sliceCtrl;
                }
                if (obj3d.current.rendZ) {
                    const sliceCtrl = new ArcballControls(obj3d.current.camZ, obj3d.current.rendZ.domElement);
                    sliceCtrl.enableRotate = false;
                    sliceCtrl.addEventListener('change', renderSliceZ);
                    obj3d.current.listeners.push({ event: 'change', listener: renderSliceZ, dispatcher: sliceCtrl });
                    obj3d.current.sliceZCtrl = sliceCtrl;
                }
                //-----------------------------------------------------------------

                //-- controls for 2D slice view : DnD of landmarks ----------------

                //prevent panning when a landmark is dragged
                const onDragStart = (panControl: ArcballControls) => panControl.enabled = false;

                const onMarkDragEnd = (event: THREE.Event, panControl: ArcballControls) => {
                    //apply drag move to corresponding landmark
                    landmarksManager.relocateMarkObj(event.object);
                    if (typeof rtState.current.indexX != 'undefined'
                        && typeof rtState.current.indexY != 'undefined'
                        && typeof rtState.current.indexZ != 'undefined') {
                        landmarksManager.showMarkBulletsBySlices([0, 1, 2], [rtState.current.indexX, rtState.current.indexY, rtState.current.indexZ]);
                    }
                    //reset highlighted landmarks
                    setHighMarks([]);
                    //re-enable paning
                    panControl.enabled = true;
                    renderAll();
                }
                const attachDragListeners = (dispatcher: EventDispatcher, panControl: ArcballControls) => {
                    let listener: (e: THREE.Event) => void;

                    listener = () => onDragStart(panControl);
                    dispatcher.addEventListener('dragstart', listener);
                    obj3d.current.listeners.push({ event: 'dragstart', listener, dispatcher });
                    dispatcher.addEventListener('drag', renderAll);
                    obj3d.current.listeners.push({ event: 'drag', listener: renderAll, dispatcher });
                    listener = (e: THREE.Event) => onMarkDragEnd(e, panControl);
                    dispatcher.addEventListener('dragend', listener);
                    obj3d.current.listeners.push({ event: 'dragend', listener: onMarkDragEnd, dispatcher });
                }

                obj3d.current.dragCtrlX = new DragControls([], obj3d.current.camX, sliceXRendererContainer.current);
                obj3d.current.sliceXCtrl && attachDragListeners(obj3d.current.dragCtrlX, obj3d.current.sliceXCtrl);
                obj3d.current.dragCtrlY = new DragControls([], obj3d.current.camY, sliceYRendererContainer.current);
                obj3d.current.sliceYCtrl && attachDragListeners(obj3d.current.dragCtrlY, obj3d.current.sliceYCtrl);
                obj3d.current.dragCtrlZ = new DragControls([], obj3d.current.camZ, sliceZRendererContainer.current);
                obj3d.current.sliceZCtrl && attachDragListeners(obj3d.current.dragCtrlZ, obj3d.current.sliceZCtrl);
                //-----------------------------------------------------------------

                initBrainModel(obj3d.current.scene, obj3d.current.camera.position, mriBoxSize.toArray(), false);
                setBrainModelMode(StAtm.BrainModelMode.Volume);

                //-- controls for main view (no gizmos)
                const controls = new ArcballControls(obj3d.current.camera, obj3d.current.renderer.domElement);

                controls.addEventListener('change', onCameraChanged);
                obj3d.current.listeners.push({ event: 'change', listener: onCameraChanged, dispatcher: controls });

                obj3d.current.controls = controls;

                controls.minDistance = 50;
                controls.maxDistance = 500;
                controls.enablePan = false;

                setCameraPOV(StAtm.CameraPOV.Superior);
                refreshClippingPlanes();
            }

        }
    };

    const initSceneAfterVolumeLoaded = () => {
        if (obj3d.current.camera && obj3d.current.aspect2) {
            // second renderer in an inset to display main view axis orientation 
            const { insetScene: scene2, insetCamera: camera2 } = setupInset(obj3d.current.aspect2, obj3d.current.camera);
            obj3d.current.camera2 = camera2;
            obj3d.current.scene2 = scene2;
        }
    };
    //---------------------------------------------------------------------
    const focusOnMark = (landmarkId: string) => {
        const mark = landmarksManager?.getMarkInstance(landmarkId);
        if (mark) {
            setIndexX(mark.indices[0]);
            setIndexY(mark.indices[1]);
            setIndexZ(mark.indices[2]);
            renderAll();
        }
    };

    const refreshNormPointer = (container: Element, clientX: number, clientY: number) => {
        const rect = container.getBoundingClientRect();
        rtState.current.normPointer.x = rect ? (((clientX - rect.left) / rect.width) * 2 - 1) : 0;
        rtState.current.normPointer.y = rect ? (- ((clientY - rect.top) / rect.height) * 2 + 1) : 0;
    };

    const onRendererClick = (
        event: React.MouseEvent<HTMLDivElement, MouseEvent>,
        camera: THREE.OrthographicCamera | undefined,
    ) => {
        if (obj3d.current.scene && landmarksManager && camera) {
            refreshNormPointer(event.currentTarget, event.clientX, event.clientY);
            if (event.shiftKey) {

                //refresh highlighted bullets, and optionally create new one

                const res = landmarksManager.processPicking(
                    rtState.current.normPointer,
                    camera,
                    obj3d.current.scene,
                    PickingMode.LandmarkCreation,
                    (
                        (nextLandmarkId != '')
                            ?
                            {
                                landmarkId: nextLandmarkId,
                                color: knownLandMarks.get(nextLandmarkId)?.color
                            } as CreateLandMarkOptions
                            :
                            undefined
                    ),
                    (instanceId) => {
                        setMarkInstances(landmarksManager.getMarkInstances());
                        setNextLandmarkId('');
                        landmarksManager.showMarkBulletsBySlices([0, 1, 2], [indexX, indexY, indexZ]);
                    }
                );

                res.modified && renderAll();
            } else if (event.altKey) {

                //refresh highlighted bullets, and update slices' indexes 
                const res = landmarksManager.processPicking(
                    rtState.current.normPointer,
                    camera,
                    obj3d.current.scene,
                    PickingMode.SlicesSelection,
                );
                if (res.indices) {
                    setIndexX(res.indices[0]);
                    setIndexY(res.indices[1]);
                    setIndexZ(res.indices[2]);
                }

            }
        }
    };


    const onRendererMouseMove = (
        event: React.MouseEvent<HTMLDivElement, MouseEvent>,
        camera: THREE.OrthographicCamera | undefined,
    ) => {
        if (obj3d.current.scene && landmarksManager && camera) {
            refreshNormPointer(event.currentTarget, event.clientX, event.clientY);
            const res = landmarksManager.processPicking(
                rtState.current.normPointer,
                camera, obj3d.current.scene,
                PickingMode.Hovering,
            );
            if (res.modified) {
                const highlighted: string[] = [];
                markInstances.forEach((mark, landmarkId) => {
                    if (res.appeared.includes(mark.instanceId)) {
                        highlighted.push(landmarkId);
                    }
                });
                setHighMarks(highlighted);
                renderAll();
            }
        }
    };


    const showISlices = [showXSlice, showYSlice, showZSlice];

    const nbShown = (showXSlice ? 1 : 0) + (showYSlice ? 1 : 0) + (showZSlice ? 1 : 0);


    /* Note:  moving slice views in the UI can not be achieved simply by changing parent of their renderer container in the grid.
     * Indeed, React reconciliation heuristic would fail, and renderer dom elements (created by ThreeJS) would
     * appear staying in place and swaping parents beteween renders...
     * Hence the need of placeholders and position updates of actual renderer containers.
     */
    const Slice2DViews =
        <div
            style={{
                visibility: (viewMode === StAtm.ViewMode.Slice2D ? 'visible' : 'hidden'),
                position: 'absolute',
                width: '100%', height: '100%',
            }}
        >

            <div
                style={{
                    visibility: (viewMode === StAtm.ViewMode.Slice2D ? 'visible' : 'hidden'),
                    display: 'grid',
                    position: 'absolute',
                    width: '100%', height: '100%',
                    gridTemplateColumns: '33% 33% 34%',
                    gridTemplateRows: '50% 50%',
                    gap: '1px 3px',
                    overflow: 'hidden',
                    backgroundColor: 'silver',
                }}
            >

                <div
                    ref={sliceRendPlaceholder1}
                    style={{
                        ...(nbShown == 1
                            ?
                            //use all available space when only one slice is shown 
                            {
                                gridColumn: '1 / 4',
                                gridRow: '1 / 3',
                            }
                            :
                            {
                                gridColumn: '1 / 3',
                                gridRow: '1 / 3',
                            }
                        )

                    }}
                />

                <div
                    style={{
                        visibility: (viewMode === StAtm.ViewMode.Slice2D && nbShown > 1) ? 'visible' : 'hidden',
                        ...(nbShown == 2
                            ?
                            //use all space in 2nd column when 2 slices are shown 
                            {
                                gridColumn: '3',
                                gridRow: '1 / 3',
                            }
                            :
                            {
                                gridColumn: '3',
                                gridRow: '1',
                            }
                        )
                    }}
                >
                    <div
                        ref={sliceRendPlaceholder2}
                        style={{
                            position: 'relative',
                            height: '100%',
                            width: '100%',
                        }}
                    >
                        <div
                            style={{ position: 'absolute', top: 1, left: 1, color: '#FFF', zIndex: 20 }}
                            title="expand this slice view"
                        >
                            <Icon
                                icon='zoom-to-fit'
                                onClick={() => {
                                    //swap positions of 1rst and 2nd slice viewers 
                                    if (nbShown > 2) {
                                        setSliceRendPosIndices([
                                            sliceRendPosIndices[1],
                                            sliceRendPosIndices[0],
                                            sliceRendPosIndices[2]
                                        ]);

                                    } else {
                                        //exclude non-visible slices 
                                        const sorted = sliceRendPosIndices
                                            .map((plane, index) => ({
                                                plane,
                                                index,
                                                visible: showISlices[plane]
                                            }))
                                            .sort(
                                                (a, b) => {
                                                    if (a.visible && !b.visible) {
                                                        return -1;
                                                    }
                                                    else if (!a.visible && b.visible) {
                                                        return 1;
                                                    } else {
                                                        return a.index - b.index
                                                    }
                                                }
                                            )
                                            .map(s => s.plane)
                                            ;

                                        setSliceRendPosIndices([
                                            sorted[1],
                                            sorted[0],
                                            sorted[2]
                                        ]);

                                    }
                                }
                                }
                            />
                        </div>
                    </div>
                </div>

                <div
                    style={{
                        visibility: (viewMode === StAtm.ViewMode.Slice2D && nbShown > 2) ? 'visible' : 'hidden',

                        gridColumn: '3',
                        gridRow: '2 ',
                    }}
                >
                    <div
                        ref={sliceRendPlaceholder3}
                        style={{
                            position: 'relative',
                            height: '100%',
                            width: '100%',
                        }}
                    >
                        <div
                            style={{ position: 'absolute', top: 1, left: 1, color: '#FFF', zIndex: 20 }}
                            title="expand this slice view"
                        >
                            <Icon
                                icon='zoom-to-fit'
                                onClick={() =>
                                    //swap positions of 1rst and 3rd slice viewers 

                                    setSliceRendPosIndices([
                                        sliceRendPosIndices[2],
                                        sliceRendPosIndices[1],
                                        sliceRendPosIndices[0],
                                    ])
                                } />
                        </div>
                    </div>
                </div>
            </div>

            <div
                ref={sliceZRendererContainer}
                className='sliceRendererContainer'
                style={{
                    position: 'absolute',
                    visibility: (viewMode === StAtm.ViewMode.Slice2D && showZSlice) ? 'visible' : 'hidden',
                }}
                onClick={(event) =>
                    onRendererClick(event, obj3d.current.camZ)
                }
                onMouseMove={(event) =>
                    onRendererMouseMove(event, obj3d.current.camZ)
                }
            />
            <div
                ref={sliceYRendererContainer}
                className='sliceRendererContainer'
                style={{
                    position: 'absolute',
                    visibility: (viewMode === StAtm.ViewMode.Slice2D && showYSlice) ? 'visible' : 'hidden',
                }}
                onClick={(event) =>
                    onRendererClick(event, obj3d.current.camY)
                }
                onMouseMove={(event) =>
                    onRendererMouseMove(event, obj3d.current.camY)
                }
            />
            <div
                ref={sliceXRendererContainer}
                className='sliceRendererContainer'
                style={{
                    position: 'absolute',
                    visibility: (viewMode === StAtm.ViewMode.Slice2D && showXSlice) ? 'visible' : 'hidden',
                }}
                onClick={(event) =>
                    onRendererClick(event, obj3d.current.camX)
                }
                onMouseMove={(event) =>
                    onRendererMouseMove(event, obj3d.current.camX)
                }
            />

        </div>;


    return (

        <div
            style={{
                maxWidth: '100%',
                maxHeight: '100%',
                height: '100%',
                userSelect: 'none',
            }}
        >
            {showLogs
                ?
                <div
                    style={{
                        position: 'absolute',
                        zIndex: 1000,
                        top: '40vh',
                        left: 10,
                        right: 10,
                        height: 200
                    }}
                >
                    <SinkLogger
                        maxLine={2000}
                        data={loglines}
                    />
                </div>
                :
                null
            }
            <div
                style={{
                    margin: 2,
                    width: 'calc(100% - 4px)', height: 'calc(100% - 4px)',
                    display: 'grid',
                    gridTemplateColumns: 'minmax(0,80%) minmax(190px, 20%)',
                    gridTemplateRows: '100%',
                    gap: '1px 3px',
                    overflow: 'hidden',
                }}
            >
                <ResizeSensor2
                    onResize={handleResize}
                >
                    <div
                        style={{
                            maxWidth: '100%', maxHeight: '100%', position: 'relative',
                        }}
                    >
                        {isLoading
                            ?
                            <div
                                style={{
                                    width: '100%',
                                    height: '100%',
                                    backgroundColor: 'transparent',
                                    border: 'none',
                                    margin: 'auto',
                                    padding: 0,
                                    position: 'absolute',
                                    zIndex: 200,
                                    display: 'flex',
                                    justifyContent: 'center',
                                }}
                            >
                                <Spinner size={SpinnerSize.LARGE} />
                            </div>
                            :
                            null
                        }
                        {alertMessage
                            ?
                            <Alert
                                confirmButtonText="Close"
                                isOpen={typeof alertMessage != 'undefined'}
                                canEscapeKeyCancel={true}
                                canOutsideClickCancel={true}
                                onClose={() => {
                                    setAlertMessage(undefined);
                                }}
                            >
                                {alertMessage}
                            </Alert>
                            :
                            null
                        }

                        {/* 3D Volume and 3D slices renderer */}
                        <div
                            className="volRendererCont"
                            style={{
                                visibility: (viewMode != StAtm.ViewMode.Slice2D ? 'visible' : 'hidden'),
                                position: 'absolute',
                                width: '100%', height: '100%',
                            }}

                            ref={volRendererContainer}
                            onClick={(event) =>
                                onRendererClick(event, obj3d.current.camera)
                            }
                            onMouseMove={(event) =>
                                onRendererMouseMove(event, obj3d.current.camera)
                            }
                        >
                        </div>
                        <div
                            ref={volRendererInset}
                            style={{
                                visibility: (viewMode != StAtm.ViewMode.Slice2D ? 'visible' : 'hidden'),
                                width: 100,
                                height: 100,
                                backgroundColor: 'transparent', /* or transparent; will show through only if renderer alpha: true */
                                border: 'none',
                                margin: 0,
                                padding: 0,
                                position: 'absolute',
                                left: 10,
                                bottom: 10,
                                zIndex: 100,
                            }}
                        >
                        </div>
                        {/* 2D slices views */}
                        {Slice2DViews}

                        {obj3d.current.volume
                            ?
                            <div
                                style={{
                                    border: 'none',
                                    margin: 'auto',
                                    padding: 0,
                                    position: 'absolute',
                                    right: 0,
                                }}
                            >
                                <LandMarksList
                                    landmarkset={knownLandMarksAry}
                                    highlighted={highMarks}
                                    marked={new Set(markInstances.keys())}
                                    onSetNextLandmarkId={(landmarkId) => setNextLandmarkId(landmarkId)}
                                    onLandmarkCreate={(landmarkId) => {
                                        if (landmarksManager) {
                                            const landmarkInfo = knownLandMarks.get(landmarkId);
                                            if (landmarkInfo) {
                                                const instanceId = landmarksManager.createLandmark(landmarkId, landmarkInfo.color, landmarkInfo.coord);
                                                setMarkInstances(landmarksManager.getMarkInstances());
                                                focusOnMark(landmarkId);
                                            }
                                        }
                                    }}

                                    onLandmarkRemove={(landmarkId) => {
                                        if (landmarksManager) {
                                            landmarksManager.remove(landmarkId);
                                            setMarkInstances(landmarksManager.getMarkInstances());
                                        }
                                    }}
                                    onMarkMouseEnter={(landmarkId) => {
                                        if (landmarksManager) {
                                            landmarksManager.setHighlight(landmarkId);
                                            renderAll();
                                        }
                                    }}
                                    onMarkMouseLeave={(landmarkId) => {
                                        if (landmarksManager) {
                                            landmarksManager.unsetHighlight(landmarkId);
                                            renderAll();
                                        }
                                    }}
                                    onLandmarkFocus={(landmarkId) => {
                                        if (markInstances.has(landmarkId)) {
                                            focusOnMark(landmarkId);
                                        }
                                    }}

                                />
                            </div>
                            :
                            null
                        }

                        {obj3d.current.volume
                            ?
                            <div
                                style={{
                                    border: 'none',
                                    margin: 'auto',
                                    padding: 0,
                                    position: 'absolute',
                                    bottom: 0,
                                    left: 200,
                                    right: 100,
                                }}
                            >
                                <HelpNavigation />
                            </div>
                            :
                            null
                        }

                    </div>
                </ResizeSensor2>

                <PreviewControls volumeFile={volumeFile} />

            </div >

        </div >

    );

};

export default VolumePreview;
