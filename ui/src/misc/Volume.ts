//From https://github.com/mrdoob/three.js/blob/dev/examples/jsm/misc/Volume.js

import {
	Matrix3,
	Matrix4,
	Vector3
} from 'three';
import { VolumeSlice } from './VolumeSlice';

export type IndexedColorEntry = {
	index: number,
	abbrev: string,
	hemisph: string,
	color: [number, number, number, number]
};

export const parseColorLUT = (text: string) => {
	const re = /([0-9]+)\s+([R|L]H):_.*_\(([^)]*)\)\s+([0-9]+)\s+([0-9]+)\s+([0-9]+)\s+([0-9]+).*/;

	let maxIndex = 0;
	const entries =		text
			.split('\n')
			.map(l => re.exec(l))
			.filter(parts => parts != null)
			.map(parts => {
				const [, colorNum, hemisph, abbrev, r, g, b, a] = parts;
				const index = parseInt(colorNum);
				maxIndex = Math.max(maxIndex, index);
				return { index, abbrev, hemisph, color: [parseInt(r), parseInt(g), parseInt(b), parseInt(a)] } as IndexedColorEntry;				
			});
	const lut = new Array<IndexedColorEntry>(maxIndex+1);
	entries.forEach( e => lut[e.index] = e);
	return lut;
};


/**
 * This class had been written to handle the output of the NRRD loader.
 * It contains a volume of data and informations about it.
 * For now it only handles 3 dimensional data.
 * See the webgl_loader_nrrd.html example and the loaderNRRD.js file to see how to use this class.
 * @class
 * @param   {number}        xLength         Width of the volume
 * @param   {number}        yLength         Length of the volume
 * @param   {number}        zLength         Depth of the volume
 * @param   {string}        type            The type of data (uint8, uint16, ...)
 * @param   {ArrayBuffer}   arrayBuffer     The buffer with volume data
 */
function Volume(xLength, yLength, zLength, type, arrayBuffer) {

	if (arguments.length > 0) {

		/**
		 * @member {number} xLength Width of the volume in the IJK coordinate system
		 */
		this.xLength = Number(xLength) || 1;
		/**
		 * @member {number} yLength Height of the volume in the IJK coordinate system
		 */
		this.yLength = Number(yLength) || 1;
		/**
		 * @member {number} zLength Depth of the volume in the IJK coordinate system
		 */
		this.zLength = Number(zLength) || 1;
		/**
		 * @member {Array<string>} The order of the Axis dictated by the NRRD header
		 */
		this.axisOrder = ['x', 'y', 'z'];
		/**
		 * @member {TypedArray} data Data of the volume
		 */

		switch (type) {

			case 'Uint8':
			case 'uint8':
			case 'uchar':
			case 'unsigned char':
			case 'uint8_t':
				this.data = new Uint8Array(arrayBuffer);
				break;
			case 'Int8':
			case 'int8':
			case 'signed char':
			case 'int8_t':
				this.data = new Int8Array(arrayBuffer);
				break;
			case 'Int16':
			case 'int16':
			case 'short':
			case 'short int':
			case 'signed short':
			case 'signed short int':
			case 'int16_t':
				this.data = new Int16Array(arrayBuffer);
				break;
			case 'Uint16':
			case 'uint16':
			case 'ushort':
			case 'unsigned short':
			case 'unsigned short int':
			case 'uint16_t':
				this.data = new Uint16Array(arrayBuffer);
				break;
			case 'Int32':
			case 'int32':
			case 'int':
			case 'signed int':
			case 'int32_t':
				this.data = new Int32Array(arrayBuffer);
				break;
			case 'Uint32':
			case 'uint32':
			case 'uint':
			case 'unsigned int':
			case 'uint32_t':
				this.data = new Uint32Array(arrayBuffer);
				break;
			case 'longlong':
			case 'long long':
			case 'long long int':
			case 'signed long long':
			case 'signed long long int':
			case 'int64':
			case 'int64_t':
			case 'ulonglong':
			case 'unsigned long long':
			case 'unsigned long long int':
			case 'uint64':
			case 'uint64_t':
				throw new Error('Error in Volume constructor : this type is not supported in JavaScript');
				break;
			case 'Float32':
			case 'float32':
			case 'float':
				this.data = new Float32Array(arrayBuffer);
				break;
			case 'Float64':
			case 'float64':
			case 'double':
				this.data = new Float64Array(arrayBuffer);
				break;
			default:
				this.data = new Uint8Array(arrayBuffer);

		}

		if (this.data.length !== this.xLength * this.yLength * this.zLength) {

			throw new Error('Error in Volume constructor, lengths are not matching arrayBuffer size');

		}

	}

	/**
	 * @member {Array}  spacing Spacing to apply to the volume from IJK to RAS coordinate system
	 */
	this.spacing = [1, 1, 1];
	/**
	 * @member {Array}  offset Offset of the volume in the RAS coordinate system
	 */
	this.offset = [0, 0, 0];
	/**
	 * @member {Martrix3} matrix The IJK to RAS matrix
	 */
	this.matrix = new Matrix3();
	this.matrix.identity();
	/**
	 * @member {Martrix3} inverseMatrix The RAS to IJK matrix
	 */
	/**
	 * @member {number} lowerThreshold The voxels with values under this threshold won't appear in the slices.
	 *                      If changed, geometryNeedsUpdate is automatically set to true on all the slices associated to this volume
	 */
	let lowerThreshold = - Infinity;
	Object.defineProperty(this, 'lowerThreshold', {
		get: function () {

			return lowerThreshold;

		},
		set: function (value) {

			lowerThreshold = value;
			this.sliceList.forEach(function (slice) {

				slice.geometryNeedsUpdate = true;

			});

		}
	});
	/**
	 * @member {number} upperThreshold The voxels with values over this threshold won't appear in the slices.
	 *                      If changed, geometryNeedsUpdate is automatically set to true on all the slices associated to this volume
	 */
	let upperThreshold = Infinity;
	Object.defineProperty(this, 'upperThreshold', {
		get: function () {

			return upperThreshold;

		},
		set: function (value) {

			upperThreshold = value;
			this.sliceList.forEach(function (slice) {

				slice.geometryNeedsUpdate = true;

			});

		}
	});


	/**
	 * @member {Array} sliceList The list of all the slices associated to this volume
	 */
	this.sliceList = [];


	/**
	 * @member {Array} RASDimensions This array holds the dimensions of the volume in the RAS space
	 */
	this.RASDimensions = [];
	/**
	 * @member {Array} overlays This array holds optional overlay Volumes
	 */
	this.overlays = [];
	/**
	 * @member {number} mixRatio visibility ratio of the main Volume image when compositing with overlays' image(s)
	 */
	this.mixRatio = 1;

	/**
	 * @member {IndexedColorEntry[]} colorTable optional color lookup table if volume contains indexed colors images.
	 */
	this.colorTable = undefined;
}

