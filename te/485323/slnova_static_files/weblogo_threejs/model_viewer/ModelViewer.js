/*
 * ModelViewer is the interface to a renderer for viewing a model using a Viewport. 
 * The model viewer is used for previewing models.
 */

const CAMREA_START_Z = 3; // Starting z position for camera.
const DEGREES_TO_RADIANS = Math.PI/180.0; // Coversion factor to go from degrees to radians.
const RADIANS_TO_DEGREES = 180.0/Math.PI; // Conversion factor to go from radians to degrees.

// id: An html element id for an html element to insert the renderer's output canvas into.
ModelViewer = function (id)
{
	// Fields:

	this.viewport = new Viewport(id); // Renders model.
	this.agentStateList = []; // List of one agent to render. Agent's shape will be the current model being previewed.
	this.sizingBoxMesh = null; // Mesh for wireframe cube used as a size reference for models.
	this.invertLight = false; // True to reverse the direction of light so that it shines toward the camera instead of away.

	// Setup:
	var material = new THREE.LineBasicMaterial();
	material.wireframe = true;
	this.sizingBoxMesh = new THREE.Mesh(new THREE.BoxGeometry(1,1,1), material);
	this.viewport.scene.add(this.sizingBoxMesh);
	this.sizingBoxOffset = [0, 0, 0]; // Offset from model center.
	this.viewport.toggleTerrain(false);
	this.viewport.toggleStats(false);
	this.viewport.setWorldUp([0, 1, 0]);
	this.viewport.controls.addEventListener("change", function() { this.redraw(); }.bind(this));
	this.viewport.controls.mouseButtons.ORBIT = THREE.MOUSE.LEFT;
	this.viewport.controls.mouseButtons.PAN = THREE.MOUSE.RIGHT;
	this.agentStateList.push({});
	this.agentStateList.push( { x: 0.0, 
								y: 0.0, 
								z: 0.0,
								heading: 0.0,
								size: 1.0,
								color: 0xFFFFFF, 
								shape: null } );
	this.viewport.setAgentStates(this.agentStateList);
	this.viewport.camera.position.z = CAMREA_START_Z;
	this.viewport.animate();
	this.redraw();
}


