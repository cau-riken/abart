import * as React from "react";


import * as THREE from 'three';

import Stats from 'three/examples/jsm/libs/stats.module.js';

import { ArcballControls } from 'three/examples/jsm/controls/ArcballControls.js';
import { OBJLoader } from 'three/examples/jsm/loaders/OBJLoader.js';

import { NIfTILoader } from '../loaders/NIfTILoader';

import {
    Alert,
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
    RangeSlider,
    ResizeEntry,
} from "@blueprintjs/core";

import {
    ResizeSensor2,
} from "@blueprintjs/popover2";

import { RegistrationTask } from "../RegistrationTaskHandler";
import SinkLogger from "./SinkLogger";

import "./VolumePreview.scss";

import { setupAxesHelper } from './Utils';
import { Volume } from "three/examples/jsm/misc/Volume";
import { VolumeSlice } from "three/examples/jsm/misc/VolumeSlice";

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

export type RealTimeState = {
    fixedWire: boolean,
    brainWireInitRotation: THREE.Quaternion,
    deltaRotation: number[],
    stopQ: THREE.Quaternion,
    camDistance: number,
};

export type Obj3dRefs = {

    brainWire: THREE.Group,
    stats: Stats,

    renderer: THREE.WebGLRenderer,

    renderer2: THREE.Renderer,
    aspect2: number,

    camera: THREE.PerspectiveCamera,
    scene: THREE.Scene,

    camera2: THREE.PerspectiveCamera,
    scene2: THREE.Scene,
    controls: ArcballControls,

    volume: Volume,
    sliceX: VolumeSlice,
    sliceY: VolumeSlice,
    sliceZ: VolumeSlice,

    boxAniMixer: THREE.AnimationMixer,
    boxAninAction: THREE.AnimationAction,
};


const SELECTED_FILE_FAKEURL = "selected_file";

