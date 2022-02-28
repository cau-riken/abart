import * as THREE from 'three';
import { DragControls } from 'three/examples/jsm/controls/DragControls';

export type MarkInstance = {
    landmarkId: string,
    instanceId: string,
    coord: number[],
    indices: number[],
}

export type LandMark = {
    id: string,
    color: string,
    coord: number[],
    name: string,
    longname: string,
    descr: string,
};

export enum PickingMode {
    LandmarkCreation,
    SlicesSelection,
    Hovering,
}

export type CreateLandMarkOptions = {
    landmarkId: string,
    color: string,
}

class LandmarksManager {

    private static raycaster = new THREE.Raycaster();

    private static bulletRadius = 4;
    private static ringThickness = 2;
    private static ringRadius = 5;

    private static ringShape = new THREE.Shape(
        new THREE.EllipseCurve(
            0.0, 0.0,
            this.ringRadius + 0.1, this.ringRadius + 0.1,
            0.0, 2.0 * Math.PI,
            false, 0
        ).getSpacedPoints(64)
    );
    static {
        this.ringShape.holes.push(
            new THREE.Shape(
                new THREE.EllipseCurve(
                    0.0, 0.0,
                    this.ringRadius + 0.05, this.ringRadius + 0.05,
                    0.0, 2.0 * Math.PI,
                    true, 0
                ).getSpacedPoints(64))
        );
    }
    private static ringGeom = new THREE.ExtrudeGeometry(
        this.ringShape,
        {
            steps: 1,
            depth: this.ringThickness,
            bevelEnabled: true,
            bevelThickness: 0.3,
            bevelSize: 0.3,
            bevelOffset: 0,
            bevelSegments: 1
        }
    );


    private static markerConf = {
        lineMats: [
            new THREE.LineBasicMaterial({ color: 0x0000ff }),
            new THREE.LineBasicMaterial({ color: 0x00ff00 }),
            new THREE.LineBasicMaterial({ color: 0xff0000 }),
        ],
        planeMats: [
            new THREE.MeshBasicMaterial({ color: 0x0000ff, side: THREE.DoubleSide, transparent: true, opacity: 0.4 }),
            new THREE.MeshBasicMaterial({ color: 0x00ff00, side: THREE.DoubleSide, transparent: true, opacity: 0.4 }),
            new THREE.MeshBasicMaterial({ color: 0xff0000, side: THREE.DoubleSide, transparent: true, opacity: 0.4 }),
        ],

        planeGeoms: [
            new THREE.CylinderGeometry(this.bulletRadius, this.bulletRadius, 1, 12)
                .applyQuaternion(new THREE.Quaternion().setFromEuler(new THREE.Euler(Math.PI / 2, 0, Math.PI / 2))),
            new THREE.CylinderGeometry(this.bulletRadius, this.bulletRadius, 1, 12)
                .applyQuaternion(new THREE.Quaternion().setFromEuler(new THREE.Euler(0, Math.PI / 2, 0))),
            new THREE.CylinderGeometry(this.bulletRadius, this.bulletRadius, 1, 12)
                .applyQuaternion(new THREE.Quaternion().setFromEuler(new THREE.Euler(0, Math.PI / 2, Math.PI / 2))),
        ],

        ringMat: new THREE.MeshBasicMaterial({ color: 0xffffff, side: THREE.DoubleSide }),

        ringGeoms: [
            this.ringGeom.clone()
                .applyQuaternion(new THREE.Quaternion().setFromEuler(new THREE.Euler(0, Math.PI / 2, 0)))
                .translate(-this.ringThickness / 2, 0, 0),
            this.ringGeom.clone()
                .applyQuaternion(new THREE.Quaternion().setFromEuler(new THREE.Euler(Math.PI / 2, 0, Math.PI / 2)))
                .translate(0, this.ringThickness / 2, 0),
            this.ringGeom.clone()
                .translate(0, 0, -this.ringThickness / 2),
        ],


    };


    private static walkMarkParts(marksGroup: THREE.Group, predicate: (part: THREE.Object3D) => (boolean), proc: (part: THREE.Object3D) => (void)) {
        marksGroup?.children.forEach(
            mark => {
                if (predicate(mark)) {
                    mark.children.forEach(part => proc(part));
                }
            });
    };


    private static walkMarksPartsInIds(marksGroup: THREE.Group, instanceIds: Set<string>, proc: (part: THREE.Object3D) => (void)) {
        this.walkMarkParts(
            marksGroup,
            mark => instanceIds.has(mark.userData.instanceId),
            proc
        );
    };

    static applySelectedStyle(marksGroup: THREE.Group, instanceIds: Set<string>) {
        if (instanceIds.size) {

            this.walkMarksPartsInIds(marksGroup, instanceIds,
                part => {
                    if (typeof part.userData?.isSelector != 'undefined' && part.userData?.isSelector) {
                        part.visible = true;
                    }

                });
        }
    };

