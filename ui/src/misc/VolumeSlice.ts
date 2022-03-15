//From https://github.com/mrdoob/three.js/blob/dev/examples/jsm/misc/VolumeSlice.js

import {
	ClampToEdgeWrapping,
	DoubleSide,
	LinearFilter,
	Mesh,
	MeshBasicMaterial,
	PlaneGeometry,
	Texture
} from 'three';

/**
 * This class has been made to hold a slice of a volume data
 * @class
 * @param   {Volume} volume    The associated volume
 * @param   {number}       [index=0] The index of the slice
 * @param   {string}       [axis='z']      For now only 'x', 'y' or 'z' but later it will change to a normal vector
 * @see Volume
 */
function VolumeSlice(volume, index, axis) {

	const slice = this;
	/**
	 * @member {Volume} volume The associated volume
	 */
	this.volume = volume;
	/**
	 * @member {Number} index The index of the slice, if changed, will automatically call updateGeometry at the next repaint
	 */
	index = index || 0;
	Object.defineProperty(this, 'index', {
		get: function () {

			return index;

		},
		set: function (value) {

			index = value;
			slice.geometryNeedsUpdate = true;
			return index;

		}
	});
	/**
	 * @member {String} axis The normal axis
	 */
	this.axis = axis || 'z';

	/**
	 * @member {HTMLCanvasElement} canvas The final (offscreen) canvas used for the texture	
	 */
	this.canvas = document.createElement('canvas');
	/**
	 * @member {HTMLCanvasElement} canvasBuffer The (offscreen) canvas used for intermediary to painting of the data (filtering)
	 */
	this.canvasBuffer = document.createElement('canvas');
	this.updateGeometry();


	const canvasMap = new Texture(this.canvas);
	canvasMap.minFilter = LinearFilter;
	canvasMap.wrapS = canvasMap.wrapT = ClampToEdgeWrapping;
	const material = new MeshBasicMaterial({ map: canvasMap, side: DoubleSide, });
	/**
	 * @member {Mesh} mesh The mesh ready to get used in the scene
	 */
	this.mesh = new Mesh(this.geometry, material);
	this.mesh.matrixAutoUpdate = false;
	/**
	 * @member {Boolean} geometryNeedsUpdate If set to true, updateGeometry will be triggered at the next repaint
	 */
	this.geometryNeedsUpdate = true;
	this.repaint();

	/**
	 * @member {Number} iLength Width of slice in the original coordinate system, corresponds to the width of the buffer canvas
	 */

	/**
	 * @member {Number} jLength Height of slice in the original coordinate system, corresponds to the height of the buffer canvas
	 */

	/**
	 * @member {Function} sliceAccess Function that allow the slice to access right data
	 * @see Volume.extractPerpendicularPlane
	 * @param {Number} i The first coordinate
	 * @param {Number} j The second coordinate
	 * @returns {Number} the index corresponding to the voxel in volume.data of the given position in the slice
	 */


}

