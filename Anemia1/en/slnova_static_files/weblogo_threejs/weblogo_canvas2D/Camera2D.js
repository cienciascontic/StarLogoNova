/*
 * The Camera2D class is a helper class for projecting the 2D sprites of agents into screen space. The camera supports full
 * 3D perspective. The camera defines a coordinate space for the near plane that is normalized so that transforms to 
 * screen space can be done by scaling by an appropriate value and translating to match screen coordinates.
 *
 * Notes about camera orientation: Camera orientation is in degrees with rotation moving counter-clockwise. A camera with 
 * 		orientation (0, 0, 0) has a view looking down the y-axis with its "up" vector being the positive z-axis.
 */
 
// fov: The angle of the vertical field of view of the camera in degrees. Must be greater than 0.0 and less than 180.0. 
// near: The world space distance from the camera's location to the near plane used for clipping objects too close to be 
//		visible.
// far: The world space distance from the camera's location to the far plane used for clipping objects too far away to be 
//		visible. 
// viewWidth: The initial width in pixels of the screen area being rendered to.
// viewHeight: The initial height in pixels of the screen area being rendered to.
/*
 * Constructor for Camera.
 */
function Camera2D(fov, near, far, viewWidth, viewHeight)
{
	// Field of view of camera from top to bottom of view.
	this.fovDegrees = fov;
	this.fovRadians = fov * Math.PI / 180.0; // Convert to radians.
	
	// View dimensions in pixels.
	this.viewWidth = viewWidth;
	this.viewHeight = viewHeight;
	
	this.aspectRatio = viewWidth/viewHeight; // Aspect ratio of view.
	
	this.nearDist = near; // World space distance to near plane.
	this.farDist = far; // World space distance to far plane.
	
	// World space dimensions of near plane. 
	this.nearHeight = Math.tan(this.fovRadians/2.0) * this.nearDist * 2;
	this.nearWidth = this.nearHeight * this.aspectRatio;

	// Up vector of camera
	this.up = new THREE.Vector3(0, 0, 1);
	
	// Conversion factors from world to screen space.
	this.worldToScreenX = this.viewWidth / this.nearWidth; 
	this.worldToScreenY = this.viewHeight / this.nearHeight;
	
	// Camera position.
	this.x = 0;
	this.y = 0;
	this.z = 0;
	
	// Camera orientation (angle about each axis in degrees).
	this.xRot = 0; 
	this.yRot = 0;
	this.zRot = 0; 

	// View transformation helpers.
	this.viewMat = new THREE.Matrix4(); // Matrix that transforms from world to camera space.
	this.lookVector = new THREE.Vector3(); // Vector denoting negative z-axis of camera in world space.
	this.rightVector = new THREE.Vector3(); // Vector denoting x-axis of camera in world space.
	this.verticalVector = new THREE.Vector3(); // Vector denoting y-axis of camera in world space.
	this.updateRotationHelpers();

	// Angle Cache for looking up view angle adjustments.
	this.angleCache = []
	this.populateAngleCache();
}


