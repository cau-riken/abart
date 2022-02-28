import * as React from 'react';

import {
    Spinner,
} from "@blueprintjs/core";

type ThumbnailProps = {
    imagePath: string,

}

const Thumbnail = (props: ThumbnailProps) => {
    const size = 520;
    const [loading, setLoading] = React.useState(true);
    return (
        <div
            style={{
                padding: 6,
                textAlign: 'center',
                border: 'solid 1px silver',
            }}
        >
            <div
                style={{
                    display: loading ? 'flex' : 'none',
                    height: size,
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'center',
                }}
            >
                <Spinner size={30} />
            </div>
            <div
                style={{
                    display: loading ? "none" : "block",
                    position: 'relative',
                    height: size,
                    maxHeight: size,
                }}
            >
                <img
                    height={size}
                    src={props.imagePath}
                    onLoad={() => setLoading(false)}
                />
            </div>
        </div>
    );
};

export default Thumbnail;