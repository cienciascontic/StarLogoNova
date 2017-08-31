/*
 * MVP 2.1 renderer supports drawing sprites or place-holder shapes for Agents in the x-y plane of world space. 
 * Perspective is a top-down view that can zoom in and out and pan left, right, up, and down based on its coordinate 
 * in world space. Otherwise its perspective is fixed. The camera has a field of view and near and far planes that, 
 * in conjunction with the dimensions of the canvas, determines what is visible at a camera position. Translation of agents 
 * affects how they are rendered, but they have fixed orientations. Agents scale with distance from the camera 
 * (currently only with z-distance), and their scaling is also afected by their world space size property. Viewport may have 
 * an aspect ratio independent from that of the world. Default behavior is to order rendering of agents based on their 
 * z coordinate, but this may be turned off. The renderer manages loading and storing necessary assets for agents before 
 * rendering them. Also supports preloading of assets. An image or color may be used for rendering the terrain. The renderer
 * also handles resizing the canvas to fit into the div element provided to it. 
 *
 *
 * Currently implemented optimizations:
 * - Pixel snapping before drawing.
 *
 *
 * Agents are expected to have these properties:
 * x: X coordinate of agent in world space.
 * y: Y coordinate of agent in world space.
 * z: Z coordinate of agent in world space. 
 * size: The dimensions of a bounding volume in world space which the agent fits inside. Assumed to be a cube with edge
 * 		length size for now.
 * color: Color of an agent to use when asset is not (yet) available. Represented as a fill style string. 
 * shape: Contains assets for rendering, including shape.sprite, a url or file path to an image for rendering in 2d. 
 *
 *
 * Notes on world space: In StarLogo Nova, the origin is in the center of world space, with level ground being 
 * parallel to the x-y plane. Positive y direction can be seen as "north", and positive x as "east", so as to 
 * reflect the 2D cartesian plane coordinate system which is taught to most kids in math. The positive z-axis
 * is up (towards sky), making the coordinate system for StarLogo right-handed. The rendering engine follows all 
 * the same conventions for world space. 
 */

var _parentDiv; // PRIVATE Div element to size the canvas to.
var _canvas; // PRIVATE Canvas element.
var _clearColor = "black";
var _context; // PRIVATE Canvas 2d drawing context.
var _agents; // PRIVATE List of Agents to render.
var _worldWidth; // PRIVATE Width of world terrain in world space units.
var _worldHeight; // PRIVATE Height of world terrain in world space units.
var _viewWidth; // PRIVATE Scaling factor to go from camera near plane x coordinates to screen x coordinates.
var _viewHeight; // PRIVATE Scaling factor to go from camera near plane y coordinates to screen y coordinates.
var _camera; // PRIVATE Current camera being used.
var _zOrderRendering = true; // PRIVATE Flag enables ordering agents by z coordinate for rendering.
var _terrain; // PRIVATE World terrain representation, either a color or key to a bitmap in _assetMap.
var _terrainReady = false; // PRIVATE Flag that is true when terrain is ready for rendering, false when it's not. 
var _terrainEnabled = true; // PRIVATE Flag to control whether terrain is rendered or not. Intially set to true.
var _rendering = false; // PRIVATE Flag used to control whether the renderer continues to draw the scene 
						// on animation requests.
var _animating = false; // PRIVATE Flag used to control whether the renderer continues to execute the _onAnimation
						// callback per animation request. 
var _onAnimation = function() {}; // PRIVATE Holds callback function to be run whenever a frame is drawn. 
var _assetMap = new Map(); // PRIVATE A mapping from asset urls/paths to the loaded asset. 



