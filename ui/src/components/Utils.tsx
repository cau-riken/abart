import * as THREE from 'three';


export function setupAxesHelper(axisLength: number, scene: THREE.Scene) {

    // axes
    const axes = new THREE.AxesHelper(axisLength);
    scene.add(axes);

    //create sprites for axes labels
    const axesLabels = [
        { label: 'A', pos: [0, axisLength, 0] },
        { label: 'P', pos: [0, -axisLength, 0] },
        { label: 'L', pos: [-axisLength, 0, 0] },
        { label: 'R', pos: [axisLength, 0, 0] },
        { label: 'I', pos: [0, 0, -axisLength] },
        { label: 'S', pos: [0, 0, axisLength] },
    ]

    axesLabels.forEach(def => {
        const sprite = createTextSprite(def.label);
        if (sprite) {
            sprite.position.fromArray(def.pos);
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

//shader material from http://stemkoski.github.io/Three.js/Shader-Glow.html
export const newXRayGlowingMaterial = (color: THREE.Color, viewVector: THREE.Vector3) =>
    new THREE.ShaderMaterial(
        {
            uniforms: {
                c: { value: 1.0 },
                p: { value: 1.7 },
                glowColor: { value: color },
                viewVector: { value: viewVector }
            },
            vertexShader: `
uniform vec3 viewVector;
uniform float c;
uniform float p;
varying float intensity;
void main() 
{
    vec3 vNormal = normalize( normalMatrix * normal );
    vec3 vNormel = normalize( normalMatrix * viewVector );
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

