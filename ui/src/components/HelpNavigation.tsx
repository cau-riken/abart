import * as React from "react";
import { useAtom } from "jotai";

import * as StAtm from '../StateAtoms';


import {
    Collapse,
    Icon,
} from "@blueprintjs/core";


const HelpNavigation = () => {

    const [viewMode, setViewMode] = useAtom(StAtm.viewMode);

    const [isOpen, setIsOpen] = React.useState(false);

    React.useEffect(() => {

        setIsOpen(false);

    }, [viewMode]);


    const helpItems: JSX.Element[] = [];

    const addHelpItems = (item: string | JSX.Element) => {
        helpItems.push(
            <div style={{ textAlign: 'center' }}>{item}</div>
        );
    }
    addHelpItems('Use mouse wheel to zoom in and out.');

    if (StAtm.ViewMode.Volume3D === viewMode || StAtm.ViewMode.Slice3D === viewMode) {
        addHelpItems('Click & drag to rotate the volume');
    }
    if (StAtm.ViewMode.Slice3D === viewMode || StAtm.ViewMode.Slice2D === viewMode) {
        addHelpItems('[Alt]+click to change orthogonal slices');
        addHelpItems('[Shift]+click to mark the position of a landmark (after selecting landmark in top list)');
    }
    if (StAtm.ViewMode.Slice2D === viewMode) {
        addHelpItems('[Ctrl]+click & drag image to pan');
        addHelpItems('Click & drag a landmark to change its location');
    }


    return (
        <div
            style={{
                minWidth: 400,
                lineHeight: '20px',
                margin: 2,

                backgroundColor: '#605f5f87',
                border: 'solid 1px #c0c0c047',
                borderRadius: '5px 5px 0px 0px',

                ...(isOpen ? {
                    fontSize: 16,
                    color: '#FFF',
                } : {
                    fontSize: 12,
                    color: 'rgb(204, 204, 204)',
                })

            }}>
            <div
                style={{
                    display: 'flex',
                    flexDirection: 'row',
                    justifyContent: 'space-between',
                    padding: '2px 6px',
                    cursor: 'pointer',
                    ...(isOpen ? {
                        lineHeight: '18px',
                    } : {
                        lineHeight: '10px',
                    })
                    
                }}
                onClick={() => setIsOpen(!isOpen)}
            >
                <Icon size={12} icon={isOpen ? "chevron-down" : "chevron-up"} />
                <span>Navigation</span>
                <Icon size={12} icon={isOpen ? "chevron-down" : "chevron-up"} />
            </div>
            <Collapse isOpen={isOpen}>
                <div
                    style={{
                        overflowY: 'auto',
                        overflowX: 'hidden',
                        padding: 4,

                        display: 'grid',
                        gridTemplateColumns: '50% 50%',
                        gridAutoRows: '50px',
                        gap: 3,
                        borderTop: 'dotted 1px #c0c0c047',
                        justifyItems: 'center',
                        alignItems: 'center',
                    }}
                >
                    {helpItems}
                </div>
            </Collapse>
        </div>

    );
};

export default HelpNavigation;