// PRIVATE
// fov: The angle of the vertical field of view of the camera in degrees. Must be greater than 0.0 and less than 180.0. 
// near: The world space distance from the camera's location to the near plane used for clipping objects too close to be 
//		visible.
// far: The world space distance from the camera's location to the far plane used for clipping objects too far away to be 
//		visible. 
// aspectRatio: The ratio of the width of the camera's view to it's height.
// xPos: The x-positon of the camera in world space.
// yPos: The y-positon of the camera in world space.
// zPos: The z-positon of the camera in world space.
/*
 * A helper class for defining the camera. The camera is currently fixed along the z-axis looking down and does not rotate.
 * The camera defines a coordinate space for the near plane that is normalized so that transforms to screen space can be
 * done by scaling by an appropriate value and translating to match screen coordinates.
 */
function _Camera(fov, near, far, aspectRatio, xPos, yPos, zPos)
{
	this.fovDegrees = fov;
	this.fovRadians = fov * Math.PI / 180.0; // Convert to radians.
	this.aspectRatio = aspectRatio;
	
	this.nearDist = near;
	this.nearHeight = Math.tan(this.fovRadians/2.0) * this.nearDist * 2;
	this.nearWidth = this.nearHeight * this.aspectRatio;
	
	this.farDist = far;
	
	this.x = xPos;
	this.y = yPos;
	this.z = zPos;
}


/*
 * Returns the current position of the camera in world space as an array of length 3.
 */
_Camera.prototype.getPosition = function ()
{
	return [this.x, this.y, this.z];
}


// x: An x-coordinate in world space.
// y: A y-coordinate in world space.
// z: A z-coordinate in world space.
/*
 * Takes the point (x, y, z) in world space and returns an array of length two of normalized coordinates of the point
 * after it has gone through a perspective projection onto the near plane of the camera. The coordinate space of the 
 * near plane is 2d and has (0,0) in the center, and spans from -0.5 to 0.5 in height and width. The corners 
 * are the intersection points between the near plane and the sides of the view frustum.
 */
_Camera.prototype.projectPoint = function (x, y, z)
{
	return [this.projectXLength(x-this.x, z), -this.projectYLength(y-this.y, z)];
}


// xLength: A length or distance in world space units, assumed to be measured parallel to the x-axis.
// zPos: The z coordinate to project the length from.
/*
 * Takes a length measurement in world space parallel to the x-axis and converts it so that it is a length measurement 
 * in the coordinate space of the near plane of the camera. The coordinate space of the near plane is 2d and has (0,0) 
 * in the center and spans from -0.5 to 0.5 in height and width. The corners are the intersection points between the near 
 * plane and the sides of the view frustum. If the length is at a z position not visible by the camera, then 0 is returned.
 */
_Camera.prototype.projectXLength = function (xLength, zPos)
{
	var zDist = this.z - zPos;
	
	if (zDist < this.nearDist || zDist > this.farDist)
		return 0;
	
	return (xLength * this.nearDist/zDist) / (this.nearWidth/2.0);
}


// yLength: A length or distance in world space units, assumed to be measured parallel to the y-axis.
// zPos: The z coordinate to project the length from.
/*
 * Takes a length measurement in world space parallel to the y-axis and converts it so that it is a length measurement 
 * in the coordinate space of the near plane of the camera. The coordinate space of the near plane is 2d and has (0,0) 
 * in the top, left corner and (1,1) in the bottom, right corner. The corners are the intersection points between the near 
 * plane and the sides of the view frustum. If the length is at a z position not visible by the camera, then 0 is returned.
 */
_Camera.prototype.projectYLength = function (yLength, zPos)
{
	var zDist = this.z - zPos;
	
	if (zDist < this.nearDist || zDist > this.farDist)
		return 0;
	
	return (yLength * this.nearDist/zDist) / (this.nearHeight/2.0);
}


// PRIVATE
// x: New x position of the camera in world space. Pass null to keep the same position.
// y: New y position of the camera in world space. Pass null to keep the same position.
// z: New z position of the camera in world space. Pass null to keep the same position.
/*
 * Moves the camera to the specified world space position.
 */
_Camera.prototype.moveTo = function (x, y, z)
{
	if (x)
		this.x = x;
	if (y)
		this.y = y;
	if (z)
		this.z = z;
}


