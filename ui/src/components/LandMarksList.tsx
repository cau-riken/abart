import * as React from "react";

import {
    Collapse,
    Icon,
} from "@blueprintjs/core";

import {
    Popover2,
} from "@blueprintjs/popover2";

import "./LandMarksList.scss";
import { LandMark } from "./LandmarksManager";
import Thumbnail from "./Thumbnail";

type LandMarksListProps = {
    landmarkset: LandMark[],
    marked: Set<string>,
    highlighted: string[],
    onMarkMouseEnter?: (markId: string) => (void),
    onMarkMouseLeave?: (markId: string) => (void),
    onSetNextLandmarkId?: (markId: string) => (void),
    onLandmarkCreate?: (markId: string) => (void),
    onLandmarkRemove?: (markId: string) => (void),
    onLandmarkFocus?: (markId: string) => (void),
};

const LandMarksList = (props: LandMarksListProps) => {

    const [isOpen, setIsOpen] = React.useState(false);
    const [nextToCreate, setNextToCreate] = React.useState('');

    return (
        <div
            className="landmark-table"
            style={{
                minWidth: 400,
                lineHeight: '25px',
                margin: 2,
            }}>
            <div
                style={{
                    display: 'flex',
                    flexDirection: 'row',
                    justifyContent: 'space-between',
                    padding: '2px 6px',
                    cursor: 'pointer',
                }}
                onClick={() => setIsOpen(!isOpen)}
            >
                <span>LandMarks</span>
                <Icon icon={isOpen ? "chevron-up" : "chevron-down"}
                />
            </div>
            <Collapse isOpen={isOpen}>
                <div
                    style={{
                        overflowY: 'auto',
                        paddingTop: 4,
                        paddingLeft: 10,
                    }}
                >
                    {
                        props.landmarkset.map(lm => {
                            const isSet = props.marked?.has(lm.id);
                            return (
                                <div
                                    key={lm.id}
                                    className={"landmark-line" + (props.highlighted.includes(lm.id) ? " landmark-high" : "")}
                                    style={{ ...(isSet ? {} : { fontStyle: 'italic', color: 'silver' }) }}
                                    onClick={() => {
                                        if (!isSet) {
                                            setNextToCreate(lm.id);
                                            props.onSetNextLandmarkId?.call(null, lm.id);
                                        } else {
                                            setNextToCreate('')
                                        }
                                    }}
                                    onMouseEnter={() => {
                                        if (isSet) {
                                            props.onMarkMouseEnter?.call(null, lm.id);
                                        }
                                    }}
                                    onMouseLeave={() => {
                                        if (isSet) {
                                            props.onMarkMouseLeave?.call(null, lm.id);
                                        }
                                    }}
                                >
                                    {!isSet && nextToCreate == lm.id
                                        ?
                                        <span title="next landmark to create"><Icon icon="double-chevron-right" color="#00FF00" /></span>
                                        :
                                        <span />
                                    }

                                    <Icon
                                        icon="map-marker"
                                        style={{ marginTop: 3 }} {...(isSet ? { color: lm.color } : {})}
                                        onDoubleClick={() => props.onLandmarkCreate?.call(null, lm.id)}
                                    />

                                    <span
                                        title={isSet ? 'click to jump to slices' : ''}
                                        className={isSet ? 'landmark-id' : ''}
                                        onClick={() => props.onLandmarkFocus?.call(null, lm.id)}
                                    >{lm.name}</span>

                                    <Popover2
                                        interactionKind="click"
                                        placement="left"
                                        hasBackdrop={true}
                                        content={
                                            <div style={{ width: 800, padding: 10, }}>
                                                <p>Landmark : <span style={{ fontWeight: 'bold', }}>{lm.longname}</span></p>
                                                <p>{lm.descr}</p>
                                                <Thumbnail imagePath={`resources/landmark_${lm.id}.png`} />
                                            </div>
                                        }
                                    >
                                        <span className='landmark-descr' title='click for description'>
                                            <Icon icon='info-sign' />
                                        </span>
                                    </Popover2>

                                    <span>{lm.longname}</span>

                                    {isSet ? <span title="Delete landmark">
                                        <Icon
                                            icon="small-cross"
                                            color="#FF0000"
                                            onClick={() => props.onLandmarkRemove?.call(null, lm.id)}
                                        />
                                    </span> : null}
                                </div>

                            );
                        })
                    }
                </div>
            </Collapse>
        </div>
    );
};

export default LandMarksList;
