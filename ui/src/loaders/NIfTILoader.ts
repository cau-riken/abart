import {
	FileLoader,
	Loader,
	LoadingManager,
	Matrix4,
	Vector4,
	Quaternion,
} from 'three';

//import { Volume } from 'three/examples/jsm/misc/Volume.js';
import { Volume } from '../misc/Volume';

import * as Nifti from "nifti-reader-js";

class NIfTILoader extends Loader {

	constructor(manager?: LoadingManager) {
		super(manager);
	}

	load(
		url: string,
		onLoad: (v: Volume) => void,
		onProgress?: (request: ProgressEvent) => void,
		onError?: (event: ErrorEvent) => void,
	) {

		const scope = this;

		const loader = new FileLoader(scope.manager);
		loader.setPath(scope.path);
		loader.setResponseType('arraybuffer');
		loader.setRequestHeader(scope.requestHeader);
		loader.setWithCredentials(scope.withCredentials);
		loader.load(url, function (data) {

			try {

				onLoad(scope.parse(data as ArrayBuffer, onError));

			} catch (e) {

				if (onError) {

					onError(e);

				} else {

					console.error(e);

				}

				scope.manager.itemError(url);

			}

		}, onProgress, onError);

	}

	parse(_data: ArrayBuffer, onError?: (event: ErrorEvent) => void): Volume {


		const getDataType = (dataTypeCode: number) => {


			switch (dataTypeCode) {
				case Nifti.NIFTI1.TYPE_UINT8:
					return Uint8Array;
				case Nifti.NIFTI1.TYPE_INT16:
					return Int16Array;
				case Nifti.NIFTI1.TYPE_INT32:
					return Int32Array;
				case Nifti.NIFTI1.TYPE_FLOAT32:
					return Float32Array;
				case Nifti.NIFTI1.TYPE_FLOAT64:
					return Float64Array;

				/*! 3x8 bytes. */
				//case Nifti.NIFTI1.TYPE_RGB24:
				//    return Int8Array;

				case Nifti.NIFTI1.TYPE_INT8:
					return Int8Array;
				case Nifti.NIFTI1.TYPE_UINT16:
					return Uint16Array;
				case Nifti.NIFTI1.TYPE_UINT32:
					return Uint32Array;

				/*! signed long long. */
				//case Nifti.NIFTI1.TYPE_INT64:
				//    return Float64Array;
				/*! unsigned long long. */
				//case Nifti.NIFTI1.TYPE_UINT64:
				//    return Float64Array;
				default:
					return null;


			}
		};


		// .. let's use the underlying array buffer
		let data = _data;
		let volume;

		if (Nifti.isCompressed(data)) {
			data = Nifti.decompress(data);
		}

		if (Nifti.isNIFTI(data)) {
			const niftiHeader = Nifti.readHeader(data);
			//console.log(niftiHeader);
			console.log(niftiHeader.toFormattedString());

			const qfac = niftiHeader.pixDims[0];
			let affine: Matrix4;
			//NIfTI header can specify affine in one of three ways
			//see https://nifti.nimh.nih.gov/pub/dist/src/niftilib/nifti1.h
			if (niftiHeader.qform_code === 0) {
				console.log('METHOD 1 - "old way"');
				const errorInitEvent: ErrorEventInit = {
					error: new Error('NIFTIParseError'),
					message: 'Unable to process this NIfTI file (METHOD 1, qform_code = 0)',
					lineno: 0,
					colno: 0,
					filename: ''
				};

				onError && onError(new ErrorEvent('NIFTILoadError', errorInitEvent));
				return;

			} else if (niftiHeader.qform_code > 0) {
				//the affine natrix is null, should use Q-form instead
				console.log('METHOD 2 - "normal" case');

				//FIXME not using a-form offsets : qoffset_x, qoffset_y, qoffset_z
				const [b, c, d] = [niftiHeader.quatern_b, niftiHeader.quatern_c, niftiHeader.quatern_d];
				const a = Math.sqrt(1.0 - (b * b + c * c + d * d))
				affine = new Matrix4().makeRotationFromQuaternion(new Quaternion(a, b, c, d));

			} else if (niftiHeader.sform_code > 0) {
				console.log("METHOD 3");

				//FIXME identity matrix for now
				affine = new Matrix4();
				{
					//apply mirroring if necessary
					const i = niftiHeader.affine[0][0];
					const j = niftiHeader.affine[1][1];
					const k = niftiHeader.affine[2][2];

					affine.set(
						Math.sign(i), 0, 0, 0,
						0, Math.sign(j), 0, 0,
						0, 0, Math.sign(k), 0,
						0, 0, 0, 1);
				}

			} else {
				//should not happen
				const errorInitEvent: ErrorEventInit = {
					error: new Error('NIFTIParseError'),
					message: 'Unable to process this NIfTI file',
					lineno: 0,
					colno: 0,
					filename: ''
				};

				onError && onError(new ErrorEvent('NIFTILoadError', errorInitEvent));
				return;
			}


			const niftiImage = Nifti.readImage(niftiHeader, data);
			/*
			if (Nifti.hasExtension(niftiHeader)) {
				const niftiExt = Nifti.readExtensionData(niftiHeader, data);
			}
			*/

			/*
						console.debug("Units Code = " + niftiHeader.xyzt_units
							+ " (" + niftiHeader.getUnitsCodeString(Nifti.NIFTI1.SPATIAL_UNITS_MASK & niftiHeader.xyzt_units)
							+ ", " + niftiHeader.getUnitsCodeString(Nifti.NIFTI1.TEMPORAL_UNITS_MASK & niftiHeader.xyzt_units) + ")\n");
			*/

			volume = new Volume();

			const datatype = getDataType(niftiHeader.datatypeCode);
			if (datatype) {
				volume.datatype = datatype;
				volume.data = new datatype(niftiImage);

				// get the min and max intensities
				const min_max = volume.computeMinMax();
				const min = min_max[0];
				const max = min_max[1];
				volume.min = min;
				volume.max = max;
				// attach the scalar range to the volume
				volume.windowLow = min;
				volume.windowHigh = max;

				// get the image dimensions

				//FIXME only space dimension
				const nbDimension = Math.min(niftiHeader.dims[0], 3)
				//FIXME Assume 3 space dimensions here...
				volume.dimensions = [niftiHeader.dims[1], niftiHeader.dims[2], niftiHeader.dims[3]];
				volume.xLength = volume.dimensions[0];
				volume.yLength = volume.dimensions[1];
				volume.zLength = volume.dimensions[2];

				// axis order fixed in nifti
				volume.axisOrder = ['x', 'y', 'z'];

				//--------------------------------------
				// FIXME: for this prototype, let's assume IJK and RAS are identical for now...

				// spacing
				/*
				const spacingX = niftiHeader.pixDims[1];
				const spacingY = niftiHeader.pixDims[2];
				const spacingZ = niftiHeader.pixDims[3];
				volume.spacing = [spacingX, spacingY, spacingZ];
				*/

				volume.spacing = [1, 1, 1];

				// IJK to RAS and invert
				volume.matrix = affine;

				volume.inverseMatrix = volume.matrix.clone().invert();

				volume.RASDimensions = new Vector4(volume.xLength, volume.yLength, volume.zLength, 0)
					.applyMatrix4(volume.matrix)
					.round().toArray().map(Math.abs).slice(0, 3);


				//FIXME volume.offset seems to be unused 


				// .. and set the default threshold
				// only if the threshold was not already set
				if (volume.lowerThreshold === - Infinity) {
					volume.lowerThreshold = min;
				}

				if (volume.upperThreshold === Infinity) {
					volume.upperThreshold = max;
				}


			}

		}
		return volume;
	}


}


export { NIfTILoader };
