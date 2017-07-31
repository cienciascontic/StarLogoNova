/*
 * Viewport2D is the main interface to the renderer and is responsible for drawing the scene. All components of the renderer 
 * are connected together through Viewport.
 */

// id: A string id for an html element to contain the canvas created by the Viewport. 
/*
 * The Viewport class is instantiated in order to setup the renderer and serves as the main interface to the renderer.
 * Instantiation of the Viewport fully prepares the renderer to begin rendering the scene. The viewport takes an html 
 * element such as a div and creates its own canvas element within that html element in which to render the scene. 
 */
Viewport2D = function (id)
{
	// Constants
	this.WHITE = 0xFFFFFF;

	// Flags:
	this.zOrderingEnabled = true; // True to order agents to be drawn according to their z-depth from the camera. 
	this.terrainEnabled = true; // True to enable rendering of terrain.
	this.needsUpdate = true; // Redraws scene if true, then sets back to false.
	
	// Fields:
	this.canvasParent = document.getElementById(id); // Container element for rendering canvas. 
	this.canvas = document.createElement("canvas"); // Rendering canvas.
	this.background = document.createElement("div"); // Black background for spaceland. 
	this.context = this.canvas.getContext("2d"); // Context for rendering to the canvas.
	this.clearColor = "rgba(0,0,0,1)"; // Color to clear canvas to between rendering frames. 
	this.lastColor = 0;
	
	// Error warnings:
	if (!this.canvasParent)
		alert("Could not obtain container element for canvas. Failed to intitialize Viewport.");
	if (!this.canvas)
		alert("Could not create canvas element. Failed to intitialize Viewport.");
	if (!this.context)
		alert("Could not obtain canvas 2d context. Failed to initialize Viewport.");
	
	// Setup:
	this.canvas.id = "renderer-canvas";
	this.background.id = "renderer-background";
	this.background.style.backgroundColor = "#101010";
	this.background.style.position = "absolute";
	this.background.style.zIndex = "-1000";
	this.background.style.perspective = "600px";
	this.background.style.webkitPerspective = "600px";
	this.background.style.mozPerspective = "600px";
	this.background.style.perspectiveOrigin = "50% 50%";
	this.background.style.webkitPerspectiveOrigin = "50% 50%";
	this.background.style.mozPerspectiveOrigin = "50% 50%";
	this.background.style.overflow = "hidden";
	this.canvasParent.appendChild(this.background);
	this.canvasParent.appendChild(this.canvas);
	this.canvas.setAttribute("tabindex", "1");
	window.addEventListener("resize", this.onResize.bind(this));
	this.onResize();
	
	// Fields:
	this.camera = new Camera2D(50, 0.1, 10000, this.canvas.width, this.canvas.height) 
	this.terrain = new Terrain(100);
	this.modelManager = new ModelManager2D(32);
	this.stats = new Stats();
	this.agentStates = [];
	this.cameraAgent = null;
	this.executionRate = 5;
    this.millisPerRun = ~~(1000/this.executionRate);
    this.lastExecTime = Date.now();
    this.timeSinceLastFrame = 10000;
	
	// Setup:
	this.stats.domElement.style.position = 'absolute';
    this.stats.domElement.style.bottom = '0px';
    this.canvasParent.appendChild(this.stats.domElement);
	this.camera.moveTo(0, 0, 220);
	this.camera.rotateTo(90, 0, 0);
	this.canvas.addEventListener("contextmenu", function (event) { event.preventDefault(); });

	// Terrain setup:
	this.terrain.getImage().style.position = "absolute";
	this.terrain.getImage().style.margin = "0 auto";
	this.terrain.getImage().style.zIndex = "-500";
	this.background.appendChild(this.terrain.getImage());

	// Camera Controls Setup (now using same controls as 3D):
	this.controls = new THREE.OrbitControls( this.camera, this.canvasParent );
	this.setWorldUp([0, 0, 1]);
    this.controls.mouseButtons.ORBIT = THREE.MOUSE.RIGHT;
    this.controls.mouseButtons.PAN = THREE.MOUSE.LEFT;
    this.controls.noKeys = true;
    this.controls.addEventListener( 'change', function(){
        this.terrain.needsUpdate = true;
    }.bind(this) );
}


