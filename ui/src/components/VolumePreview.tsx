import * as React from "react";
import { useAtom } from "jotai";


import * as THREE from 'three';

import Stats from 'three/examples/jsm/libs/stats.module.js';

import { VolumeRenderShader1 } from 'three/examples/jsm/shaders/VolumeShader.js';
import { ArcballControls } from 'three/examples/jsm/controls/ArcballControls.js';
import { OBJLoader } from 'three/examples/jsm/loaders/OBJLoader.js';
import { DragControls } from 'three/examples/jsm/controls/DragControls';

import { NIfTILoader } from '../loaders/NIfTILoader';

import {
    Alert,
    Spinner,
    SpinnerSize,
    ResizeEntry,
} from "@blueprintjs/core";

import {
    ResizeSensor2,
} from "@blueprintjs/popover2";

import * as StAtm from '../StateAtoms';


import SinkLogger from "./SinkLogger";
import LandMarksList from "./LandMarksList";
import { MarkInstance, LandMark } from "./LandmarksManager";

import "./VolumePreview.scss";

import { setupAxesHelper } from './Utils';

import { Volume } from "../misc/Volume";
import { VolumeSlice } from "../misc/VolumeSlice";
import LandmarksManager, { CreateLandMarkOptions } from "./LandmarksManager";
import PreviewControls from "./PreviewControls";
import { EventDispatcher } from "three";


type ListenerInfo = {
    event: string,
    listener: any,
    dispatcher: EventDispatcher,
}
export type LoadedVolumeFile = {
    file: File | undefined,
    name: string,
    ext: string,
    data: string | ArrayBuffer | undefined
};

type VolumePreviewProps = {
    volumeFile: LoadedVolumeFile | undefined,
};

const setupInset = (insetAspect: number, camera: THREE.Camera) => {
    // scene
    const insetScene = new THREE.Scene();

    // camera
    const insetCamera = new THREE.PerspectiveCamera(50, insetAspect, 1, 1000);
    insetCamera.up = camera.up; // important!

    // axes
    setupAxesHelper(100, insetScene)

    return { insetScene, insetCamera };
}

export type Obj3dRefs = {

    stats: Stats,

    //main scene (volume 3D & slices in 3D)
    renderer: THREE.WebGLRenderer,
    camera: THREE.OrthographicCamera,
    scene: THREE.Scene,
    controls: ArcballControls,

    //insets related  
    renderer2: THREE.Renderer,
    aspect2: number,
    camera2: THREE.PerspectiveCamera,
    scene2: THREE.Scene,

    //for slices rendering
    volume: Volume,
    sliceX: VolumeSlice,
    sliceY: VolumeSlice,
    sliceZ: VolumeSlice,

    //for volume rendering
    vol3D: THREE.Mesh,
    materialVol3D: THREE.ShaderMaterial,

    //brain model
    brainWire: THREE.Group,

    //groups for user created landmarks
    marksGroup: THREE.Group,

    //volume bounding box 
    cube: THREE.Mesh,

    boxAniMixer: THREE.AnimationMixer,
    boxAninAction: THREE.AnimationAction,

    //standard planes scenes (slices in 2D)
    rendX: THREE.WebGLRenderer,
    camX: THREE.OrthographicCamera,
    //sceneX: THREE.Scene,
    dragCtrlX: DragControls,

    rendY: THREE.WebGLRenderer,
    camY: THREE.OrthographicCamera,
    //sceneY: THREE.Scene,
    dragCtrlY: DragControls,

    rendZ: THREE.WebGLRenderer,
    camZ: THREE.OrthographicCamera,
    //sceneZ: THREE.Scene,
    dragCtrlZ: DragControls,


    //others ThreeJS objects which need to be released when undloading volume 
    disposable: THREE.Object3D[],

    listeners: ListenerInfo[],

};


const SELECTED_FILE_FAKEURL = "selected_file";

