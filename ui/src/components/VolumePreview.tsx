import * as React from "react";
import { useAtom } from "jotai";


import * as THREE from 'three';

import Stats from 'three/examples/jsm/libs/stats.module.js';

import { VolumeRenderShader1 } from 'three/examples/jsm/shaders/VolumeShader.js';
import { ArcballControls } from 'three/examples/jsm/controls/ArcballControls.js';
import { OBJLoader } from 'three/examples/jsm/loaders/OBJLoader.js';

import { NIfTILoader } from '../loaders/NIfTILoader';

import {
    Alert,
    Alignment,
    AnchorButton,
    Button,
    Icon,
    Intent,
    NumberRange,
    ProgressBar,
    Slider,
    Spinner,
    SpinnerSize,
    Switch,
    Tab,
    Tabs,
    RangeSlider,
    ResizeEntry,
} from "@blueprintjs/core";

import {
    ResizeSensor2,
} from "@blueprintjs/popover2";

import * as StAtm from '../StateAtoms';


import SinkLogger from "./SinkLogger";
import LandMarksList from "./LandMarksList";
import { MarkInstance, LandMark } from "./LandMarksList";

import "./VolumePreview.scss";

import { setupAxesHelper } from './Utils';

import { Volume } from "../misc/Volume";
import { VolumeSlice } from "../misc/VolumeSlice";
import LandmarksManager, { CreateLandMarkOptions } from "./LandmarksManager";
import PreviewControls from "./PreviewControls";


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

    brainWire: THREE.Group,
    stats: Stats,

    renderer: THREE.WebGLRenderer,

    renderer2: THREE.Renderer,
    aspect2: number,

    camera: THREE.Camera,
    scene: THREE.Scene,

    camera2: THREE.PerspectiveCamera,
    scene2: THREE.Scene,
    controls: ArcballControls,

    vol3D: THREE.Mesh,
    materialVol3D: THREE.ShaderMaterial,

    marksGroup: THREE.Group,

    cube: THREE.Mesh,
    volume: Volume,
    sliceX: VolumeSlice,
    sliceY: VolumeSlice,
    sliceZ: VolumeSlice,

    boxAniMixer: THREE.AnimationMixer,
    boxAninAction: THREE.AnimationAction,

    disposable: THREE.Object3D[],
};


const SELECTED_FILE_FAKEURL = "selected_file";

