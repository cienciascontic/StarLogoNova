OBJModel = function ( obj, mtl, loader, callback ) {
	this.geometry = new THREE.InstancedBufferGeometry
	this.material = new THREE.RawShaderMaterial( {
			uniforms: {
			},
			vertexShader: document.getElementById( 'vertexShader' ).textContent,
			fragmentShader: document.getElementById( 'fragmentShader' ).textContent,
			side: THREE.DoubleSide,
			transparent: false,
			attributes: { 'position': 0, 'offset': 1, 'orientation': 2, 'uv': 3, 'normal': 4, 'scale': 5, 'color': 6 }
		} );
		
	this.vertices = null;
	this.normals = null;
	this.indices = null;
	this.uvs = null;
	
  // DANIEL - loader calls starlogoloader.load, then traverses the object and
  // converts it to an instancedbuffergeometry (loadbuffers function). it does not 
  // apply the shader that we use for batching. (done in modelmanager)
	loader.load(obj, mtl, function(object) {
		console.log('loaded');
		this.traverse(object, callback);
	}.bind(this) );
}

OBJModel.prototype = {
	
	traverse: function( object, callback ) {
		object.traverse( function( child ) {
			if (child instanceof THREE.Mesh) {
				if (child.geometry.vertices.length>0 && child.geometry.faces.length>0) {
					this.loadBuffers(child);
				}
        callback(child);
			}
		}.bind(this) );
	},

	loadBuffers: function( mesh ) {
		var mat = mesh.material;
		
		var g = mesh.geometry;
		var v = g.vertices;
		var n = g.normals;
		var f = g.faces;
		var uv = g.faceVertexUvs[0]; // TODO double check this format
		
		var vArray = new Float32Array( v.length*3 );
		this.vertices = new THREE.BufferAttribute( vArray, 3 );
		for (var i=0; i<v.length; i++) {
			this.vertices.setXYZ(i, v[i].x, v[i].y, v[i].z);
		}
		
		var nArray = new Float32Array( v.length*3 );
		this.normals = new THREE.BufferAttribute( nArray, 3 );
		for (var i=0; i<f.length; i++) {
			this.normals.setXYZ(i*3, f[i].normal.x, f[i].normal.y, f[i].normal.z);
			this.normals.setXYZ(i*3+1, f[i].normal.x, f[i].normal.y, f[i].normal.z);
			this.normals.setXYZ(i*3+2, f[i].normal.x, f[i].normal.y, f[i].normal.z);
		}
		
		var fArray = new Uint16Array( f.length*3 );
		this.indices = new THREE.BufferAttribute( fArray, 3 );
		for (var i=0; i<f.length; i++) {
			this.indices.setXYZ(i, f[i].a, f[i].b, f[i].c);
		}
		
    var uvArray = new Float32Array( f.length*3*2 ); // TODO maybe quads?
    this.uvs = new THREE.BufferAttribute( uvArray, 2 );
    for (var i=0; i<uv.length; i++) {
      for (var j=0; j<uv[i].length; j++) {
        if (uv) {
          this.uvs.setXY(i*3+j, uv[i][j].x, uv[i][j].y);
        } else {
          this.uvs.setXY(i*3+j, 0, 0);
        }
      }
    }
    
		

		this.geometry.addAttribute('position', this.vertices);
		this.geometry.addAttribute('normal', this.normals);
		this.geometry.addAttribute('index', this.indices);
		this.geometry.addAttribute('uv', this.uvs);
	},

	getGeometry: function() { return this.geometry; },
	
	getMaterial: function() { return this.material; }
}