// Methods:
Camera2D.prototype = 
{
	// Public Interface:
	
	/*
	 * Returns the current pixel width of the camera's view (screen space width)
	 */
	getViewWidth: function ()
	{
		return this.viewWidth;
	},
	
	
	/*
	 * Returns the current pixel height of the camera's view (screen space height)
	 */
	getViewHeight: function ()
	{
		return this.viewHeight;
	},


	/*
	 * Returns the current position of the camera in world space as an array of length 3.
	 */
	getPosition: function ()
	{
		return [this.x, this.y, this.z];
	},
	
	
	/*
	 * Returns the orientation of the camera about each axis in degrees as an array of length 3. 
	 */
	getOrientation: function ()
	{
		return [this.xRot, this.yRot, this.zRot];
	},


	/*
	 * Returns the look vector (direction camera is facing in world space) of the camera as an array of length 3.
	 */
	getLookVector: function()
	{
		return this.lookVector.toArray().splice(0, 3);
	},


	/*
	 * Returns the vertical vector (vertically up direction of view in world space) of the camera as an array of length 3.
	 */
	getVerticalVector: function()
	{
		return this.verticalVector.toArray().splice(0, 3);
	},


	/*
	 * Returns the right vector (horizontally right direction of view in world space) of the camera as an array of length 3.
	 */
	getRightVector: function()
	{
		return this.rightVector.toArray().splice(0, 3);
	},


	// x: An x-coordinate in world space.
	// y: A y-coordinate in world space.
	// z: A z-coordinate in world space.
	/*
	 * Takes the point (x, y, z) in world space visible by the camera and returns an array of length three. The first two
	 * elements are the coordinates of the point projected into screen space. The last element is the camera space 
	 * z distance of the point from the camera. 
	 */
	projectPoint: function (x, y, z)
	{
		// Old Top-Down Way: Translate and Rotate into view space.
		//var rotatedX = (x-this.x) * this.zRotCos - (y-this.y) * (-this.zRotSin);
		//var rotatedY = (x-this.x) * (-this.zRotSin) + (y-this.y) * this.zRotCos;
		var pos = new THREE.Vector4(x, y, z, 1);
		pos.applyMatrix4(this.viewMat);
		
		// Projection to near plane.
		var projX = this.projectXLength(pos.x, pos.z);
		var projY = this.projectYLength(pos.y, pos.z);
		
		// Reflect and translate into screen coordinates.
		return [projX+this.viewWidth/2, -projY+this.viewHeight/2, pos.z];
	},


	// xLength: A length or distance in world space units, assumed to be measured parallel to the camera x-axis.
	// zPos: The z distance from camera to project the length from.
	/*
	 * Takes a length measurement in world space parallel to the x-axis and converts it so that it is a length measurement 
	 * in screen space. If the length is at a z position not visible by the camera, then 0 is returned.
	 */
	projectXLength: function (xLength, zPos)
	{
		if (zPos < this.nearDist || zPos > this.farDist)
			return 0;
	
		return (xLength * this.nearDist/zPos) * this.worldToScreenX;
	},


	// yLength: A length or distance in world space units, assumed to be measured parallel to the camera y-axis.
	// zPos: The z distance from camera to project the length from.
	/*
	 * Takes a length measurement in world space parallel to the y-axis and converts it so that it is a length measurement 
	 * in screen space. If the length is at a z position not visible by the camera, then 0 is returned.
	 */
	projectYLength: function (yLength, zPos)
	{
		if (zPos < this.nearDist || zPos > this.farDist)
			return 0;
	
		return (yLength * this.nearDist/zPos) * this.worldToScreenY;
	},
	
	
	// TODO: Depricate this method.
	// heading: heading in degrees to transform to camera's view angle.
	/*
	 * Returns the view angle (spherical coordinates) of the camera given an agent's heading.
	 */
	projectHeading: function (heading)
	{
		return [this.zRot - heading, this.xRot];
	},


	// POSTPONED
	// viewTheta: The Theta angle of the camera's view in degrees (OrbitControls manages this).
	// viewPhi: The Phi angle of the camera's view in degrees (OrbitControls manages this).
	// screenX: x screen coordinate of pixel to find view adjust for.
	// screenY: y screen coordinate of pixel to find view adjust for.
	/*
	 * Returns the adjustment values to the view angle of the camera in degrees given the screen coordinates.
	 * These are values to add to the camera view angle to get the angle of view for objects off
	 * center of the screen.
	 */
	getViewAdjustment: function (viewTheta, viewPhi, screenX, screenY)
	{
		//var phiLerp = Math.abs((viewPhi-90.0)/90.0);

		// if (screenX < 0 || screenX >= this.viewWidth || screenY < 0 || screenY >= this.viewHeight)
		// {
		// 	var screenNear = this.viewHeight/2/Math.tan(this.fovRadians/2.0);
		// 	return [viewTheta, viewPhi-Math.atan((screenY-this.viewHeight/2)/screenNear)*180/Math.PI];
		// }

		var adjustedTheta = viewTheta;// + this.angleCache[0][Math.floor(screenX)];//*phiLerp
			//+ this.angleCache[1][Math.floor(screenY)]*(1-phiLerp);

		var adjustedPhi = viewPhi;// + this.angleCache[1][Math.floor(screenY)];

		return [adjustedTheta, adjustedPhi];
	},


	// screenX: An x coordinate in screen space.
	// screenY: A y coordinate in screen space.
	/*
	 * Takes a point in screen space and transforms it to the corresponding point in world space on the near plane of the camera.
	 * Returns the transformed point as an array of length 3.
	 */
	/*transformPointScreenToWorld: function(screenX, screenY)
	{
		// Essentially reverses all transformations performed by projectPoint().

		var untranslateReflectX = screenX-this.viewWidth/2;
		var untranslateReflectY = -(screenY-this.viewHeight/2);

		var unProjectedX = this.transformXLengthScreenToWorld(untranslateReflectX, this.nearDist);
		var unProjectedY = this.transformYLengthScreenToWorld(untranslateReflectY, this.nearDist);

		var unRotatedX = -(unProjectedX * this.zRotCos) + (unProjectedY * this.zRotSin); 
		var unRotatedY = -(unProjectedX * this.zRotSin) - (unProjectedY * this.zRotCos);

		return [unRotatedX+this.x, unRotatedY+this.y, this.nearDist+this.z];
	},*/


	// xLength: A length or distance in screen space, assumed to be a horizontal length of pixels.
	// distance: Distance from camera to project length to. Must be positive.
	/*
	 * Takes a length in screen space and transforms it to the corresponding length in world space at the given z distance from the camera.
	 */
	/*transformXLengthScreenToWorld: function(xLength, distance)
	{
		return xLength / this.worldToScreenX * (distance/this.nearDist);
	},*/


	// yLength: A length or distance in screen space, assumed to be a vertical length of pixels.
	// distance: Distance from camera to project length to. Must be positive.
	/*
	 * Takes a length in screen space and transforms it to the corresponding length in world space at the given z distance from the camera.
	 */
	/*transformYLengthScreenToWorld: function(yLength, distance)
	{
		return yLength / this.worldToScreenY * (distance/this.nearDist);
	},*/
	
	
	// newWidth: New width of the view in pixels (screen space width)
	// newHeight: New height of the view in pixels (screen space height)
	/*
	 * Adjusts the field of view of the camera to accomodate the new dimensions of the view. 
	 */
	updateView: function (newWidth, newHeight)
	{
		this.viewWidth = newWidth;
		this.viewHeight = newHeight;
		this.aspectRatio = this.viewWidth/this.viewHeight;
		
		this.fovRadians = Math.atan(this.viewHeight/2/this.worldToScreenY/this.nearDist)*2;
		this.fovDegrees = this.fovRadians * 180.0 / Math.PI;
		
		this.nearHeight = Math.tan(this.fovRadians/2.0) * this.nearDist * 2;
		this.nearWidth = this.nearHeight * this.aspectRatio;
		
		this.worldToScreenX = this.viewWidth / this.nearWidth; 
		this.worldToScreenY = this.viewHeight / this.nearHeight;

		this.populateAngleCache();
	},


	// x: New x position of the camera in world space. Pass null to keep the same position.
	// y: New y position of the camera in world space. Pass null to keep the same position.
	// z: New z position of the camera in world space. Pass null to keep the same position.
	/*
	 * Moves the camera to the specified world space position.
	 */
	moveTo: function (x, y, z)
	{
		if (x === 0 || x)
			this.x = x;
		if (y === 0 || y)
			this.y = y;
		if (z === 0 || z)
			this.z = z;
	},


	// deltaX: Signed x distance to move the camera in world space.
	// deltaY: Signed y distance to move the camera in world space.
	// deltaZ: Signed z distance to move the camera in world space.
	/*
	 * Adjusts the position of the camera by the given deltas.
	 */
	moveBy: function (deltaX, deltaY, deltaZ)
	{
		this.x += deltaX;
		this.y += deltaY;
		this.z += deltaZ;
	},
	
	
	// x: New angle about the x-axis of the camera in degrees. Pass null to keep the same angle.
	// y: New angle about the y-axis of the camera in degrees. Pass null to keep the same angle.
	// z: New angle about the z-axis of the camera in degrees. Pass null to keep the same angle.
	/*
	 * Rotates the camera to the specified orientation.
	 */
	rotateTo: function (x, y, z)
	{
		if (x === 0 || x)
			this.xRot = x;
		if (y === 0 || y)
			this.yRot = y;
		if (z === 0 || z)
			this.zRot = z;
		
		this.updateRotationHelpers();
	},


	// deltaX: Signed angle in degrees to rotate the camera by around the x-axis.
	// deltaY: Signed angle in degrees to rotate the camera by around the y-axis.
	// deltaZ: Signed angle in degrees to rotate the camera by around the z-axis.
	/*
	 * Adjusts the orientation of the camera by the given deltas.
	 */
	rotateBy: function (deltaX, deltaY, deltaZ)
	{
		this.xRot += deltaX;
		this.yRot += deltaY;
		this.zRot += deltaZ;
		
		this.updateRotationHelpers();
	},


	// Private Methods:

	/*
	 * Updates view space transform and camera vectors.
	 */
	updateRotationHelpers: function()
	{
		this.lookVector = new THREE.Vector4(0, -1, 0, 0); // Inverted to match starlogo coordinate space.
		var rotationMatrix = new THREE.Matrix4().makeRotationZ(this.zRot * Math.PI/180);
		rotationMatrix.multiply(new THREE.Matrix4().makeRotationY(this.yRot * Math.PI/180));
		rotationMatrix.multiply(new THREE.Matrix4().makeRotationX(this.xRot * Math.PI/180));
		this.lookVector.applyMatrix4(rotationMatrix);

		this.verticalVector = new THREE.Vector4(0, 0, -1, 0); // Inverted to match starlogo coordinate space.
		var rotationMatrix = new THREE.Matrix4().makeRotationZ(this.zRot * Math.PI/180);
		rotationMatrix.multiply(new THREE.Matrix4().makeRotationY(this.yRot * Math.PI/180));
		rotationMatrix.multiply(new THREE.Matrix4().makeRotationX(this.xRot * Math.PI/180));
		this.verticalVector.applyMatrix4(rotationMatrix);

		this.rightVector = new THREE.Vector4(1, 0, 0, 0);
		var rotationMatrix = new THREE.Matrix4().makeRotationZ(this.zRot * Math.PI/180);
		rotationMatrix.multiply(new THREE.Matrix4().makeRotationY(this.yRot * Math.PI/180));
		rotationMatrix.multiply(new THREE.Matrix4().makeRotationX(this.xRot * Math.PI/180));
		this.rightVector.applyMatrix4(rotationMatrix);

		camWorld = new THREE.Matrix4();
		camWorld.makeBasis(this.rightVector, this.verticalVector, this.lookVector);
		camWorld.setPosition(new THREE.Vector3(this.x, this.y, this.z));
		this.viewMat.getInverse(camWorld);
	},


	// POSTPONED
	/*
	 * Populates angle cache based on current screen dimensions.
	 */
	populateAngleCache: function ()
	{
		// var screenNear = this.viewHeight/2/Math.tan(this.fovRadians/2.0);

		// this.angleCache = [];
		// this.angleCache.push([]);
		// this.angleCache.push([]);

		// for (var x = 0; x < this.viewWidth; x++)
		// {
		// 	this.angleCache[0].push(-Math.atan((x-this.viewWidth/2)/screenNear)*180/Math.PI);
		// }
		// for (var y = 0; y < this.viewHeight; y++)
		// {
		// 	this.angleCache[1].push(-Math.atan((y-this.viewHeight/2)/screenNear)*180/Math.PI);
		// }
	}
}