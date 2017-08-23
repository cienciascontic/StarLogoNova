/* asset_create.js
 *
 * Front-end Javascript related to asset uploading and previewing
 *
 * Dependencies:
 * 	- sb.WebLogoDemo
 *	- jQuery
 */

// List of 3D model formats supported.
const SUPPORTED_MODEL_FORMATS = ["dae", "obj"];

// List of image formats supported for 3D model textures. Please add file extensions to this list if you
// notice something is missing.
const SUPPORTED_IMAGE_FORMATS = ["jpeg", "jpg", "png", "tif", "tiff", "gif", "bmp"];

// File extension for files encoding transformations to bake into loaded model.
const TRANSFORM_FILE_EXTENSION = "slb"; 


var uploadAndPreviewAssets = function() {
	
	// For model upload progress bar:
	const UNZIP_PERCENTAGE = 80;
	const TEXTURE_PERCENTAGE = 20;
	
	var step_total = UNZIP_PERCENTAGE;
	var totalProgress = 0;
	function updateProgress(evt) {
		if (evt.lengthComputable) 
	   {
	     var percentComplete = (evt.loaded / evt.total)*step_total;  
	     document.getElementById("modelindicator").style.width = (totalProgress + percentComplete) + "px";
	   } 
	}
	
	const PREVIEW_CACHE_PREFIX = "Preview/"; // Prefix for url to populate cache with when displaying models with previewer.
	
	var assetFormModelViewer = null; // Reference to ModelViewer for previewing assets during asset creation is 
									 // initialized the first time it is used so that it can properly insert into
									 // the preview div.
	var assetZip = null; // Hold onto zipManager for current uploaded asset so that we can add the transfrom file later if 
						 // they end up submitting it to s3.
	var lastCacheEntries = []; // Holds onto last files put into THREE.Cache so the previewer can get rid of it once its done.

	var groundOffset = 0; // Used in slb generation to get model to render properly at ground level (z=0) according to user preference.

	// Setup previewer in popup for uploading model asset.
	$("#asset_file").change(
			function ()
			{
				console.log("asset file changed");
				
				if (assetFormModelViewer)
				{
					assetFormModelViewer.resetCamera();
					assetFormModelViewer.clearModel(true);
					assetFormModelViewer.toggleInvertedLighting(false);
					assetFormModelViewer.resetOffsets();
					groundOffset = 0;
				}
				else
				{
					assetFormModelViewer = new ModelViewer("shapePreview");
					assetFormModelViewer.toggleCameraControls(false);
					assetFormModelViewer.toggleSizingBox(false);
				}
				
				document.getElementById("modelindicator").style.width = "0px";
				totalProgress = 0;
				step_total = UNZIP_PERCENTAGE;
				document.getElementById("modelloadinglabel").innerHTML = "Unloading files...";
				document.getElementById("loadingModel").style.display = "block";
				
				assetZip = new StarLogoZipManager($("#asset_file")[0].files[0], 
						function ()
						{	
							document.getElementById("modelloadinglabel").innerHTML = "Loading textures...";
							document.getElementById("modelindicator").style.width = UNZIP_PERCENTAGE+"px";
							totalProgress = UNZIP_PERCENTAGE;
							step_total = TEXTURE_PERCENTAGE;
							
							THREE.Cache.enabled = true;
							for (entry of lastCacheEntries)
								THREE.Cache.remove(entry);
							lastCacheEntries = [];
							
							var filenames = assetZip.getFilenames();
		
							var geometryFileURL = null;
							var imageFilenames = [];
							for (filename of filenames)
							{
								lastCacheEntries.push(PREVIEW_CACHE_PREFIX+filename);
								
								var extension = assetZip.getFileExtension(filename);
								if (SUPPORTED_IMAGE_FORMATS.indexOf(extension) > -1)
									imageFilenames.push(filename);
								else 
								{
									THREE.Cache.add(PREVIEW_CACHE_PREFIX+filename, assetZip.getFile(filename));
		
									// Hold onto URL for file to be passed to the loader.
									if (SUPPORTED_MODEL_FORMATS.indexOf(extension) > -1)
										geometryFileURL = PREVIEW_CACHE_PREFIX+filename;
									
									// If model already has a transform file, move camera to display it already in correct orientation.
									if (extension == TRANSFORM_FILE_EXTENSION)
										assetFormModelViewer.rotateCameraUp(-RIGHT_ANGLE);
								}
							}
		
							// If there were no textures associated with the file, then go ahead and start loading the model.
							if (imageFilenames.length == 0)
							{
								document.getElementById("modelloadinglabel").innerHTML = "Creating Model...";
								document.getElementById("modelindicator").style.width = "100px";
								assetFormModelViewer.loadModelFromURL(geometryFileURL, function () { 
										document.getElementById("loadingModel").style.display = "none"; 
										var dimensions = assetFormModelViewer.getModelDimensions();
										assetFormModelViewer.setModelOffset([0,0,-0.5*dimensions[2]]);
										snapToGround(); 
										assetFormModelViewer.toggleSizingBox(true);
									});
							}
							
							// Otherwise need to wait till last image is loaded before creating the FileModel.
							else
							{
								for (var i = 0; i < imageFilenames.length; i++)
								{
									var imageDataUrl = "data:image/" + assetZip.getFileExtension(imageFilenames[i]) + 
										";base64," + assetZip.getFile(imageFilenames[i]);
									var image = new Image();
									image.src = imageDataUrl;
									THREE.Cache.add(PREVIEW_CACHE_PREFIX+imageFilenames[i], image);
									if (i == imageFilenames.length - 1) 
									{
										var loadGeoScope = { modelViewer: assetFormModelViewer };
										var loadGeo = function () { 
											document.getElementById("modelloadinglabel").innerHTML = "Creating Model...";
											document.getElementById("modelindicator").style.width = "100px";
											this.modelViewer.loadModelFromURL(geometryFileURL,function () { 
												document.getElementById("loadingModel").style.display = "none"; 
												var dimensions = assetFormModelViewer.getModelDimensions();
												assetFormModelViewer.setModelOffset([0,0,-0.5*dimensions[2]]);
												snapToGround();
												assetFormModelViewer.toggleSizingBox(true);
											});
										}.bind(loadGeoScope);
										image.onload = loadGeo;
										
										var onErrorScope = { filename: imageFilenames[i] };
										image.onerror =  function () {
											console.log("Attempt to load image file type unsupported on browser: ", 
													this.filename);
											var canvas = document.createElement("canvas");
											canvas.width = 64;
											canvas.height = 64;
											var context = canvas.getContext("2d");
											context.fillStyle = "white";
											context.fillRect(0, 0, canvas.width, canvas.height);
											
											var replacementImage = new Image();
											replacementImage.src = canvas.toDataURL("image/png");
											THREE.Cache.add(PREVIEW_CACHE_PREFIX+this.filename, replacementImage);
											replacementImage.onload = loadGeo;
										}.bind(onErrorScope);
									}
								}
							}
						}, updateProgress);
			});
	
	// Controls for letting user correct orientation, placement, and size of uploaded models:
	
	const RIGHT_ANGLE = 90;
	const DEGREES_TO_RADIANS = Math.PI/180.0;
	const RADIANS_TO_DEGREES = 180.0/Math.PI;
	
	// Snaps the angle to the closest match between 0, 90, 280, and 270. Must be in degrees.
	function snapAngle(angleDegrees) 
	{
		angleDegrees = angleDegrees % 360;
		if (angleDegrees < 0)
			angleDegrees += 360;
		
		if (angleDegrees >= 0 && angleDegrees < 90) // Quadrant I
		{
			if (angleDegrees < Math.abs(angleDegrees-90))
				return 0;
			else
				return 90;
		}
		else if (angleDegrees >= 90 && angleDegrees < 180) // Quadrant II
		{
			if (Math.abs(angleDegrees-90) < Math.abs(angleDegrees-180))
				return 90;
			else
				return 180;
		}
		else if (angleDegrees >= 180 && angleDegrees < 270) // Quadrant III
		{
			if (Math.abs(angleDegrees-180) < Math.abs(angleDegrees-270))
				return 180;
			else
				return 270;
		}
		else // Quadrant IV
		{
			if (Math.abs(angleDegrees-270) < Math.abs(angleDegrees-360))
				return 270;
			else
				return 0;
		}
	}
	
	
	// Helper function determines which axis a THREE.Vector3 is closest to aligning with.
	function snapToAxis (vector3)
	{
		if (Math.abs(vector3.x) > Math.abs(vector3.y) && 
				Math.abs(vector3.x) > Math.abs(vector3.z))
		{
			if (vector3.x > 0)
				return new THREE.Vector3(1, 0, 0);
			else
				return new THREE.Vector3(-1, 0, 0);
		}
		else if (Math.abs(vector3.y) > Math.abs(vector3.x) && 
				Math.abs(vector3.y) > Math.abs(vector3.z))
		{
			if (vector3.y > 0)
				return new THREE.Vector3(0, 1, 0);
			else
				return new THREE.Vector3(0, -1, 0);
		}
		else
		{
			if (vector3.z > 0)
				return new THREE.Vector3(0, 0, 1);
			else
				return new THREE.Vector3(0, 0, -1);
		}
	}
	
	
	// Helper function to snap model to ground level plus its current ground level offset.
	function snapToGround () 
	{
		function directionToOffset (direction)
		{
			var dimensions = assetFormModelViewer.getModelDimensions();
			
			var offset = new THREE.Vector3(direction.x*(1-dimensions[0]), 
					direction.y*(1-dimensions[1]), direction.z*(1-dimensions[2]));
			offset.multiplyScalar(0.5);
			
			return offset;
		}
		
		var snappedTheta = snapAngle(assetFormModelViewer.getCameraTheta());
		var snappedPhi = snapAngle(assetFormModelViewer.getCameraPhi());
		var snappedSpin = snapAngle(assetFormModelViewer.getCameraSpin());
		
		var toGround = new THREE.Vector3(0, -1, 0);
		var toCamera = new THREE.Vector3();
		toCamera.fromArray(assetFormModelViewer.getCameraPosition());
		toCamera.normalize();
		
		var toGroundRotation = new THREE.Quaternion();
		toGroundRotation.setFromAxisAngle(toCamera, snappedSpin*DEGREES_TO_RADIANS);
		
		if (snappedPhi == 0)
		{
			toGround = new THREE.Vector3(0, 0, 1);
			toGroundRotation.setFromAxisAngle(toCamera, (snappedSpin-snappedTheta)*DEGREES_TO_RADIANS);
			console.log(snappedSpin);
			console.log(snappedTheta);
		}
		else if (snappedPhi == 180)
		{
			toGround = new THREE.Vector3(0, 0, -1);
			toGroundRotation.setFromAxisAngle(toCamera, (snappedSpin+snappedTheta)*DEGREES_TO_RADIANS);
			console.log(snappedSpin);
			console.log(snappedTheta);
		}
		
		toGround.applyQuaternion(toGroundRotation);
		toGround = snapToAxis(toGround);
		
		var boxOffset = directionToOffset(toGround);
		boxOffset.negate();
		var userOffset = snapToAxis(boxOffset);
		userOffset.multiplyScalar(groundOffset);
		boxOffset.add(userOffset);
		
		assetFormModelViewer.setSizingBoxOffset(boxOffset.toArray());
	}
	
	
	// Rotate up arrow.
	$("#rotateUp").click( 
			function() {
				// Camera spin snapped to closest angle among 0, 90, 180, and 270 degrees.
				var snappedCameraSpin = snapAngle(assetFormModelViewer.getCameraSpin());
				var snappedPhi = snapAngle(assetFormModelViewer.getCameraPhi());
				
				if (snappedCameraSpin == 0)
				{
					if (snappedPhi == 0)
					{
						assetFormModelViewer.rotateCameraLeft(2*RIGHT_ANGLE);
						assetFormModelViewer.rotateCameraUp(-RIGHT_ANGLE);
						assetFormModelViewer.spinCameraCCW(2*RIGHT_ANGLE);
					}
					else
						assetFormModelViewer.rotateCameraUp(RIGHT_ANGLE);
				}
				else if (snappedCameraSpin == 90)
				{
					assetFormModelViewer.rotateCameraLeft(RIGHT_ANGLE);
					if (snappedPhi == 0)
					{
						assetFormModelViewer.rotateCameraUp(-RIGHT_ANGLE);
						assetFormModelViewer.spinCameraCCW(RIGHT_ANGLE);
					}
					else if (snappedPhi == 180)
					{
						assetFormModelViewer.rotateCameraUp(RIGHT_ANGLE);
						assetFormModelViewer.spinCameraCCW(-RIGHT_ANGLE);
					}
				}
				else if (snappedCameraSpin == 180)
				{
					if (snappedPhi == 180)
					{
						assetFormModelViewer.rotateCameraLeft(2*RIGHT_ANGLE);
						assetFormModelViewer.rotateCameraUp(RIGHT_ANGLE);
						assetFormModelViewer.spinCameraCCW(2*RIGHT_ANGLE);
					}
					else
						assetFormModelViewer.rotateCameraUp(-RIGHT_ANGLE);
				}
				else
				{
					assetFormModelViewer.rotateCameraLeft(-RIGHT_ANGLE);
					if (snappedPhi == 0)
					{
						assetFormModelViewer.rotateCameraUp(-RIGHT_ANGLE);
						assetFormModelViewer.spinCameraCCW(-RIGHT_ANGLE);
					}
					else if (snappedPhi == 180)
					{
						assetFormModelViewer.rotateCameraUp(RIGHT_ANGLE);
						assetFormModelViewer.spinCameraCCW(RIGHT_ANGLE);
					}
				}
				
				snapToGround();
			});
	
	// Rotate down arrow.
	$("#rotateDown").click( 
			function() {
				// Camera spin snapped to closest angle among 0, 90, 180, and 270 degrees.
				var snappedCameraSpin = snapAngle(assetFormModelViewer.getCameraSpin());
				var snappedPhi = snapAngle(assetFormModelViewer.getCameraPhi());
				
				if (snappedCameraSpin == 0)
				{
					if (snappedPhi == 180)
					{
						assetFormModelViewer.rotateCameraLeft(2*RIGHT_ANGLE);
						assetFormModelViewer.rotateCameraUp(RIGHT_ANGLE);
						assetFormModelViewer.spinCameraCCW(2*RIGHT_ANGLE);
					}
					else
						assetFormModelViewer.rotateCameraUp(-RIGHT_ANGLE);
				}
				else if (snappedCameraSpin == 90)
				{
					assetFormModelViewer.rotateCameraLeft(-RIGHT_ANGLE);
					if (snappedPhi == 0)
					{
						assetFormModelViewer.rotateCameraUp(-RIGHT_ANGLE);
						assetFormModelViewer.spinCameraCCW(-RIGHT_ANGLE);
					}
					else if (snappedPhi == 180)
					{
						assetFormModelViewer.rotateCameraUp(RIGHT_ANGLE);
						assetFormModelViewer.spinCameraCCW(RIGHT_ANGLE);
					}
				}
				else if (snappedCameraSpin == 180)
				{
					if (snappedPhi == 0)
					{
						assetFormModelViewer.rotateCameraLeft(2*RIGHT_ANGLE);
						assetFormModelViewer.rotateCameraUp(-RIGHT_ANGLE);
						assetFormModelViewer.spinCameraCCW(2*RIGHT_ANGLE);
					}
					else
						assetFormModelViewer.rotateCameraUp(RIGHT_ANGLE);
				}
				else
				{
					assetFormModelViewer.rotateCameraLeft(RIGHT_ANGLE);
					if (snappedPhi == 0)
					{
						assetFormModelViewer.rotateCameraUp(-RIGHT_ANGLE);
						assetFormModelViewer.spinCameraCCW(RIGHT_ANGLE);
					}
					else if (snappedPhi == 180)
					{
						assetFormModelViewer.rotateCameraUp(RIGHT_ANGLE);
						assetFormModelViewer.spinCameraCCW(-RIGHT_ANGLE);
					}
				}
				
				snapToGround();
			});
	
	// Rotate right arrow.
	$("#rotateRight").click( 
			function() {
				// Camera spin snapped to closest angle among 0, 90, 180, and 270 degrees.
				var snappedCameraSpin = snapAngle(assetFormModelViewer.getCameraSpin());
				var snappedPhi = snapAngle(assetFormModelViewer.getCameraPhi());
				
				if (snappedCameraSpin == 0)
				{
					assetFormModelViewer.rotateCameraLeft(-RIGHT_ANGLE);
					if (snappedPhi == 0)
					{
						assetFormModelViewer.rotateCameraUp(-RIGHT_ANGLE);
						assetFormModelViewer.spinCameraCCW(-RIGHT_ANGLE);
					}
					else if (snappedPhi == 180)
					{
						assetFormModelViewer.rotateCameraUp(RIGHT_ANGLE);
						assetFormModelViewer.spinCameraCCW(RIGHT_ANGLE);
					}
				}
				else if (snappedCameraSpin == 90)
				{
					if (snappedPhi == 0)
					{
						assetFormModelViewer.rotateCameraLeft(2*RIGHT_ANGLE);
						assetFormModelViewer.rotateCameraUp(-RIGHT_ANGLE);
						assetFormModelViewer.spinCameraCCW(2*RIGHT_ANGLE);
					}
					else
						assetFormModelViewer.rotateCameraUp(RIGHT_ANGLE);
				}
				else if (snappedCameraSpin == 180)
				{
					assetFormModelViewer.rotateCameraLeft(RIGHT_ANGLE);
					if (snappedPhi == 0)
					{
						assetFormModelViewer.rotateCameraUp(-RIGHT_ANGLE);
						assetFormModelViewer.spinCameraCCW(RIGHT_ANGLE);
					}
					else if (snappedPhi == 180)
					{
						assetFormModelViewer.rotateCameraUp(RIGHT_ANGLE);
						assetFormModelViewer.spinCameraCCW(-RIGHT_ANGLE);
					}
				}
				else
				{
					if (snappedPhi == 180)
					{
						assetFormModelViewer.rotateCameraLeft(2*RIGHT_ANGLE);
						assetFormModelViewer.rotateCameraUp(RIGHT_ANGLE);
						assetFormModelViewer.spinCameraCCW(2*RIGHT_ANGLE);
					}
					else
						assetFormModelViewer.rotateCameraUp(-RIGHT_ANGLE);
				}
				
				snapToGround();
			});
	
	// Rotate left arrow.
	$("#rotateLeft").click( 
			function() {
				// Camera spin snapped to closest angle among 0, 90, 180, and 270 degrees.
				var snappedCameraSpin = snapAngle(assetFormModelViewer.getCameraSpin());
				var snappedPhi = snapAngle(assetFormModelViewer.getCameraPhi());
				
				if (snappedCameraSpin == 0)
				{
					assetFormModelViewer.rotateCameraLeft(RIGHT_ANGLE);
					if (snappedPhi == 0)
					{
						assetFormModelViewer.rotateCameraUp(-RIGHT_ANGLE);
						assetFormModelViewer.spinCameraCCW(RIGHT_ANGLE);
					}
					else if (snappedPhi == 180)
					{
						assetFormModelViewer.rotateCameraUp(RIGHT_ANGLE);
						assetFormModelViewer.spinCameraCCW(-RIGHT_ANGLE);
					}
				}
				else if (snappedCameraSpin == 90)
				{
					if (snappedPhi == 180)
					{
						assetFormModelViewer.rotateCameraLeft(2*RIGHT_ANGLE);
						assetFormModelViewer.rotateCameraUp(RIGHT_ANGLE);
						assetFormModelViewer.spinCameraCCW(2*RIGHT_ANGLE);
					}
					else
						assetFormModelViewer.rotateCameraUp(-RIGHT_ANGLE);
				}
				else if (snappedCameraSpin == 180)
				{
					assetFormModelViewer.rotateCameraLeft(-RIGHT_ANGLE);
					if (snappedPhi == 0)
					{
						assetFormModelViewer.rotateCameraUp(-RIGHT_ANGLE);
						assetFormModelViewer.spinCameraCCW(-RIGHT_ANGLE);
					}
					else if (snappedPhi == 180)
					{
						assetFormModelViewer.rotateCameraUp(RIGHT_ANGLE);
						assetFormModelViewer.spinCameraCCW(RIGHT_ANGLE);
					}
				}
				else
				{
					if (snappedPhi == 0)
					{
						assetFormModelViewer.rotateCameraLeft(2*RIGHT_ANGLE);
						assetFormModelViewer.rotateCameraUp(-RIGHT_ANGLE);
						assetFormModelViewer.spinCameraCCW(2*RIGHT_ANGLE);
					}
					else
						assetFormModelViewer.rotateCameraUp(RIGHT_ANGLE);
				}
				
				snapToGround();
			});
	
	// Spin right.
	$("#spinCW").click( 
			function() {
				assetFormModelViewer.spinCameraCCW(RIGHT_ANGLE); // More intuitive for model to rotate CW than camera.
				snapToGround();
			});
	
	// Spin left.
	$("#spinCCW").click( 
			function() {
				assetFormModelViewer.spinCameraCCW(-RIGHT_ANGLE);  // More intuitive for model to rotate CCW than camera.
				snapToGround();
			});
	
	const SIZE_INCREMENT = 0.01; // Controls how much user can adjust scale of model with each button press.
	
	// Enlarge.
	$("#enlarge").click(
			function() {
				assetFormModelViewer.enlargeModel(SIZE_INCREMENT);
				snapToGround();
			});
	
	// Shrink.
	$("#shrink").click(
			function() {
				assetFormModelViewer.enlargeModel(-SIZE_INCREMENT);
				snapToGround();
			});
	
	const OFFSET_INCREMENT = 0.01; // Controls how much user can adjust ground level height of model with each button press.
	
	// Shift up.
	$("#translateUp").click(
			function() {
				groundOffset += OFFSET_INCREMENT;
				snapToGround();
			});
	
	// Shift down.
	$("#translateDown").click(
			function() {
				groundOffset -= OFFSET_INCREMENT;
				snapToGround();
			});
	
	
	// Invert lighting.
	$("#flipNormals").click(
			function() {
				assetFormModelViewer.toggleInvertedLighting(!assetFormModelViewer.invertLight);
			});
	
	
	const TRANSFORM_FILE_HEADER = ""; // Not sure what should go in here, since some old slb files don't
	   					   			  // have headers and others say StarLogoTNG at the top.
	// Finds rotations to pack into the transform file given the camera's orientation for the asset previewer and returns
	// the appropritate transform file content.
	function generateTransformFile()
	{
		var theta = snapAngle(assetFormModelViewer.getCameraTheta());
		var phi = snapAngle(assetFormModelViewer.getCameraPhi());
		var spin = snapAngle(assetFormModelViewer.getCameraSpin());
		
		
		// First determine rotation due to theta and phi coordinates of the camera using euler angles.
		var xRot = 0;
		
		if (phi == 0)
			xRot = Math.PI/2;
		else if (phi == 180)
			xRot = -Math.PI/2;
		
		var thetaPhiRotation = new THREE.Euler(xRot, -theta*DEGREES_TO_RADIANS, 0, "XYZ");
		
		// Now determine the rotation due to spin of camera using euler angles.
		var cameraPosition = assetFormModelViewer.getCameraPosition();
		var spinRotation = null;
		// Rotate about x-axis.
		if (Math.abs(cameraPosition[0]) > Math.abs(cameraPosition[1]) && 
				Math.abs(cameraPosition[0]) > Math.abs(cameraPosition[2]))
		{
			if (cameraPosition[0] > 0)
				spinRotation = new THREE.Euler(-spin*DEGREES_TO_RADIANS, 0, 0, "XYZ");
			else
				spinRotation = new THREE.Euler(spin*DEGREES_TO_RADIANS, 0, 0, "XYZ");
		}
		else if (Math.abs(cameraPosition[1]) > Math.abs(cameraPosition[0]) && 
				Math.abs(cameraPosition[1]) > Math.abs(cameraPosition[2]))
		{
			if (cameraPosition[1] > 0)
				spinRotation = new THREE.Euler(0, -spin*DEGREES_TO_RADIANS, 0, "YXZ");
			else
				spinRotation = new THREE.Euler(0, spin*DEGREES_TO_RADIANS, 0, "YXZ");
		}
		else
		{
			if (cameraPosition[2] > 0)
				spinRotation = new THREE.Euler(0, 0, -spin*DEGREES_TO_RADIANS, "ZXY");
			else
				spinRotation = new THREE.Euler(0, 0, spin*DEGREES_TO_RADIANS, "ZXY");
		}
		
		// Last rotation is to transform from ModelViewer space to Spaceland space.
		var previewToSpaceland = new THREE.Euler(Math.PI/2, 0, 0, "XYZ");
		
		
		// Convert to matrices and concatenate rotations.
		var thetaPhiMatrix = new THREE.Matrix4();
		thetaPhiMatrix.makeRotationFromEuler(thetaPhiRotation);
		var spinMatrix = new THREE.Matrix4();
		spinMatrix.makeRotationFromEuler(spinRotation);
		var previewToSpacelandMatrix = new THREE.Matrix4();
		previewToSpacelandMatrix.makeRotationFromEuler(previewToSpaceland);
		
		var concatenatedMatrices = spinMatrix.clone();
		concatenatedMatrices.multiply(thetaPhiMatrix);
		concatenatedMatrices.multiply(previewToSpacelandMatrix);
		
		// Convert concatenated rotations back into euler angles.
		var fullTransformEuler = new THREE.Euler();
		fullTransformEuler.setFromRotationMatrix(concatenatedMatrices, "XYZ");
		
		// Get size to scale model by from the model viewer.
		var scale = assetFormModelViewer.getModelScale();
		
		
		// Use combined rotations, model scale, and ground offset to create transform file contents.
		var rotationContent = "\nrotate "+snapAngle(fullTransformEuler.x*RADIANS_TO_DEGREES)+" "+
		snapAngle(fullTransformEuler.y*RADIANS_TO_DEGREES)+" "+snapAngle(fullTransformEuler.z*RADIANS_TO_DEGREES);
		
		var scalingContent = "\nscale "+scale+" "+scale+" "+scale;
		
		var translateContent = "\ntranslate 0 0 "+(groundOffset);
		
		var transFileContent = TRANSFORM_FILE_HEADER+rotationContent+scalingContent+translateContent;
		
		if (assetFormModelViewer.invertLight)
			transFileContent += "\ninvert";
		return transFileContent;
	}
	
	// Add transform file to zip, send the asset zip to S3, and close the popup.
	$("#asset-form-inline").on('submit', function() {
		if ($('#asset_title').val() !== "") {
		if ($("#asset_file")[0].files[0] !== undefined) {
			if ($("#asset_thumbnail")[0].files[0] !== undefined) {
				alert("Your asset has been saved!");
				popup('createAsset', true);

				popup('loadingAsset', true);
				
				// Create transform file and add it to the zip.
				var transFileContent = generateTransformFile(); 
				var transFilename = "";
				var hasTransFile = false;
				for (filename of assetZip.getFilenames())
				{
					if (SUPPORTED_MODEL_FORMATS.lastIndexOf(assetZip.getFileExtension(filename)) > -1)
					{
						var index = filename.lastIndexOf(".");
						transFilename = filename.slice(0, index)+"."+TRANSFORM_FILE_EXTENSION;
						if (index == -1)
							transFilename = filename+"."+TRANSFORM_FILE_EXTENSION;
					}
					if (assetZip.getFileExtension(filename) == TRANSFORM_FILE_EXTENSION)
						hasTransFile = true;
				}

				//console.log($('#assetformid').serialize());
				var to = userUrl + "newasset/";
				var data1 = $('#assetformid').serialize();

				// Only upload our generated transform file if the model does not already have one.
				var fileobject = $("#asset_file")[0].files[0];
				if (!hasTransFile)
				{
					if (!assetZip.addFile(transFilename, transFileContent)) 
						console.log("Failed to add transform file to uploaded asset!");
					else
						fileobject = assetZip.getZip();
				}
				var thumbnail = $("#asset_thumbnail")[0];

				//readFile($("#asset_file")[0].files[0]); // uncomment to print the contents of the file to the console

				// create a form with a couple of values
				var form = new FormData(document.forms.namedItem('assetform'));
				form.append("file", fileobject);
				form.append("thumbnail", thumbnail.files[0]);
				form.append("tags", Object.keys(assetTags));
				form.append("type", "3D Model");
				// Object.keys returns a list but Python receives as a string so cannot send anything with a comma in it
				console.log("FORM:", form);

				// send via XHR
				var xhr = new XMLHttpRequest();
				xhr.onload = function() {
					console.log("Upload complete.");
				};
				xhr.open("POST", to, true);
				xhr.onreadystatechange = function() {
					if (xhr.readyState == 4 && xhr.status == 200) {
						popup('loadingAsset', true);
						try {
							document.getElementById('assetsAvailable').innerHTML = xhr.responseText + document.getElementById('assetsAvailable').innerHTML;
						}
						catch(err) {
						}
					}
				};
				xhr.send(form);

				document.getElementById("assetformid").reset();
				assetTags = {};
				$('#all_asset_tags').empty();
				
				assetFormModelViewer.clearModel(true);
				assetFormModelViewer.toggleSizingBox(false);
			} else {
				alert("You have not selected a thumbnail image!");
			}
		} else {
			alert("You have not selected a file!");
		}
		} else {
			alert("Please title your asset!");
		}
		return false;
	});
	

	// Add the asset tag when the Add button is clicked.
	$('#add_asset_tag').click(function() {
		addAssetTag();
	});
	
	$('#add_sound_tag').click(function() {
		addSoundTag();
	});

	// Add the asset tag when Enter is pressed in the input area.
	$('#asset_tags').keydown(function(e) {
		if (e.keyCode == 13) {
			e.preventDefault();
			addAssetTag();
		}
	});
	
	$('#sound_tags').keydown(function(e) {
		if (e.keyCode == 13) {
			e.preventDefault();
			addSoundTag();
		}
	});
	
	
};