const VolumePreview = (props: VolumePreviewProps) => {

    const [viewMode, setViewMode] = useAtom(StAtm.viewMode);

    const [isLoading, setIsLoading] = useAtom(StAtm.isLoading);
    const [volumeLoaded, setVolumeLoaded] = useAtom(StAtm.volumeLoaded);

    const [alertMessage, setAlertMessage] = useAtom(StAtm.alertMessage);

    const [deltaRotation, setDeltaRotation] = useAtom(StAtm.deltaRotation);
    const [cameraPOV, setCameraPOV] = useAtom(StAtm.cameraPOV);

    const [showBrainModel, setShowBrainModel] = useAtom(StAtm.showBrainModel);
    const [brainModelMode, setBrainModelMode] = useAtom(StAtm.brainModelMode);

    const [clipWire, setClipWire] = useAtom(StAtm.clipWire);
    const [brainWireInitRotation, setBrainWireInitRotation] = useAtom(StAtm.brainWireInitRotation);
    const [fixedWire, setFixedWire] = useAtom(StAtm.fixedWire);

    const [isothreshold, setIsothreshold] = useAtom(StAtm.isothreshold);
    const [clims, setClims] = useAtom(StAtm.clims);
    const [castIso, setCastIso] = useAtom(StAtm.castIso);

    const [showXSlice, setShowXSlice] = useAtom(StAtm.showXSlice);
    const [showYSlice, setShowYSlice] = useAtom(StAtm.showYSlice);
    const [showZSlice, setShowZSlice] = useAtom(StAtm.showZSlice);

    const [volumeRange, setVolumeRange] = useAtom(StAtm.volumeRange);
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


    const [mriBoxMinMax, setMRIBoxMinMax] = React.useState({ min: [0, 0, 0], max: [0, 0, 0] });
    const [landmarksManager, setLandmarksManager] = React.useState<LandmarksManager>();


    const volRendererContainer = React.useRef<HTMLDivElement>();
    const clock = React.useRef(new THREE.Clock());

    const objectURLs = React.useRef<string[]>([]);
    const volRendererInset = React.useRef<HTMLDivElement>();

    const sliceXRendererContainer = React.useRef<HTMLDivElement>();
    const sliceYRendererContainer = React.useRef<HTMLDivElement>();
    const sliceZRendererContainer = React.useRef<HTMLDivElement>();

    const obj3d = React.useRef<Obj3dRefs>({ 
        disposable: [], 
        listeners: [] 
    });

    const rtState = React.useRef<StAtm.RealTimeState>({ 
        normPointer: new THREE.Vector2() 
    });

    React.useEffect(() => {

        rtState.current = {
            ...rtState.current,
            fixedWire,
            deltaRotation,
            brainWireInitRotation,
            viewMode,
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

                obj3d.current.sliceX.mesh.visible = showXSlice;
                obj3d.current.sliceY.mesh.visible = showYSlice;
                obj3d.current.sliceZ.mesh.visible = showZSlice;
            }
        }

        //stop animation when rendrering volume (as the shader becomes slow when the animation is processed)
        if (StAtm.ViewMode.Volume3D === viewMode && obj3d.current?.boxAninAction) {
            obj3d.current.boxAninAction.stop();
        }

        if (viewMode != StAtm.ViewMode.Slice2D) {

        } else {

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
        }

        handleResize(null);

    }, [viewMode]);


    React.useEffect(() => {

        updateInset();
        renderAll();

    }, [deltaRotation]);


    React.useEffect(() => {

        const wireframe = brainModelMode === StAtm.BrainModelMode.Wire;
        if (obj3d.current.brainWire) {
            obj3d.current.brainWire.traverse(function (child) {
                if (child.isMesh) {
                    child.material.wireframe = wireframe;
                }
            });
        }
        renderAll();

    }, [brainModelMode]);


    React.useEffect(() => {
        if (obj3d.current.controls) {

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
                obj3d.current.camera.up.fromArray(cameraRotation.up);
                obj3d.current.camera.position.fromArray(cameraRotation.position);
                obj3d.current.camera.lookAt(0, 0, 0);

                updateBrainWireRotation();
                renderAll();
            }
        }
    }, [cameraPOV]);



    React.useEffect(() => {

        if (obj3d.current.sliceX) {
            obj3d.current.sliceX.mesh.visible = showXSlice;
            if (!showXSlice && clipWire === StAtm.ClipWireMode.ClipX) {
                setClipWire(StAtm.ClipWireMode.None);
            }
            renderAll();
        }

    }, [showXSlice]);

    React.useEffect(() => {

        if (obj3d.current.sliceY) {
            obj3d.current.sliceY.mesh.visible = showYSlice;
            if (!showYSlice && clipWire == StAtm.ClipWireMode.ClipY) {
                setClipWire(StAtm.ClipWireMode.None);
            }
            renderAll();
        }

    }, [showYSlice]);

    React.useEffect(() => {

        if (obj3d.current.sliceZ) {
            obj3d.current.sliceZ.mesh.visible = showZSlice;
            if (!showZSlice && clipWire === StAtm.ClipWireMode.ClipZ) {
                setClipWire(StAtm.ClipWireMode.None);
            }
            renderAll();
        }

    }, [showZSlice]);


    React.useEffect(() => {

        if (obj3d.current.renderer) {
            if (clipWire != StAtm.ClipWireMode.None) {
                //wireframe clipping enabled

                setBrainModelMode(StAtm.BrainModelMode.Clipped);
                refreshClippingPlanes(clipWire);
                obj3d.current.renderer.localClippingEnabled = true;

            } else {
                //wireframe clipping disabled

                setBrainModelMode(StAtm.BrainModelMode.Wire);
                obj3d.current.renderer.localClippingEnabled = false;
            }
            renderAll();
        }

    }, [clipWire]);


    React.useEffect(() => {

        if (volumeLoaded && obj3d.current.sliceX) {
            obj3d.current.sliceX.index = indexX;
            obj3d.current.sliceX.repaint.call(obj3d.current.sliceX);
            if (clipWire === StAtm.ClipWireMode.ClipX) {
                refreshClippingPlanes(clipWire);
            }
            renderAll();
        }

    }, [indexX]);


    React.useEffect(() => {

        if (volumeLoaded && obj3d.current.sliceY) {
            obj3d.current.sliceY.index = indexY;
            obj3d.current.sliceY.repaint.call(obj3d.current.sliceY);
            if (clipWire === StAtm.ClipWireMode.ClipY) {
                refreshClippingPlanes(clipWire);
            }
            renderAll();
        }

    }, [indexY]);


    React.useEffect(() => {

        if (volumeLoaded && obj3d.current.sliceZ) {
            obj3d.current.sliceZ.index = indexZ;
            obj3d.current.sliceZ.repaint.call(obj3d.current.sliceZ);
            if (clipWire === StAtm.ClipWireMode.ClipZ) {
                refreshClippingPlanes(clipWire);
            }
            renderAll();
        }

    }, [indexZ]);


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

        if (volumeLoaded && obj3d.current.brainWire) {
            obj3d.current.brainWire.visible = showBrainModel;
            renderAll();
        }

    }, [showBrainModel]);

    React.useEffect(() => {
        if (obj3d.current.camera) {
            if (!fixedWire) {
                //from now on brainwire will look like it's moving along the camera
                //(but it is actually static)

                //camera rotation when stoping updating brainwire rotation
                obj3d.current.camera.getWorldQuaternion(rtState.current.stopQ);

            } else {
                //from now on brainwire will look like it's fixed in its current pos
                //(but it is actually being rotated)

                setBrainWireInitRotation(getRotationOffset());
            }
            renderAll();
        }
    }, [fixedWire]);


    React.useEffect(() => {
        updateBrainWireRotation(true);
        renderAll();
    }, [brainWireInitRotation]);

    React.useEffect(() => {

        rtState.current.brainWireInitRotation = brainWireInitRotation;
        renderAll();

    }, [brainWireInitRotation]);


    //when Volume changed (as a result of local file selection) 
    React.useEffect(() => {

        clearBeforeVolumeChange();

        setVolumeLoaded(false);
        setViewMode(StAtm.ViewMode.None);


        setDeltaRotation([0, 0, 0]);
        rtState.current.stopQ = new THREE.Quaternion();

        setShowBrainModel(false);
        setClipWire(StAtm.ClipWireMode.None);
        setBrainWireInitRotation(new THREE.Quaternion());
        setFixedWire(false);

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

        if (props.volumeFile) {

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
                    url = URL.createObjectURL(props.volumeFile?.file);
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
                    function onError(e) {
                        console.error(e);
                        setAlertMessage(
                            <p>
                                Couldn't load the selected file.
                                <br />
                                Please check it is a valid NIFTi file.
                            </p>);
                        setIsLoading(false);
                    },

                );
                initSceneAfterVolumeLoaded();

            }
            objectURLs.current.forEach((url) => URL.revokeObjectURL(url));

        }


    }, [props.volumeFile]
    );


    //handle resize
    const handleResize = (entries?: ResizeEntry[]) => {
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
            const adjustSliceCamOnResize = (renderer: THREE.Renderer, rendContainer: HTMLDivElement | undefined, camera: THREE.OrthographicCamera) => {
                if (renderer && rendContainer && camera) {
                    renderer.setSize(rendContainer.offsetWidth, rendContainer.offsetHeight);

                    const aspect = rendContainer.offsetWidth / rendContainer.offsetHeight;
                    const mboxZLen = mriBoxMinMax.max[2];

                    const { left, right, top, bottom } = getFrustumPlanes(aspect, mboxZLen * 3);
                    camera.left = left;
                    camera.right = right;
                    camera.top = top;
                    camera.bottom = bottom;
                    camera.updateProjectionMatrix();
                }
            };

            adjustSliceCamOnResize(obj3d.current.rendX, sliceXRendererContainer.current, obj3d.current.camX);
            adjustSliceCamOnResize(obj3d.current.rendY, sliceYRendererContainer.current, obj3d.current.camY);
            adjustSliceCamOnResize(obj3d.current.rendZ, sliceZRendererContainer.current, obj3d.current.camZ);
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

            renderer.localClippingEnabled = (clipWire != StAtm.ClipWireMode.None);
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

            const createSliceRenderer = (rendContainer: HTMLDivElement | undefined) => {
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
            if (obj3d.current.renderer) {
                const volRendCont = volRendererContainer.current;
                if (volRendCont) {
                    volRendCont.removeChild(obj3d.current.renderer.domElement);

                    if (obj3d.current.stats) {
                        volRendCont.removeChild(obj3d.current.stats.dom);
                    }
                }
            }
            if (obj3d.current.renderer2) {
                const insetCont = volRendererInset.current;
                if (insetCont) {
                    insetCont.removeChild(obj3d.current.renderer2.domElement);
                }
            }
            obj3d.current = {};
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
        obj3d.current.controls?.dispose();


        landmarksManager?.dispose();

        obj3d.current.disposable.forEach(d => d.dispose());
        obj3d.current.listeners.forEach(li => li.dispatcher.removeEventListener(li.event, li.listener));

    };


    const updateInset = () => {
        if (obj3d.current.controls) {
            //copy position of the camera into inset
            obj3d.current.camera2.position.copy(obj3d.current.camera.position);
            obj3d.current.camera2.position.sub(obj3d.current.controls.target);
            obj3d.current.camera2.position.setLength(300);
            obj3d.current.camera2.lookAt(obj3d.current.scene2.position);

            obj3d.current.renderer2.render(obj3d.current.scene2, obj3d.current.camera2);
        }
    }

    const renderAll = function () {
        if (viewMode != StAtm.ViewMode.Slice2D) {
            if (obj3d.current.camera) {

                updateInset();
                if (obj3d.current.boxAniMixer) {
                    const delta = clock.current.getDelta();
                    obj3d.current.boxAniMixer.update(delta);
                    //as long as animation isn't finished...
                    if (obj3d.current.boxAninAction.isRunning()) {
                        //reiterate another rendering
                        //(don't need 60FPS for this animation!)
                        setTimeout(renderAll, 40);
                    }
                }
                obj3d.current.renderer.render(obj3d.current.scene, obj3d.current.camera);

                obj3d.current.stats?.update();
            }
        } else {
            if (obj3d.current.rendX && obj3d.current.camX) {
                obj3d.current.rendX.render(obj3d.current.scene, obj3d.current.camX);
            }
            if (obj3d.current.rendY && obj3d.current.camY) {
                obj3d.current.rendY.render(obj3d.current.scene, obj3d.current.camY);
            }
            if (obj3d.current.rendZ && obj3d.current.camZ) {
                obj3d.current.rendZ.render(obj3d.current.scene, obj3d.current.camZ);
            }
            obj3d.current.stats?.update();
        }
    }

    const onCameraChanged = () => {

        setCameraPOV(StAtm.CameraPOV.Free);

        //keep the brain wireframe in sync with camera rotation to make it look like it's static
        updateBrainWireRotation();

        //show Volume's bounding-box while rotating
        if (StAtm.ViewMode.Volume3D != rtState.current.viewMode) {
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

        const texture = new THREE.DataTexture3D(volume.data, volume.xLength, volume.yLength, volume.zLength);
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
        //re-orient
        mesh.applyMatrix4(volume.matrix);

        mesh.visible = initVisibility;
        mesh.name = 'vol3D-mesh';
        scene.add(mesh);

        //const box = new THREE.BoxHelper(mesh, 0xff0000);
        //scene.add(box);

        obj3d.current.vol3D = mesh;
        obj3d.current.materialVol3D = material;

        obj3d.current.disposable.push(geometry, material, texture, cm_viridis);
    }

    const initSlices = (scene: THREE.Scene, volume: Volume) => {

        //box helper to see the extend of the volume
        const geometry = new THREE.BoxGeometry(volume.xLength, volume.yLength, volume.zLength);
        const material = new THREE.MeshBasicMaterial({ color: 0x00ff00 });
        //const material = new THREE.LineBasicMaterial( { color: 0x8080ff, fog: false, transparent: true, opacity: 0.6 } );
        const cube = new THREE.Mesh(geometry, material);
        cube.visible = false;
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
        const initSliceZ = Math.floor(volume.dimensions[2] / 4);
        const sliceZ = volume.extractSlice('z', initSliceZ);
        sliceZ.mesh.visible = showZSlice;
        sliceZ.mesh.layers.enable(3);
        sliceZ.mesh.name = 'sliceZ-mesh';
        sliceZ.mesh.userData = { isSlice: true, axis: 'z' };

        scene.add(sliceZ.mesh);
        obj3d.current.sliceZ = sliceZ;
        setIndexZ(obj3d.current.sliceZ.index);
        setMaxIndexZ(volume.dimensions[2] - 1);

        //y plane
        const initSliceY = Math.floor(volume.dimensions[1] / 2);
        const sliceY = volume.extractSlice('y', initSliceY);
        sliceY.mesh.name = 'sliceY-mesh';
        sliceY.mesh.userData = { isSlice: true, axis: 'y' };

        sliceY.mesh.visible = showYSlice;
        sliceY.mesh.layers.enable(2);
        scene.add(sliceY.mesh);
        obj3d.current.sliceY = sliceY;
        setIndexY(obj3d.current.sliceY.index);
        setMaxIndexY(volume.dimensions[1] - 1);

        //x plane
        const initSliceX = Math.floor(volume.dimensions[0] / 2);
        const sliceX = volume.extractSlice('x', initSliceX);
        sliceX.mesh.name = 'sliceX-mesh';
        sliceX.mesh.userData = { isSlice: true, axis: 'x' };

        sliceX.mesh.visible = showXSlice;
        sliceX.mesh.layers.enable(1);

        scene.add(sliceX.mesh);
        obj3d.current.sliceX = sliceX;
        setIndexX(obj3d.current.sliceX.index);
        setMaxIndexX(volume.dimensions[0] - 1);

        //obj3d.current.sceneX.add(sliceX.mesh);
        setVolumeValMin(volume.min);
        setVolumeValMax(volume.max);
        setVolumeRange([
            volume.windowLow,
            volume.windowHigh
        ]);
    };


    const initBrainWire = (scene: THREE.Scene, bboxMax: number[], initVisibility: boolean) => {

        const [mboxXLen, mboxYLen, mboxZLen] = bboxMax;

        const objloader = new OBJLoader();
        const wireColor = new THREE.Color(0xFF88FF)
        //objloader.setMaterials(objmaterial);

        const clipPlanes: THREE.Plane[] = [];
        const material = new THREE.MeshLambertMaterial({
            color: wireColor,
            side: THREE.DoubleSide,
            clippingPlanes: clipPlanes,
            clipIntersection: false,
        });

        objloader.load("models/bma_sp2-lh.surf-simpld.obj", function (leftHemisphere) {

            //update left-hemisphere to display as wireframe
            leftHemisphere.traverse(function (child) {
                if (child.isMesh) {
                    child.material.wireframe = true;
                    child.material.color = wireColor;
                    //child.material.opacity = 0.9;
                    //child.material.transparent = true;
                    child.material.side = THREE.DoubleSide;
                    child.material.clippingPlanes = clipPlanes;
                    child.material.clipIntersection = false;
                }
            });
            //create right-hemisphere by mirroring through sagittal (median) plane
            const rightHemisphere = leftHemisphere.clone();

            const mirrorMatrix = new THREE.Matrix4().set(
                -1, 0, 0, 0,
                0, 1, 0, 0,
                0, 0, 1, 0,
                0, 0, 0, 1
            );
            rightHemisphere.applyMatrix4(mirrorMatrix);

            //group both hemisphere
            const brainWire = new THREE.Group();
            brainWire.add(leftHemisphere);
            brainWire.add(rightHemisphere);

            //scale brainwire to roughly fit image dimension 
            const sf = 0.8;
            var templBbox = new THREE.Box3().setFromObject(brainWire);

            const [brainboxXLen, brainboxYLen, brainboxZLen] = templBbox.max.toArray();
            const scaleTemplMatrix = new THREE.Matrix4().set(
                sf * mboxXLen / brainboxXLen, 0, 0, 0,
                0, sf * mboxYLen / brainboxYLen, 0, 0,
                0, 0, sf * mboxZLen / brainboxZLen, 0,
                0, 0, 0, 1
            );
            brainWire.applyMatrix4(scaleTemplMatrix);
            brainWire.visible = initVisibility;
            scene.add(brainWire);
            obj3d.current.brainWire = brainWire;


            const initialQ = new THREE.Quaternion();
            brainWire.getWorldQuaternion(initialQ);
            setBrainWireInitRotation(initialQ);

        });
    };

    const refreshClippingPlanes = (clipWire: StAtm.ClipWireMode) => {

        if (clipWire) {
            const planeNorms: THREE.Vector3[] = [];
            let slice: VolumeSlice;
            let pos: number = NaN;

            switch (clipWire) {
                case StAtm.ClipWireMode.ClipX:
                    planeNorms.push(new THREE.Vector3(-1, 0, 0));
                    planeNorms.push(new THREE.Vector3(1, 0, 0));
                    slice = obj3d.current.sliceX;
                    pos = slice.mesh.matrix.elements[12];
                    break;
                case StAtm.ClipWireMode.ClipY:
                    planeNorms.push(new THREE.Vector3(0, -1, 0));
                    planeNorms.push(new THREE.Vector3(0, 1, 0));
                    slice = obj3d.current.sliceY;
                    pos = slice.mesh.matrix.elements[13];
                    break;
                case StAtm.ClipWireMode.ClipZ:
                    planeNorms.push(new THREE.Vector3(0, 0, -1));
                    planeNorms.push(new THREE.Vector3(0, 0, 1));
                    slice = obj3d.current.sliceZ;
                    pos = slice.mesh.matrix.elements[14];
                    break;

            }
            if (!isNaN(pos)) {

                const thickness = 1.5;
                const clipPlanes: THREE.Plane[] = [];

                clipPlanes.push(
                    new THREE.Plane(planeNorms[0], pos + thickness)
                );
                clipPlanes.push(
                    new THREE.Plane(planeNorms[1], -pos + thickness)
                );


                obj3d.current.brainWire.traverse(function (child) {
                    if (child.isMesh) {
                        child.material.clippingPlanes = clipPlanes;
                    }
                });
            }
        }
    };

    //-------------------------------------------------------------------------


    const getRotationOffset = () => {
        //current camera rotation
        const camQ = new THREE.Quaternion();
        obj3d.current.camera.getWorldQuaternion(camQ);

        //last updated brainwire rotation 
        const initQ = new THREE.Quaternion().copy(rtState.current.brainWireInitRotation)

        const updatedQ = camQ.invert().multiply(rtState.current.stopQ).multiply(initQ);
        return updatedQ;
    };

    const getBWRotationOffset = () => {
        //concatenate initial rotation of brainwire to camera rotation
        const camQ = new THREE.Quaternion();
        obj3d.current.camera.getWorldQuaternion(camQ);
        return camQ.multiply(rtState.current.brainWireInitRotation);
    };

    const updateBrainWireRotation = (force: boolean = false) => {
        if (obj3d.current.brainWire) {
            if (rtState.current.fixedWire || force) {

                obj3d.current.brainWire.up.copy(obj3d.current.camera.up);
                const rotOffset = getBWRotationOffset();
                obj3d.current.brainWire.setRotationFromQuaternion(rotOffset);
            }
            setDeltaRotation(
                obj3d.current.brainWire.rotation.toArray() as [number, number, number]
            );
        }

    };

    const getFrustumPlanes = (aspect: number, frustumHeight = 512) => {
        return {
            left: - frustumHeight * aspect / 2,
            right: frustumHeight * aspect / 2,
            top: frustumHeight / 2,
            bottom: - frustumHeight / 2,
        };
    }

    const initSceneBeforeVolumeLoad = () => {
        const volRendCont = volRendererContainer.current;
        const aspect = volRendCont.offsetWidth / volRendCont.offsetHeight;

        const { left, right, top, bottom } = getFrustumPlanes(aspect);
        const camera = new THREE.OrthographicCamera(left, right, top, bottom, 1, 1000);

        obj3d.current.camera = camera;

        //main scene
        const scene = new THREE.Scene();
        scene.add(camera);
        obj3d.current.scene = scene;

        // light
        const hemiLight = new THREE.HemisphereLight(0xffffff, 0x000000, 1);
        scene.add(hemiLight);

    };

    const initSceneOnVolumeLoaded = (volume: Volume) => {

        obj3d.current.volume = volume;

        initVol3D(obj3d.current.scene, volume, true);
        initSlices(obj3d.current.scene, volume);

        const mriBbox = new THREE.Box3().setFromObject(obj3d.current.cube);
        const mriBoxMinMax = { min: mriBbox.min.toArray(), max: mriBbox.max.toArray() };
        setMRIBoxMinMax(mriBoxMinMax);

        const mboxZLen = mriBoxMinMax.max[2];
        const camDistance = 6 * mboxZLen;
        obj3d.current.camera.position.z = camDistance;
        rtState.current.camDistance = camDistance;
        obj3d.current.camera.getWorldQuaternion(rtState.current.stopQ);


        //group for landmarks
        obj3d.current.marksGroup = new THREE.Group();
        obj3d.current.scene.add(obj3d.current.marksGroup);

        const createSliceCamera = (rendContainer: HTMLDivElement | undefined, layer: number, near: number) => {
            let camera: THREE.OrthographicCamera | undefined;
            if (rendContainer) {
                const aspect = rendContainer.offsetWidth / rendContainer.offsetHeight;
                const { left, right, top, bottom } = getFrustumPlanes(aspect, near);
                camera = new THREE.OrthographicCamera(left, right, top, bottom, near, 1000);
                camera.layers.set(layer);
                obj3d.current.scene.add(camera);
            }
            return camera;
        };

        const sliceXCamDistance = mriBoxMinMax.max[0] - mriBoxMinMax.min[0];
        obj3d.current.camX = createSliceCamera(sliceXRendererContainer.current, 1, - sliceXCamDistance);
        //obj3d.current.camX.position.x = sliceCamDistance;
        obj3d.current.camX.up.fromArray([0, 0, 1]);
        obj3d.current.camX.position.fromArray([- sliceXCamDistance, 0, 0]);
        obj3d.current.camX.lookAt(0, 0, 0);

        const sliceYCamDistance = mriBoxMinMax.max[1] - mriBoxMinMax.min[1];
        obj3d.current.camY = createSliceCamera(sliceYRendererContainer.current, 2, - sliceYCamDistance);
        // obj3d.current.camY.position.y = sliceCamDistance;
        obj3d.current.camY.up.fromArray([0, 0, 1]);
        obj3d.current.camY.position.fromArray([0, sliceYCamDistance, 0, 0]);
        obj3d.current.camY.lookAt(0, 0, 0);

        const sliceZCamDistance = mriBoxMinMax.max[2] - mriBoxMinMax.min[2];
        obj3d.current.camZ = createSliceCamera(sliceZRendererContainer.current, 3, - sliceZCamDistance);
        //obj3d.current.camZ.position.z = sliceCamDistance;
        obj3d.current.camZ.up.fromArray([0, 1, 0]);
        obj3d.current.camZ.position.fromArray([0, 0, sliceZCamDistance]);
        obj3d.current.camZ.lookAt(0, 0, 0);


        const landmarksManager = new LandmarksManager(
            obj3d.current.marksGroup, {
            maxIndexX: volume.dimensions[0] - 1,
            maxIndexY: volume.dimensions[1] - 1,
            maxIndexZ: volume.dimensions[2] - 1
        });
        setLandmarksManager(landmarksManager);

        const onMarkDragEnd = (event: THREE.Event) => {
            landmarksManager.relocateMarkObj(event.object);
            setHighMarks([]);
        }
        const attachDragListeners = (dispatcher: EventDispatcher) => {
            dispatcher.addEventListener('drag', renderAll);
            obj3d.current.listeners.push({ event: 'drag', listener: renderAll, dispatcher });
            dispatcher.addEventListener('dragend', onMarkDragEnd);
            obj3d.current.listeners.push({ event: 'dragend', listener: onMarkDragEnd, dispatcher: dispatcher });
        }
        obj3d.current.dragCtrlX = new DragControls([], obj3d.current.camX, sliceXRendererContainer.current);
        attachDragListeners(obj3d.current.dragCtrlX);
        obj3d.current.dragCtrlY = new DragControls([], obj3d.current.camY, sliceYRendererContainer.current);
        attachDragListeners(obj3d.current.dragCtrlY);
        obj3d.current.dragCtrlZ = new DragControls([], obj3d.current.camZ, sliceZRendererContainer.current);
        attachDragListeners(obj3d.current.dragCtrlZ);

        initBrainWire(obj3d.current.scene, mriBbox.max.toArray(), false);
        setBrainModelMode(clipWire === StAtm.ClipWireMode.None ? StAtm.BrainModelMode.Wire : StAtm.BrainModelMode.Clipped);

        const controls = new ArcballControls(obj3d.current.camera, obj3d.current.renderer.domElement, obj3d.current.scene);

        controls.addEventListener('change', onCameraChanged);
        obj3d.current.listeners.push({ event: 'change', listener: onCameraChanged, dispatcher: controls });

        obj3d.current.controls = controls;

        controls.minDistance = 50;
        controls.maxDistance = 500;
        controls.enablePan = false;

    };

    const initSceneAfterVolumeLoaded = () => {

        // second renderer in an inset to display main view axis orientation 
        const { insetScene: scene2, insetCamera: camera2 } = setupInset(obj3d.current.aspect2, obj3d.current.camera);
        obj3d.current.camera2 = camera2;
        obj3d.current.scene2 = scene2;

    };
    //---------------------------------------------------------------------

    const refreshNormPointer = (container: HTMLDivElement, clientX: number, clientY: number) => {
        const rect = container.getBoundingClientRect();
        rtState.current.normPointer.x = rect ? (((clientX - rect.left) / rect.width) * 2 - 1) : 0;
        rtState.current.normPointer.y = rect ? (- ((clientY - rect.top) / rect.height) * 2 + 1) : 0;
    };

    const onRendererClick = (
        event: React.MouseEvent<HTMLDivElement, MouseEvent>,
        container: HTMLDivElement,
        camera: THREE.OrthographicCamera,
    ) => {
        if (landmarksManager && event.shiftKey) {
            refreshNormPointer(container, event.clientX, event.clientY);
            const res = landmarksManager.processPicking(
                rtState.current.normPointer,
                camera,
                obj3d.current.scene,
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
                }
            );

            res.modified && renderAll();
        }
    };


    const onRendererMouseMove = (
        event: React.MouseEvent<HTMLDivElement, MouseEvent>,
        container: HTMLDivElement,
        camera: THREE.OrthographicCamera,
    ) => {
        if (landmarksManager) {
            refreshNormPointer(container, event.clientX, event.clientY);
            const res = landmarksManager.processPicking(
                rtState.current.normPointer,

                camera, obj3d.current.scene,
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
                    gridTemplateColumns: 'minmax(0, 8fr) minmax(190px, 2fr)',
                    gap: '1px 3px',
                    overflow: 'hidden',
                }}
            >
                <ResizeSensor2
                    onResize={handleResize}
                >
                    <div
                        style={{
                            width: '100%', height: '100%', position: 'relative',
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
                                isOpen={alertMessage}
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
                                volRendererContainer.current && onRendererClick(event, volRendererContainer.current, obj3d.current.camera)
                            }
                            onMouseMove={(event) => {
                                volRendererContainer.current &&onRendererMouseMove(event, volRendererContainer.current, obj3d.current.camera)
                            }}
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
                        <div
                            style={{
                                visibility: (viewMode === StAtm.ViewMode.Slice2D ? 'visible' : 'hidden'),
                                display: 'grid',
                                position: 'absolute',
                                width: '100%', height: '100%',
                                gridTemplateColumns: '1fr 1fr 1fr',
                                gridTemplateRows: '1fr 1fr',
                                gap: '1px 3px',
                                overflow: 'hidden',
                                backgroundColor: 'silver',
                            }}
                        >
                            <div
                                ref={sliceZRendererContainer}
                                style={{
                                    gridColumn: '1 / 3',
                                    gridRow: '1 / 3',
                                    backgroundColor: 'red',
                                }}
                                onClick={(event) =>
                                    sliceZRendererContainer.current && onRendererClick(event, sliceZRendererContainer.current, obj3d.current.camZ)
                                }
                                onMouseMove={(event) => {
                                    sliceZRendererContainer.current && onRendererMouseMove(event, sliceZRendererContainer.current, obj3d.current.camZ)
                                }}

                            >
                            </div>
                            <div
                                ref={sliceXRendererContainer}
                                style={{
                                    gridColumn: '3',
                                    gridRow: '1',
                                    backgroundColor: 'green',
                                }}
                                onClick={(event) =>
                                    sliceXRendererContainer.current && onRendererClick(event, sliceXRendererContainer.current, obj3d.current.camX)
                                }
                                onMouseMove={(event) => {
                                    sliceXRendererContainer.current && onRendererMouseMove(event, sliceXRendererContainer.current, obj3d.current.camX)
                                }}

                            ></div>
                            <div
                                ref={sliceYRendererContainer}
                                style={{
                                    gridColumn: '3',
                                    gridRow: '2 ',
                                    backgroundColor: 'blue',
                                }}
                                onClick={(event) =>
                                    sliceYRendererContainer.current && onRendererClick(event, sliceYRendererContainer.current, obj3d.current.camY)
                                }
                                onMouseMove={(event) => {
                                    sliceYRendererContainer.current && onRendererMouseMove(event, sliceYRendererContainer.current, obj3d.current.camY)
                                }}

                            ></div>
                        </div>


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
                                            const mark = landmarksManager?.getMarkInstance(landmarkId);
                                            if (mark) {
                                                setIndexX(mark.indices[0]);
                                                setIndexY(mark.indices[1]);
                                                setIndexZ(mark.indices[2]);
                                                renderAll();
                                            }
                                        }
                                    }}

                                />
                            </div>
                            :
                            null
                        }

                    </div>
                </ResizeSensor2>

                <PreviewControls />

            </div >

        </div >

    );

};

export default VolumePreview;
