import * as THREE from 'three';
import * as StAtm from '../StateAtoms';


export const getNormPointer = (container: Element, clientX: number, clientY: number) => {
    const rect = container.getBoundingClientRect();
    return rect
        ?
        [(((clientX - rect.left) / rect.width) * 2 - 1), (- ((clientY - rect.top) / rect.height) * 2 + 1)]
        :
        [0, 0]
        ;
};


export function setupAxesHelper(axisLength: number, scene: THREE.Scene) {

    // axes
    const axes = new THREE.AxesHelper(axisLength);
    scene.add(axes);

    //create sprites for axes labels
    StAtm.Axes.forEach((info, pov) => {
        const sprite = createTextSprite(info.label);
        if (sprite) {
            sprite.position.copy(info.dir.clone().multiplyScalar(axisLength));
            sprite.userData = { isAxisSign: true, axis: pov };
            scene.add(sprite);
        }
    });

}


///excerpt from https://github.com/stity/threejs-atlas-viewer
export function createTextSprite(message: string): THREE.Sprite | null {

    const fontface = "Arial";
    const fontsize = 45;

    let sprite: THREE.Sprite | null = null;

    const canvas = document.createElement('canvas');
    canvas.width = fontsize + 10;
    canvas.height = fontsize + 10;
    var context = canvas.getContext('2d');
    if (context) {
        context.font = "Bold " + fontsize + "px " + fontface;

        // text color
        context.fillStyle = "#FFFFFF";
        context.textAlign = 'center';

        context.fillText(message, fontsize / 2 + 5, fontsize + 5);

        // canvas contents will be used for a texture
        const texture = new THREE.Texture(canvas);
        texture.needsUpdate = true;

        const spriteMaterial = new THREE.SpriteMaterial({ map: texture });

        sprite = new THREE.Sprite(spriteMaterial);
        sprite.scale.set(fontsize, fontsize, 1.0);
    }
    return sprite;

}

//shader material derived from http://stemkoski.github.io/Three.js/Shader-Glow.html
export const newXRayGlowingMaterial = (color: THREE.Color) =>
    new THREE.ShaderMaterial(
        {
            uniforms: {
                c: { value: 1.0 },
                p: { value: 1.7 },
                glowColor: { value: color },
            },
            vertexShader: `
uniform float c;
uniform float p;
varying float intensity;
void main() 
{
    vec3 vNormal = normalize( normalMatrix * normal );
    vec3 vNormel = vec3( 0.0, 0.0, 1.0 );
    intensity = pow( c - dot(vNormal, vNormel), p );
    
    gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );
}
`,
            fragmentShader: `
uniform vec3 glowColor;
varying float intensity;
void main() 
{
    vec3 glow = glowColor * intensity;
    gl_FragColor = vec4( glow, 1.0 );
}
`,
            side: THREE.FrontSide,
            blending: THREE.AdditiveBlending,
            transparent: true,
        })
    ;


export const rowArrayToMatrix3 = (mat: number[][]) => {
    const mat3 = new THREE.Matrix3();
    mat3.set(
        mat[0][0], mat[0][1], mat[0][2],
        mat[1][0], mat[1][1], mat[1][2],
        mat[2][0], mat[2][1], mat[2][2],
    )
    return mat3;
};

export const rowArrayToMatrix4 = (mat: number[][]) => {
    const mat4 = new THREE.Matrix4();
    mat4.set(
        mat[0][0], mat[0][1], mat[0][2], mat[0][3],
        mat[1][0], mat[1][1], mat[1][2], mat[1][3],
        mat[2][0], mat[2][1], mat[2][2], mat[2][3],
        mat[3][0], mat[3][1], mat[3][2], mat[3][3],
    )
    return mat4;
};