/* readFile
 *
 * Log the contents of the file.
 *
 * Required:
 *	[0] file - the file to be read
 *
 * Returns: None
 */
function readFile(file) {
	var read = new FileReader();
	read.onloadend = function() {
		console.log(read.result);
	};
	read.readAsBinaryString(file);
}

var assetTags = {};
var soundTags = {};

/* addAssetTag
 *
 * Add the asset tag to the assetTags object and update the HTML.
 *
 * Required: None
 *
 * Returns: None
 */
function addAssetTag() {
	var tagName = $('#asset_tags').val().trim();
	
	if (tagName) {
		assetTags[tagName] = tagName;
		$('#all_asset_tags').append('<div class="asset_tag_item"><a onclick="searchAssetTag(this);">' + tagName + '</a><div class="remove_asset_tag" onclick="removeAssetTag(this)">x</div></div>');
		$('#asset_tags').val('');
	}
}

function addSoundTag() {
	var tagName = $('#sound_tags').val().trim();
	
	if (tagName) {
		assetTags[tagName] = tagName;
		$('#all_sound_tags').append('<div class="asset_tag_item"><a>' + tagName + '</a><div class="remove_asset_tag" onclick="removeSoundTag(this)">x</div></div>');
		$('#sound_tags').val('');
	}
}