// Methods:
Viewport2D.prototype =
{
	// Public Interface:
	
	/*
	 * Call to begin rendering frames to the canvas. 
	 */
	animate: function ()
	{
		var animationRequest = function()
		{
			var now = Date.now();
        	// if rate is 0 ("paused"), skip execution by pretending
        	// to have executed
	        if (this.executionRate == 0) {
	            this.lastExecTime = now;
	        }

	        // run the engine as many times as requested, unless the
	        // requested rate pulls the framerate below ~20fps
	        this.timeSinceLastFrame = now - this.lastExecTime;
	        if (this.timeSinceLastFrame < 50) {
	            // run the engine enough times to catch up to the current time
	            while (now > this.lastExecTime + this.millisPerRun) {
	                this.lastExecTime += this.millisPerRun;
	                this.needsUpdate = this.needsUpdate || Execution.Engine.tick();
	            }
	        }
	        else {
	            if (this.timeSinceLastFrame > this.millisPerRun) {
	                this.lastExecTime += this.millisPerRun;
	                this.needsUpdate = this.needsUpdate || Execution.Engine.tick();
	            }
	        }

	        if (this.needsUpdate || this.terrain.needsUpdate)
			{
				this.followAgent();
				this.drawScene();

				this.needsUpdate = false;
				this.terrain.needsUpdate = false;
			}
			
			this.stats.update();
		
			window.requestAnimationFrame(animationRequest.bind(this));
		};
	
		window.requestAnimationFrame(animationRequest.bind(this));
	},
	
	
	// url: url to model asset to load. 
	// tag: alias to load model under.
	// callback: an optional arguement for a function to be executed upon completion of model loading.
	/*
	 * Pre-loads a model into the renderer before render-time if the model has not already been loaded.
	 * Agents with shape equal to either url or tag will be rendered using the loaded model. An optional
	 * callback can be executed upon model loading completion. 
	 */
	loadModel: function (url, tag, callback)
	{
		this.modelManager.associateTagToUrl(tag, url);
		var self = this;
		var updateCallback = function () {
            if (callback)
                callback();
            self.needsUpdate = true;
        };
		return this.modelManager.getModel(url, updateCallback);
	},


	/*
	 * Clears all models from memory. Models must be reloaded to render agents with them again.
	 */
	clearModels: function() 
	{
        this.modelManager.clearModels();
    },


	// lightDirection: An array of length 3 representing a vector for the new direction of parallel light in the scene.
	/* 
	 * Sets the direction of light in the scene.
	 */
    setLight: function(lightDirection) 
    { 
        // TODO: Implement.
    },


    // upVector: An array of length 3 representing the new world up vector.
    /*
     * Sets current world up vector, or the up axis for camera controls (theta rotation spins around this axis,
     * phi rotation is the angle away from this axis).
     */
    setWorldUp: function(upVector) 
    {
        this.camera.up.copy(new THREE.Vector3(upVector[0], upVector[1], upVector[2]));
        this.controls.up0 = this.camera.up.clone();
        this.controls.update();
    },


    // agentStates: Reference to a list of agent states.
    /*
     * Sets list of agent states to use in rendering scene.
     */
    setAgentStates: function(agentStates) 
    {
    	this.agentStates = agentStates;
    },


    // agentPrevStates: Reference to a list of agent states.
    /*
     * Sets list of previous agent states to use in rendering scene (used for tweening).
     */
    setAgentPrevStates: function(agentPrevStates)
    {
    	// TODO: Implement.
    },


    // agentState: An agent state instance corresponding to the agent the camera should follow, or undefined/null
    /*
     * Assign an agent for the camera to follow. Assigning undefined or null causes the camera to stop following the agent.
     */
    setCameraAgent: function(agentState) 
    {
        this.cameraAgent = agentState;
    },


    // rate: Frames per second.
    /*
     * Sets rate at which scene should be redrawn (to sync with execution engine).
     */
    setExecRate: function(rate) 
    {
       	this.executionRate = rate;
        if (this.executionRate == 0) return;
        this.millisPerRun = ~~(1000/this.executionRate);
        this.lastExecTime = Date.now();
    },


	// granularity: New rotation granularity for models (number of discrete rotations for a model viewed from a given angle).
	/*
	 * Sets a new rotation granularity for models.
	 */
	setRotationGranularity: function (granularity)
	{
		this.modelManager.setRotationGranularity(granularity);
	},
	
	
	// enable: True to enable terrain rendering, false to disable. Must be boolean. 
	/*
	 * Sets flag to enable or disable rendering of terrain.
	 */
	toggleTerrain: function (enable)
	{
		this.terrainEnabled = enable;

		if (enable)
			this.terrain.getImage().style.display = "initial";
		else
			this.terrain.getImage().style.display = "none";
	},


	// enable: True to display framerate statistics window, false to hide it.
	/*
	 * Hide or display framerate statistics window.
	 */
	toggleStats: function(enable) 
	{
        if (enable)
            this.stats.domElement.style.display = "block";
        else
            this.stats.domElement.style.display = "none";
    },


    // enable: True to enable user control of camera, false to disable it.
    /*
     * Toggles whether user can control camera or not.
     */
    toggleControls: function(enable) 
    {
        this.controls.toggleControls(enable);
    },


	// enable: True to enable z ordering for rendering agents, false to disable. Must be boolean. 
	/*
	 * Sets flag to enable z ordering of agents to determine their draw order, enabling agents closer to the view to appear
	 * on top of others. 
	 */
	toggleZOrdering: function (enable)
	{
		this.zOrderingEnabled = enable;
	},

	
	// Private Methods:
	
	/*
	 * Draws all Agents in the Agent list the renderer currently has a reference to.
	 */
	drawScene: function ()
	{
		// Clear canvas
		// this.context.clearRect(0, 0, this.canvas.width, this.canvas.height); // only need this if clear color is transparent
		this.context.fillStyle = this.clearColor;
		this.context.fillRect(0, 0, this.canvas.width, this.canvas.height);
		this.lastColor = this.clearColor;

		var terrainRendered = false; // Keep track of whether we've rendered terrain or not. 
	
		// Render terrain first if we don't care about depth ordering or there are no agents to draw.
		if (!this.zOrderingEnabled || this.agentStates[1] === undefined)
		{
			this.drawTerrain();
			terrainRendered = true;
		}
	
		var drawList = this.agentStates;
		if(this.zOrderingEnabled) // If zOrdering enabled, sort agents by their depth for rendering.
		{
			var zOrderedList = drawList.slice(1);
			zOrderedList.sort(
				function(a,b)
				{
					if (b === undefined || a.z < b.z)
						return -1;
					if (a === undefined || a.z > b.z)
						return 1;
					return 0;
				});
			drawList = zOrderedList;
		}
	
		var start = 0;
		if (!this.zOrderingEnabled)
			start = 1;
		for (var i = start; i < drawList.length; i++) 
		{	
			if (drawList[i] === undefined)
				break;

			if(!terrainRendered && drawList[i].z >= 0)
			{
				this.drawTerrain();
				terrainRendered = true;
			}
		
			this.drawAgent(drawList[i]);
		}

		// now that the scene has been rendered, replace the black background with
		// transparent pixels
		this.removeBlackBackground();
	},


	/**
	 * Replaces black pixels in the canvas with transparent ones, to let the terrain
	 * show through the black background.
	 * (The background needs to be opaque black for the color blending of agents to work.)
	 */
	removeBlackBackground: function ()
	{
		var imgData = this.context.getImageData(0, 0, this.canvas.width, this.canvas.height);
		var subpixels = imgData.data;

		for (var i=0; i < subpixels.length; i+=4) {
			// if R, G, B are all 0...
			if (subpixels[i] == 0 && subpixels[i+1] == 0 && subpixels[i+2] == 0) {
				// ... then set the alpha to 0 so the pixel will be transparent
				subpixels[i+3] = 0;
			}
		}

		this.context.putImageData(imgData, 0, 0);
	},

	/*
	 * Renders the terrain.
	 */
	drawTerrain: function ()
	{
		if(this.terrainEnabled)
		{
			this.terrain.updateFromPixelArray();

			var origin = this.camera.projectPoint(0, 0, 0);
		
			var width = this.camera.projectXLength((this.terrain.MAPSIZE+1)*2, origin[2]);
			var height = this.camera.projectYLength((this.terrain.MAPSIZE+1)*2, origin[2]);

			var cameraPos = this.camera.getPosition();
			var xDisp = Math.floor(-cameraPos[0]);
			var yDisp = Math.floor(cameraPos[1]);

			var cameraRot = this.camera.getOrientation();

			var terrainScale = 1.0/this.terrain.getImage().width;
	 		var scaleMatrix = new THREE.Matrix4();
			scaleMatrix.makeScale(terrainScale*width, terrainScale*height, 1);

			var rotationMatrix = new THREE.Matrix4();
			rotationMatrix.makeRotationFromEuler(new THREE.Euler(cameraRot[0]*Math.PI/180-(Math.PI/2), 
				cameraRot[1]*Math.PI/180, cameraRot[2]*Math.PI/180, "XYZ"));

			var terrainMat = new THREE.Matrix4();
			terrainMat.multiplyMatrices(rotationMatrix, scaleMatrix);

			this.terrain.getImage().style.transform = "matrix3d("+terrainMat.elements[0]+","+terrainMat.elements[1]+","+
				terrainMat.elements[2]+","+terrainMat.elements[3]+","+terrainMat.elements[4]+","+terrainMat.elements[5]+","+
				terrainMat.elements[6]+","+terrainMat.elements[7]+","+terrainMat.elements[8]+","+terrainMat.elements[9]+","+
				terrainMat.elements[10]+","+terrainMat.elements[11]+","+terrainMat.elements[12]+","+terrainMat.elements[13]+","+
				terrainMat.elements[14]+","+terrainMat.elements[15]+")";
			this.terrain.getImage().style.mozTransform = this.terrain.getImage().style.transform;
			this.terrain.getImage().style.webkitTransform = this.terrain.getImage().style.transform;

			this.terrain.getImage().style.left = (origin[0]-this.terrain.getImage().width/2+2)+"px";
			this.terrain.getImage().style.top = (origin[1]-this.terrain.getImage().height/2+2)+"px";
		

			// Old top-down terrain rendering method
			// this.context.save();
			
			// this.context.translate(Math.floor(origin[0]), Math.floor(origin[1]))
			// if (this.camera.getOrientation[2] != 0)
			// 	this.context.rotate(this.camera.projectHeading(0) * Math.PI / 180);
			
			// this.context.drawImage(this.terrain.getImage(), 0, 0, this.terrain.TEXTURESIZE, this.terrain.TEXTURESIZE,
			// 	Math.floor(-width/2), Math.floor(-height/2), Math.floor(width), Math.floor(height));
				
			// this.context.restore();

			// var terrainCanvas = this.terrain.getImage();
		}
	},

	colorArray: [0,0,0,0],
	fillImageData: function (foregroundData, backgroundData, color) {
		this.colorArray = [((color & 0xFF0000) >> 16), ((color & 0x00FF00) >> 8),
      		(color & 0x0000FF), 255];
		// for any blank pixels (actually any blank channels), let the existing image show throw
		for (var p = 0; p < foregroundData.length; p+=4) {
			for (var i = 0; i < 4; i++) {
				if (foregroundData[p+i] == 0) {
					foregroundData[p+i] = backgroundData[p+i];
				} else {
					foregroundData[p+i] = (foregroundData[p+i]*this.colorArray[i]) >> 8;
				}
			}
		}
	},

	// agent: Agent to be drawn.
	/*
	 * Draws a single agent to the canvas drawing space. If the sprite property of the agent's shape is
	 * undefined or null, or if the sprite's asset has not finished loading, then a rectangle will be drawn 
	 * to represent the agent. 
	 */
	drawAgent: function (agent)
	{
		var model = this.modelManager.getModel(agent.shape);

		// Have to adjust agent coordinates to center of agent model before projecting to screen space.
		var screenCoordinates = this.camera.projectPoint(agent.x, agent.y, agent.z+model.getHeightAdjustment()*agent.size);
		
		// Third value of screenCoordinates is z-distance from camera in view space.
		var xSize = this.camera.projectXLength(agent.size, screenCoordinates[2])*model.getScaleFactor();
		var ySize = this.camera.projectYLength(agent.size, screenCoordinates[2])*model.getScaleFactor();

		var viewAdjusts = this.camera.getViewAdjustment(this.controls.getAzimuthalAngle()*180/Math.PI-agent.heading, 
			this.controls.getPolarAngle()*180/Math.PI, screenCoordinates[0], screenCoordinates[1]);
		
		if (agent.shape && model.loaded())
		{
			var renderSprite = model.getSprite(viewAdjusts[0], viewAdjusts[1]);
			var originalSprite = model.getSprite(0, 0);

			if (agent.color == this.WHITE)
			{
				this.context.drawImage(renderSprite, Math.floor(screenCoordinates[0]-xSize/2), Math.floor(screenCoordinates[1]-ySize/2), 
					Math.floor(xSize), Math.floor(ySize));
			}
			else
			{
				// Clear region where sprite will be drawn.
				this.context.globalCompositeOperation = "destination-out";
				this.context.drawImage(renderSprite, Math.floor(screenCoordinates[0]-xSize/2), Math.floor(screenCoordinates[1]-ySize/2), 
					Math.floor(xSize), Math.floor(ySize));
				// Draw in color of agent into space where it will be.
				this.context.globalCompositeOperation = "destination-over";
				if (this.lastColor != agent.color) { // only need to update fillStyle (slow) if this is a new color
					this.lastColor = agent.color;
					this.context.fillStyle = this.colorNumberToFillStyle(agent.color); 
				}
				this.context.fillRect(Math.floor(screenCoordinates[0]-xSize/2), Math.floor(screenCoordinates[1]-ySize/2), 
					Math.floor(xSize), Math.floor(ySize));
				// Draw agent over its color with multiply blending.
				this.context.globalCompositeOperation = "multiply";
				this.context.drawImage(renderSprite, Math.floor(screenCoordinates[0]-xSize/2), Math.floor(screenCoordinates[1]-ySize/2), 
					Math.floor(xSize), Math.floor(ySize));

				// Restore composite operation
				this.context.globalCompositeOperation = "source-over";


				// // Per-pixel manual color filter method with getImageData
				// var buffer = document.createElement("canvas");
				// var tempctx = buffer.getContext('2d');
				// tempctx.drawImage(renderSprite, 0, 0, Math.floor(xSize), Math.floor(ySize));
				// var imgData = tempctx.getImageData(0,0,Math.floor(xSize), Math.floor(ySize));
				// var destImgData = this.context.getImageData(Math.floor(screenCoordinates[0]-xSize/2), Math.floor(screenCoordinates[1]-ySize/2), Math.floor(xSize), Math.floor(ySize));
				// this.fillImageData(imgData.data, destImgData.data, agent.color);
				// this.context.putImageData(imgData, Math.floor(screenCoordinates[0]-xSize/2), Math.floor(screenCoordinates[1]-ySize/2));

				// this.context.drawImage(renderSprite, Math.floor(screenCoordinates[0]-xSize/2), Math.floor(screenCoordinates[1]-ySize/2), 
				// 	Math.floor(xSize), Math.floor(ySize));
				// // Draw in color of agent into space where it will be.
				// this.context.globalCompositeOperation = "multiply";
				// this.context.fillStyle = this.hexToFillStyle(agent.color);
				// this.context.fillRect(Math.floor(screenCoordinates[0]-xSize/2), Math.floor(screenCoordinates[1]-ySize/2), 
				// 	Math.floor(xSize), Math.floor(ySize));
				// // Restore composite operation
				// this.context.globalCompositeOperation = "source-over";

			}
		}
		else // Else draw a rectangle while waiting for model to load.
		{
			// Translate and rotate canvas for rendering.
			this.context.save();
			this.context.translate(Math.floor(screenCoordinates[0]), Math.floor(screenCoordinates[1]))
			if (agent.heading != this.camera.getOrientation()[2])
				this.context.rotate(this.camera.projectHeading(agent.heading)[0] * Math.PI / 180);
			
			this.context.fillStyle = this.colorNumberToFillStyle(agent.color);
			this.context.fillRect(Math.floor(-xSize/2), Math.floor(-ySize/2), Math.floor(xSize), Math.floor(ySize));
			this.context.restore();
		}
	},


	/*
	 * Resizes the canvas viewport to fit its parent container. Pauses rendering during resize.
	 */
	onResize: function ()
	{
		if (this.context)
		{
			var tempContext = document.createElement('canvas').getContext("2d");
			tempContext.canvas.width = this.canvas.width;
			tempContext.canvas.height = this.canvas.height;
			tempContext.drawImage(this.canvas, 0, 0);
		}
	
		if (this.canvasParent.offsetWidth == 0 || this.canvasParent.offsetHeight == 0)
        {
            var divStyle = window.getComputedStyle(this.canvasParent);

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

            this.canvas.width = offsetWidth;
			this.canvas.height = offsetHeight;
        }
        else
		{
			this.canvas.width = this.canvasParent.offsetWidth;
			this.canvas.height = this.canvasParent.offsetHeight;
		}

		this.background.style.width = (this.canvas.width)+"px";
		this.background.style.height = (this.canvas.height)+"px";
		
		if (this.camera)
			this.camera.updateView(this.canvas.width, this.canvas.height);
	
		if (this.context)
			this.context.drawImage(tempContext.canvas, 0, 0);

		this.needsUpdate = true;
	},


	/*
	 * Make camera follow agent if this.cameraAgent points to an agent state.
	 */
	followAgent: function () 
	{
		if (this.cameraAgent)
		{
			this.camera.moveTo(this.cameraAgent.x, this.cameraAgent.y, 
				(this.cameraAgent.z+1)*this.cameraAgent.size+(10+this.cameraAgent.size));
			this.camera.rotateTo(null, null, -this.cameraAgent.heading-90);
		}
	},


	// hex: An integer in the range [0x0, 0xFFFFFF]
	/*
	 * Converts a hex number representing an rgb color to a fill style.
	 */
	hexToFillStyle: function (hex)
	{
		var hexString = hex.toString(16);
		while (hexString.length < 6)
		{
			hexString = "0"+hexString;
		}
		return "#"+hexString;
	},


	/*
	 * Converts a number representing an rgb color to a fill style.
	 * (Faster than generating a hex string, and works on floats too.)
	 */
	colorNumberToFillStyle: function(color) {
		var c = ~~color;
		return "rgb("+((c & 0xFF0000) >> 16)+","+((c & 0x00FF00) >> 8)+","+(c & 0x0000FF)+")";
	},

	// r: red component, range [0,1]
	// g: green component, range [0,1]
	// b: blue component, range [0,1]
	/*
	 * Creates a fillStyle from the provided rgb components.
	 */
	rgbToFillStyle: function (r, g, b) 
	{
		return "rgb("+r+","+g+","+b+")";
	}
}