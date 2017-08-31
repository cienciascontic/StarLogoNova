/*
 * ModelViewer is the interface to a renderer for viewing a model using a SoftRenderer. 
 * The model viewer is used for previewing models.
 */

const CAMERA_START_Z = 3; // Starting z position for camera.
const DEGREES_TO_RADIANS = Math.PI/180.0; // Coversion factor to go from degrees to radians.
const RADIANS_TO_DEGREES = 180.0/Math.PI; // Conversion factor to go from radians to degrees.

// id: An html element id for an html element to insert the renderer's output canvas into. May be undefined
// 		to indicate not to render into an output div.
// width: Width of the rendering window of the model viewer. Ignored if a div is specified.
// height: Height of the rendering window of the model viewer. Ignored if a div is specified.
ModelViewer = function (id, width, height)
{
	// Fields:
	this.backgroundColor = [16.0/255.0, 16.0/255.0, 16.0/255.0, 1.0];
	this.parentDiv = document.getElementById(id);
	var offsetDims = this.determineContainerOffsetDimensions(this.parentDiv);
	this.width = this.parentDiv ? offsetDims[0]*window.devicePixelRatio : width;
	this.height = this.parentDiv ? offsetDims[1]*window.devicePixelRatio : height;
	this.renderer = new SoftRenderer(this.width, this.height, id, this.backgroundColor, 1.0); // Renders model.
	this.model = {buffers: [], textures: [], offset: new THREE.Vector3(0, 0, 0), scale: 1}
	this.sizingBox = {buffer: new THREE.BufferGeometry(), position: new THREE.Vector3(0, 0, 0), 
		offset: new THREE.Vector3(0, 0, 0), visible: true}; 
	this.invertLight = false; // True to reverse the direction of light so that it shines toward the camera instead of away.
	this.modelMatrix = new THREE.Matrix4();
	this.sizingBoxMatrix = new THREE.Matrix4();
	this.camera = new THREE.PerspectiveCamera(50, this.width / this.height, 0.1, 10000);
	this.controls = new THREE.OrbitControls(this.camera, this.renderer.getOutputCanvasReference());
	this.modelMap = new Map(); // This will be used like the model map in ModelManager to hold onto previously
							   // loaded geometry.
	this.needsUpdate = false; // When true, redraw model and sizing box.

	// Setup:
	var cubePositions = [
		// Front face.
		-0.5, -0.5, 0.5, 
		0.5, -0.5, 0.5,
		0.5, 0.5, 0.5,
		-0.5, 0.5, 0.5,
				
		// Back face.
		-0.5, -0.5, -0.5, 
		-0.5, 0.5, -0.5,
		0.5, 0.5, -0.5,
		0.5, -0.5, -0.5,
				
		// Top face.
		-0.5, 0.5, -0.5, 
		-0.5, 0.5, 0.5,
		0.5, 0.5, 0.5,
		0.5, 0.5, -0.5,
				
		// Bottom face.
		-0.5, -0.5, -0.5, 
		0.5, -0.5, -0.5,
		0.5, -0.5, 0.5,
		-0.5, -0.5, 0.5,
				
		// Right face.
		0.5, -0.5, -0.5, 
		0.5, 0.5, -0.5,
		0.5, 0.5, 0.5,
		0.5, -0.5, 0.5,
				
		// Left face.
		-0.5, -0.5, -0.5, 
		-0.5, -0.5, 0.5,
		-0.5, 0.5, 0.5,
		-0.5, 0.5, -0.5
	];

	var cubeIndicies = [
		0, 1, 2,	0, 2, 3,	// front
		4, 5, 6,	4, 6, 7,	// back
		8, 9, 10,	8, 10, 11,	// top
		12, 13, 14,	12, 14, 15,	// bottom
		16, 17, 18,	16, 18, 19,	// right
		20, 21, 22,	20, 22, 23	// left
	];

	this.sizingBox.buffer.index = new THREE.BufferAttribute(cubeIndicies, 1, false);
	this.sizingBox.buffer.position = new THREE.BufferAttribute(cubePositions, 3, false);
	this.renderer.setProjectionTransform(this.camera.projectionMatrix);
	this.camera.up.copy(new THREE.Vector3(0, 1, 0));
    this.controls.up0 = this.camera.up.clone();
    this.controls.update();
	this.controls.addEventListener("change", function() { this.redraw(); }.bind(this));
	this.controls.mouseButtons.ORBIT = THREE.MOUSE.LEFT;
	this.controls.mouseButtons.PAN = THREE.MOUSE.RIGHT;
	
	this.camera.position.z = CAMERA_START_Z;
	this.resetOffsets();
	
	var onAnimate = function ()
		{
			requestAnimationFrame(onAnimate);
			if (this.needsUpdate)
			{
				this.redraw();
				this.needsUpdate = false;
			}
		}.bind(this);
	if (this.parentDiv)
		requestAnimationFrame(onAnimate);

	this.redraw();
}