const VolumePreview = (props: VolumePreviewProps) => {

    const [viewMode, setViewMode] = useAtom(StAtm.viewMode);

    const [isLoading, setIsLoading] = useAtom(StAtm.isLoading);
    const [alertMessage, setAlertMessage] = useAtom(StAtm.alertMessage);

    const [deltaRotation, setDeltaRotation] = useAtom(StAtm.deltaRotation);
    const [cameraRotation,] = useAtom(StAtm.cameraRotation);

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

    const [indexX, setIndexX] = useAtom(StAtm.indexX);
    const [indexY, setIndexY] = useAtom(StAtm.indexY);
    const [indexZ, setIndexZ] = useAtom(StAtm.indexZ);

    const [showLogs,] = useAtom(StAtm.showLogs);
    const [loglines,] = useAtom(StAtm.loglines);

    const [knownLandMarks,] = useAtom(StAtm.knownLandMarks);
    const [knownLandMarksAry,] = useAtom(StAtm.knownLandMarksAry);

    const [nextLandmarkId, setNextLandmarkId] = useAtom(StAtm.nextLandmarkId);
    const [markInstances, setMarkInstances] = useAtom(StAtm.markInstances);
    const [highMarks, setHighMarks] = useAtom(StAtm.highMarks);

    const volRendererContainer = React.useRef<HTMLDivElement>();
    const clock = React.useRef(new THREE.Clock());

    const objectURLs = React.useRef<string[]>([]);
    const volRendererInset = React.useRef<HTMLDivElement>();

    const obj3d = React.useRef<Obj3dRefs>({ disposable: [] });

    const rtState = React.useRef<StAtm.RealTimeState>({ normPointer: new THREE.Vector2() });
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

        renderAll();

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
            obj3d.current.controls.reset();
            obj3d.current.camera.up.fromArray(cameraRotation.up);
            obj3d.current.camera.position.fromArray(cameraRotation.position);
            obj3d.current.camera.lookAt(0, 0, 0);

            updateBrainWireRotation();
            renderAll();
        }

    }, [cameraRotation]);


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

        if (obj3d.current.sliceX) {
            obj3d.current.sliceX.index = indexX;
            obj3d.current.sliceX.repaint.call(obj3d.current.sliceX);
            if (clipWire === StAtm.ClipWireMode.ClipX) {
                refreshClippingPlanes(clipWire);
            }
            renderAll();
        }

    }, [indexX]);


    React.useEffect(() => {

        if (obj3d.current.sliceY) {
            obj3d.current.sliceY.index = indexY;
            obj3d.current.sliceY.repaint.call(obj3d.current.sliceY);
            if (clipWire === StAtm.ClipWireMode.ClipY) {
                refreshClippingPlanes(clipWire);
            }
            renderAll();
        }

    }, [indexY]);


    React.useEffect(() => {

        if (obj3d.current.sliceZ) {
            obj3d.current.sliceZ.index = indexZ;
            obj3d.current.sliceZ.repaint.call(obj3d.current.sliceZ);
            if (clipWire === StAtm.ClipWireMode.ClipZ) {
                refreshClippingPlanes(clipWire);
            }
            renderAll();
        }

    }, [indexZ]);


    React.useEffect(() => {
        updateBrainWireRotation(true);
        renderAll();
    }, [brainWireInitRotation]);


    React.useEffect(() => {

        if (obj3d.current.volume) {
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

        if (obj3d.current.brainWire) {
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

        rtState.current.brainWireInitRotation = brainWireInitRotation;
        renderAll();

    }, [brainWireInitRotation]);


    //when Volume changed (as a result of local file selection) 
    React.useEffect(() => {

        clearBeforeVolumeChange();

        setDeltaRotation([0, 0, 0]);
        rtState.current.stopQ = new THREE.Quaternion();

        setShowBrainModel(false);
        setClipWire(StAtm.ClipWireMode.None);
        setBrainWireInitRotation(new THREE.Quaternion());
        setFixedWire(false);

        setVolumeRange([0, 0]);
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
                disposable: [],
            };



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
                        setIsLoading(false);
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
    const handleResize = (entries: ResizeEntry[]) => {
        if (obj3d.current.renderer) {
            const renderer = obj3d.current.renderer;
            const volRendCont = volRendererContainer.current;
            if (volRendCont) {
                const aspect = volRendCont.offsetWidth / volRendCont.offsetHeight;
                renderer.setSize(volRendCont.offsetWidth, volRendCont.offsetHeight);

                if (obj3d.current.camera) {
                    obj3d.current.camera.aspect = aspect;
                    obj3d.current.camera.updateProjectionMatrix();
                }
            }
        }
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


        LandmarksManager.dispose(obj3d.current.marksGroup);

        //obj3d.current.cube
        obj3d.current.disposable.forEach(d => d.dispose());
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
    }

    const onCameraChanged = () => {

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

        const mesh = new THREE.Mesh(geometry, material);
        //center back on the origin
        mesh.translateZ(-volume.zLength / 2 + 0.5);
        mesh.translateY(-volume.yLength / 2 + 0.5);
        mesh.translateX(-volume.xLength / 2 + 0.5);
        //re-orient
        mesh.applyMatrix4(volume.matrix);

        mesh.visible = initVisibility;
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
        scene.add(sliceZ.mesh);
        obj3d.current.sliceZ = sliceZ;
        setIndexZ(obj3d.current.sliceZ.index);

        //y plane
        const initSliceY = Math.floor(volume.dimensions[1] / 2);
        const sliceY = volume.extractSlice('y', initSliceY);

        sliceY.mesh.visible = showYSlice;
        scene.add(sliceY.mesh);
        obj3d.current.sliceY = sliceY;
        setIndexY(obj3d.current.sliceY.index);

        //x plane
        const initSliceX = Math.floor(volume.dimensions[0] / 2);
        const sliceX = volume.extractSlice('x', initSliceX);
        sliceX.mesh.visible = showXSlice;
        scene.add(sliceX.mesh);
        obj3d.current.sliceX = sliceX;
        setIndexX(obj3d.current.sliceX.index);

        setVolumeRange([
            obj3d.current.volume.windowLow,
            obj3d.current.volume.windowHigh
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

    const initSceneBeforeVolumeLoad = () => {
        const renderer = obj3d.current.renderer;
        const volRendCont = volRendererContainer.current;
        const aspect = volRendCont.offsetWidth / volRendCont.offsetHeight;

        /*
            const camera = new THREE.PerspectiveCamera(60, aspect, 0.01, 1e10);
        */

        const h = 512; // frustum height
        const camera = new THREE.OrthographicCamera(- h * aspect / 2, h * aspect / 2, h / 2, - h / 2, 1, 1000);

        obj3d.current.camera = camera;

        //main scene
        const scene = new THREE.Scene();
        scene.add(camera);
        obj3d.current.scene = scene;

        // light
        const hemiLight = new THREE.HemisphereLight(0xffffff, 0x000000, 1);
        scene.add(hemiLight);
        updateBrainWireRotation();
        updateInset();

    };

    const initSceneOnVolumeLoaded = (volume: Volume) => {

        obj3d.current.volume = volume;

        initVol3D(obj3d.current.scene, volume, true);
        initSlices(obj3d.current.scene, volume);

        const mriBbox = new THREE.Box3().setFromObject(obj3d.current.cube);
        const mboxZLen = mriBbox.max.toArray()[2];
        const camDistance = 6 * mboxZLen;
        obj3d.current.camera.position.z = camDistance;
        rtState.current.camDistance = camDistance;
        obj3d.current.camera.getWorldQuaternion(rtState.current.stopQ);

        initBrainWire(obj3d.current.scene, mriBbox.max.toArray(), false);
        setBrainModelMode(clipWire === StAtm.ClipWireMode.None ? StAtm.BrainModelMode.Wire : StAtm.BrainModelMode.Clipped);

        //group for landmarks
        obj3d.current.marksGroup = new THREE.Group();
        obj3d.current.scene.add(obj3d.current.marksGroup);

        const controls = new ArcballControls(obj3d.current.camera, obj3d.current.renderer.domElement, obj3d.current.scene);

        controls.addEventListener('change', onCameraChanged);
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
    const setShowSlice = (slice: string, newShowSlice: boolean) => {
        switch (slice) {
            case 'x':
                setShowXSlice(newShowSlice);
                obj3d.current.sliceX.mesh.visible = newShowSlice;
                break;
            case 'y':
                setShowYSlice(newShowSlice);
                obj3d.current.sliceY.mesh.visible = newShowSlice;
                break;
            case 'z':
                setShowZSlice(newShowSlice);
                obj3d.current.sliceZ.mesh.visible = newShowSlice;
                break;
        }
        if (!newShowSlice) {
            setClipWireBySlice(slice, false);
        }
    };

    }


    const refreshNormPointer = (clientX: number, clientY: number) => {
        const rect = volRendererContainer.current?.getBoundingClientRect();
        rtState.current.normPointer.x = rect ? ((clientX / rect.width) * 2 - 1) : 0;
        rtState.current.normPointer.y = rect ? (- (clientY / rect.height) * 2 + 1) : 0;
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
                    gridTemplateColumns: 'minmax(0, 6fr) minmax(190px, 2fr)',
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
                        <div
                            className="volRendererCont"
                            style={{
                                position: 'absolute',
                                width: '100%', height: '100%',
                            }}

                            ref={volRendererContainer}
                            onClick={(event) => {
                                if (event.shiftKey) {
                                    refreshNormPointer(event.clientX, event.clientY);
                                    const res = LandmarksManager.processPicking(
                                        rtState.current.normPointer,
                                        obj3d.current.camera,
                                        obj3d.current.scene,
                                        obj3d.current.marksGroup,
                                        (
                                            (nextLandmarkId != '')
                                                ?
                                                { color: knownLandMarks.get(nextLandmarkId)?.color } as CreateLandMarkOptions
                                                :
                                                undefined
                                        ),
                                        (instance, pos) => {
                                            console.log('pos', pos.toArray());
                                            markInstances.set(nextLandmarkId,
                                                {
                                                    landmarkId: nextLandmarkId,
                                                    coord: pos.toArray(),
                                                    instanceId: instance
                                                }
                                            );
                                            setMarkInstances(new Map(markInstances));
                                            setNextLandmarkId('');
                                        }
                                    );

                                    res.modified && renderAll();
                                }
                            }}
                            onMouseMove={(event) => {
                                refreshNormPointer(event.clientX, event.clientY);
                                const res = LandmarksManager.processPicking(rtState.current.normPointer, obj3d.current.camera, obj3d.current.scene, obj3d.current.marksGroup);

                                const highlighted: string[] = [];
                                markInstances.forEach((mark, landmarkId) => {
                                    if (res.appeared.includes(mark.instanceId)) {
                                        highlighted.push(landmarkId);
                                    }
                                });
                                setHighMarks(highlighted);
                                res.modified && renderAll();
                            }}
                        >
                        </div>
                        <div
                            ref={volRendererInset}
                            style={{
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
                                        const mark = markInstances.get(landmarkId);
                                        if (mark) {
                                            markInstances.delete(landmarkId);
                                            setMarkInstances(new Map(markInstances));
                                            LandmarksManager.remove(obj3d.current.marksGroup, mark.instanceId);
                                        }
                                    }}
                                    onMarkMouseEnter={(landmarkId) => {
                                        if (markInstances.has(landmarkId)) {
                                            LandmarksManager.setHighlight(obj3d.current.marksGroup, markInstances.get(landmarkId).instanceId);
                                            renderAll();
                                        }
                                    }}
                                    onMarkMouseLeave={(landmarkId) => {
                                        if (markInstances.has(landmarkId)) {
                                            LandmarksManager.unsetHighlight(obj3d.current.marksGroup, markInstances.get(landmarkId).instanceId);
                                            renderAll();
                                        }
                                    }}
                                />
                            </div>
                            :
                            null
                        }

                    </div>
                </ResizeSensor2>

                <PreviewControls
                    rtState={rtState}
                    obj3d={obj3d}
                />

            </div>

        </div >

    );

};

export default VolumePreview;