const VolumePreview = (props: VolumePreviewProps) => {

    const [isLoading, setIsLoading] = React.useState(false);
    const [alertMessage, setAlertMessage] = React.useState<JSX.Element | undefined>();

    const volRendererContainer = React.useRef<HTMLDivElement>();
    const clock = React.useRef(new THREE.Clock());

    const objectURLs = React.useRef<string[]>([]);

    const volRendererInset = React.useRef<HTMLDivElement>();

    const obj3d = React.useRef<Obj3dRefs>({});

    const [deltaRotation, setDeltaRotation] = React.useState([0, 0, 0]);

    const [showWire, setShowWire] = React.useState(true);
    const [clipWire, setClipWire] = React.useState<string | undefined>();
    const [brainWireInitRotation, setBrainWireInitRotation] = React.useState(new THREE.Quaternion());
    const [fixedWire, setFixedWire] = React.useState(false);

    const [showXSlice, setShowXSlice] = React.useState(false);
    const [showYSlice, setShowYSlice] = React.useState(false);
    const [showZSlice, setShowZSlice] = React.useState(true);
    const [volumeRange, setVolumeRange] = React.useState<[number, number]>([0, 0]);

    const [indexX, setIndexX] = React.useState(0);
    const [indexY, setIndexY] = React.useState(0);
    const [indexZ, setIndexZ] = React.useState(0);

    const [remoteTask, setRemoteTask] = React.useState<RegistrationTask>();
    const [showLogs, setShowLogs] = React.useState(false);
    const [loglines, setLoglines] = React.useState<string[]>([]);

    const rtState = React.useRef<RealTimeState>({});
    React.useEffect(() => {
        rtState.current = {
            ...rtState.current,
            fixedWire,
            deltaRotation,
            brainWireInitRotation,
        };
        renderAll();
    });


    const revokeObjectURLs = () => {
        objectURLs.current.forEach((url) => URL.revokeObjectURL(url));
    }

    //when Volume changed (as a result of local file selection) 
    React.useEffect(() => {

        setDeltaRotation([0, 0, 0]);
        rtState.current.stopQ = new THREE.Quaternion();

        setShowWire(true);
        setClipWire(undefined);
        setBrainWireInitRotation(new THREE.Quaternion());
        setFixedWire(false);

        setVolumeRange([0, 0]);
        setShowXSlice(false);
        setShowYSlice(false);
        setShowZSlice(true);

        if (props.volumeFile) {

            setIsLoading(true);

            //if a volume was already loaded
            if (obj3d.current.volume) {
                //explicitely release slices to prevent leak (since the hold a back reference to the volume)
                obj3d.current.volume.sliceList.length = 0;
            }


            //reset ThreeJS object references, except renderers which are conserved
            obj3d.current = {
                renderer: obj3d.current.renderer,
                stats: obj3d.current.stats,
                renderer2: obj3d.current.renderer2,
                aspect2: obj3d.current.aspect2,
            };


            revokeObjectURLs();

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

                const renderer = obj3d.current.renderer;
                const volRendCont = volRendererContainer.current;
                const aspect = volRendCont.offsetWidth / volRendCont.offsetHeight;

                const camera = new THREE.PerspectiveCamera(60, aspect, 0.01, 1e10);

                obj3d.current.camera = camera;

                //main scene
                const scene = new THREE.Scene();
                scene.add(camera);
                obj3d.current.scene = scene;

                // light
                const hemiLight = new THREE.HemisphereLight(0xffffff, 0x000000, 1);
                scene.add(hemiLight);

                const dirLight = new THREE.DirectionalLight(0xffffff, 0.5);
                dirLight.position.set(200, 200, 200);
                scene.add(dirLight);


                const niftiloadr = new NIfTILoader(manager);

                //use already selected & loaded file 
                const filename = SELECTED_FILE_FAKEURL;

                niftiloadr.load(filename,
                    function onload(volume) {
                        if (volume) {
                            obj3d.current.volume = volume;

                            //box helper to see the extend of the volume
                            const geometry = new THREE.BoxGeometry(volume.xLength, volume.yLength, volume.zLength);
                            const material = new THREE.MeshBasicMaterial({ color: 0x00ff00 });
                            //const material = new THREE.LineBasicMaterial( { color: 0x8080ff, fog: false, transparent: true, opacity: 0.6 } );
                            const cube = new THREE.Mesh(geometry, material);
                            cube.visible = false;
                            const box = new THREE.BoxHelper(cube, 0xffff00);

                            scene.add(box);
                            box.applyMatrix4(volume.matrix);
                            scene.add(cube);
                            obj3d.current.box = box;

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

                            const mriBbox = new THREE.Box3().setFromObject(cube);
                            const mboxZLen = mriBbox.max.toArray()[2];
                            const camDistance = 6 * mboxZLen;
                            camera.position.z = camDistance;
                            rtState.current.camDistance = camDistance;
                            camera.getWorldQuaternion(rtState.current.stopQ);

                            initBrainWire(scene, mriBbox.max.toArray());
                            setBrainWireFrame(typeof clipWire == 'undefined');



                            const controls = new ArcballControls(camera, renderer.domElement, scene);

                            controls.addEventListener('change', (e) => {

                                //keep the brain wireframe in sync with camera rotation to make it look like it's static
                                updateBrainWireRotation();

                                //show Volume's bounding-box while rotating
                                obj3d.current.boxAninAction.stop();
                                obj3d.current.boxAninAction.play();

                                renderAll();

                            });
                            obj3d.current.controls = controls;

                            controls.minDistance = 50;
                            controls.maxDistance = 500;
                            controls.enablePan = false;

                        }

                        revokeObjectURLs();
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




                //---------------------------------------------------------------------
                // second renderer in an inset to display main view axis orientation 
                const { insetScene: scene2, insetCamera: camera2 } = setupInset(obj3d.current.aspect2, obj3d.current.camera);
                obj3d.current.camera2 = camera2;
                obj3d.current.scene2 = scene2;

                //---------------------------------------------------------------------
            }
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

            renderer.localClippingEnabled = (typeof clipWire != 'undefined');
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
            if (obj3d.current.volume) {
                //explicitely release slices to prevent leak (since the hold a back reference to the volume)
                obj3d.current.volume.sliceList.length = 0;
            }
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

            //obj3d.current.stats.update();
        }
    }


    const initBrainWire = (scene: THREE.Scene, bboxMax: number[]) => {

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
            const sf = 0.75;
            var templBbox = new THREE.Box3().setFromObject(brainWire);

            const [brainboxXLen, brainboxYLen, brainboxZLen] = templBbox.max.toArray();
            const scaleTemplMatrix = new THREE.Matrix4().set(
                sf * mboxXLen / brainboxXLen, 0, 0, 0,
                0, sf * mboxYLen / brainboxYLen, 0, 0,
                0, 0, sf * mboxZLen / brainboxZLen, 0,
                0, 0, 0, 1
            );
            brainWire.applyMatrix4(scaleTemplMatrix);
            scene.add(brainWire);
            obj3d.current.brainWire = brainWire;


            const initialQ = new THREE.Quaternion();
            brainWire.getWorldQuaternion(initialQ);
            setBrainWireInitRotation(initialQ);

        });
    };


    const setBrainWireFrame = (wireframe: boolean) => {
        if (obj3d.current.brainWire) {
            obj3d.current.brainWire.traverse(function (child) {
                if (child.isMesh) {
                    child.material.wireframe = wireframe;
                }
            });
        }
    };

    const refreshClippingPlanes = (clipWire: string | undefined) => {

        if (clipWire) {
            const planeNorms: THREE.Vector3[] = [];
            let slice: VolumeSlice;
            let pos: number = NaN;

            switch (clipWire) {
                case 'x':
                    planeNorms.push(new THREE.Vector3(-1, 0, 0));
                    planeNorms.push(new THREE.Vector3(1, 0, 0));
                    slice = obj3d.current.sliceX;
                    pos = slice.mesh.matrix.elements[12];
                    break;
                case 'y':
                    planeNorms.push(new THREE.Vector3(0, -1, 0));
                    planeNorms.push(new THREE.Vector3(0, 1, 0));
                    slice = obj3d.current.sliceY;
                    pos = slice.mesh.matrix.elements[13];
                    break;
                case 'z':
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
        if (rtState.current.fixedWire || force) {

            obj3d.current.brainWire.up.copy(obj3d.current.camera.up);
            const rotOffset = getBWRotationOffset();
            obj3d.current.brainWire.setRotationFromQuaternion(rotOffset);
        }
        setDeltaRotation(
            obj3d.current.brainWire.rotation.toArray()
        );

    };

    const setCameraRotation = (up: number[], position: number[]) => {
        obj3d.current.controls.reset();
        obj3d.current.camera.up.fromArray(up);
        obj3d.current.camera.position.fromArray(position);
        obj3d.current.camera.lookAt(0, 0, 0);

        updateBrainWireRotation();
        updateInset();
    };

    //-------------------------------------------------------------------------
    const setClipWireBySlice = (newClipWire: string, enableClipping: boolean) => {
        if (enableClipping) {
            //enabling wireframe clipping
            setClipWire(newClipWire);
            setBrainWireFrame(false);
            refreshClippingPlanes(newClipWire);
            obj3d.current.renderer.localClippingEnabled = true;
        } else {
            //disabling wireframe clipping
            setClipWire(undefined);
            setBrainWireFrame(true);
            obj3d.current.renderer.localClippingEnabled = false;
        }
    }


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
    }



    return (

        <div
            style={{
                maxWidth: '100%',
                maxHeight: '100%',
                height: '100%'
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
                            null}
                        <div
                            className="volRendererCont"
                            style={{
                                position: 'absolute',
                                width: '100%', height: '100%',
                            }}

                            ref={volRendererContainer}
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


                    </div>
                </ResizeSensor2>

                <div
                    style={{
                        backgroundColor: "#EEE",
                        padding: 6,
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'space-between',
                    }}
                >
                    <div>

                        <div
                            style={{ display: 'flex', flexDirection: 'row', justifyContent: 'space-between', alignItems: "baseline" }}
                        >
                            <span>Brain wire:</span>
                            <Switch
                                checked={showWire}
                                disabled={!obj3d.current.volume}
                                label="visible"
                                onChange={() => {
                                    setShowWire(!showWire);
                                    obj3d.current.brainWire.visible = !showWire;
                                }}
                            />
                            <span></span>
                        </div>

                        <div
                            style={{ display: 'flex', flexDirection: 'row', justifyContent: 'space-between', alignItems: "baseline" }}
                        >
                            <span>Brain wire orientation:</span>
                            <Switch
                                checked={fixedWire}
                                disabled={!obj3d.current.volume}
                                label="fixed"
                                onChange={() => {
                                    setFixedWire(!fixedWire);

                                    if (fixedWire) {
                                        //from now on brainwire will look like it's moving along the camera
                                        //(but it is actually static)

                                        //camera rotation when stoping updating brainwire rotation
                                        obj3d.current.camera.getWorldQuaternion(rtState.current.stopQ);

                                    } else {
                                        //from now on brainwire will look like it's fixed in its current pos
                                        //(but it is actually being rotated)

                                        setBrainWireInitRotation(getRotationOffset());
                                    }
                                }}
                            />
                            <Button icon="reset"
                                disabled={!obj3d.current.volume}

                                onClick={() => {
                                    //update directly, rerender will happen before REact UseEffects are processed 
                                    rtState.current.brainWireInitRotation = new THREE.Quaternion();
                                    setBrainWireInitRotation(rtState.current.brainWireInitRotation);
                                    updateBrainWireRotation(true);
                                }}

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
                                disabled={!obj3d.current.volume}

                                onClick={() => {
                                    if (obj3d.current.controls) {
                                        obj3d.current.controls.reset();
                                    }
                                }}

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



                        <div
                        >


                            <div style={{ marginTop: 16, borderTop: "solid 1px #d1d1d1", paddingTop: 6 }}>
                                <div
                                    style={{ display: 'flex', flexDirection: 'row', justifyContent: 'space-between' }}
                                >

                                    <Switch
                                        checked={showXSlice}
                                        disabled={!obj3d.current.sliceX}
                                        label="Sagittal (X) slices"
                                        onChange={() => {
                                            setShowSlice('x', !showXSlice);
                                        }}
                                    />

                                    <Switch
                                        checked={clipWire == 'x'}
                                        disabled={!obj3d.current.sliceX || !showXSlice}
                                        label="clip brainwire"
                                        onChange={() => {
                                            setClipWireBySlice('x', clipWire != 'x');
                                        }}
                                    />
                                </div>
                                <Slider
                                    className="x-slider"
                                    min={0}
                                    max={obj3d.current.volume ? obj3d.current.volume.dimensions[0] - 1 : 0}
                                    disabled={!obj3d.current.sliceX || !showXSlice}
                                    labelValues={[]}
                                    showTrackFill={false}
                                    value={indexX}
                                    onChange={(value: number) => {

                                        setIndexX(value);
                                        obj3d.current.sliceX.index = value;
                                        obj3d.current.sliceX.repaint.call(obj3d.current.sliceX);

                                        refreshClippingPlanes(clipWire);
                                    }}
                                />
                                <div
                                    style={{ display: 'flex', flexDirection: 'row', justifyContent: 'space-between' }}
                                >
                                    <Button
                                        disabled={!obj3d.current.volume}

                                        onClick={() => {
                                            setCameraRotation([0, 0, 1], [- rtState.current.camDistance, 0, 0]);
                                        }}
                                    >L</Button>
                                    <Button
                                        disabled={!obj3d.current.volume}
                                        onClick={() => {
                                            setCameraRotation([0, 0, 1], [rtState.current.camDistance, 0, 0]);
                                        }}
                                    >R</Button>

                                </div>

                            </div>
                            <div style={{ marginTop: 16, borderTop: "solid 1px #d1d1d1", paddingTop: 6 }}>
                                <div
                                    style={{ display: 'flex', flexDirection: 'row', justifyContent: 'space-between' }}
                                >

                                    <Switch
                                        checked={showYSlice}
                                        disabled={!obj3d.current.sliceY}
                                        label="Coronal (Y) slices"
                                        onChange={() => {
                                            setShowSlice('y', !showYSlice);
                                        }}
                                    />

                                    <Switch
                                        checked={clipWire == 'y'}
                                        disabled={!obj3d.current.sliceY || !showYSlice}
                                        label="clip brainwire"
                                        onChange={() => {
                                            setClipWireBySlice('y', clipWire != 'y');
                                        }}
                                    />
                                </div>

                                <Slider
                                    className="y-slider"
                                    min={0}
                                    max={obj3d.current.volume ? obj3d.current.volume.dimensions[1] - 1 : 0}
                                    disabled={!obj3d.current.sliceY || !showYSlice}
                                    labelValues={[]}
                                    showTrackFill={false}
                                    value={indexY}
                                    onChange={(value: number) => {

                                        setIndexY(value);
                                        obj3d.current.sliceY.index = value;
                                        obj3d.current.sliceY.repaint.call(obj3d.current.sliceY);
                                        refreshClippingPlanes(clipWire);
                                    }}
                                />

                                <div
                                    style={{ display: 'flex', flexDirection: 'row', justifyContent: 'space-between' }}
                                >
                                    <Button
                                        disabled={!obj3d.current.volume}

                                        onClick={() => {
                                            setCameraRotation([0, 0, 1], [0, - rtState.current.camDistance, 0]);
                                        }}
                                    >P</Button>
                                    <Button
                                        disabled={!obj3d.current.volume}
                                        onClick={() => {
                                            setCameraRotation([0, 0, 1], [0, rtState.current.camDistance, 0]);
                                        }}
                                    >A</Button>

                                </div>

                            </div>
                            <div style={{ marginTop: 16, borderTop: "solid 1px #d1d1d1", paddingTop: 6 }}>
                                <div
                                    style={{ display: 'flex', flexDirection: 'row', justifyContent: 'space-between' }}
                                >

                                    <Switch
                                        checked={showZSlice}
                                        disabled={!obj3d.current.sliceZ}
                                        label="Axial (Z) slices"
                                        onChange={() => {
                                            setShowSlice('z', !showZSlice);
                                        }}
                                    />
                                    <Switch
                                        checked={clipWire == 'z'}
                                        disabled={!obj3d.current.sliceZ || !showZSlice}
                                        label="clip brainwire"
                                        onChange={() => {
                                            setClipWireBySlice('z', clipWire != 'z');
                                        }}
                                    />
                                </div>
                                <Slider
                                    className="z-slider"
                                    min={0}
                                    max={obj3d.current.volume ? obj3d.current.volume.dimensions[2] - 1 : 0}
                                    disabled={!obj3d.current.sliceZ || !showZSlice}
                                    labelValues={[]}
                                    showTrackFill={false}
                                    value={indexZ}
                                    onChange={(value: number) => {

                                        setIndexZ(value);
                                        obj3d.current.sliceZ.index = value;
                                        obj3d.current.sliceZ.repaint.call(obj3d.current.sliceZ);

                                        refreshClippingPlanes(clipWire);
                                    }}
                                />

                                <div
                                    style={{ display: 'flex', flexDirection: 'row', justifyContent: 'space-between' }}
                                >
                                    <Button
                                        disabled={!obj3d.current.volume}

                                        onClick={() => {
                                            setCameraRotation([0, 1, 0], [0, 0, - rtState.current.camDistance]);
                                        }}
                                    >I</Button>
                                    <Button
                                        disabled={!obj3d.current.volume}
                                        onClick={() => {
                                            setCameraRotation([0, 1, 0], [0, 0, rtState.current.camDistance]);
                                        }}
                                    >S</Button>

                                </div>
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
                                    (!obj3d.current.volume ? { color: 'rgba(92, 112, 128, 0.2)' } : {})
                                }
                                icon="contrast"
                            />
                            <RangeSlider
                                disabled={!obj3d.current.volume}
                                min={obj3d.current.volume ? obj3d.current.volume.min : 0}
                                max={obj3d.current.volume ? obj3d.current.volume.max : 100}
                                stepSize={2}
                                labelStepSize={obj3d.current.volume ? obj3d.current.volume.max : 20}
                                onChange={(range: NumberRange) => {
                                    obj3d.current.volume.windowLow = range[0];
                                    obj3d.current.volume.windowHigh = range[1];
                                    obj3d.current.volume.repaintAllSlices();
                                    setVolumeRange(range);
                                }}
                                value={volumeRange}
                            />
                        </div>

                    </div>
                    <div>
                        <div
                            style={{ marginTop: 20, display: 'flex', flexDirection: 'row', justifyContent: 'space-evenly' }}
                        >

                            <Button
                                className="big-button"
                                icon="confirm"
                                disabled={!props.volumeFile || (remoteTask && remoteTask.hasStarted())}
                                onClick={() => {
                                    const params = { rotation: deltaRotation.slice(0, 3) };
                                    const task = RegistrationTask.create(
                                        props.volumeFile?.file,
                                        params,
                                        (task) => {
                                            setRemoteTask(task);
                                            if (!task) {
                                                setShowLogs(false);
                                            }
                                        },
                                        (lines: string[]) => setLoglines(lines),
                                        (iserror, event) => {
                                            if (iserror) {
                                                setAlertMessage(
                                                    <p>
                                                        Registration aborted!
                                                    </p>);
                                                task.taskStatus = 'aborted';
                                            } else {
                                                setAlertMessage(
                                                    <p>
                                                        Registration done!
                                                    </p>);
                                                task.taskStatus = 'done';
                                            }
                                            setShowLogs(false);
                                        },

                                    );
                                    setRemoteTask(task)
                                    setShowLogs(true);
                                }} >Register</Button>

                            <br />

                            <Button
                                icon="delete"
                                disabled={!remoteTask || !remoteTask.hasStarted() || remoteTask.hasFinished()}
                                onClick={() => {
                                    const updatedTask = remoteTask?.cancel(
                                        () => {
                                            setRemoteTask(undefined);
                                            setShowLogs(false);
                                        });
                                    setRemoteTask(updatedTask);
                                }} >Cancel</Button>
                            <AnchorButton
                                icon="archive"
                                disabled={!remoteTask || !remoteTask.hasFinished()}
                                href={remoteTask ? remoteTask?.getDownloadResultUrl() : ""}
                                target="_blank"
                            >Download</AnchorButton>

                        </div>
                        <div style={{ height: 10, margin: "4px 6px", padding: "0 10px" }}>
                            {
                                remoteTask && !remoteTask.hasFinished()
                                    ?
                                    <ProgressBar
                                        intent={remoteTask.isCanceled() ? Intent.WARNING : (remoteTask.hasStarted() ? Intent.PRIMARY : Intent.NONE)}
                                    />
                                    :
                                    null
                            }
                        </div>
                        <Switch
                            checked={showLogs}
                            disabled={!remoteTask || !remoteTask.hasStarted()}
                            label="show logs"
                            onChange={() => setShowLogs(!showLogs)}
                        />
                    </div>


                </div>



            </div>

        </div >

    );

};

export default VolumePreview;