VolumeSlice.prototype = {

	constructor: VolumeSlice,

	/**
	 * @member {Function} repaint Refresh the texture and the geometry if geometryNeedsUpdate is set to true
	 * @memberof VolumeSlice
	 */
	repaint: function () {

		if (this.geometryNeedsUpdate) {
			this.updateGeometry();
		}

		const iLength = this.iLength,
			jLength = this.jLength,
			volume = this.volume;
		const ctxBuffer = this.canvasBuffer.getContext('2d');

		// get the ImageData object from the intermediary canvas. It is where the updated image will be drawn.
		const imgData = ctxBuffer.createImageData(iLength, jLength);
		const destData = imgData.data;

		//final canvas where all filtered image will be drawn
		const ctx = this.canvas.getContext('2d');

		//clear destination image 
		ctx.globalCompositeOperation = 'source-over';
		ctx.fillStyle = '#000';
		ctx.fillRect(0, 0, iLength, jLength);

		//composition of main volume image with overlay image(s)
		let volMixRatio: number;
		let overlayMixRatio: number;
		if (volume.overlays.length > 0) {
			volMixRatio = Math.max(Math.min(volume.mixRatio, 1), 0);
			overlayMixRatio = (1 - volMixRatio) / volume.overlays.length;
		} else {
			volMixRatio = 1;
			overlayMixRatio = 0;
		}
		//1rst layer is main volume
		const layers = [{ layerVol: volume, pixelAccess: this.sliceAccess, mixRatio: volMixRatio }];
		//one more layer for each overlay volumes 
		volume.overlays.forEach((overlayVol: Volume) => {
			const extracted = overlayVol.extractPerpendicularPlane(this.axis, this.index, this.matrix);
			layers.push({ layerVol: overlayVol, pixelAccess: extracted.sliceAccess, mixRatio: overlayMixRatio });
		});

		//combine images
		layers.forEach(({ layerVol, pixelAccess, mixRatio }) => {

			const srcData = layerVol.data;
			//filter values to apply to the image 
			const windowLow = layerVol.windowLow;
			const windowHigh = layerVol.windowHigh;

			let alpha = 0xff * mixRatio;

			// manipulate some pixel elements
			let pixelCount = 0;

			for (let j = 0; j < jLength; j++) {

				for (let i = 0; i < iLength; i++) {

					let value = srcData[pixelAccess(i, j)];
					//apply window level and convert to 8bits value
					value = Math.floor(255 * (value - windowLow) / (windowHigh - windowLow));
					value = value > 255 ? 255 : (value < 0 ? 0 : value | 0);

					destData[4 * pixelCount] = value;
					destData[4 * pixelCount + 1] = value;
					destData[4 * pixelCount + 2] = value;
					destData[4 * pixelCount + 3] = alpha;
					pixelCount++;
				}
			}

			//update intermediary canvas with filtered image
			ctxBuffer.putImageData(imgData, 0, 0);

			//draw on final buffer (optionally setting blending method)
			//ctx.globalCompositeOperation = 'screen';
			ctx.globalCompositeOperation = 'screen';
			ctx.drawImage(this.canvasBuffer, 0, 0, iLength, jLength, 0, 0, this.canvas.width, this.canvas.height);

			//restore default composition value
			ctx.globalCompositeOperation = 'source-over';


		});

		this.mesh.material.map.needsUpdate = true;

	},

	/**
	 * @member {Function} Refresh the geometry according to axis and index
	 * @see Volume.extractPerpendicularPlane
	 * @memberof VolumeSlice
	 */
	updateGeometry: function () {

		const extracted = this.volume.extractPerpendicularPlane(this.axis, this.index);
		this.sliceAccess = extracted.sliceAccess;
		this.jLength = extracted.jLength;
		this.iLength = extracted.iLength;
		this.matrix = extracted.matrix;

		//canvas dimensions are same as source image (IJK space)
		this.canvas.width = this.iLength;
		this.canvas.height = this.jLength;
		this.canvasBuffer.width = this.iLength;
		this.canvasBuffer.height = this.jLength;

		if (this.geometry) this.geometry.dispose(); // dispose existing geometry

		//plane holding the slice has dimensions in RAS space
		this.geometry = new PlaneGeometry(extracted.planeWidth, extracted.planeHeight);

		if (this.mesh) {

			this.mesh.geometry = this.geometry;
			//reset mesh matrix
			this.mesh.matrix.identity();
			this.mesh.applyMatrix4(this.matrix);

		}

		this.geometryNeedsUpdate = false;

	},

	/**
	 * @member {Function} Dispose allocated geometries, textures, materials
	 * @memberof VolumeSlice
	 */
	dispose: function () {
		//because Volume & VolumeSlice reference each other, the circular references loop needs to be broken...
		this.volume = undefined;
		if (this.geometry) this.geometry.dispose();
		if (this.mesh) {
			//this.mesh.material.map().dispose();
			this.mesh.material.dispose();
		}
	},

};

export { VolumeSlice };
