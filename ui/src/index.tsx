import * as React from "react";
import * as ReactDOM from "react-dom";

import 'normalize.css';
import "@blueprintjs/core/lib/css/blueprint.css";
import "@blueprintjs/popover2/lib/css/blueprint-popover2.css";



import UIMain from "./components/UIMain"


document
    //find parent elements for the viewer
    .querySelectorAll('#abart-root')
    .forEach(parentContainer => {

        parentContainer.style="width:100%; height:100%;"; 
        
        ReactDOM.render(
            <React.StrictMode>
                <UIMain />
            </React.StrictMode>,
            parentContainer
        )
    });