// PRIVATE
// deltaX: Signed x distance to move the camera in world space.
// deltaY: Signed y distance to move the camera in world space.
// deltaZ: Signed z distance to move the camera in world space.
/*
 * Adjusts the position of the camera by the given deltas.
 */
_Camera.prototype.moveBy = function (deltaX, deltaY, deltaZ)
{
	this.x += deltaX;
	this.y += deltaY;
	this.z += deltaZ;
}
					  
	
	
					  
// PRIVATE
/*
 * Draws all Agents in the Agent list the renderer currently has a reference to.
 * Requires that initCanvasRenderer() has been called. 
 */
function _drawScene()
{
	// Clear canvas to black
	_context.fillStyle = "white";
	_context.fillRect(0, 0, _canvas.width, _canvas.height);
	
	var terrainRendered = false; // Keep track of whether we've rendered terrain or not. 
	
	// Render terrain first if we don't care about depth ordering.
	if (!_zOrderRendering)
	{
		_drawTerrain();
		terrainRendered = true;
	}
	
	var drawList = _agents;
	if(_zOrderRendering) // If zOrdering enabled, sort agents by their depth for rendering.
	{
		var zOrderedList = [];
		for (var i = 0; i < _agents.length; i++)
		{
			zOrderedList.push(_agents[i])
		}
		zOrderedList.sort(
			function(a,b)
			{
				if (a.z < b.z)
					return -1;
				if (a.z > b.z)
					return 1;
				return 0;
			});
		drawList = zOrderedList;
	}
	
	for (var i = 0; i < drawList.length; i++)
	{	
		if(!terrainRendered && drawList[i].z >= 0)
		{
			_drawTerrain();
			terrainRendered = true;
		}
		
		_drawAgent(drawList[i]);
	}
}


// PRIVATE
/*
 * Renders the terrain.
 */
function _drawTerrain()
{
	if(_terrainReady && _terrainEnabled)
	{
		var origin = _camera.projectPoint(0, 0, 0);
		origin = [origin[0]*_viewWidth+_canvas.width/2, origin[1]*_viewHeight+_canvas.height/2];
		
		var width = _camera.projectXLength(_worldWidth, 0)*_viewWidth;
		var height = _camera.projectYLength(_worldHeight, 0)*_viewHeight;
		
		if(_assetMap.has(_terrain))
		{
			_context.drawImage(_assetMap.get(_terrain), Math.floor(origin[0]-width/2), Math.floor(origin[1]-height/2), 
				Math.floor(width), Math.floor(height));
		}
		else
		{
			_context.fillStyle = _terrain;
			_context.fillRect(Math.floor(origin[0]-width/2), Math.floor(origin[1]-height/2), 
				Math.floor(width), Math.floor(height));
		}
	}
}


// PRIVATE
// agent: Agent to be drawn.
/*
 * Draws a single agent to the canvas drawing space. If the sprite property of the agent's shape is
 * undefined or null, or if the sprite's asset has not finished loading, then a square will be drawn 
 * to represent the agent. 
 */
function _drawAgent(agent)
{
	var screenCoordinates = _camera.projectPoint(agent.x, agent.y, agent.z);
	screenCoordinates = [screenCoordinates[0]*_viewWidth+_canvas.width/2, 
		screenCoordinates[1]*_viewHeight+_canvas.height/2];
	
	var xSize = _camera.projectXLength(agent.size, agent.z)*_viewWidth;
	var ySize = _camera.projectYLength(agent.size, agent.z)*_viewHeight;
	
	if (_assetMap.has(agent.shape.sprite))
	{
		var agentSprite = _assetMap.get(agent.shape.sprite);
		
		// Fit size of rendered agent within its bounding box.
		if (agentSprite.width > agentSprite.height)
			ySize *= agentSprite.height/agentSprite.width;
		else
			xSize *= agentSprite.width/agentSprite.height;
		
		_context.drawImage(agentSprite, Math.floor(screenCoordinates[0]-xSize/2), Math.floor(screenCoordinates[1]-ySize/2),
			Math.floor(xSize), Math.floor(ySize));
	}
	else
	{
		if (agent.shape.sprite)
			CanvasRenderer.prototype.loadSprite(agent.shape.sprite);
		
		_context.fillStyle = agent.color;
		_context.fillRect(Math.floor(screenCoordinates[0]-xSize/2), Math.floor(screenCoordinates[1]-ySize/2),
			Math.floor(xSize), Math.floor(ySize));
	}
}


