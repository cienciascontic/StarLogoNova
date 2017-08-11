Viewport = function ( id ) {
    var self = this;

    self.renderList = [];

    // HTML element to store viewport
    self.container = document.getElementById( id );
    self.instances = 10;
    self.needsUpdate = true;

    // TODO background color could be input param, set by user
    self.clearColor = new THREE.Color(0x101010);

    // SET SCENE
    self.scene = new THREE.Scene();

    // SET RENDERER
    if (!self.container)
    	self.container = { offsetWidth: 256/window.devicePixelRatio, offsetHeight: 256/window.devicePixelRatio, fake: true };
    self.renderer = self.setRenderer(self.container, self.clearColor);
    if (!self.container.fake)
    	self.container.appendChild(self.renderer.domElement);
    self.renderer.domElement.setAttribute("id", "renderer-canvas");
    self.renderer.domElement.setAttribute("tabindex", "1");

    // SET MODELMANAGER
    self.modelManager = new ModelManager(self.scene);

    // setup camera
    self.resetCamera();

    // SET TERRAIN
    self.terrain = self.setTerrain(self.scene);

    // SET STATS MODULE
    if (!self.container.fake)
    	self.stats = self.setStats(self.container);

    // SET AGENT STATES
     self.setAgentStates();

    // CHECK IF INSTANCES SUPPORTED
    if ( !self.renderer.extensions.get( 'ANGLE_instanced_arrays' ) ) {
        throw this.INSTANCING_NOT_SUPPORTED;
    }

    self.executionRate = 5;
    self.millisPerRun = 1000/self.executionRate;
    self.lastExecTime = performance.now();

    // Function to update each frame
    self.animate = function() {
        requestAnimationFrame( self.animate );

        var now = performance.now();
        // if rate is 0 ("paused"), skip execution by pretending
        // to have executed
        if (self.executionRate == 0) {
            self.lastExecTime = now;
        }

        var timeSinceLastExec = now - self.lastExecTime;
        var timeSinceLastUpdate = now - self.lastUpdateTime;

        // run the engine as many times as requested, unless the
        // framerate is falling below ~20fps. Note that reported framerate
        // will stay at 60 (render is called every frame!), but visible framerate
        // depends on whether we update or not. So 1000/timeSinceLastUpdate gives
        // actual perceived framerate.
        if (timeSinceLastUpdate < 50) {

            // run the engine enough times to catch up to the current time, as long as it doesn't drop below 20fps
            while (timeSinceLastExec >= self.millisPerRun &&  timeSinceLastUpdate < 50) {
                self.lastExecTime += self.millisPerRun;
                self.needsUpdate = Execution.Engine.tick() || self.needsUpdate;
                now = performance.now();
                timeSinceLastExec = Math.max(Math.min(now - self.lastExecTime, self.millisPerRun),0);
                timeSinceLastUpdate = now - self.lastUpdateTime;
                self.tweening = self.needsUpdate;
            }
        }
        else {
            if (timeSinceLastExec > self.millisPerRun) {
                self.lastExecTime += self.millisPerRun;
                self.needsUpdate = Execution.Engine.tick() || self.needsUpdate;
                now = performance.now();
                timeSinceLastExec = Math.max(0, Math.min(now - self.lastExecTime, self.millisPerRun));
                self.tweening = self.needsUpdate;
            } 
        }

        // update the display at ~30 FPS if still tweening between executions. If nothing
        // is running, the tweening will stop after one tick of nothing changing.
        self.needsUpdate = (self.needsUpdate || self.tweening) && (now-self.lastUpdateTime > 33);

        var proportion = self.tweening ? timeSinceLastExec / self.millisPerRun : 1;
        self.render(proportion);
        if (self.stats)
        	self.stats.update();
    }

    // window resize listener
    window.addEventListener( 'resize', function( event ) {
        self.camera.aspect = self.container.offsetWidth / self.container.offsetHeight;
        self.camera.updateProjectionMatrix();

        self.renderer.setSize( self.container.offsetWidth, self.container.offsetHeight );
        self.needsUpdate = true;
    }, false );
}