    static applyUnselectedStyle(marksGroup: THREE.Group, instanceIds: Set<string>) {
        if (instanceIds.size) {
            this.walkMarksPartsInIds(marksGroup, instanceIds,
                part => {
                    if (typeof part.userData?.isSelector != 'undefined' && part.userData?.isSelector) {
                        part.visible = false;
                    }
                });
        }
    };

    private static createLandmarkObj(
        xyz: number[],
        color: string,
    ) {
        const mark = new THREE.Group()

        const instanceId = mark.uuid;
        const markData = { isLandmark: true, instanceId: instanceId };
        mark.userData = markData;

        //in 2D slices view, only scene objects representing the landmark are shown 
        [0, 1, 2].forEach(i => {

            const layerChannel = i + 1;
            const layerName = layerChannel === 1 ? 'x' : layerChannel === 2 ? 'y' : 'z';

            //circle bullet to represent the landmark 
            const geom = this.markerConf.planeGeoms[i];
            const mat = new THREE.MeshBasicMaterial({ color: color, side: THREE.FrontSide, transparent: true, opacity: 0.7 });
            const bullet = new THREE.Mesh(geom, mat);

            bullet.userData = { ...markData, layerChannel: layerChannel };
            bullet.name = 'bulllet-mesh-' + layerName;
            bullet.layers.enable(layerChannel);
            mark.add(bullet);

            //ring to visually highlight the landmark
            const ringMesh = new THREE.Mesh(this.markerConf.ringGeoms[i], this.markerConf.ringMat);

            ringMesh.userData = { ...markData, layerChannel: layerChannel, isSelector: true };
            ringMesh.name = 'ring-mesh-' + layerName;
            ringMesh.layers.enable(layerChannel);
            ringMesh.visible = true;
            mark.add(ringMesh);

        });

        mark.position.fromArray(xyz);
        return mark;
    };

    // ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ 
    private maxs;
    private selectedMarks;
    private marksGroup;
    private markInstances;

    constructor(marksGroup: THREE.Group, maxs: { maxIndexX: number, maxIndexY: number, maxIndexZ: number }) {
        this.marksGroup = marksGroup;
        this.maxs = maxs;
        this.selectedMarks = new Set<string>();
        this.markInstances = new Map<string, MarkInstance>()
    }

    dispose() {
        LandmarksManager.walkMarkParts(
            this.marksGroup,
            () => true,
            part => {
                //release colored bullet material 
                if (part.type == 'Mesh' && part.name == 'bulllet-mesh') {
                    ((part as THREE.Mesh).material as THREE.Material).dispose();
                }
            }
        );
    };

    createLandmark(landmarkId: string, color: string, coord: number[]) {
        const [i, j, k, x, y, z] = this.pointToSliceIndexes(coord);
        const indices = [i, j, k]
        const mark = LandmarksManager.createLandmarkObj(coord, color);
        const instanceId = mark.uuid;
        this.marksGroup.add(mark);

        //record newly created mark instance
        this.markInstances.set(landmarkId,
            {
                landmarkId: landmarkId,
                coord: [x, y, z],
                indices: indices,
                instanceId,
            }
        );
        return instanceId;
    }

    remove(landmarkId: string) {
        const markInstance = this.getMarkInstance(landmarkId);
        if (markInstance) {
            this.markInstances.delete(landmarkId);
            const mark = this.getMarkObj(markInstance.instanceId);
            if (mark) {
                this.marksGroup.remove(mark);
            }
        }
    };

    getMarkInstances() {
        return new Map(this.markInstances);
    }
    getMarkInstance(landmarkId: string) {
        return this.markInstances.get(landmarkId);
    }

    getMarkInstanceById(instanceId: string) {
        return [...this.markInstances.values()].find(m => m.instanceId === instanceId);
    }

    getMarkObj(instanceId: string) {
        return this.marksGroup.children
            .find(mark => (instanceId === mark.userData.instanceId));
    }

    showAllMarkBullets() {
        LandmarksManager.walkMarkParts(
            this.marksGroup,
            mark => mark.userData?.isLandmark,
            part => {
                if (part.userData?.layerChannel) {
                    part.layers.enable(part.userData?.layerChannel);
                }
            }
        );
    }

    showMarkBulletsBySlices(dimNums: number[], indices: number[]) {
        dimNums.forEach(dimNum => {
            const layerChannel = dimNum + 1;
            LandmarksManager.walkMarkParts(
                this.marksGroup,
                mark => mark.userData?.isLandmark,
                part => {
                    if (part.userData?.layerChannel === layerChannel) {
                        const instance = this.getMarkInstanceById(part.userData?.instanceId);
                        if (instance) {
                            if (instance?.indices[dimNum] == indices[dimNum]) {
                                part.layers.enable(part.userData?.layerChannel);
                            } else {
                                part.layers.disable(part.userData?.layerChannel);
                            }
                        }
                    }
                }
            );
        });
    };