// PRIVATE
/*
 * Resizes the canvas viewport to fit its parent div. Pauses rendering during resize.
 */
function _onResize()
{
	if (_context)
	{
		var tempContext = document.createElement('canvas').getContext("2d");
		tempContext.canvas.width = _canvas.width;
		tempContext.canvas.height = _canvas.height;
		tempContext.drawImage(_canvas, 0, 0);
	}
	
	var divStyle = window.getComputedStyle(_parentDiv);
	var width = divStyle.getPropertyValue('width');
	var height = divStyle.getPropertyValue('height');
	_canvas.width = parseInt(width.substring(0, width.length-2));
	_canvas.height = parseInt(height.substring(0, height.length-2));
	
	if(_context)
		_context.drawImage(tempContext.canvas, 0, 0);
}
 
 
 

// Singleton object for interfacing with the renderer. Public methods declared below.
function CanvasRenderer() {}


// divElementID: Valid string ID for a div element. Div element should already be created with desired size to match
// 		canvas to.
// worldWidth: X dimension of world terrain in world space. Must be a positive Number. 
// worldHeight: Y dimension of world terrain in world space. Must be a positive Number.
// fov: The angle in degrees of the vertical field of view for the camera. Must be a number greater than 0 and less than 180.
// nearPlane: A distance in world space limiting how close objects can get to the camera before they do not get rendered.
// farPlane: A distance in world space limiting how far objects can get from the camera before they do not get rendered. 
// terrain: One of two possible parameter types.
//		- A color represented by an array of length 3 with the first element being the r component, second element 
//			the g component, and third the b component. Components are integers in the range [0,255].
//		- A url or file path to an image.
// pAgents: Reference to a list that contains all Agents desired to be rendered. 
/*
 * Prepares the renderer and canvas drawing space to draw Agents visible by the camera. The camera is initially set to
 * encompase the entire world in its view (or as much as possible given the far plane). If an rgb color, the terrain 
 * parameter is used to draw the terrain as a colored rectangle matching the dimensions of the world. If a path to an image, 
 * terrain is rendered as that image scaled to fit the dimensions of the world. A div element ID is taken as an argument so
 * that the renderer can create its own canvas element within that div to draw to. 
 */
CanvasRenderer.prototype.initCanvasRenderer = function(divElementID, worldWidth, worldHeight, fov, nearPlane, farPlane,
	terrain, pAgents) 
{
	_parentDiv = document.getElementById(divElementID);
	if (!_parentDiv)
		alert("Could not obtain div element. Failed to intitialize CanvasRenderer.");
	
	_canvas = document.createElement('canvas');
	_canvas.id = "viewport";
	if (!_canvas)
		alert("Could not create canvas element. Failed to intitialize CanvasRenderer.");
	_parentDiv.appendChild(_canvas);
	window.addEventListener("resize", _onResize);
	_onResize();
	
	_viewWidth = _canvas.width;
	_viewHeight = _canvas.height;
	
	_context = _canvas.getContext("2d");
	if (!_context)
		alert("Could not obtain canvas 2d context. Failed to initialize CanvasRenderer.");
	
	_worldWidth = worldWidth;
	_worldHeight = worldHeight;
	
	this.setTerrain(terrain);
	
	_agents = pAgents;
	
	this.setCamera(fov, nearPlane, farPlane);
	
	// Setup rendering on animation request. 
	var animationRequest = function()
	{
		if(_animating)
			_onAnimation();
		
		if(_rendering)
			_drawScene();
		
		window.requestAnimationFrame(animationRequest);
	}
	
	window.requestAnimationFrame(animationRequest);
}


