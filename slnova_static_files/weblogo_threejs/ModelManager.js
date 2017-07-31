ModelManager = function ( scene ) {
	this.builtIn = ['Sphere', 'Cube', 'Pyramid', 'Triangle'];
	this.models = {};
	this.batches = {};
	this.scene = scene;
  this.tagToUrl = new Map();
  this.light = [-5.0, 10.0, 10.0]; // Initial scene light direction.

  // Defining persistent temporary agent state variable for re-use as workaround for
  // http://benediktmeurer.de/2016/10/11/the-case-of-temporary-objects-in-chrome/.
  // Basically, garbage collection can cause de-optimization if temp variables are gc'ed,
  // so we need to keep this persistent for now. See addAll for where to remove this when
  // the bug is fixed.
  this.tempState = new Execution.AgentState();
}



ModelManager.prototype = {
    associateTagToUrl: function(tag, url) {
        this.tagToUrl.set(tag, url);
    },

    // Returns the FileModel or ShapeModel object, loads the model if necessary
    // callback is an optional argument for a function to be run upon model being fully loaded.
	getModel: function(model, callback) {
    const tagRegEx = /asset_3D Model_[0-9]+/;

    // If model is not an unassociated tag 
    if (!(tagRegEx.test(model) && !this.tagToUrl.has(model)));
    {
  		if (!this.models[model]) {
  			if (this.isBuiltIn(model)) {
                  // Built-in shapes are stored in a ShapeModel
  				this.models[model] = new ShapeModel(model, this.light);
  				var geometry = this.models[model].getGeometry();
  				var material = this.models[model].getMaterial();

  				var mesh = new THREE.Mesh( geometry, material );
  				this.scene.add( mesh );
          if (callback)
            callback();
  			} else {
                  // OBJ and Collada files stored in FileModel

                  // If model is a tag, convert it to a url.
                  var fileUrl = model;
                  if (this.tagToUrl.has(model))
                      fileUrl = this.tagToUrl.get(model);

  				this.models[model] = new FileModel(fileUrl, this.light,
  					function(geometry, material) {
  						var mesh = new THREE.Mesh( geometry, material ); // TODO store mesh in model, just getMesh
  						this.scene.add(mesh);
  					}.bind(this),
            callback
  				);
  			}
  		}
      else if (callback)
      {
        callback();
      }
      return this.models[model];
    }
    
    // Callback is still called even if an unassociated tag is passed. 
    if (callback)
    {
      callback();
    }
	},

    // Check if shape is in our list of built in models
	isBuiltIn: function(model) {
		if (this.builtIn.indexOf(model)>-1) return true;
		return false;
	},

    // Add an agent's batch information to the appropriate dictionary
	add: function(agent) {
		var s = agent.shape;
		this.getModel(s);
        // Create new batch if necessary
		if (!this.batches[s]) {
			this.batches[s] = {translations:[],
								rotations:[],
								rotations:[],
								scales:[],
								colors:[],
								instances: 0}
		}
		this.batches[s].translations.push(agent.translate[0], agent.translate[1], agent.translate[2]);
        // Convert rotations to quaternions
		var rotate = new THREE.Quaternion();
		rotate.set( agent.rotate[0]*Math.PI/180, agent.rotate[1]*Math.PI/180, agent.rotate[2]*Math.PI/180, 1 );
		rotate.normalize();
		this.batches[s].rotations.push(rotate.x, rotate.y, rotate.z, rotate.w);
		this.batches[s].scales.push(agent.scale[0], agent.scale[1], agent.scale[2]);
		this.batches[s].colors.push(agent.color[0], agent.color[1], agent.color[2]);
		++this.batches[s].instances;
	},

  addAll: function(agentStates, agentPrevStates, proportion) {
    this.batches = {};

    var shapeCounts = {}
    for (var i = 1, len = agentStates.length; i < len; i++) {  // start at 1 to skip the world
      if (agentStates[i] === undefined) {
        break
      }
      var shape = agentStates[i].shape;
      if (!shape) // Skip if shape is undefined or null.
        continue;
      shapeCounts[shape] = 1 + (shapeCounts[shape] || 0);
    }

    for (var shape in shapeCounts) {
      if (shapeCounts.hasOwnProperty(shape)) {
        var count = shapeCounts[shape];
        this.batches[shape] = {
          translations: new Array(3 * count),
          rotations: new Array(4 * count),
          scales: new Array(3 * count),
          colors: new Array(3 * count),
          instances: count,
          index: 0
        }
      }
    }

    var rotate = new THREE.Quaternion();
    var uz = new THREE.Vector3(0,0,1);
    for (var i = 1, len = agentStates.length; i < len; i++) {  // start at 1 to skip the world
      if (agentStates[i] === undefined) {
        break;
      }
      this.tempState.copyFrom(agentStates[i]); // convert to local variable tempState once V8 GC bug is fixed!
      if (agentPrevStates && agentPrevStates[i]) {
        this.tween(this.tempState, agentPrevStates[i], proportion);
      }
      var shape = this.tempState.shape;

      if (!shape) // Skip if shape is undefined or null.
        continue;

      var j = this.batches[shape].index;
      this.batches[shape].translations[3*j] = this.tempState.x;
      this.batches[shape].translations[3*j+1] = this.tempState.y;
      this.batches[shape].translations[3*j+2] = this.tempState.z;

      rotate.setFromAxisAngle(uz, this.tempState.heading * Math.PI / 180, 1);
      rotate.normalize();
      this.batches[shape].rotations[4*j] = rotate.x;
      this.batches[shape].rotations[4*j+1] = rotate.y;
      this.batches[shape].rotations[4*j+2] = rotate.z;
      this.batches[shape].rotations[4*j+3] = rotate.w;

      this.batches[shape].scales[3*j] = this.tempState.size;
      this.batches[shape].scales[3*j+1] = this.tempState.size;
      this.batches[shape].scales[3*j+2] = this.tempState.size;

      this.batches[shape].colors[3*j] = ((this.tempState.color & 0xFF0000) >> 16) / 255;
      this.batches[shape].colors[3*j+1] = ((this.tempState.color & 0x00FF00) >> 8) / 255;
      this.batches[shape].colors[3*j+2] = (this.tempState.color & 0x0000FF) / 255;

      this.batches[shape].index ++;
    }

  },

  tween: function(state, prevState, proportion) {
    state.x = prevState.x + proportion*(state.x - prevState.x);
    state.y = prevState.y + proportion*(state.y - prevState.y);
    state.z = prevState.z + proportion*(state.z - prevState.z);
    state.size = prevState.size + proportion*(state.size - prevState.size);
    var headingDiff = state.heading - prevState.heading;
    if (Math.abs(headingDiff) > 180) {
      headingDiff = (360-Math.abs(headingDiff)) * -Math.sign(headingDiff)
    }
    state.heading = prevState.heading + proportion*headingDiff;

    // don't tween shape; we don't have shape morphing capability.
    // only tween color if color has changed, because it changes rarely
    // and the tween is slow to compute.
    if (state.color != prevState.color) {
      var red = ((state.color & 0xFF0000) >> 16);
      var green = ((state.color & 0x00FF00) >> 8);
      var blue  = (state.color & 0x0000FF);
      var prevRed = ((prevState.color & 0xFF0000) >> 16);
      var prevGreen = ((prevState.color & 0x00FF00) >> 8);
      var prevBlue  = (prevState.color & 0x0000FF);
      red = Math.round(prevRed + proportion*(red - prevRed));
      green = Math.round(prevGreen + proportion*(green - prevGreen));
      blue = Math.round(prevBlue + proportion*(blue - prevBlue));
      state.color = (red << 16) + (green << 8) + blue;
    }
  },

    // Iterate over each model, loading all the batched properties into buffers
    // Duplicates size of attribute buffers if agent count has increased
	render: function() {
        for (var model in this.batches) {
            var m = this.getModel(model);
            var geometries = m.getGeometries();
            for (var j=0; j<geometries.length; j++) {
                var g = geometries[j];
                g.maxInstancedCount = this.batches[model].instances;

                var prevMaxInstances;
                if (g.attributes['offset']) {
                    prevMaxInstances = g.attributes['offset'].array.length/3;
                } else {
                    prevMaxInstances = -1;
                }

                // Duplicate buffers
                var translations, rotations, scales, colors;
                if (this.batches[model].instances > prevMaxInstances) {
                    maxInstances = this.batches[model].instances * 2;

                    var t = new Float32Array( maxInstances * 3 );
                    translations = new THREE.InstancedBufferAttribute( t, 3, 1, false );
                    g.addAttribute( 'offset', translations ); // per mesh translation

                    var r = new Float32Array( maxInstances * 4 );
                    rotations = new THREE.InstancedBufferAttribute( r, 4, 1, false );
                    g.addAttribute( 'orientation', rotations ); // per mesh rotation

                    var s = new Float32Array( maxInstances * 3 );
                    scales = new THREE.InstancedBufferAttribute( s, 3, 1, false );
                    g.addAttribute( 'scale', scales ); // per mesh scale

                    var c = new Float32Array( maxInstances * 3 );
                    colors = new THREE.InstancedBufferAttribute( c, 3, 1, false );
                    g.addAttribute( 'color', colors ); // per mesh color
                } else {
                    translations = g.getAttribute('offset');
                    rotations = g.getAttribute('orientation');
                    scales = g.getAttribute('scale');
                    colors = g.getAttribute('color');
                }

                // loop through all instances, setting them
                var t = this.batches[model].translations;
                var r = this.batches[model].rotations;
                var s = this.batches[model].scales;
                var c = this.batches[model].colors;
                for (var i=0; i<this.batches[model].instances; i++) {
                    translations.setXYZ( i, t[i*3], t[i*3 + 1], t[i*3 + 2] );
                    rotations.setXYZW( i, r[i*4], r[i*4 + 1], r[i*4 + 2], r[i*4 + 3] );
                    scales.setXYZ( i, s[i*3], s[i*3 + 1], s[i*3 + 2] );
                    colors.setXYZ( i, c[i*3], c[i*3 + 1], c[i*3 + 2] );
                }
                translations.needsUpdate = true;
                rotations.needsUpdate = true;
                scales.needsUpdate = true;
                colors.needsUpdate = true;
            }
		}
	},

    // Clears instances that have just been rendered.
    clearInstances: function () {
        for (model in this.batches) {
            geometries = this.getModel(model).getGeometries();
            for (var j=0; j<geometries.length; j++) {
                geometries[j].maxInstancedCount = 0;
                geometries[j].removeAttribute("offset");
                geometries[j].removeAttribute("orientation");
                geometries[j].removeAttribute("scale");
                geometries[j].removeAttribute("color");
            }
        }
    },

    // Clears all models that have been loaded as well as url-tag associations.
    clearModels: function () {
        this.models = {};
        this.tagToUrl.clear();
    },

    // Takes an array of length 3 and uses it to set the direction of light in the scene. 
    setLight: function (lightDirection) {
      this.light = [-lightDirection[0], -lightDirection[1], -lightDirection[2]];
      
      for (child of this.scene.children)
      {
        if (child.type == "Mesh" && child.material.type == "RawShaderMaterial")
        {
          child.material.uniforms.light.value = this.light;
          child.material.needsUpdate = true;
        }
      }
    }
}

