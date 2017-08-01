/*
 * The SoftRenderer class rasterizes triangles from a vertex and index buffer to a canvas. 
 *
 * Notes about rendering:
 * - The blend formula is not configurable and is set to destRGB = srcRGB*alpha + destRGB*(1.0-alpha) for the RGB color 
 * 		channels and destA = srcA + destA for the alpha channel. This decision is geared toward the use case of sprite
 *		generation from models. 
 */

// width: Width of the image buffer render target in pixels.
// height: Height of the image buffer render target in pixels.
// div: Optional. An ID of a div element (string).
// imageClearValue: Optional. An array of length 4 of number elements in the range [0.0, 1.0] specifying RGBA values to use
//		when clearing the image buffer. This defaults to [0.0, 0.0, 0.0, 1.0] (black).
// depthClearValue: Optional. A floating point number to use when clearing the depth buffer. This defaults to 1.0.
// 		In a normalized depth range, 1.0 is the farthest depth from the camera.
/*
 * Constructs a SoftRenderer object with the specified configuration. If a div ID is specified, the soft renderer will
 * render its image into that div element with each call to present().
 */
 SoftRenderer = function (width, height, div, imageClearValue = [0.0, 0.0, 0.0, 1.0], depthClearValue = 1.0)
 {
 	// Clear value:
 	this.imageClearValue = [this.intensityToUint(imageClearValue[0]), this.intensityToUint(imageClearValue[1]), 
 			this.intensityToUint(imageClearValue[2]), this.intensityToUint(imageClearValue[3])];
 	this.depthClearValue = depthClearValue;  

 	// Model View Projection Matrices:
 	this.modelMatrix = new THREE.Matrix4(); // Identity.
 	this.viewMatrix = new THREE.Matrix4(); // Identity.
 	this.projectionMatrix = new THREE.Matrix4(); // Identity.
 	this.modelViewProjMatrix = new THREE.Matrix4(); // Identity.
 	this.modelInvTransMatrix = new THREE.Matrix3(); // Identity. This matrix is for transforming normals.

 	// Input Buffers:
 	this.indexBuffer = [];
 	this.positionBuffer = [];
 	this.normalBuffer = [];
 	this.texCoordBuffer = [];

 	// Texture data stored in off-screen canvas:
 	this.texture = document.createElement('canvas');
 	this.texture.id = "software_renderer_texture";
 	this.textureContext = this.texture.getContext('2d');
 	this.textureImageData; // ImageDataObject for texture.
 	this.textureBuffer; // Pointer to textureImageData's pixel data.
 	this.textureIsBound = false;

 	// Lights:
 	this.light = {vector: new THREE.Vector3(0, 1, 0), intensity: [1.0, 1.0, 1.0]}; // White light from positive y direction.

 	// Output canvas:
 	this.outputCanvas = document.createElement('canvas');
 	this.outputCanvas.id = "software_renderer_output";
 	this.outputContext = this.outputCanvas.getContext('2d');
 	this.outputDirty = true;
 	this.outputDiv = document.getElementById(div);
 	if (this.outputDiv)
 	{
 		this.outputCanvas.style.width = "100%";
 		this.outputCanvas.style.height = "100%";
 		this.outputDiv.appendChild(this.outputCanvas);
 	}

 	// Image and Depth Buffers:
 	this.imageDataObject; // An ImageData object obtained from a canvas context.
 	this.imageBuffer; // Pointer to imageDataObject's pixel data. 
 	this.depthBuffer; 
 	this.imageWidth = width;
 	this.imageHeight = height;
 	this.setImageBufferDimensions(this.imageWidth, this.imageHeight);
 }


 SoftRenderer.prototype = 
 {
 	// Public Interface:

 	// clearValue: An array of length 4 of elements in the [0.0, 1.0] range defining RGBA values.
 	/*
 	 * Set the RGBA clear values to use when clearing the image buffer.
 	 */
 	setImageClearValue: function (clearValue)
 	{
 		this.imageClearValue = [this.intensityToUint(clearValue[0]), this.intensityToUint(clearValue[1]), 
 			this.intensityToUint(clearValue[2]), this.intensityToUint(clearValue[3])];
 	},

 	// clearValue: A floating point number.
 	/*
 	 * Set the value used when clearing the depth buffer.
 	 */
 	setDepthClearValue: function (clearValue)
 	{
 		this.depthClearValue = clearValue;
 	},

 	/*
 	 * Clears the image buffer to the current clear values.
 	 */
 	clearImageAndDepthBuffer: function ()
 	{
 		for (var x = 0; x < this.imageWidth; x++)
 		{
 			for (var y = 0; y < this.imageHeight; y++)
 			{
 				this.setPixelColor(x, y, this.imageClearValue[0], this.imageClearValue[1], 
 					this.imageClearValue[2], this.imageClearValue[3]);
 				this.setPixelDepth(x, y, this.depthClearValue);
 			}
 		}

 		this.outputDirty = true;
 	},

 	// width: Width of the image buffer render target in pixels.
	// height: Height of the image buffer render target in pixels.
	/*
	 * Clears and resizes the image buffer to the specified dimensions.
	 */
	setImageBufferDimensions: function(width, height)
	{
		this.outputCanvas.width = width;
		this.outputCanvas.height = height;

		this.imageDataObject = this.outputContext.createImageData(width, height);
		this.imageBuffer = this.imageDataObject.data;
		this.imageWidth = width;
 		this.imageHeight = height;

 		this.depthBuffer = new Array(this.imageWidth*this.imageHeight);

 		this.clearImageAndDepthBuffer();
	},

 	// modelTransformMatrix: A THREE.Matrix4 that transforms from model to world space for currently bound rendering geometry.
 	/*
 	 * Set transform that converts rendering geometry from model to world space.
 	 */
 	setModelTransform: function (modelTransformMatrix)
 	{
 		this.modelMatrix = modelTransformMatrix.clone();
 	},

 	// viewTransformMatrix: A THREE.Matrix4 that transforms from world space to camera or view space.
 	/*
 	 * Set camera view transform for rendering geometry.
 	 */
 	setViewTransform: function (viewTransformMatrix)
 	{
 		this.viewMatrix = viewTransformMatrix.clone();
 	},

 	// projectionTransformMatrix: A THREE.Matrix4 that projects view space geometry to the image plane.
 	// 		(Note: Renderer divides by z after projection.)
 	/*
 	 * Set projection transform for rendering geometry.
 	 */
 	setProjectionTransform: function (projectionTransformMatrix)
 	{
 		this.projectionMatrix = projectionTransformMatrix.clone();
 	},

 	// indexBuffer: An array of indicies.
 	/*
 	 * Set index buffer to use when render is called. Every three indicies make a triangle.
 	 */
 	bindIndexBuffer: function (indexBuffer)
 	{
 		this.indexBuffer = indexBuffer.slice();
 	},

 	// positionBuffer: An array of floating point numbers, where every three elements is a position.
 	/*
 	 * Set position buffer determining model space positions of triangle verticies to render.
 	 */
 	bindPositionBuffer: function (positionBuffer)
 	{
 		this.positionBuffer = positionBuffer.slice();
 	},

 	// normalBuffer: An array of floating point numbers, where every three elements is a normal.
 	/*
 	 * Set normal buffer determining model space normals of triangle verticies to render. 
 	 */
 	bindNormalBuffer: function (normalBuffer)
 	{
 		this.normalBuffer = normalBuffer.slice();
 	},

 	// textCoordBuffer: An array of floating point numbers, where every two elements is a texture coordinate.
 	/*
 	 * Set texture coordinate buffer determining texture coordinate for each triangle vertex to render. 
 	 * Texture coordinate space is the same as the spec for WebGL.
 	 */
 	bindTexCoordinateBuffer: function (texCoordBuffer)
 	{
 		this.texCoordBuffer = texCoordBuffer.slice();
 	},

 	// texture: A canvas object whose pixel data is the texture to bind. Or undefined.
 	/*
 	 * Set texture to use when rendering triangles. If undefined is passed, then no texture will be bound
 	 * (texture samples result in opaque white). 
 	 */
 	bindTexture: function (texture)
 	{
 		if (texture === undefined)
 		{
 			this.textureIsBound = false;
 			return;
 		}

 		this.texture.width = texture.width;
 		this.texture.height = texture.height;
 		this.textureContext.drawImage(texture, 0, 0, texture.width, texture.height);
 		this.textureImageData = this.textureContext.getImageData(0, 0, this.texture.width, this.texture.height);
 		this.textureBuffer = this.textureImageData.data;
 		this.textureIsBound = true;
 	},

 	// direction: A THREE.Vector3 giving the direction of a parallel light source.
 	// intensity: An array of length 3 giving the RGB intensity of a light source. 
 	//		All elements are in the range [0.0, 1.0].
 	/*
 	 * Set parallel light source for rendering.
 	 */
 	setLight: function (direction, intensity)
 	{
 		this.light.vector = direction.clone().normalize();
 		this.light.vector.negate();
 		this.light.intensity = intensity.slice();
 	},

 	// wireframe: Optional. True to render in wireframe mode, false to render full triangles. Defaults to false.
 	// start: Optional. The first index in the currently bound index buffer to begin drawing triangles from. Defaults to 0.
 	// count: Optional. The number of triangles to draw. Must not specify more triangles than are in the currently bound 
 	// 		index buffer from start onwards. Draws up to end of currently bound index buffer by default.
 	/*
 	 * Draw currently bound resources to canvas. Requires that the currently bound index buffer does
 	 * not index outside the range of the other currently bound resource buffers. 
 	 */
 	draw: function (wireframe = false, start = 0, count)
 	{
 		if (typeof count === undefined)
 			count = this.indexBuffer.length - start;

 		this.updateModelViewProjection();

 		for (var i = 0; i < count*3; i = i + 3)
 		{
 			this.drawTriangle(this.indexBuffer[i+start], this.indexBuffer[i+1+start], this.indexBuffer[i+2+start], wireframe);
 		}

 		this.outputDirty = true;
 	},

 	/*
 	 * If this SoftRenderer was instantiated with an output div, updates the output div with the current image buffer.
 	 */
 	present: function()
 	{
 		if (this.outputDiv)
 		{
 			this.updateOutputCanvas();
 		}
 	},

 	// width: Optional. The width of the desired resolution in pixels. Defaults to image buffer width.
 	// height: Optional. The height of the desired resolution in pixels. Defaults to image buffer height.
 	/*
 	 * Returns a canvas object with the current image buffer as its pixel content sized to the given resolution.
 	 */
 	getImage: function (width, height)
 	{
 		if (width === undefined)
 			width = this.imageWidth;
 		if (height === undefined)
 			height = this.imageHeight;

 		if (this.outputDirty == true)
 			this.updateOutputCanvas();	

 		var output = document.createElement('canvas');
 		output.width = width;
 		output.height = height;
 		var context = output.getContext('2d');
 		context.drawImage(this.outputCanvas, 0, 0, width, height);

 		return output;
 	},

 	/*
 	 * Returns a reference to the output canvas of the renderer.
 	 */
 	getOutputCanvasReference: function ()
 	{
 		return this.outputCanvas;
 	},


 	// Private Methods:

 	// x: The x coordinate of the pixel to get the offset of (left is 0).
 	// y: The y coordinate of the pixel to get the offset of (top is 0).
 	// width: Optional. Width of the image. Defaults to width of the image buffer.
 	/*
 	 * Converts x, y image coordinate into an offest in the image buffer. 
 	 */
 	imageCoordToOffset: function (x, y, width = this.imageWidth)
 	{
 		return (y * (width * 4)) + (x * 4);
 	},

 	// x: The x coordinate of the pixel to get the offset of (left is 0).
 	// y: The y coordinate of the pixel to get the offset of (top is 0).
 	// width: Optional. Width of the image. Defaults to width of the depth buffer.
 	/*
 	 * Converts x, y depth buffer coordinate into an offest in the depth buffer. 
 	 */
 	depthCoordToOffset: function (x, y, width = this.imageWidth)
 	{
 		return (y * width) + x;
 	},

 	// x: The x coordinate of the pixel to fetch the color of.
 	// y: The y coordinate of the pixel to fetch the color of.
 	/*
 	 * Returns the RGBA values in the image buffer at the specified pixel as an array of length 4. (Top left is 0,0).
 	 */
 	getPixelColor: function (x, y)
 	{
 		var offset = this.imageCoordToOffset(x, y, this.imageWidth);
 		return [this.imageBuffer[offset], this.imageBuffer[offset+1], 
 			this.imageBuffer[offset+2], this.imageBuffer[offset+3]];
 	},

 	// x: The x coordinate of the pixel to set the color of.
 	// y: The y coordinate of the pixel to set the color of.
 	// r: An integer in the range [0, 255]. Sets the red channel.
 	// g: An integer in the range [0, 255]. Sets the green channel.
 	// b: An integer in the range [0, 255]. Sets the blue channel.
 	// a: An integer in the range [0, 255]. Sets the alpha channel.
 	/*
 	 * Sets the RGBA values in the image buffer at the specified pixel to the specified values. (Top left is 0,0).
 	 */
 	setPixelColor: function (x, y, r, g, b, a)
 	{
 		var offset = this.imageCoordToOffset(x, y, this.imageWidth);

 		this.imageBuffer[offset] = r;
 		this.imageBuffer[offset+1] = g;
 		this.imageBuffer[offset+2] = b;
 		this.imageBuffer[offset+3] = a;
 	},

 	// x: The x coordinate of the pixel to fetch the depth of.
 	// y: The y coordinate of the pixel to fetch the depth of.
 	/*
 	 * Returns the value in the depth buffer at the specified pixel. (Top left is 0,0).
 	 */
 	getPixelDepth: function (x, y)
 	{
 		var offset = this.depthCoordToOffset(x, y, this.imageWidth);
 		return this.depthBuffer[offset];
 	},

 	// x: The x coordinate of the pixel to set the color of.
 	// y: The y coordinate of the pixel to set the color of.
 	// d: Sets the depth value.
 	/*
 	 * Sets the value in the depth buffer at the specified pixel. (Top left is 0,0).
 	 */
 	setPixelDepth: function (x, y, d)
 	{
 		var offset = this.depthCoordToOffset(x, y, this.imageWidth);
 		this.depthBuffer[offset] = d;
 	},

 	// intensity: A floating point value indicating a color intensity.
 	/*
 	 * Returns the nearest color value to the floating point intensity as an 8-bit unsigned integer.
 	 * 0.0 -> 0, 1.0 -> 255. Values outside the range [0.0, 1.0] are clamped. 
 	 */
 	intensityToUint: function (intensity)
 	{
 		var uint = ~~(intensity*255);
 		if (uint > 255)
 			uint = 255;
 		if (uint < 0)
 			uint = 0;
 		return uint;
 	},

 	// uint: An integer in the range [0, 255].
 	/*
 	 * Returns the uint as a light intensity floating point value in the range [0.0, 1.0].
 	 */
 	uintToIntensity: function (uint)
 	{
 		return uint/255.0;
 	},

 	/*
 	 * Updates the current model-view-projection matrix with currently bound
 	 * model, view, and projection transforms.
 	 */
 	updateModelViewProjection: function ()
 	{
 		this.modelViewProjMatrix = this.projectionMatrix.clone();
 		this.modelViewProjMatrix.multiply(this.viewMatrix);
 		this.modelViewProjMatrix.multiply(this.modelMatrix);

 		this.modelInvTransMatrix.getNormalMatrix(this.modelMatrix);
 	},

 	/*
 	 * Transfers data from image buffer into the output canvas. 
 	 */
 	updateOutputCanvas: function ()
 	{
 		this.outputContext.putImageData(this.imageDataObject, 0, 0);
 		this.outputDirty = false;
 	},

 	// x: The x coordinate of a pixel (left is 0).
 	// y: The y coordinate of a pixel (top is 0).
 	/*
 	 * Converts image pixel coordinates to normalized device coordinates space.
 	 * Returns the new coordinates in an array of length 2. 
 	 */
 	imageToNdc: function(x, y)
 	{
 		return [x/(this.imageWidth-1)*2.0-1.0, -(y/(this.imageHeight-1)*2.0-1.0)];
 	},

 	// x: An x coordinate in the normalized device coordinate space (a value in the range [-1.0, 1.0]).
 	// y: A y coordinate in the normalized device coordinate space (a value in the range [-1.0, 1.0]).
 	/*
 	 * Converts normalized device coordinate to an image pixel coordinate. Returns the new coordinates
 	 * in an array of length 2. The returned coordinates may be fractional pixel coordinates. 
 	 */
 	ndcToImage: function(x, y)
 	{
 		return [(x+1.0)/2*(this.imageWidth-1), (-y+1.0)/2*(this.imageHeight-1)];
 	},

 	// i0: Index of the first vertex of the triangle into the currently bound resource buffers.
 	// i1: Index of the second vertex of the triangle into the currently bound resource buffers.
 	// i2: Index of the third vertex of the triangle into the currently bound resource buffers.
 	// wireframe: True to render in wireframe mode, false to render full triangles.
 	/*
 	 * Draws triangle specified by the given indicies to the image buffer.
 	 */
 	drawTriangle: function (i0, i1, i2, wireframe)
 	{
 		// Go straight to homogeneous space. Will divide by z later.
 		var position0 = new THREE.Vector4(this.positionBuffer[i0*3], this.positionBuffer[i0*3+1],
 			this.positionBuffer[i0*3+2], 1.0);
 		position0.applyMatrix4(this.modelViewProjMatrix);
 		var position1 = new THREE.Vector4(this.positionBuffer[i1*3], this.positionBuffer[i1*3+1],
 			this.positionBuffer[i1*3+2], 1.0);
 		position1.applyMatrix4(this.modelViewProjMatrix);
 		var position2 = new THREE.Vector4(this.positionBuffer[i2*3], this.positionBuffer[i2*3+1],
 			this.positionBuffer[i2*3+2], 1.0);
 		position2.applyMatrix4(this.modelViewProjMatrix);

 		// Can reject triangles behind the camera early.
 		if (position0.z < 0.0 && position1.z < 0.0 && position2.z < 0.0)
 			return;

 		// Edges of the projected triangle in 2D homogenous space.
 		// Used later for creating the matrix for perspective interpolation and pixel coverage test. 
 		var homoEdge0 = new THREE.Vector4(position0.x, position0.y, position0.w, 0);
 		var homoEdge1 = new THREE.Vector4(position1.x, position1.y, position1.w, 0);
 		var homoEdge2 = new THREE.Vector4(position2.x, position2.y, position2.w, 0);

 		// Divide by z coordinate into NDC space.
 		position0.divideScalar(position0.w);
 		position1.divideScalar(position1.w);
 		position2.divideScalar(position2.w);

 		// Check now if triangle covers any of the screen. If not, we can ignore this triangle and return early. 
 		if (position0.x < -1.0 && position1.x < -1.0 && position2.x < -1.0)
 			return;
 		if (position0.x > 1.0 && position1.x > 1.0 && position2.x > 1.0)
 			return;
 		if (position0.y < -1.0 && position1.y < -1.0 && position2.y < -1.0)
 			return;
 		if (position0.y > 1.0 && position1.y > 1.0 && position2.y > 1.0)
 			return;

 		// Create matrix for getting perspective correct interpolation values.
 		// We do this after checking if triangle is out of view to avoid an unecessary matrix inverse calculation.
 		var interpolationMatrix = new THREE.Matrix4();
 		interpolationMatrix.makeBasis(homoEdge0, homoEdge1, homoEdge2);
 		try
 		{
 			interpolationMatrix.getInverse(interpolationMatrix.clone(), true); 
 		}
 		catch (e)
 		{
 			return; // If getting the inverse fails, this geometrically means the triangle is not visible, and we can skip it.
 		}

 		// If wireframe mode, just draw white lines between each vertex and we're done.
 		if (wireframe)
 		{
 			this.drawLine(position0, position1, interpolationMatrix, 0, 1);
 			this.drawLine(position0, position2, interpolationMatrix, 0, 2);
 			this.drawLine(position1, position2, interpolationMatrix, 1, 2);
 			return;
 		}

 		// Create edge testing equations for triangle:
 		var edgeMat = interpolationMatrix.clone().transpose();
 		var edgeEq0 = (new THREE.Vector3()).setFromMatrixColumn(0, edgeMat);
 		var edgeEq1 = (new THREE.Vector3()).setFromMatrixColumn(1, edgeMat);
 		var edgeEq2 = (new THREE.Vector3()).setFromMatrixColumn(2, edgeMat);

 		// Transform normals to world space.
 		var normal0 = (new THREE.Vector3()).fromArray(this.normalBuffer, i0*3);
 		normal0.applyMatrix3(this.modelInvTransMatrix);
 		var normal1 = (new THREE.Vector3()).fromArray(this.normalBuffer, i1*3);
 		normal1.applyMatrix3(this.modelInvTransMatrix);
 		var normal2 = (new THREE.Vector3()).fromArray(this.normalBuffer, i2*3);
 		normal2.applyMatrix3(this.modelInvTransMatrix);

 		var texCoord0 = (new THREE.Vector2()).fromArray(this.texCoordBuffer, i0*2);
 		var texCoord1 = (new THREE.Vector2()).fromArray(this.texCoordBuffer, i1*2);
 		var texCoord2 = (new THREE.Vector2()).fromArray(this.texCoordBuffer, i2*2);


 		// Find bounding box of triangle so that we only have to scan pixels in triangle's bounding box.
 		// Bounding boxes are clamped to be inside viewport.
 		var minBounds = position0.clone();
 		minBounds.min(position1);
 		minBounds.min(position2);
 		minBounds = this.ndcToImage(minBounds.x, minBounds.y);
 		minBounds[0] = Math.max(0, Math.floor(minBounds[0])); 
 		minBounds[1] = Math.min(this.imageHeight, Math.floor(minBounds[1]+1)); // Exclusive bound.

 		var maxBounds = position0.clone();
 		maxBounds.max(position1);
 		maxBounds.max(position2);
 		maxBounds = this.ndcToImage(maxBounds.x, maxBounds.y);
 		maxBounds[0] = Math.min(this.imageWidth, Math.ceil(maxBounds[0]+1)); // Exclusive bound.
 		maxBounds[1] = Math.max(0, Math.ceil(maxBounds[1]));

 		// Iterate over (scan) pixels that may be covered by the triangle. 
 		for (var x = minBounds[0]; x < maxBounds[0]; x++)
 		{
 			// TODO: Use incremental computation of edge functions if performance is still an issue. 
 			for (var y = maxBounds[1]; y < minBounds[1]; y++) // max bound and min bound are flipped due to NDC being flipped from image pixel space.
 			{
 				var pixelNdc = this.imageToNdc(x, y);
 				pixelNdc = new THREE.Vector3(pixelNdc[0], pixelNdc[1], 1);

 				// Test if pixel is covered by a part of the triangle in front of the screen.
 				if (pixelNdc.dot(edgeEq0) >= 0 && pixelNdc.dot(edgeEq1) >= 0 && pixelNdc.dot(edgeEq2) >= 0)
 				{
 					// Interpolate triangle attributes and process the pixel.

 					var baryWeights = pixelNdc.clone().applyMatrix4(interpolationMatrix);
 					baryWeights.divideScalar(baryWeights.x+baryWeights.y+baryWeights.z);

 					var interpolatedDepth = position0.z*baryWeights.x + position1.z*baryWeights.y + position2.z*baryWeights.z;

 					// Can make an early z check before continuing to process the pixel.
 					var prevDepth = this.getPixelDepth(x, y);
 					if (prevDepth < interpolatedDepth)
 						return;

 					var interpolatedNormal = normal0.clone().multiplyScalar(baryWeights.x);
 					interpolatedNormal.add(normal1.clone().multiplyScalar(baryWeights.y));
 					interpolatedNormal.add(normal2.clone().multiplyScalar(baryWeights.z));

 					var interpolatedTexCoord = texCoord0.clone().multiplyScalar(baryWeights.x);
 					interpolatedTexCoord.add(texCoord1.clone().multiplyScalar(baryWeights.y));
 					interpolatedTexCoord.add(texCoord2.clone().multiplyScalar(baryWeights.z));

 					this.processPixel(x, y, interpolatedDepth, interpolatedNormal, interpolatedTexCoord);
 				}
 			}
 		}
 	},

 	// start: A Vector4 representing one endpoint of the line in normalized device coordinate space.
 	// end: A Vector4 representing the other endpoint of the line in normalized device coordinate space.
 	// interpMat: A Matrix4 that when applied to a coordinate in normalized decice coordinate space, gives
 	// 		corresponding barycentric interpolation weights that, when normalized, can be used for
 	//		perspective correct interpolation of depth.
 	// startBaryIndex: Specifies which vertex of the triangle used to generate interpMat corresponds to start.
 	//		This is one of three values, 0 (first vertex), 1 (second), or 2 (third).
 	// endBaryIndex: Specifies which vertex of the triangle used to generate interpMat corresponds to end.
 	//		This is one of three values, 0 (first vertex), 1 (second), or 2 (third).
 	/*
 	 * Draws a line into the image buffer from pStart to pEnd.
 	 */
 	drawLine: function (start, end, interpMat, startBaryIndex, endBaryIndex)
 	{
 		// Implementation uses Bresenham's line algorithm.

 		// Convert to image pixel space.
 		imgStart = this.ndcToImage(start.x, start.y);
 		imgEnd = this.ndcToImage(end.x, end.y);

 		// If line is shorter than the width of half a pixel, then don't render.
 		if ((imgStart[0]-imgEnd[0])*(imgStart[0]-imgEnd[0]) + 
 			(imgStart[1]-imgEnd[1])*(imgStart[1]-imgEnd[1]) < 0.5*0.5)
 				return;

 		// Convert to integers.
 		var x0 = imgStart[0] | 0;
 		var y0 = imgStart[1] | 0;
 		var x1 = imgEnd[0] | 0;
 		var y1 = imgEnd[1] | 0;

 		// If the line is steep, then we have to switch x and y so that the line is not steep. 
 		var steep = Math.abs(y1 - y0) > Math.abs(x1 - x0);
 		if (steep)
 		{
 			var temp = x0;
 			x0 = y0;
 			y0 = temp;

 			temp = x1;
 			x1 = y1;
 			y1 = temp;
 		}

 		// Make sure line is going left to right.
 		if (x0 > x1)
 		{
 			var temp = x0;
 			x0 = x1;
 			x1 = temp;

 			temp = y0;
 			y0 = y1;
 			y1 = temp;
 		}

 		// Increment y based on whether line goes top to bottom or bottom to top.
 		var yStep;
 		if (y0 < y1)
 			yStep = 1;
 		else
 			yStep = -1;

 		var deltaX = x1 - x0;
 		var deltaY = Math.abs(y1 - y0);
 		var error = 0;

 		var currY = y0;
 		var xExtent = steep ? this.imageHeight : this.imageWidth;
 		var yExtent = steep ? this.imageWidth : this.imageHeight;
 		for (var currX = x0; currX <= x1; currX++)
 		{
 			if (!(currX < 0 || currX >= xExtent || 
 				currY < 0 || currY >= yExtent))
 			{
 				// Calculate interpolated depth and check if we pass the depth test.
 				var pixelNdc = steep ? this.imageToNdc(currY, currX) : this.imageToNdc(currX, currY);
 				pixelNdc = new THREE.Vector3(pixelNdc[0], pixelNdc[1], 1);
 				var baryWeights = pixelNdc.clone().applyMatrix4(interpMat);
 				baryWeights.divideScalar(baryWeights.x+baryWeights.y+baryWeights.z);

 				var interpolatedDepth = start.z*baryWeights.getComponent(startBaryIndex) + 
 					end.z*baryWeights.getComponent(endBaryIndex);

 				// If we pass depth test, draw pixel.
 				var prevDepth = steep ? this.getPixelDepth(currY, currX) : this.getPixelDepth(currX, currY);
 				if (prevDepth >= interpolatedDepth)
 				{
	 				if (steep)
	 				{
	 					this.setPixelColor(currY, currX, 255, 255, 255, 255);
	 					this.setPixelDepth(currY, currX, interpolatedDepth);
	 				}
	 				else
	 				{
	 					this.setPixelColor(currX, currY, 255, 255, 255, 255);
	 					this.setPixelDepth(currX, currY, interpolatedDepth);
	 				}
 				}
 			}

 			error += deltaY;
 			if ((error << 1) >= deltaX) 
 			{
      			currY += yStep;
      			error -= deltaX;
    		}
 		}
 	},

 	// x: The x coordinate of the pixel in the image buffer (left is 0).
 	// y: The y coordinate of the pixel in the image buffer (top is 0).
 	// depth: The interpolated depth value of the pixel. 
 	// normal: The interpolated normal at the pixel as a THREE.Vector3.
 	// texCoord: The interpolated texture coordinate at the pixel as a THREE.Vector2.
 	/*
 	 * Takes interpolated triangle values and draws the appropriate pixel. 
 	 */
 	processPixel: function(x, y, depth, normal, texCoord)
 	{
 		var shadedColor = this.shade(normal, texCoord);
 		var alpha = shadedColor[3];

 		var oldColor = this.getPixelColor(x, y);

 		var r = this.intensityToUint(shadedColor[0]*alpha+oldColor[0]*(1.0-alpha));
 		var g = this.intensityToUint(shadedColor[1]*alpha+oldColor[1]*(1.0-alpha));
 		var b = this.intensityToUint(shadedColor[2]*alpha+oldColor[2]*(1.0-alpha));
 		var a = this.intensityToUint(shadedColor[3]+oldColor[3]);

 		this.setPixelColor(x, y, r, g, b, a);
 		this.setPixelDepth(x, y, depth);
 	},

 	// u: Horizontal texture coordinate, with 0 being the left of the texture.
 	// v: Vertical texture coordinate, with 0 being the bottom of the texture. 
 	/*
 	 * Samples the currently bound texture using bilinear filtering at the given uv coordinate. Returns the sampled 
 	 * color as an array of floating point intensity values.
 	 *
 	 * TODO: Implement trilinear filtering if necessary. 
 	 */
 	sampleTexture: function(u, v)
 	{
 		// If no texture is bound, return opaque white.
 		if (!this.textureIsBound)
 			return [1.0, 1.0, 1.0, 1.0];

 		// Convert uv to image space used by canvas.
 		var x = u * (this.texture.width-1);
 		var y = (-v+1.0) * (this.texture.height-1);

 		// Convert image space coordinates to offsets to the four texels we are bilinearly interpolating.
 		// We have to make sure when we take the ceiling of coordinates to get the next texel over we don't go out of range.
 		var topLeft = this.imageCoordToOffset(Math.floor(x), Math.floor(y), this.texture.width);
 		var topRight = this.imageCoordToOffset(Math.min(Math.ceil(x), this.texture.width-1), Math.floor(y), 
 			this.texture.width);
 		var bottomLeft = this.imageCoordToOffset(Math.floor(x), Math.min(Math.ceil(y), this.texture.height-1), 
 			this.texture.width);
 		var bottomRight = this.imageCoordToOffset(Math.min(Math.ceil(x), this.texture.width-1), 
 			Math.min(Math.ceil(y), this.texture.height-1), this.texture.width);

 		// Interpolation factors;
 		var horLerpFactor = x % 1;
 		var vertLerpFactor = y % 1;

 		// Interpolate horizontally first. 
 		var topR = this.uintToIntensity(this.textureBuffer[topLeft])*(1.0-horLerpFactor) + 
 			this.uintToIntensity(this.textureBuffer[topRight])*horLerpFactor;
 		var topG = this.uintToIntensity(this.textureBuffer[topLeft+1])*(1.0-horLerpFactor) + 
 			this.uintToIntensity(this.textureBuffer[topRight+1])*horLerpFactor;
 		var topB = this.uintToIntensity(this.textureBuffer[topLeft+2])*(1.0-horLerpFactor) + 
 			this.uintToIntensity(this.textureBuffer[topRight+2])*horLerpFactor;
 		var topA = this.uintToIntensity(this.textureBuffer[topLeft+3])*(1.0-horLerpFactor) + 
 			this.uintToIntensity(this.textureBuffer[topRight+3])*horLerpFactor;

 		var bottomR = this.uintToIntensity(this.textureBuffer[bottomLeft])*(1.0-horLerpFactor) + 
 			this.uintToIntensity(this.textureBuffer[bottomRight])*horLerpFactor;
 		var bottomG = this.uintToIntensity(this.textureBuffer[bottomLeft+1])*(1.0-horLerpFactor) + 
 			this.uintToIntensity(this.textureBuffer[bottomRight+1])*horLerpFactor;
 		var bottomB = this.uintToIntensity(this.textureBuffer[bottomLeft+2])*(1.0-horLerpFactor) + 
 			this.uintToIntensity(this.textureBuffer[bottomRight+2])*horLerpFactor;
 		var bottomA = this.uintToIntensity(this.textureBuffer[bottomLeft+3])*(1.0-horLerpFactor) + 
 			this.uintToIntensity(this.textureBuffer[bottomRight+3])*horLerpFactor;

 		// Interpolate vertically and return result.
 		return [topR*(1.0-vertLerpFactor) + bottomR*vertLerpFactor, topG*(1.0-vertLerpFactor) + bottomG*vertLerpFactor, 
 			topB*(1.0-vertLerpFactor) + bottomB*vertLerpFactor, topA*(1.0-vertLerpFactor) + bottomA*vertLerpFactor];
 	},

 	// normal: world space normal of a pixel as a THREE.Vector3.
 	// texCoord: texture coordinate of a pixel as a THREE.Vector2. 
 	/*
 	 * Returns shaded color of pixel with the given position, normal, and texture coordinate. The color is returned as
 	 * a length 4 array of floating point intentsities.
 	 */
 	shade: function (normal, texCoord)
 	{
 		normal.normalize();
 		var incidentIntensity = Math.max(0.0, this.light.vector.dot(normal)); 
 		var diffuseAmbient = incidentIntensity*0.8 + 0.2;
 		var colorOut = this.sampleTexture(texCoord.x, texCoord.y);

 		// calculate RGB colors
 		colorOut[0] = colorOut[0]*diffuseAmbient;
 		colorOut[1] = colorOut[1]*diffuseAmbient;
 		colorOut[2] = colorOut[2]*diffuseAmbient;

 		return colorOut;
 	}
 }