// fov: The angle in degrees of the vertical field of view for the camera. Must be a number greater than 0 and less than 180.
// nearPlane: A distance in world space limiting how close objects can get to the camera before they do not get rendered.
// farPlane: A distance in world space limiting how far objects can get from the camera before they do not get rendered.
/*
 * Adjusts view settings of the camera or defines a new one set at a z position to fit as much of the terrain in its view
 * as possible.
 */
CanvasRenderer.prototype.setCamera = function (fov, nearPlane, farPlane)
{
	var aspectRatio = _viewWidth/_viewHeight;
	
	if (_camera)
		_camera = new _Camera(fov, nearPlane, farPlane, aspectRatio, 
			_camera.getPosition()[0], _camera.getPosition()[1], _camera.getPosition()[2]);
	else
	{	
		var fovRadians = fov * Math.PI / 180.0;
		
		var heightZ = _worldHeight / Math.tan(fovRadians/2.0); // Required z distance for camera to see top and bottom of
															   // terrain.
		var widthZ = _worldWidth / Math.tan(fovRadians/2.0) / aspectRatio; // Required z distance for camera to see left
																		   // and right of terrain.
		
		// Choose the z distance that will encompase the most of the terrain in the camera's view. 
		var zPosition;
		if (heightZ > widthZ && heightZ < farPlane)
			zPosition = heightZ;
		else if (heightZ <= widthZ && widthZ < farPlane)
			zPosition = widthZ;
		else
			zPosition = farPlane;
		
		_camera = new _Camera(fov, nearPlane, farPlane, aspectRatio, 0, 0, zPosition);
	}
}


/*
 * Returns the current position of the camera in world space as an array of length 3.
 */
CanvasRenderer.prototype.getCameraPosition = function ()
{
	return _camera.getPosition();
}


// x: New x position of the camera in world space. Pass null to keep the same position.
// y: New y position of the camera in world space. Pass null to keep the same position.
// z: New z position of the camera in world space. Pass null to keep the same position.
/*
 * Moves the camera to the specified world space position.
 */
CanvasRenderer.prototype.moveCameraTo = function (x, y, z)
{
	if (_camera)
		_camera.moveTo(x, y, z);
}


// deltaX: Signed x distance to move the camera in world space.
// deltaY: Signed y distance to move the camera in world space.
// deltaZ: Signed z distance to move the camera in world space.
/*
 * Adjusts the position of the camera by the given deltas.
 */
CanvasRenderer.prototype.moveCameraBy = function (deltaX, deltaY, deltaZ)
{
	if (_camera)
		_camera.moveBy(deltaX, deltaY, deltaZ);
}


// terrain: One of two possible parameter types.
//		- A color represented by an array of length 3 with the first element being the r component, second element 
//			the g component, and third the b component. Components are integers in the range [0,255].
//		- A url or file path to an image.
/*
 * Sets the terrain representation. If an rgb color, the terrain parameter is used to draw the terrain as a
 * colored rectangle matching the dimensions of the world. If a path to an image, terrain is rendered as that image 
 * scaled to fit the dimensions of the world.
 */
CanvasRenderer.prototype.setTerrain = function (terrain)
{
	if (terrain.constructor === Array)
	{
		// Convert to strings so that we can use them as fill styles.
		_terrain = "rgb(" + terrain[0] + "," + terrain[1] + "," + terrain[2] + ")";
		_terrainReady = true;
	}
	else
	{
		_terrainReady = false;
		
		this.loadSprite(terrain, 
			function()
			{
				_terrainReady = true;
			},
			function()
			{
				alert("Could not load terrain image.");
			});
		
		_terrain = terrain;
	}
}


// enable: True to enable terrain rendering, false to disable. Must be boolean. 
/*
 * Sets flag to enable or disable rendering of terrain.
 */
CanvasRenderer.prototype.enableTerrain = function (enable)
{
	_terrainEnabled = enable;
}


// pAgents: Reference to a list that contains all Agents desired to be rendered.
/*
 * Reconfigures the renderer to draw Agents in the list specified by pAgents. 
 */