// Methods:
ModelViewer.prototype = 
{
	// Public Interface:
		
	
	// width: Width of the desired image snapshot in pixels.
	// height: Height of the desired image snapshot in pixels.
	// transparentBackground: Optional. True to take snapshot of the model with a transparent background, 
	// 		false to use opaque background for rendering. 
	/*
	 * Returns a canvas object depicting a snapshot of the ModelViewer's current view.
	 */
	takeSnapshot: function(width, height, transparentBackground = false)
	{
		if (transparentBackground)
			this.renderer.setImageClearValue([0.0, 0.0, 0.0, 0.0]);
		this.redraw();
		this.renderer.setImageClearValue(this.backgroundColor);
		this.needsUpdate = true;
		
		var snapshot = this.renderer.getImage(width, height);
		return snapshot;
	},

	
	/*
	 * Adjusts camera to fit the bounding sphere of the model currently being viewed. 
	 * Does nothing if no model is currently being viewed. 
	 */
	fitCameraToModel: function()
	{
		if (this.model.buffers.length == 0)
			return;

		/*
		 * Fits camera to model by calculating the bounding sphere of the model and then
		 * determining the distance from the model to position the camera as the radius 
		 * of the sphere divided by the sin of half the field of view of the camera.
		 */
		var boundingSphere = this.getModelBoundingSphere();
		var cameraPos = this.camera.position.clone();
		var fov = this.camera.fov*Math.PI/180;
		cameraPos.normalize();
		var EPS = 0.75; // Had to use quite the epsilon adjustment! Used to make sure nothing gets clipped from camera view.
		cameraPos.multiplyScalar(boundingSphere.radius/Math.sin(fov/2)+EPS);
		this.camera.position.copy(cameraPos);
		this.controls.update();
		this.needsUpdate = true;
	},

	
	// enable: True to enable mouse as camera controls, false to disable mouse controls. 
	/*
	 * Toggles on and off mouse controls for camera when viewing model.
	 */
	toggleCameraControls: function (enable)
	{
		this.controls.toggleControls(enable);
	},

	
	// enable: True to toggle the cube on, false to toggle it off.
	/*
	 * Toggles on and off a wireframe cube of size 1. Helpful for seeing relative size of models to Starlogo world
	 * space dimensions.
	 */
	toggleSizingBox: function (enable)
	{
		this.sizingBox.visible = enable;

		this.needsUpdate = true;
	},

	
	// angle: Angle to rotate camera by in degrees.
	/*
	 * Rotates the view of the camera up around the model by degrees.
	 * (Negative angel moves down around object).
	 */
	rotateCameraUp: function (angle)
	{

		this.controls.rotateUp(angle * DEGREES_TO_RADIANS);
		this.controls.update();
		this.needsUpdate = true;
	},

	
	// angle: Angle to rotate camera by in degrees.
	/*
	 * Rotates the view of the camera to the left around the model by degrees.
	 * (Negative angel moves right around object).
	 */
	rotateCameraLeft: function (angle)
	{
		this.controls.rotateLeft(angle * DEGREES_TO_RADIANS);
		this.controls.update();
		this.needsUpdate = true;
	},

	
	// angle: Angle to rotate camera by in degrees.
	/*
	 * Rotates the view of the camera about its view axis counter-clockwise by degrees.
	 * (Negative angel rotates clockwise).
	 */
	spinCameraCCW: function (angle)
	{
		this.controls.spinCCW(angle * DEGREES_TO_RADIANS);
		this.controls.update();
		this.needsUpdate = true;
	},

	
	/*
	 * Returns the angle of the camera about the vertical, up axis (relative to world space) in degrees.
	 */
	getCameraTheta: function ()
	{
		return -this.controls.getAzimuthalAngle()*RADIANS_TO_DEGREES;
	},

	
	/*
	 * Returns the angle of the camera above or below the horizontal plane (relative to world space) in degrees.
	 */
	getCameraPhi: function ()
	{
		return -this.controls.getPolarAngle()*RADIANS_TO_DEGREES;
	},

	
	/*
	 * Returns the current angle of the camera about its view axis in degrees.
	 */
	getCameraSpin: function ()
	{
		return this.controls.getSpinAngle()*RADIANS_TO_DEGREES;
	},

	
	/*
	 * Returns the current world space position of the camera as an array of length 3.
	 */
	getCameraPosition: function ()
	{
		var coordinate = [0, 0, 0];
		return this.camera.position.toArray(coordinate, 0);
	},

	
	/*
	 * Resets the camera.
	 */
	resetCamera: function ()
	{
		this.controls.reset();
		this.camera.position.z = CAMERA_START_Z;
		this.needsUpdate = true;
	},

	
	/*
	 * If a model is currently being viewed, centers camera on model.
	 */
	centerCameraOnModel: function ()
	{
		this.controls.panTo(this.getModelBoundingBox().center());
		this.controls.update();
		this.needsUpdate = true;
	},

	
	// axis: An array of length 3 specifying the up axis to use for camera movement.
	/*
	 * Changes up axis for camera movement (both for methods for camera control and
	 * user camera control). This is the axis which theta rotation spins around.
	 */
	setControlsUpAxis: function (axis)
	{
		this.camera.up.copy(new THREE.Vector3(axis[0], axis[1], axis[2]));
    	this.controls.up0 = this.camera.up.clone();
    	this.controls.update();
		this.needsUpdate = true;
	},

	
	// clearAsset: boolean flag indicating whether to clear data loaded for the asset.
	/*
	 * Clears model being viewed (model stops rendering).
	 */
	clearModel: function (clearAsset)
	{
		this.model = {buffers: [], textures: undefined, offset: new THREE.Vector3(0, 0, 0), scale: 1};
		if (clearAsset)
			this.modelMap = new Map();
		this.needsUpdate = true;
	},

	
	// enable: True to invert lighting towards camera, false to have light come from camera.
	/*
	 * Inverts direction of lighting.
	 */
	toggleInvertedLighting: function (enable)
	{
		this.invertLight = enable;
		this.needsUpdate = true;
	},

	
	// url: A url path to a model asset.
	// callback: An optional function to be executed upon completion of model loading.
	/*
	 * Sets the model with the given url as the model to render. 
	 */
	loadModelFromURL: function (url, callback)
	{
		this.model.buffers = [];
		this.model.textures = [];

		if (this.modelMap.has(url))
		{
			var fileModel = this.modelMap.get(url);
			this.model.buffers = fileModel.getGeometries();

			var materials = preloadedFileModel.getMaterials();
			for (var i = 0; i < materials.length; i++)
				this.model.textures.push(this.extractTexture(materials[i]));

			if (callback)
				callback();
		}
		else
		{
			this.modelMap.set(url, new FileModel(url, [0.0, 0.0, 0.0], 
				function(geometry, material)
				{
					this.model.buffers.push(geometry);
					this.model.textures.push(this.extractTexture(material));
				}.bind(this),
				callback));
		}
	},

	
	// increment: Amount to increase size (scaling factor) of model by. Negative value shrinks.
	/*
	 * Enlarges the size of the model being viewed by the given amount.
	 */
	enlargeModel: function (increment)
	{
		this.model.scale += increment;
		this.rebuildModelMatrix();
		this.needsUpdate = true;
	},

	
	// scale: New size scaling factor for model.
	/*
	 * Sets the scaling factor of the model to the given scaling factor.
	 */
	setModelScale: function (scale)
	{
		this.model.scale = scale;
		this.rebuildModelMatrix();
		this.needsUpdate = true;
	},

	
	/*
	 * Returns the current size scaling factor of the model being viewed. 
	 */
	getModelScale: function ()
	{
		return this.model.scale;
	},

	
	// offset: An array of length 3 reprsenting a translation vector.
	/*
	 * Sets the displacement of the model being viewed from the origin.
	 */
	setModelOffset: function (offset)
	{
		this.model.offset = (new THREE.Vector3()).fromArray(offset);

		var dimensions = this.getModelDimensions();

		this.sizingBox.position = this.sizingBox.offset.clone().add(this.model.offset);
		this.sizingBox.position.setZ(this.sizingBox.position.z + 0.5*dimensions[2]);

		this.rebuildModelMatrix();

		this.needsUpdate = true;
	},

	
	/*
	 * Returns the current offset of the model being viewed from the origin as an array of length 3.
	 */
	getModelOffset: function ()
	{
		return [this.model.offset.x, this.model.offset.y, this.model.offset.z];
	},

	
	// offset: An array of length 3 representing a translation vector.
	/*
	 * Sets offset of the lattice sizing box from the center of the model.
	 */
	setSizingBoxOffset: function (offset)
	{
		this.sizingBox.offset = (new THREE.Vector3()).fromArray(offset);

		var dimensions = this.getModelDimensions();

		this.sizingBox.position = this.sizingBox.offset.clone().add(this.model.offset);
		this.sizingBox.position.setZ(this.sizingBox.position.z + 0.5*dimensions[2]);

		this.rebuildSizingBoxMatrix();

		this.needsUpdate = true;
	},

	
	/*
	 * Returns the current offset of the lattice sizing box from the model's center as an array of length 3.
	 */
	getSizingBoxOffset: function ()
	{
		return [this.sizingBox.offset.x, this.sizingBox.offset.y, this.sizingBox.offset.z];
	},

	
	/*
	 * Resets the translation offsets of the model and the lattice sizing box.
	 */
	resetOffsets: function ()
	{
		this.model.offset = new THREE.Vector3(0, 0, 0);

		this.sizingBox.offset = new THREE.Vector3(0, 0, 0);

		var dimensions = this.getModelDimensions();

		this.sizingBox.position.set(0, 0, 0.5*dimensions[2]);
		this.rebuildModelMatrix();
		this.rebuildSizingBoxMatrix();
		this.needsUpdate = true;
	},

	
	/*
	 * Returns an array of size 3 containing the x, y, and z dimensions of the model.
	 * Dimensions are 0 if no model is being viewed.
	 */
	getModelDimensions: function () 
	{
		var boundingBox = this.getModelBoundingBox();
		return [boundingBox.max.x-boundingBox.min.x, boundingBox.max.y-boundingBox.min.y, boundingBox.max.z-boundingBox.min.z];
	},


	// Private Methods:

	
	/*
	 * Recreates the model matrix for the model based on the model's current offset and scale.
	 */
	rebuildModelMatrix: function ()
	{
		this.modelMatrix.makeScale(this.model.scale, this.model.scale, this.model.scale);
		this.modelMatrix.setPosition(this.model.offset);
	},

	
	/*
	 * Recreates the model matrix for the sizing box based on it's current offset.
	 */
	rebuildSizingBoxMatrix: function ()
	{
		this.sizingBoxMatrix.setPosition(this.sizingBox.offset);
	},


	// material: A THREE.RawShaderMaterial object.
	/*
	 * Extracts the texture from a material and returns it as a canvas object. If the material has no
	 * texture, returns undefined.
	 */
	extractTexture: function (material)
	{
		if (material.uniforms.hasTex.value == 0)
			return undefined;

		var texture = material.uniforms.tex.value.image;
		var canvas = document.createElement('canvas');
		canvas.width = texture.width;
		canvas.height = texture.height;
		var context = canvas.getContext('2d');
		context.drawImage(texture, 0, 0);

		return canvas;
	},


	/*
	 * Redraws the model to the canvas.
	 */
	redraw: function ()
	{
		var x = this.invertLight ? this.camera.position.x : -this.camera.position.x;
		var y = this.invertLight ? this.camera.position.y : -this.camera.position.y;
		var z = this.invertLight ? this.camera.position.z : -this.camera.position.z;
		var lightDir = new THREE.Vector3(x, y, z);

		this.renderer.setLight(lightDir, [1.0, 1.0, 1.0]);

		this.camera.updateMatrix();
		this.camera.updateMatrixWorld();
		var viewMat = new THREE.Matrix4();
		viewMat.getInverse(this.camera.matrixWorld);
		this.renderer.setViewTransform(viewMat);
		this.renderer.clearImageAndDepthBuffer();

		// Draw Sizing Cube
		if (this.sizingBox.visible)
		{
			// this.renderer.setModelTransform(this.sizingBoxMatrix);
			// this.renderer.bindIndexBuffer(this.sizingBox.buffer.index.array);
			// this.renderer.bindPositionBuffer(this.sizingBox.buffer.position.array);
			// this.renderer.bindNormalBuffer([]);
			// this.renderer.bindTexCoordinateBuffer([]);
			// this.renderer.bindTexture();
			// this.renderer.draw(true, 0, this.sizingBox.buffer.index.array.length/3);
		}

		// Draw Model
		if (this.model.buffers.length > 0)
		{
			this.renderer.setModelTransform(this.modelMatrix);
			for (var i = 0; i < this.model.buffers.length; i++)
			{
				this.renderer.bindIndexBuffer(this.model.buffers[i].index.array);
				this.renderer.bindPositionBuffer(this.model.buffers[i].getAttribute('position').array);
				this.renderer.bindNormalBuffer(this.model.buffers[i].getAttribute('normal').array);
				this.renderer.bindTexCoordinateBuffer(this.model.buffers[i].getAttribute('uv').array);
				this.renderer.bindTexture(this.model.textures[i]);
				this.renderer.draw(false, 0, this.model.buffers[i].index.array.length/3);
			}
		}
		
		this.renderer.present();
	},

	
	/*
	 * Returns the bounding box in world space of the model being viewed, or a Box3 with dimensions 0 centered at (0,0,0).
	 */
	getModelBoundingBox: function ()
	{
		if (this.model.buffers.length > 0)
		{
			var geometries = this.model.buffers;
				
			var max = new THREE.Vector3(-Infinity,-Infinity,-Infinity);
	        var min = new THREE.Vector3(Infinity,Infinity,Infinity);
	        for (var i=0; i<geometries.length; i++) 
	        {
		        g = geometries[i]
		            
		        g.computeBoundingBox();

		        // Sometimes geometries don't have any vertices and should not count for determining the min and max.
		        if (g.boundingBox.max.length() == 0 && g.boundingBox.min.length() == 0)
		            continue;

		        max.max(g.boundingBox.max);
		        min.min(g.boundingBox.min);
		    }

		    max.multiplyScalar(this.model.scale);
		    min.multiplyScalar(this.model.scale);

		    return new THREE.Box3(min, max);
		}
		else
			return new THREE.Box3(new THREE.Vector3(0,0,0), new THREE.Vector3(0,0,0));
	},

	
	/*
	 * Returns the bounding sphere of the model being currently viewed as a THREE.Sphere, or a THREE.Sphere of size 0.
	 */
	getModelBoundingSphere: function ()
	{
		if (this.model.buffers.length > 0)
		{
			var geometries = this.model.buffers;
				
			var center = new THREE.Vector3(0, 0, 0);
			var vertexCount = 0;
	        for (var i=0; i<geometries.length; i++) 
	        {
		        var verticies = geometries[i].getAttribute('position').array;
		            
		        for (var j=0; j<verticies.length; j = j+3)
		        {
		        	center.add(new THREE.Vector3(verticies[j], verticies[j+1], verticies[j+2]));
		        	vertexCount++;
		        }
		    }
		    center.divideScalar(vertexCount);

		    var radiusSq = 0;
		    for (var i=0; i<geometries.length; i++) 
	        {
		        var verticies = geometries[i].getAttribute('position').array;
		            
		        for (var j=0; j<verticies.length; j = j+3)
		        {
		        	var newRadiusSq = Math.abs(verticies[j]-center.x)*Math.abs(verticies[j]-center.x) +
		        		Math.abs(verticies[j+1]-center.y)*Math.abs(verticies[j+1]-center.y) + 
		        			Math.abs(verticies[j+2]-center.z)*Math.abs(verticies[j+2]-center.z);
					if (newRadiusSq > radiusSq)
						radiusSq = newRadiusSq;
		        }
		    }

		    var radius = this.model.scale * Math.sqrt(radiusSq);
		    center.add(this.model.offset);

		    return new THREE.Sphere(center, radius);
		}
		else
			return new THREE.Sphere(new THREE.Vector3(0,0,0), 0);
	},

	// container: A DOM element, or undefined.
	/*
	 * Returns an array of length 2 of the offset width and offset height of a DOM element.
	 * Guaranteed to not return [0, 0] if the dimensions of the container are non-zero. 
	 * Returns [0, 0] if container is undefined. 
	 */
	determineContainerOffsetDimensions: function (container)
	{
		if (!container)
			return [0, 0];

		if (container.offsetWidth == 0 || container.offsetHeight == 0)
        {
            var divStyle = window.getComputedStyle(container);

            var width = parseInt(divStyle.getPropertyValue('width'));
            var padding_left = parseInt(divStyle.getPropertyValue("padding-left"));
            var padding_right = parseInt(divStyle.getPropertyValue("padding-right"));
            var border_left = parseInt(divStyle.getPropertyValue("border-left").split(" ")[0]);
            var border_right = parseInt(divStyle.getPropertyValue("border-right").split(" ")[0]);
            var offsetWidth = padding_left+border_left+width+border_right+padding_right;

            var height = parseInt(divStyle.getPropertyValue('height'));
            var padding_top = parseInt(divStyle.getPropertyValue("padding-top"));
            var padding_bottom = parseInt(divStyle.getPropertyValue("padding-bottom"));
            var border_top = parseInt(divStyle.getPropertyValue("border-top").split(" ")[0]);
            var border_bottom = parseInt(divStyle.getPropertyValue("border-bottom").split(" ")[0]);
            var offsetHeight = padding_top+border_top+height+border_bottom+padding_bottom;

            return [offsetWidth, offsetHeight];
        }
        else
            return [container.offsetWidth, container.offsetHeight];
	}
}