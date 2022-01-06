import * as React from "react";


import * as THREE from 'three';

import Stats from 'three/examples/jsm/libs/stats.module.js';

import { TrackballControls } from 'three/examples/jsm/controls/TrackballControls.js';
import { OBJLoader } from 'three/examples/jsm/loaders/OBJLoader.js';

import { NIfTILoader } from '../loaders/NIfTILoader';

import {
    Alert,
    Button,
    Intent,
    ProgressBar,
    Slider,
    Spinner,
    SpinnerSize,
    Switch
} from "@blueprintjs/core";

import useResizeObserver from '@react-hook/resize-observer'

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

function useSize(target: HTMLDivElement) {
    const [size, setSize] = React.useState<DOMRect>();

    React.useLayoutEffect(() => {
        target && setSize(target.getBoundingClientRect());
    }, [target]);

    useResizeObserver(target, (entry) => setSize(entry.contentRect));
    return size;
}


export type RealTimeState = {
    fixedWire: boolean,
    brainWireRotation: number[],
    camRotation: number[],
};

export type Obj3dRefs = {

    brainWire: THREE.Group,
    stats: Stats,

    renderer: THREE.Renderer,

    renderer2: THREE.Renderer,
    aspect2: number,

    camera: THREE.PerspectiveCamera,
    initCameraMat: THREE.Matrix4,

    camera2: THREE.PerspectiveCamera,
    controls: TrackballControls,

    volume: Volume,
    sliceX: VolumeSlice,
    sliceY: VolumeSlice,
    sliceZ: VolumeSlice,
};


const SELECTED_FILE_FAKEURL = "selected_file";