CanvasRenderer.prototype.reassignAgents = function(pAgents)
{
	_agents = pAgents;
}


// enable: True to enable z ordering for rendering agents, false to disable. Must be boolean. 
/*
 * Sets flag to enable z ordering of agents to determine their draw order, enabling agents closer to the view to appear
 * on top of others. 
 */
CanvasRenderer.prototype.enableZOrdering = function(enable)
{
	_zOrderRendering = enable;
}


/*
 * Tells the renderer to begin or resume rendering the scene to the canvas. Requires that initCanvasRenderer() has been 
 * called. Does nothing if scene is currently being rendered. 
 */
CanvasRenderer.prototype.startDrawing = function()
{
	_rendering = true;
}


// clear: True to clear the canvas before stopping, false to leave last frame on canvas.
/*
 * Tells the renderer to stop rendering the scene to the canvas. Does nothing if the renderer is currently not
 * rendering the scene.
 */
CanvasRenderer.prototype.stopDrawing = function(clear)
{
	if (clear)
	{
		// Clear canvas to black
		_context.fillStyle = "black";
		_context.fillRect(0, 0, _canvas.width, _canvas.height);
	}
	
	_rendering = false;
}


/*
 * Tells the renderer to begin or resume calling the animation callback. Requires that initCanvasRenderer() has been 
 * called. Does nothing if the renderer is already executing the animation callback.
 */
CanvasRenderer.prototype.startAnimating = function()
{
	_animating = true;
}


/*
 * Tells the renderer to stop calling the animation callback. Does nothing if the renderer is currently not
 * calling the animation callback.
 */
CanvasRenderer.prototype.stopAnimating = function()
{
	_animating = false;
}


/*
 * Performs actions of startDrawing() and startAnimating() simultaneously. 
 */
CanvasRenderer.prototype.startDrawingAndAnimating = function()
{
	_rendering = true;
	_animating = true;
}


// clear: True to clear the canvas before stopping, false to leave last frame on canvas.
/*
 * Performs actions of stopDrawing() and stopAnimating() simultaneously. 
 */
CanvasRenderer.prototype.stopDrawingAndAnimating = function(clear)
{
	if (clear)
	{
		// Clear canvas to black
		_context.fillStyle = "black";
		_context.fillRect(0, 0, _canvas.width, _canvas.height);
	}
	
	_rendering = false;
	_animating = false;
}


// callback: Any function with no arguments. 
/*
 * Assigns a function for the renderer to call on a per frame basis. The callback function is executed before 
 * the next frame is rendered.
 */
CanvasRenderer.prototype.setAnimationCallback = function(callback)
{
	_onAnimation = callback;
}


/*
 * Forces the renderer to release all assets that it currently has loaded. This includes terrain.
 */
CanvasRenderer.prototype.clearAssets = function()
{
	_assetMap.clear();
}


// spritePath: A string representing a url or file path to a sprite asset.
// onSuccess: Optional parameter. Any function with no arguments.
// onFailure: Optional parameter. Any function with no arguments. 
/*
 * Loads the sprite specified by the spritePath argument into the _assetMap. 
 * If sprite loading succeeds, onSuccess() is called, otherwise onFailure() is called. 
 */
CanvasRenderer.prototype.loadSprite = function (spritePath, onSuccess, onFailure)
{
	var spriteImage = new Image();
	spriteImage.onload = function () 
	{ 
		createImageBitmap(this).then(
			function (bitmap) 
			{
				_assetMap.set(spritePath, bitmap);
				if(onSuccess)
					onSuccess();
			},
			function (reason)
			{
				alert("Could not create sprite bitmap for " + spritePath + ". " + reason);
				if(onFailure)
					onFailure();
			}); 
	};
	spriteImage.src = spritePath;
	spriteImage.onerror = function() 
		{ 
			alert("Could not load sprite asset for " + spritePath + "."); 
			if(onFailure)
				onFailure();
		};
}