Viewport.prototype = {
    // Strings used as exceptions:
    INSTANCING_NOT_SUPPORTED: "INSTANCING_NOT_SUPPORTED",
    WEBGL_NOT_SUPPORTED: "WEBGL_NOT_SUPPORTED",

    // SCENE SETUP
    setCamera: function (container) {
        var camera = new THREE.PerspectiveCamera( 50, container.offsetWidth / container.offsetHeight, 0.1, 10000 );
        camera.position.z = 220;
        return camera;
    },
    resetCamera: function() {
        // SET CAMERA
        this.camera = this.setCamera(this.container);

        // SET CONTROLS
        this.controls = this.setControls(this.camera, this.renderer);
        this.setWorldUp([0, 0, 1]);
        var self = this;
        this.controls.addEventListener( 'change', function(){
            self.terrain.needsUpdate = true;
        } );
        this.needsUpdate = true;
    },
    setRenderer: function(container, color) {
        try {
            var params = {alpha: true};
            var renderer = new THREE.WebGLRenderer(params);
        }
        catch(e) {
            throw this.WEBGL_NOT_SUPPORTED;
        }
        renderer.setClearColor(color);
        renderer.setPixelRatio( window.devicePixelRatio );

        // Sometimes offsetWidth and offsetHeight are not calculated yet. In that case try to calculate it ourselves.
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

            renderer.setSize( offsetWidth, offsetHeight );
        }
        else
            renderer.setSize( container.offsetWidth, container.offsetHeight );
        
        return renderer;
    },
    setTerrain: function(scene) {
        var terrain = new Terrain(100,100);
        var ground = terrain.getMesh();
        scene.add(ground);
        return terrain;
    },
    setControls: function(camera, renderer) {
        var controls = new THREE.OrbitControls( camera, renderer.domElement );
        controls.mouseButtons.ORBIT = THREE.MOUSE.RIGHT;
        controls.mouseButtons.PAN = THREE.MOUSE.LEFT;
        controls.noKeys = true;
        return controls;
    },
    setStats: function(container) {
        var stats = new Stats();
        stats.domElement.style.position = 'absolute';
        stats.domElement.style.bottom = '0px';
        container.appendChild( stats.domElement );
        return stats;
    },
    // Takes in an array of length 3.
    setLight: function(lightDirection) { 
        this.modelManager.setLight(lightDirection);
        this.needsUpdate = true;
    },
    // Takes in an array of length 3.
    setWorldUp: function(upVector) {
        this.camera.up.copy(new THREE.Vector3(upVector[0], upVector[1], upVector[2]));
        this.controls.up0 = this.camera.up.clone();
        this.controls.update();
    },
    setAgentStates: function(agentStates) {
      this.agentStates = (agentStates !== undefined) ? agentStates: [];
    },
    setAgentPrevStates: function(agentPrevStates) {
      this.agentPrevStates = (agentPrevStates !== undefined) ? agentPrevStates: [];
    },
    setCameraAgent: function(agentState, prevState) {
        if (!this.cameraAgent && agentState) {
            this.overheadCamera = this.camera.clone(this.camera);
            this.toggleControls(false);
        }
        this.cameraAgent = agentState;
        this.cameraAgentPrev = prevState;
        if (!this.cameraAgent) {
            this.camera = this.overheadCamera || this.camera;
            this.toggleControls(true);
        }
    },
    setExecRate: function(rate) {
        this.executionRate = rate;
        if (this.executionRate == 0) return;
        this.millisPerRun = 1000/this.executionRate;
    },

    toggleTerrain: function(enable) {
        if (enable) {
            if (this.scene.children.indexOf(this.terrain) < 0)
                this.scene.add(this.terrain.getMesh());
        }
        else
            this.scene.remove(this.terrain.getMesh());
    },

    toggleStats: function(enable) {
    	if (!this.stats)
    		return;
        if (enable)
            this.stats.domElement.style.display = "block";
        else
            this.stats.domElement.style.display = "none";
    },

    toggleControls: function(enable) {
        this.controls.toggleControls(enable);
    },

    // Calls the ModelManager to load a model before render-time
    // Loads model from url under the alias tag (agents with shape tag will render with the loaded model).
    // Callback is an optional function to be called when the model has finished loading.
    loadModel: function(url, tag, callback) {
        this.modelManager.associateTagToUrl(tag, url);
        var updateCallback = function () {
            if (callback)
                callback();
            this.needsUpdate = true;
        }
        return this.modelManager.getModel(tag, updateCallback);
    },

    // Calls the ModelManager to clear all its preloaded models.
    clearModels: function() {
        this.modelManager.clearModels();
    },

    // Add all agent variables to batches, call ModelManager.render
    render: function(proportion) {
        seed = 0;  // TESTING ONLY
        this.lastDrawTime = performance.now();

        if (this.needsUpdate || this.terrain.needsUpdate) { // only render when engine says necessary
            this.needsUpdate = false;
            this.lastUpdateTime = this.lastDrawTime;
            if (this.terrain.needsUpdate) {
                this.terrain.updateFromPixelArray();
                this.terrain.needsUpdate = false;
            }
            this.modelManager.addAll(this.agentStates, this.agentPrevStates, proportion);

            if (this.cameraAgent) {
                this.followAgent(this.cameraAgent, this.cameraAgentPrev, proportion);
            }

            this.modelManager.render();
            this.renderer.render( this.scene, this.camera );
            this.modelManager.clearInstances();
        }
    },

    followAgent: function(agent, prev, proportion) {
        // tween the agent state
        agent = agent.copy();
        this.modelManager.tween(agent, prev, proportion);
        // position the camera behind and above the target agents
        var camX = agent.x - Math.cos(agent.heading*Math.PI/180)*(agent.size+30);
        var camY = agent.y - Math.sin(agent.heading*Math.PI/180)*(agent.size+30);

        this.camera.position.set(camX, camY, (agent.z+1)*agent.size+(10+agent.size));
        this.camera.lookAt(new THREE.Vector3(agent.x, agent.y, (agent.z+1)*agent.size));
    }
}