// Methods:
ModelViewer.prototype = 
{
	// Public Interface:
		
		
	/*
	 * Returns an Image object depicting a snapshot of the ModelViewer's current
	 * view (the Image has not necessarily finished loading).
	 */
	takeSnapshot: function()
	{
		var oldClearAlpha = this.viewport.renderer.getClearAlpha();
		this.viewport.renderer.setClearAlpha(0.0);
		this.viewport.needsUpdate = true;
		this.viewport.render(1);
		this.viewport.renderer.setClearAlpha(oldClearAlpha);
		
		var snapshot = document.createElement('canvas');
		snapshot.width = this.viewport.renderer.domElement.width;
		snapshot.height = this.viewport.renderer.domElement.height;
		snapshot.getContext('2d').drawImage(this.viewport.renderer.domElement, 0, 0);
		/*var snapshot = new Image();
		snapshot.src = this.viewport.renderer.domElement.toDataURL();*/
		return snapshot;
	},

	/*
	 * Adjusts camera to fit the bounding sphere of the model currently being viewed. 
	 * Does nothing if no model is currently being viewed. 
	 */
	fitCameraToModel: function()
	{
		if (!this.agentStateList[1].shape)
			return;

		/*
		 * Fits camera to model by calculating the bounding sphere of the model and then
		 * determining the distance from the model to position the camera as the radius 
		 * of the sphere divided by the sin of half the field of view of the camera.
		 */
		var boundingSphere = this.getModelBoundingSphere();
		var cameraPos = this.viewport.camera.position.clone();
		var fov = this.viewport.camera.fov*Math.PI/180;
		cameraPos.normalize();
		var EPS = 0.75; // Had to use quite the epsilon adjustment! Used to make sure nothing gets clipped from camera view.
		cameraPos.multiplyScalar(boundingSphere.radius/Math.sin(fov/2)+EPS);
		this.viewport.camera.position.copy(cameraPos);
		this.viewport.controls.update();
	},

	// enable: True to enable mouse as camera controls, false to disable mouse controls. 
	/*
	 * Toggles on and off mouse controls for camera when viewing model.
	 */
	toggleCameraControls: function (enable)
	{
		this.viewport.toggleControls(enable);
	},

	// enable: True to toggle the cube on, false to toggle it off.
	/*
	 * Toggles on and off a wireframe cube of size 1. Helpful for seeing relative size of models to Starlogo world
	 * space dimensions.
	 */
	toggleSizingBox: function (enable)
	{
		this.sizingBoxMesh.visible = enable;

		this.redraw();
	},

	// angle: Angle to rotate camera by in degrees.
	/*
	 * Rotates the view of the camera up around the model by degrees.
	 * (Negative angel moves down around object).
	 */
	rotateCameraUp: function (angle)
	{

		this.viewport.controls.rotateUp(angle * DEGREES_TO_RADIANS);
		this.viewport.controls.update();
	},

	// angle: Angle to rotate camera by in degrees.
	/*
	 * Rotates the view of the camera to the left around the model by degrees.
	 * (Negative angel moves right around object).
	 */
	rotateCameraLeft: function (angle)
	{
		this.viewport.controls.rotateLeft(angle * DEGREES_TO_RADIANS);
		this.viewport.controls.update();
	},

	// angle: Angle to rotate camera by in degrees.
	/*
	 * Rotates the view of the camera about its view axis counter-clockwise by degrees.
	 * (Negative angel rotates clockwise).
	 */
	spinCameraCCW: function (angle)
	{
		this.viewport.controls.spinCCW(angle * DEGREES_TO_RADIANS);
		this.viewport.controls.update();
	},

	/*
	 * Returns the angle of the camera about the vertical, up axis (relative to world space) in degrees.
	 */
	getCameraTheta: function ()
	{
		return -this.viewport.controls.getAzimuthalAngle()*RADIANS_TO_DEGREES;
	},

	/*
	 * Returns the angle of the camera above or below the horizontal plane (relative to world space) in degrees.
	 */
	getCameraPhi: function ()
	{
		return -this.viewport.controls.getPolarAngle()*RADIANS_TO_DEGREES;
	},

	/*
	 * Returns the current angle of the camera about its view axis in degrees.
	 */
	getCameraSpin: function ()
	{
		return this.viewport.controls.getSpinAngle()*RADIANS_TO_DEGREES;
	},

	/*
	 * Returns the current world space position of the camera as an array of length 3.
	 */
	getCameraPosition: function ()
	{
		var coordinate = [0, 0, 0];
		return this.viewport.camera.position.toArray(coordinate, 0);
	},

	/*
	 * Resets the camera.
	 */
	resetCamera: function ()
	{
		this.viewport.controls.reset();
		this.viewport.camera.position.z = CAMREA_START_Z;
		this.redraw();
	},

	/*
	 * If a model is currently being viewed, centers camera on model.
	 */
	centerCameraOnModel: function ()
	{
		this.viewport.controls.panTo(this.getModelBoundingBox().center());
		this.viewport.controls.update();
		this.redraw();
	},

	// axis: An array of length 3 specifying the up axis to use for camera movement.
	/*
	 * Changes up axis for camera movement (both for methods for camera control and
	 * user camera control). This is the axis which theta rotation spins around.
	 */
	setControlsUpAxis: function (axis)
	{
		this.viewport.setWorldUp(axis);
		this.redraw();
	},

	// clearAsset: boolean flag indicating whether to clear data loaded for the asset.
	/*
	 * Clears model being viewed (model stops rendering).
	 */
	clearModel: function (clearAsset)
	{
		this.agentStateList[1].shape = null;
		this.agentStateList[1].size = 1.0;
		if (clearAsset)
			this.viewport.clearModels();
		this.redraw();
	},

	// enable: True to invert lighting towards camera, false to have light come from camera.
	/*
	 * Inverts direction of lighting.
	 */
	toggleInvertedLighting: function (enable)
	{
		this.invertLight = enable;
		this.redraw();
	},

	// url: A url path to a model asset.
	// callback: An optional function to be executed upon completion of model loading.
	/*
	 * Sets the model with the given url as the model to render. Requires that the global viewport instance has 
	 * already been initialized. 
	 */
	loadModelFromURL: function (url, callback)
	{
		this.viewport.loadModel(url, url, function() 
			{ 
				this.agentStateList[1].shape = url;
				if (callback)
					callback();
				this.redraw();
			}.bind(this));
	},

	// increment: Amount to increase size (scaling factor) of model by. Negative value shrinks.
	/*
	 * Enlarges the size of the model being viewed by the given amount.
	 */
	enlargeModel: function (increment)
	{
		this.agentStateList[1].size += increment;
		this.redraw();
	},

	// scale: New size scaling factor for model.
	/*
	 * Sets the scaling factor of the model to the given scaling factor.
	 */
	setModelScale: function (scale)
	{
		this.agentStateList[1].size = scale;
		this.redraw();
	},

	/*
	 * Returns the current size scaling factor of the model being viewed. 
	 */
	getModelScale: function ()
	{
		return this.agentStateList[1].size;
	},

	// offset: An array of length 3 reprsenting a translation vector.
	/*
	 * Sets the displacement of the model being viewed from the origin.
	 */
	setModelOffset: function (offset)
	{
		this.agentStateList[1].x = offset[0];
		this.agentStateList[1].y = offset[1];
		this.agentStateList[1].z = offset[2];

		var dimensions = this.getModelDimensions();

		this.sizingBoxMesh.position.set(offset[0] + this.sizingBoxOffset[0], offset[1] + this.sizingBoxOffset[1],
			offset[2] + this.sizingBoxOffset[2] + 0.5*dimensions[2]);

		this.redraw();
	},

	/*
	 * Returns the current offset of the model being viewed from the origin as an array of length 3.
	 */
	getModelOffset: function ()
	{
		return [this.agentStateList[1].x, this.agentStateList[1].y, this.agentStateList[1].z];
	},

	// offset: An array of length 3 representing a translation vector.
	/*
	 * Sets offset of the lattice sizing box from the center of the model.
	 */
	setSizingBoxOffset: function (offset)
	{
		this.sizingBoxOffset[0] = offset[0];
		this.sizingBoxOffset[1] = offset[1];
		this.sizingBoxOffset[2] = offset[2];

		var dimensions = this.getModelDimensions();

		this.sizingBoxMesh.position.set(offset[0] + this.agentStateList[1].x, offset[1] + this.agentStateList[1].y,
			offset[2] + this.agentStateList[1].z  + 0.5*dimensions[2]);

		this.redraw();
	},

	/*
	 * Returns the current offset of the lattice sizing box from the model's center as an array of length 3.
	 */
	getSizingBoxOffset: function ()
	{
		return this.sizingBoxOffset.slice();
	},

	/*
	 * Resets the translation offsets of the model and the lattice sizing box.
	 */
	resetOffsets: function ()
	{
		this.agentStateList[1].x = 0;
		this.agentStateList[1].y = 0;
		this.agentStateList[1].z = 0;

		this.sizingBoxOffset[0] = 0;
		this.sizingBoxOffset[1] = 0;
		this.sizingBoxOffset[2] = 0;

		var dimensions = this.getModelDimensions();

		this.sizingBoxMesh.position.set(0, 0, 0.5*dimensions[2]);
		this.redraw();
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
	 * Redraws the model to the canvas.
	 */
	redraw: function ()
	{
		var x = this.invertLight ? this.viewport.camera.position.x : -this.viewport.camera.position.x;
		var y = this.invertLight ? this.viewport.camera.position.y : -this.viewport.camera.position.y;
		var z = this.invertLight ? this.viewport.camera.position.z : -this.viewport.camera.position.z;
		var lightDir = [x, y, z];

		this.viewport.setLight(lightDir);
		this.viewport.needsUpdate = true;
	},

	/*
	 * Returns the bounding box in world space of the model being viewed, or a Box3 with dimensions 0 centered at (0,0,0).
	 */
	getModelBoundingBox: function ()
	{
		if (this.agentStateList[1].shape)
		{
			var geometries = this.viewport.modelManager.getModel(this.agentStateList[1].shape).getGeometries();
				
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

		    max.multiplyScalar(this.agentStateList[1].size);
		    min.multiplyScalar(this.agentStateList[1].size);

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
		// This algorithm gets a little tighter fit, but the O(n^2) run time is prohibitive for models with many verticies.
		/*if (this.agentStateList[1].shape)
		{
			var geometries = this.viewport.modelManager.getModel(this.agentStateList[1].shape).getGeometries();

			var currVertex = new THREE.Vector3();
			var currDiameter = 0;
			var currCenter = new THREE.Vector3();

			for (var i=0; i<geometries.length; i++)
			{
				var firstVerticies = geometries[i].getAttribute('position').array;
				for (var j=0; j<firstVerticies.length; j=j+3)
				{
					currVertex = new THREE.Vector3(firstVerticies[j], firstVerticies[j+1], firstVerticies[j+2]);
					for (var k=0; k<geometries.length; k++)
					{
						var secondVerticies = geometries[k].getAttribute('position').array;
						for (var h=0; h<secondVerticies.length; h=h+3)
						{
							var comparisonVertex = new THREE.Vector3(secondVerticies[h], secondVerticies[h+1], secondVerticies[h+2]);
							var distance = currVertex.distanceTo(comparisonVertex);
							if (distance > currDiameter)
							{
								currDiameter = distance;
								currCenter.addVectors(currVertex, comparisonVertex);
								currCenter.multiplyScalar(0.5);
							}
						}
					}
				}
			}

			currCenter.add(new THREE.Vector3(this.agentStateList[1].x, this.agentStateList[1].y, this.agentStateList[1].z));
			return new THREE.Sphere(currCenter, currDiameter/2);
		}
		else
			return new THREE.Sphere(new THREE.Vector3(0,0,0), 0);*/

		if (this.agentStateList[1].shape)
		{
			var geometries = this.viewport.modelManager.getModel(this.agentStateList[1].shape).getGeometries();
				
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

		    var radius = this.agentStateList[1].size * Math.sqrt(radiusSq);
		    center.add(new THREE.Vector3(this.agentStateList[1].x, this.agentStateList[1].y, this.agentStateList[1].z));

		    return new THREE.Sphere(center, radius);
		}
		else
			return new THREE.Sphere(new THREE.Vector3(0,0,0), 0);
	}
}