const VolumePreview = (props: VolumePreviewProps) => {

    const [isLoading, setIsLoading] = React.useState(false);
    const [loadError, setLoadError] = React.useState();

    const volRendererContainer = React.useRef<HTMLDivElement>();
    const sliceXRendererContainer = React.useRef<HTMLDivElement>();

    const [target, setTarget] = React.useState<HTMLDivElement>();
    const rendererContSize = useSize(target);


    const objectURLs = React.useRef<string[]>([]);

    const volRendererInset = React.useRef<HTMLDivElement>();

    const obj3d = React.useRef<Obj3dRefs>({});

    const [camRotation, setCamRotation] = React.useState([0, 0, 0]);
    const [brainWireRotation, setBrainWireRotation] = React.useState([0.5, 2.0, 0.20]);
    const [fixedWire, setFixedWire] = React.useState(true);


    const [showWire, setShowWire] = React.useState(true);

    const [showXSlice, setShowXSlice] = React.useState(true);
    const [showYSlice, setShowYSlice] = React.useState(false);
    const [showZSlice, setShowZSlice] = React.useState(false);

    const [indexX, setIndexX] = React.useState(0);
    const [indexY, setIndexY] = React.useState(0);
    const [indexZ, setIndexZ] = React.useState(0);

    const [remoteTask, setRemoteTask] = React.useState<RegistrationTask>();
    const [showLogs, setShowLogs] = React.useState(false);
    const [loglines, setLoglines] = React.useState<string[]>([]);

    const rtState = React.useRef<RealTimeState>({});
    React.useEffect(() => {
        rtState.current = {
            fixedWire,
            camRotation,
            brainWireRotation,
        };
    });


    const revokeObjectURLs = () => {
        objectURLs.current.forEach((url) => URL.revokeObjectURL(url));
    }

    React.useEffect(() => {

        setCamRotation([0, 0, 0]);
        setBrainWireRotation([0, 0, 0]);
        setShowXSlice(true);
        setShowYSlice(true);
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
                obj3d.current.initCameraMat = camera.matrix.clone();

                //main scene
                const scene = new THREE.Scene();
                scene.add(camera);


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
                        console.log("volume", volume);
                        if (volume) {
                            obj3d.current.volume = volume;

                            //box helper to see the extend of the volume
                            const geometry = new THREE.BoxGeometry(volume.xLength, volume.yLength, volume.zLength);
                            const material = new THREE.MeshBasicMaterial({ color: 0x00ff00 });
                            const cube = new THREE.Mesh(geometry, material);
                            cube.visible = false;
                            const box = new THREE.BoxHelper(cube);

                            scene.add(box);
                            box.applyMatrix4(volume.matrix);
                            scene.add(cube);

                            //z plane
                            const initSliceZ = Math.floor(volume.dimensions[2] / 4);
                            const sliceZ = volume.extractSlice('z', initSliceZ);
                            sliceZ.mesh.visible = showZSlice;
                            scene.add(sliceZ.mesh);
                            obj3d.current.sliceZ = sliceZ;
                            setIndexZ(obj3d.current.sliceZ.index)

                            //y plane
                            const initSliceY = Math.floor(volume.dimensions[1] / 2);
                            const sliceY = volume.extractSlice('y', initSliceY);

                            sliceY.mesh.visible = showYSlice;
                            scene.add(sliceY.mesh);
                            obj3d.current.sliceY = sliceY;
                            setIndexY(obj3d.current.sliceY.index)

                            //x plane
                            const initSliceX = Math.floor(volume.dimensions[0] / 2);
                            const sliceX = volume.extractSlice('x', initSliceX);
                            sliceX.mesh.visible = showXSlice;
                            scene.add(sliceX.mesh);
                            obj3d.current.sliceX = sliceX;
                            setIndexX(obj3d.current.sliceX.index)


                            const mriBbox = new THREE.Box3().setFromObject(cube);
                            const [mboxXLen, mboxYLen, mboxZLen] = mriBbox.max.toArray();
                            camera.position.z = 6 * mboxZLen;


                            const objloader = new OBJLoader();
                            const wireColor = new THREE.Color(0xFF88FF)
                            //objloader.setMaterials(objmaterial);
                            objloader.load("models/bma_sp2-lh.surf-simpld.obj", function (leftHemisphere) {

                                //update left-hemisphere to display as wireframe
                                leftHemisphere.traverse(function (child) {
                                    if (child.isMesh) {
                                        child.material.wireframe = true;
                                        child.material.color = wireColor;
                                        //child.material.opacity = 0.9;
                                        //child.material.transparent = true;

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

                                const controls = new TrackballControls(camera, renderer.domElement);
                                controls.addEventListener('change', () => {

                                    //keep the brain wireframe in sync with camera rotation to make it look like it's static
                                    if (rtState.current.fixedWire) {
                                        brainWire.rotation.copy(camera.rotation);
                                        brainWire.updateMatrix();
                                    }
                                    setCamRotation(camera.rotation.toArray());

                                });
                                obj3d.current.controls = controls;

                                controls.minDistance = 50;
                                controls.maxDistance = 500;
                                controls.rotateSpeed = 5.0;
                                controls.zoomSpeed = 5;
                                controls.panSpeed = 2;

                            });

                        }

                        revokeObjectURLs();
                        setIsLoading(false);
                    },
                    function onProgress(request: ProgressEvent) {
                        //console.log('onProgress', request)
                    },
                    function onError(e) {
                        console.error(e);
                        setLoadError(e);
                        setIsLoading(false);
                    },

                );




                //---------------------------------------------------------------------
                // second renderer in an inset to display main view axis orientation 
                const { insetScene: scene2, insetCamera: camera2 } = setupInset(obj3d.current.aspect2, camera);

                //---------------------------------------------------------------------

                const animate = function () {

                    requestAnimationFrame(animate);

                    if (obj3d.current.controls) {
                        obj3d.current.controls.update();

                        //---------------------------------------------------------------------
                        //update inset
                        //copy position of the camera into inset
                        camera2.position.copy(camera.position);
                        camera2.position.sub(obj3d.current.controls.target);
                        camera2.position.setLength(300);
                        camera2.lookAt(scene2.position);

                        obj3d.current.renderer2.render(scene2, camera2);
                        //---------------------------------------------------------------------
                    }
                    renderer.render(scene, camera);

                    //obj3d.current.stats.update();
                }

                animate();
            }
        }


    }, [props.volumeFile]
    );


    React.useEffect(() => {
        if (obj3d.current.renderer) {
            const renderer = obj3d.current.renderer;
            const volRendCont = volRendererContainer.current;
            if (volRendCont) {
                const aspect = volRendCont.offsetWidth / volRendCont.offsetHeight;
                renderer.setSize(volRendCont.offsetWidth, volRendCont.offsetHeight);
                //FIXME why doesn't it catch height downsizing events?

                //console.debug('resize', volRendCont.offsetWidth, volRendCont.offsetHeight, volRendCont.clientWidth, volRendCont.clientHeight) 
                if (obj3d.current.camera) {
                    obj3d.current.camera.aspect = aspect;
                    obj3d.current.camera.updateProjectionMatrix();
                    obj3d.current.controls.handleResize();
                }
            }
        }
    }, [rendererContSize]
    );


    React.useEffect(() => {

        const volRendCont = volRendererContainer.current;
        if (volRendCont) {
            const renderer = new THREE.WebGLRenderer({
                antialias: true,
            });
            renderer.setSize(volRendCont.offsetWidth, volRendCont.offsetHeight);
            renderer.setClearColor(0x333333, 1);
            renderer.setPixelRatio(window.devicePixelRatio);
            volRendCont.appendChild(renderer.domElement);

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
        //---------------------------------------------------------------------
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
                <div
                    style={{
                        width: '100%', height: '100%', position: 'relative',
                    }}
                    ref={setTarget}
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
                    {loadError
                        ?
                        <Alert
                            confirmButtonText="Close"
                            isOpen={loadError}
                            canEscapeKeyCancel={true}
                            canOutsideClickCancel={true}
                            onClose={() => {
                                setLoadError(undefined);
                            }}
                        >
                            <p>
                                Couldn't load the selected file.
                                <br />
                                Please check it is a valid NIFTi file.
                            </p>
                        </Alert>
                        :
                        null}
                    <div
                        className="volRendererCont"
                        style={{
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
                        <Button icon="reset"
                            onClick={() => {
                                if (obj3d.current.controls) {
                                    obj3d.current.controls.reset();
                                }
                            }}

                        >reset Camera</Button>

                        <div
                            style={{ height: 30, display: 'flex', flexDirection: 'row', justifyContent: 'space-evenly' }}
                        >


                            {obj3d.current.camera ?
                                <>
                                    <span>{THREE.MathUtils.radToDeg(camRotation[0]).toFixed(2) + '°'}</span>
                                    <span>{THREE.MathUtils.radToDeg(camRotation[1]).toFixed(2) + '°'}</span>
                                    <span>{THREE.MathUtils.radToDeg(camRotation[2]).toFixed(2) + '°'}</span>
                                </>
                                :
                                null
                            }
                        </div>
                        <Switch
                            checked={fixedWire}
                            label="Fixed brain wire"
                            onChange={() => {
                                setFixedWire(!fixedWire);

                                setBrainWireRotation(obj3d.current.brainWire.rotation.toArray());
                            }}
                        />
                        <div
                            style={{ height: 30, display: 'flex', flexDirection: 'row', justifyContent: 'space-evenly' }}
                        >


                            {obj3d.current.camera ?
                                <>
                                    <span>{THREE.MathUtils.radToDeg(brainWireRotation[0]).toFixed(2) + '°'}</span>
                                    <span>{THREE.MathUtils.radToDeg(brainWireRotation[1]).toFixed(2) + '°'}</span>
                                    <span>{THREE.MathUtils.radToDeg(brainWireRotation[2]).toFixed(2) + '°'}</span>
                                </>
                                :
                                null
                            }
                        </div>

                        <Switch
                            checked={showWire}
                            label="Show Brain wire"
                            onChange={() => {
                                setShowWire(!showWire);
                                obj3d.current.brainWire.visible = !showWire;

                            }}
                        />

                        <div
                        >


                            <div style={{ marginTop: 16 }}>

                                <Switch
                                    checked={showXSlice}
                                    disabled={!obj3d.current.sliceX}
                                    label="X slices"
                                    onChange={() => {
                                        if (obj3d.current.sliceX) {
                                            setShowXSlice(!showXSlice);
                                            obj3d.current.sliceX.mesh.visible = !showXSlice
                                        };
                                    }}
                                />
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
                                    }}
                                />
                            </div>
                            <div style={{ marginTop: 16 }}>
                                <Switch
                                    checked={showYSlice}
                                    disabled={!obj3d.current.sliceY}
                                    label="Y slices"
                                    onChange={() => {
                                        if (obj3d.current.sliceY) {
                                            setShowYSlice(!showYSlice);
                                            obj3d.current.sliceY.mesh.visible = !showYSlice
                                        };
                                    }}
                                />
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
                                    }}
                                />
                            </div>
                            <div style={{ marginTop: 16 }}>

                                <Switch
                                    checked={showZSlice}
                                    disabled={!obj3d.current.sliceZ}
                                    label="Z slices"
                                    onChange={() => {
                                        if (obj3d.current.sliceZ) {
                                            setShowZSlice(!showZSlice);
                                            obj3d.current.sliceZ.mesh.visible = !showZSlice
                                        };
                                    }}
                                />
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
                                    }}
                                />
                            </div>

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
                                    const params = { param1: "value1" };
                                    const task = RegistrationTask.create(
                                        props.volumeFile?.file,
                                        params,
                                        (lines: string[]) => setLoglines(lines),
                                    );
                                    setRemoteTask(task)
                                    setShowLogs(true);
                                }} >register</Button>

                            <br />

                            <Button
                                icon="delete"
                                disabled={!remoteTask || !remoteTask.hasStarted()}
                                onClick={() => {
                                    const updatedTask = remoteTask?.cancel(
                                        () => {
                                            setRemoteTask(undefined);
                                            setShowLogs(false);
                                        });
                                    setRemoteTask(updatedTask);
                                }} >cancel</Button>

                        </div>
                        <div style={{ height: 10, margin: "4px 6px", padding: "0 10px" }}>
                            {
                                remoteTask
                                    ?
                                    <ProgressBar
                                        intent={remoteTask.isCanceled() ? Intent.WARNING : Intent.PRIMARY}
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