    //only dragabble objects are the circle bullets visible on the view
    resetDraggable(dragControl: DragControls | undefined, layerChannel: number) {
        if (dragControl) {
            dragControl.getObjects().length = 0;

            const draggable = this.marksGroup.children
                .filter(mg => mg.userData.isLandmark)
                .map(mg => mg.children
                    .filter(mp => mp.visible && mp.userData?.layerChannel === layerChannel)
                )
                .flat();

            dragControl.getObjects().push(...draggable);
        }

    };


    relocateMarkObj(markPart: THREE.Object3D) {
        //get new location
        const newPos = markPart.position.clone();
        //reset dragged circle bullet to it's former location (=origin)
        markPart.position.set(0, 0, 0);

        const mark = markPart.parent;
        if (mark) {
            const targetPos = mark.position.clone().add(newPos);
            //move the whole group at new position
            const [i, j, k, x, y, z] = this.pointToSliceIndexes(targetPos.toArray());

            mark.position.set(x, y, z);
            //reset mark instance's slice indices
            const markInstance = this.getMarkInstanceById(mark.userData.instanceId);
            if (markInstance) {
                markInstance.indices = [i, j, k];
            }
        }
    }

    private pointToSliceIndexes(point: number[]) {

        /* 
        FIXME Assume Nifti affine transform is identity matrix.

            * slices are centered at the origin, 
            * slice thickness is 0, 
            * slices are positionned at index coordinates +0.5 (world space units)
        */
        const [x, y, z] = point;

        const { maxIndexX, maxIndexY, maxIndexZ } = this.maxs;
        const midX = maxIndexX / 2, midY = maxIndexY / 2, midZ = maxIndexZ / 2;

        let i = Math.round(x + midX);
        let j = Math.round(y + midY);
        let k = Math.round(z + midZ);
        //keep value within slice boundaries
        if (i < 0) {
            i = 0;
        } else if (i > maxIndexX) {
            i = maxIndexX;
        }
        if (j < 0) {
            j = 0;
        } else if (j > maxIndexY) {
            j = maxIndexY;
        }
        if (k < 0) {
            k = 0;
        } else if (k > maxIndexZ) {
            k = maxIndexZ;
        }
        return [i, j, k, i - midX, j - midY, k - midZ];

    };

    processPicking(
        normPointer: THREE.Vector2,
        camera: THREE.Camera,
        scene: THREE.Scene,
        pickingMode: PickingMode,
        createOptions?: CreateLandMarkOptions,
        onCreated?: (instanceId: string) => void) {

        let modified = false;
        let appeared: string[] = [];
        let disappeared: string[] = [];
        let indices: number[] | undefined = undefined;
        if (camera && scene) {
            // update the picking ray with the camera and pointer position
            LandmarksManager.raycaster.setFromCamera(normPointer, camera);

            // calculate objects intersecting the picking ray
            const intersects = LandmarksManager.raycaster.intersectObjects(scene.children);

            for (let i = 0; i < intersects.length; i++) {
                const ntrsect = intersects[i];
                if (ntrsect.object?.visible) {
                    const previousSelected = new Set(this.selectedMarks);

                    //clear highlighting of previously hovered landmarks
                    if (this.selectedMarks.size > 0) {
                        LandmarksManager.applyUnselectedStyle(this.marksGroup, this.selectedMarks);
                        this.selectedMarks.clear();
                        modified = true;
                    }

                    if (ntrsect.object?.userData?.isSlice && pickingMode != PickingMode.Hovering) {

                        const [i, j, k, x, y, z] = this.pointToSliceIndexes(ntrsect.point.toArray());
                        if (createOptions) {
                            const instanceId = this.createLandmark(createOptions.landmarkId, createOptions.color, [x, y, z])
                            onCreated && onCreated(instanceId);
                            modified = true;
                        } else {
                            indices = [i, j, k];
                        }
                        break;

                    }
                    else if (ntrsect.object?.userData?.isLandmark && ntrsect.object?.userData?.instanceId) {

                        this.selectedMarks.add(ntrsect.object.userData.instanceId);
                        LandmarksManager.applySelectedStyle(this.marksGroup, this.selectedMarks);
                        modified = true;
                        appeared = [...this.selectedMarks.values()].filter(instanceId => !previousSelected.has(instanceId));
                        disappeared = [...previousSelected.values()].filter(instanceId => !this.selectedMarks.has(instanceId));
                        break;
                    }
                }

            }
        }

        return { modified, appeared, disappeared, indices };
    };

    setHighlight(landmarkId: string) {
        const markInstance = this.getMarkInstance(landmarkId);
        if (markInstance) {
            LandmarksManager.applySelectedStyle(this.marksGroup, new Set([markInstance.instanceId]));
        }
    }

    unsetHighlight(landmarkId: string) {
        const markInstance = this.getMarkInstance(landmarkId);
        if (markInstance) {
            LandmarksManager.applyUnselectedStyle(this.marksGroup, new Set([markInstance.instanceId]));
        }
    };


}

export default LandmarksManager;