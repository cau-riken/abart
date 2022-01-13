import * as React from "react";

import {
    FileInput,
    FocusStyleManager,
} from "@blueprintjs/core";


import VolumePreview from "./VolumePreview"
import { LoadedVolumeFile } from "./VolumePreview"

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
        //excerpt from https://slicedrop.com/js/x.rendering.js

        if (volumeFile) {
            volumeFile.file = undefined;
            volumeFile.data = undefined;
        }
        setVolumeFile(undefined);

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


        //HTML5 File Reader 
        const reader = new FileReader();
        reader.onerror = (e) => {
            console.log('Error:' + e.target.error.code);
        };

        reader.onload = (e) => {
            // reading complete
            const rawVolumeData = e.target.result;
            setVolumeFile(
                {
                    file: file,
                    name: fileName,
                    ext: fileExtension,
                    data: rawVolumeData
                }
            );

        };

        //start loading
        reader.readAsArrayBuffer(file);

    };


    const [isWebGlEnabled, setWebGlEnabled] = React.useState<boolean | null>();
    const [volumeFile, setVolumeFile] = React.useState<LoadedVolumeFile>();


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
                    <VolumePreview
                        volumeFile={volumeFile}
                    />
                </div>
                <FileInput
                    style={{ position: 'absolute' }}
                    text={volumeFile ? volumeFile.name : "Choose file..."}
                    onInputChange={(e) => {

                        if (e?.target?.files) {
                            if (e.target.files.length) {
                                const selectedFile = e.target.files[0];

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