Volume.prototype = {

	constructor: Volume,

	/**
	 * @member {Function} getData Shortcut for data[access(i,j,k)]
	 * @memberof Volume
	 * @param {number} i    First coordinate
	 * @param {number} j    Second coordinate
	 * @param {number} k    Third coordinate
	 * @returns {number}  value in the data array
	 */
	getData: function (i, j, k) {

		return this.data[k * this.xLength * this.yLength + j * this.xLength + i];

	},

	/**
	 * @member {Function} access compute the index in the data array corresponding to the given coordinates in IJK system
	 * @memberof Volume
	 * @param {number} i    First coordinate
	 * @param {number} j    Second coordinate
	 * @param {number} k    Third coordinate
	 * @returns {number}  index
	 */
	access: function (i, j, k) {

		return k * this.xLength * this.yLength + j * this.xLength + i;

	},

	/**
	 * @member {Function} reverseAccess Retrieve the IJK coordinates of the voxel corresponding of the given index in the data
	 * @memberof Volume
	 * @param {number} index index of the voxel
	 * @returns {Array}  [x,y,z]
	 */
	reverseAccess: function (index) {

		const z = Math.floor(index / (this.yLength * this.xLength));
		const y = Math.floor((index - z * this.yLength * this.xLength) / this.xLength);
		const x = index - z * this.yLength * this.xLength - y * this.xLength;
		return [x, y, z];

	},

	/**
	 * @member {Function} map Apply a function to all the voxels, be careful, the value will be replaced
	 * @memberof Volume
	 * @param {Function} functionToMap A function to apply to every voxel, will be called with the following parameters :
	 *                                 value of the voxel
	 *                                 index of the voxel
	 *                                 the data (TypedArray)
	 * @param {Object}   context    You can specify a context in which call the function, default if this Volume
	 * @returns {Volume}   this
	 */
	map: function (functionToMap, context) {

		const length = this.data.length;
		context = context || this;

		for (let i = 0; i < length; i++) {

			this.data[i] = functionToMap.call(context, this.data[i], i, this.data);

		}

		return this;

	},

	/**
	 * @member {Function} extractPerpendicularPlane Compute the orientation of the slice and returns all the information relative to the geometry such as sliceAccess, the plane matrix (orientation and position in RAS coordinate) and the dimensions of the plane in both coordinate system.
	 * @memberof Volume
	 * @param {string}            axis  the normal axis to the slice 'x' 'y' or 'z'
	 * @param {number}            sliceRASIndex RAS index of the slice 
	 * @param {Matrix4}            mainVolMatrix matrix of the main volume this volume is overlayed on (undefined if this volume is not an overlay).
	 * @returns {Object} an object containing all the useful information on the geometry of the slice
	 */
	extractPerpendicularPlane: function (axis: string, sliceRASIndex: number, mainVolMatrix: THREE.Matrix4 | undefined) {

		//Note: slice RAS indexes are always increasing from L to R, P to A, I to S.
		//      (as opposed to IJK index which can increase in any direction depending on each NIfTI specifics)

		let volume = this;

		//volume IJK dimensions (number of slices)
		const dimensions = new Vector3(this.xLength, this.yLength, this.zLength);

		// slice image dimensions (in voxels)
		let iLength,
			jLength;

		//matrix applied to the geometry holding slice image to translate/rotate the slice at its correct location in RAS space
		let planeMatrix = new Matrix4();

		//plane dimension in RAS space (in mm)
		let planeWidth,
			planeHeight;

		//spacings of slices, along normal axis, and along i & j
		let normalSpacing,
			firstSpacing,
			secondSpacing;

		//position of the slice on its  axis (in RAS space)
		let positionOffset;

		//function that compute the index (in the volume single dimension data array) of the i,j voxel of this slice 
		let ij2PixelAccess: (i: number, j: number) => number;

		//with NRRD format, axes order is variable (unlike with NIfTI where it is always x, y, z), hence it need to be translated
		const axisInIJK = new Vector3();

		//normalized direction vector along i & j
		const firstDirection = new Vector3(),
			secondDirection = new Vector3();

		const rotationMatrix = volume.matrix;
		planeMatrix.extractRotation(rotationMatrix);

		//Note that matrix of overlay volume might be different from the main volume one, 
		//but overlay images are draw on same geometry of the main volume slice (which is transformed by main volume matrix)
		//Hence slice indexes must be adjusted to restore proper image and cancel effect of the transform
		const compMat = typeof mainVolMatrix !== 'undefined'
			?
			new Matrix4().extractRotation(mainVolMatrix).invert().multiply(planeMatrix)
			:
			new Matrix4()
			;


		//indicator set to true when ijk axis is reverse compared to RAS axis
		let reverseX: boolean, reverseY: boolean, reverseZ: boolean;

		switch (axis) {

			case 'x':
				//axisInIJK.set( 1, 0, 0 );
				//notice reversed direction for i & j 
				firstDirection.set(0, 0, - 1);
				secondDirection.set(0, - 1, 0);
				firstSpacing = this.spacing[this.axisOrder.indexOf('z')];
				secondSpacing = this.spacing[this.axisOrder.indexOf('y')];

				[reverseX, reverseY, reverseZ] = new Vector3(1, -1, -1).applyMatrix4(compMat).toArray().map(c => c < 0);
				ij2PixelAccess = (i, j) => volume.access(
					reverseX ? (volume.xLength - 1 - sliceRASIndex) : sliceRASIndex,
					reverseY ? (volume.yLength - 1 - j) : j,
					reverseZ ? (volume.zLength - 1 - i) : i
				);

				//rotate so the plane is orthogonal to X Axis
				planeMatrix.multiply((new Matrix4()).makeRotationY(Math.PI / 2));

				normalSpacing = this.spacing[this.axisOrder.indexOf('x')];
				//middle slice will be located at the origin 
				positionOffset = (volume.RASDimensions[0] - normalSpacing) / 2;
				planeMatrix.setPosition(new Vector3(sliceRASIndex * normalSpacing - positionOffset, 0, 0));
				break;

			case 'y':
				axisInIJK.set(0, 1, 0);
				firstDirection.set(1, 0, 0);
				secondDirection.set(0, 0, 1);
				firstSpacing = this.spacing[this.axisOrder.indexOf('x')];
				secondSpacing = this.spacing[this.axisOrder.indexOf('z')];

				reverseY = 0 >= new Vector3(1, 1, 1).applyMatrix4(rotationMatrix).getComponent(1);
				ij2PixelAccess = (i, j) => volume.access(
					i,
					reverseY ? (volume.yLength - 1 - sliceRASIndex) : sliceRASIndex,
					j
				);

				//rotate so the plane is orthogonal to Y Axis
				planeMatrix.multiply((new Matrix4()).makeRotationX(- Math.PI / 2));

				normalSpacing = this.spacing[this.axisOrder.indexOf('y')];
				//middle slice will be located at the origin 
				positionOffset = (volume.RASDimensions[1] - normalSpacing) / 2;
				planeMatrix.setPosition(new Vector3(0, sliceRASIndex * normalSpacing - positionOffset, 0));
				break;

			case 'z':
			default:
				//axisInIJK.set( 0, 0, 1 );
				firstDirection.set(1, 0, 0);
				//notice reversed direction for j 
				secondDirection.set(0, - 1, 0);
				firstSpacing = this.spacing[this.axisOrder.indexOf('x')];
				secondSpacing = this.spacing[this.axisOrder.indexOf('y')];

				[reverseX, reverseY, reverseZ] = new Vector3(1, -1, 1).applyMatrix4(compMat).toArray().map(c => c < 0);
				ij2PixelAccess = (i, j) => volume.access(
					reverseX ? (volume.xLength - 1 - i) : i,
					reverseY ? (volume.yLength - 1 - j) : j,
					reverseZ ? (volume.zLength - 1 - sliceRASIndex) : sliceRASIndex
				);

				//Note: by default, newly created plane is already orthogonal to Z Axis

				normalSpacing = this.spacing[this.axisOrder.indexOf('z')];
				//middle slice will be located at the origin 
				positionOffset = (volume.RASDimensions[2] - normalSpacing) / 2;
				//
				planeMatrix.setPosition(new Vector3(0, 0, sliceRASIndex * normalSpacing - positionOffset));

				break;

		}

		firstDirection.applyMatrix4(volume.inverseMatrix).normalize();
		secondDirection.applyMatrix4(volume.inverseMatrix).normalize();
		iLength = Math.floor(Math.abs(firstDirection.dot(dimensions)));
		jLength = Math.floor(Math.abs(secondDirection.dot(dimensions)));

		//plane dimension in RAS space
		planeWidth = Math.abs(iLength * firstSpacing);
		planeHeight = Math.abs(jLength * secondSpacing);

		return {
			// slice of the canvas to draw slice image
			iLength: iLength,
			jLength: jLength,

			// function to retrieve the absolute index of a voxel from its i,j coords in this slice 
			sliceAccess: ij2PixelAccess,

			// matrix to apply to the geometry holding slice image to locate it correctly in RAS space 
			matrix: planeMatrix,

			// size of the plane geometry holding the slice (size in RAS space)
			planeWidth: planeWidth,
			planeHeight: planeHeight
		};

	},

	/**
	 * @member {Function} extractSlice Returns a slice corresponding to the given axis and index
	 *                        The coordinate are given in the Right Anterior Superior coordinate format
	 * @memberof Volume
	 * @param {string}            axis  the normal axis to the slice 'x' 'y' or 'z'
	 * @param {number}            index the index of the slice
	 * @returns {VolumeSlice} the extracted slice
	 */
	extractSlice: function (axis, index) {

		const slice = new VolumeSlice(this, index, axis);
		this.sliceList.push(slice);
		return slice;

	},

	/**
	 * @member {Function} repaintAllSlices Call repaint on all the slices extracted from this volume
	 * @see VolumeSlice.repaint
	 * @memberof Volume
	 * @returns {Volume} this
	 */
	repaintAllSlices: function () {

		this.sliceList.forEach(function (slice) {

			slice.repaint();

		});

		return this;

	},

	/**
	 * @member {Function} computeMinMax Compute the minimum and the maximum of the data in the volume
	 * @memberof Volume
	 * @returns {Array} [min,max]
	 */
	computeMinMax: function () {

		let min = Infinity;
		let max = - Infinity;

		// buffer the length
		const datasize = this.data.length;

		let i = 0;

		for (i = 0; i < datasize; i++) {

			if (!isNaN(this.data[i])) {

				const value = this.data[i];
				min = Math.min(min, value);
				max = Math.max(max, value);

			}

		}

		this.min = min;
		this.max = max;

		return [min, max];

	}

};

export { Volume };