/* removeAssetTag
 *
 * Remove the asset tag from the assetTags object and update the HTML.
 *
 * Required:
 *	[0] div (HTML element) - the div that was clicked
 *
 * Returns: None
 */
function removeAssetTag(div) {
	delete assetTags[div.parentNode.childNodes[0].innerHTML];
	document.getElementById('all_asset_tags').removeChild(div.parentNode);
}

function removeSoundTag(div) {
	delete soundTags[div.parentNode.childNodes[0].innerHTML];
	document.getElementById('all_sound_tags').removeChild(div.parentNode);
}

/* searchAssetTag
 *
 * Search the asset tag and update the HTML with the results.
 *
 * Required:
 *	[0] tag (HTML element) - the tag div that was clicked
 *
 * Returns: None
 */
function searchAssetTag(tag) {
	var tagName = tag.innerHTML;
	var query = tagName.split(' ').join('+');
	var url = "/assetsearch?category=Tags&q=" + query;
	var xhr = new XMLHttpRequest();
	xhr.open("GET", url, true);
	xhr.onreadystatechange = function() {
		if (xhr.readyState == 4 && xhr.status == 200) {
			document.getElementById('assetsAvailable').innerHTML = xhr.responseText;
		}
	};
	xhr.send();
}


// Create a new instance of AuO for sound managing
const auo = new AuO(null, null, uploadSound, "https://54.144.129.144/receive.php");

