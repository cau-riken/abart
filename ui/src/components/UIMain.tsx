import * as React from "react";
import { useAtom } from "jotai";

import {
    FileInput,
    FocusStyleManager,
} from "@blueprintjs/core";

import * as StAtm from '../StateAtoms';

import VolumePreview from "./VolumePreview"

FocusStyleManager.onlyShowFocusOnTabs();


const detectWebGLContext = () => {
    try {
        // canvas element (no need to add it to the DOM)
        const canvas = document.createElement("canvas");
        // get WebGLRenderingContext from canvas element.
        const gl = canvas.getContext("webgl")
            || canvas.getContext("experimental-webgl");
        return Boolean(gl && gl instanceof WebGLRenderingContext);
    } catch (e) {
        return false;
    }
};



type UIMainProps = {
};

const UIMain = (props: UIMainProps) => {

    const loadLocalVolumeFile = (file: File) => {

        if (volumeFile) {
            volumeFile.fileOrBlob = undefined;
        }
        setVolumeFile(undefined);
        setRemoteTask(undefined);

        const fileName = file.name;
        const fileExt = fileName.toUpperCase().split('.').pop();

        // check for files with no extension
        const fileExtension =
            (!fileExt || fileExt == fileName.toUpperCase())
                ?
                // this must be dicom
                'DCM'
                :
                fileExt
            ;

        //files extension of recognized volumes
        //const volumeExtensions = ['NRRD', 'MGZ', 'MGH', 'NII', 'GZ', 'DCM', 'DICOM'];
        const volumeExtensions = ['NII', 'GZ'];
        const seemsValidFile = (volumeExtensions.indexOf(fileExtension) >= 0);
        if (seemsValidFile) {
            setVolumeFile({
                fileOrBlob: file,
                name: fileName,
            });

        } else {
            setAlertMessage(<span>The selected file doesn't seem to be a valid NIfTI file.</span>)
        }

    };


    const [isWebGlEnabled, setWebGlEnabled] = React.useState<boolean>();
    const [volumeFile, setVolumeFile] = useAtom(StAtm.volumeFile);
    const [, setRemoteTask] = useAtom(StAtm.remoteTask);
    const [, setAlertMessage] = useAtom(StAtm.alertMessage);


    React.useEffect(() => {
        const isWebGlEnabled = detectWebGLContext();
        setWebGlEnabled(isWebGlEnabled);
        if (isWebGlEnabled) {

        }

    }, []
    );

    return (
        (isWebGlEnabled === false)
            ?
            <div
                style={{
                    width: '100%',
                    textAlign: 'center',
                    paddingTop: 50,
                    fontSize: 'large',
                    color: 'orangered'
                }}
            >Preview can not be displayed because WebGL is not available on this browser!</div>

            :
            <div
            >
                <div style={{ position: 'absolute', width: '100%', height: '100%' }}>
                    <VolumePreview />
                </div>
                <FileInput
                    style={{ position: 'absolute' }}
                    text={volumeFile ? volumeFile.name : "Choose file..."}
                    onInputChange={(e: React.FormEvent<HTMLInputElement>) => {

                        if (e?.currentTarget?.files) {
                            if (e.currentTarget.files.length) {
                                const selectedFile = e.currentTarget.files[0];

                                loadLocalVolumeFile(selectedFile);
                                //console.log("onInputChange selectedFile:", selectedFile);
                            }
                        }
                    }
                    } />

            </div>


    );

}

export default UIMain;
