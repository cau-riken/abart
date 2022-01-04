import * as React from "react";

type SinkLoggerProps = {
    maxLine: number,
    data: string[],
    manualScroll?: boolean,
};

import "./SinkLogger.scss";


const SinkLogger = (props: SinkLoggerProps) => {
    const endOfLog = React.useRef<HTMLDivElement>(null);

    const [offset, setOffset] = React.useState(0);
    const [lines, setLines] = React.useState<string[]>([]);

    React.useEffect(() => {
        if (props.data && props.data.length) {
            const nbNew = props.data.length;

            const nbTokeep = props.maxLine - nbNew;
            if (nbTokeep < 0) {
                setLines(props.data.slice(-props.maxLine));
            } else {
                setLines(
                    [
                        ...(lines.slice(-nbTokeep)),
                        ...props.data
                    ])
            }
            setOffset(offset + nbNew)
        }
    }, [props.data]);

    React.useEffect(() => {
        if (!props.manualScroll && endOfLog.current) {
            endOfLog.current.scrollIntoView();
        }
    });

    return (
        <pre
            className="sinklogger"
            style={{
                backgroundColor: '#000',
                color: '#FFF',
                height: 'calc(100% - 2px)',
                border: 'solid 1px grey',
                margin: 0,
                overflowY: 'scroll',
                overflowX: 'hidden',
                padding: '5px 10px',
            }}>
            {
                lines.map(
                    (l, i) =>
                        <p key={offset + i}>{l}</p>)
            }
            <div style={{height: 30, width: 1}} ref={endOfLog} />
        </pre>
    );
};

export default SinkLogger;