// Launches AuO in a new window and stops all currently playing sounds
function addSound() {
	auo.launch();
	document.getElementsByClassName('AuO')[0].style.display = "";
	try {
		AssetManager.clearSounds();
		Howler.unload();
	}
	catch(err) {}
}

/* uploadSound: sends sound to S3
 * 
 * Parameter: sound file (blob)
 * 
 * Returns: none
 */
function uploadSound(blob) {
	var soundFile = blob;
	var url = URL.createObjectURL(blob);
	popup('createSound', true);
	try {
		popup('soundManager', true);
	}
	catch(err){}
	document.getElementsByClassName('AuO')[0].style.display = "none";
	

	document.getElementById('soundSource').src = url;
	$("#sound-form-inline").on('submit', function() {
		console.log("sound title", $('#sound_title').val());
		if ($('#sound_title').val() !== "") {
		if (soundFile !== undefined) {
				alert("Your asset has been saved!");
				popup('createSound', true);
				popup('loadingAsset', true);
				
				var to = userUrl + "newasset/";
				var data1 = $('#soundformid').serialize();

				var thumbnail = $("#sound_thumbnail")[0];
				var title = $('#sound_title').val();
				
				var filename = encodeURI(title);
				var ext = ".".concat($(".auo-save-options option:selected").val());

				//readFile($("#asset_file")[0].files[0]); // uncomment to print the contents of the file to the console

				// create a form with a couple of values
				var form = new FormData(document.forms.namedItem('soundform'));
				form.append("file", soundFile, filename.concat(ext));
				form.append("thumbnail", thumbnail.files[0]);
				form.append("tags", Object.keys(assetTags));
				form.append("type", "Sound");

				// send via XHR
				var xhr = new XMLHttpRequest();
				xhr.onload = function() {
					console.log("Upload complete.");
				};
				xhr.open("POST", to, true);
				xhr.onreadystatechange = function() {
					if (xhr.readyState == 4 && xhr.status == 200) {
						popup('loadingAsset', true);
						try {
							$("#soundManager").find("#assetsAvailable")[0].innerHTML = xhr.responseText + $("#soundManager").find("#assetsAvailable").html();
						}
						catch(err) {
						}
					}
				};
				xhr.send(form);
				
				document.getElementById("soundformid").reset();
				document.getElementById("soundSource").pause();
				assetTags = {};
				$('#all_sound_tags').empty();
				auo.suspend();
				try {
					popup('soundManager', true);
				}
				catch(err) {}
		} else {
			alert("You have not selected a file!");
		}
		} else {
			alert("Please title your asset!");
		}
		return false;
	});
	
}





