import * as THREE from 'three';


export type CreateLandMarkOptions = {
    color: string,
}

class LandmarksManager {

    private static raycaster = new THREE.Raycaster();


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
            new THREE.CircleGeometry(4, 4),
            new THREE.CircleGeometry(4, 4).applyQuaternion(new THREE.Quaternion().setFromEuler(new THREE.Euler(0, Math.PI / 2, 0))),
            new THREE.CircleGeometry(4, 4).applyQuaternion(new THREE.Quaternion().setFromEuler(new THREE.Euler(Math.PI / 2, 0, Math.PI / 2))),
        ],

        sphereMat: new THREE.MeshPhongMaterial({ color: 0xffffff, emissive: 0xff00ff, specular: 0x00ff00, shininess: 100, side: THREE.FrontSide, transparent: true, opacity: 0.7 }),
        sphereGeom: new THREE.SphereGeometry(4.5, 12, 12),

    };

    private static selectedMarks = new Set<string>();

    static dispose(markGroup: THREE.Group) {
        LandmarksManager.walkMarkParts(
            markGroup,
            () => true,
            part => {
                if (part.type == "Mesh") {
                    //((part as THREE.Mesh).material as THREE.Material).dispose();
                    //(part as THREE.Mesh).geometry.dispose();        
                }
            }
        );
    };

    private static walkMarkParts(markGroup: THREE.Group, predicate: (part: THREE.Object3D) => (boolean), proc: (part: THREE.Object3D) => (void)) {
        markGroup?.children.forEach(
            mark => {
                if (predicate(mark)) {
                    mark.children.forEach(part => proc(part));
                }
            });
    };


    private static walkMarksPartsInIds(markGroup: THREE.Group, markIds: Set<string>, proc: (part: THREE.Object3D) => (void)) {
        LandmarksManager.walkMarkParts(
            markGroup,
            mark => markIds.has(mark.userData.markId),
            proc
        );
    };


    static applySelectedStyle(markGroup: THREE.Group, markIds: Set<string>) {
        if (markIds.size) {

            LandmarksManager.walkMarksPartsInIds(markGroup, markIds,
                part => {
                    if (typeof part.userData?.selector != 'undefined' && part.userData?.selector) {
                        part.visible = true;
                    }

                });
        }
    };

    static applyUnselectedStyle(markGroup: THREE.Group, markIds: Set<string>) {
        if (markIds.size) {
            LandmarksManager.walkMarksPartsInIds(markGroup, markIds,
                part => {
                    if (typeof part.userData?.selector != 'undefined' && part.userData?.selector) {
                        part.visible = false;
                    }
                });
        }
    };

    static remove(markGroup: THREE.Group, instanceId: string) {
        markGroup?.children.forEach(
            mark => {
                if (instanceId == mark.userData.markId) {
                    markGroup.remove(mark);
                }
            });
    };

    static setHighlight(markGroup: THREE.Group, instanceId: string) {
        this.applySelectedStyle(markGroup, new Set([instanceId]));
    }
    static unsetHighlight(markGroup: THREE.Group, instanceId: string) {
        this.applyUnselectedStyle(markGroup, new Set([instanceId]));
    };


    static processPicking(normPointer: THREE.Vector2, camera: THREE.Camera, scene: THREE.Scene, markGroup: THREE.Group,
        createOptions?: CreateLandMarkOptions,
        onCreated?: (instanceId: string, pos: THREE.Vector3) => void) {

        let modified = false;
        let appeared: string[] = [];
        let disappeared: string[] = [];
        if (camera && scene) {
            // update the picking ray with the camera and pointer position
            LandmarksManager.raycaster.setFromCamera(normPointer, camera);

            // calculate objects intersecting the picking ray
            const intersects = LandmarksManager.raycaster.intersectObjects(scene.children);

            for (let i = 0; i < intersects.length; i++) {
                const ntrsect = intersects[i];
                if (ntrsect.object?.visible) {
                    const previousSelected = new Set(LandmarksManager.selectedMarks);

                    //clear highlighting of previously hovered landmarks
                    if (LandmarksManager.selectedMarks) {
                        LandmarksManager.applyUnselectedStyle(markGroup, LandmarksManager.selectedMarks);
                        LandmarksManager.selectedMarks.clear();
                        modified = true;
                    }

                    if (createOptions && ntrsect.object?.userData?.isSlice) {
                        const mark = new THREE.Group()

                        const markId = self.crypto.randomUUID();
                        const markData = { isLandmark: true, markId: markId };
                        mark.userData = markData;


                        const planeGeom = new THREE.CircleGeometry(4, 4);
                        [0, 1, 2].forEach(i => {

                            const geom = LandmarksManager.markerConf.planeGeoms[i];
                            const segment = new THREE.LineSegments(geom, LandmarksManager.markerConf.lineMats[i]);
                            segment.userData = markData;
                            mark.add(segment);

                            const mat = LandmarksManager.markerConf.planeMats[i];
                            const plane = new THREE.Mesh(geom, mat);
                            
                            plane.userData = markData;
                            mark.add(plane);
                        });
                        planeGeom.dispose();


                        const sphgeom = LandmarksManager.markerConf.sphereGeom;
                        const sphereMat = LandmarksManager.markerConf.sphereMat;

                        const sphere = new THREE.Mesh(sphgeom, sphereMat);
                        sphere.userData = { ...markData, selector: true };
                        sphere.visible = true;
                        mark.add(sphere);



                        mark.position.copy(ntrsect.point);
                        markGroup.add(mark);
                        onCreated && onCreated(markId, mark.position.clone());
                        modified = true;
                        break;
                    }
                    else if (ntrsect.object?.userData?.isLandmark && ntrsect.object?.userData?.markId) {

                        LandmarksManager.selectedMarks.add(ntrsect.object.userData.markId);
                        LandmarksManager.applySelectedStyle(markGroup, LandmarksManager.selectedMarks);
                        modified = true;
                        appeared = [...LandmarksManager.selectedMarks.values()].filter(markId => !previousSelected.has(markId));
                        disappeared = [...previousSelected.values()].filter(markId => !LandmarksManager.selectedMarks.has(markId));
                        break;
                    }
                }

            }
        }

        return { modified, appeared, disappeared };
    };

}

export default LandmarksManager;