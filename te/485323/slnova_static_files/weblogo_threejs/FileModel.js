// renderer_callback is a callback for the renderer to process loaded geometries and materials. 
FileModel = function ( url, light, renderer_callback, onload_callback, onprogress_callback ) {
    const DEGREES_TO_RADIANS = Math.PI/180; // Converts degrees to radians.
    
    this.geometries = [];
	this.geometry = new THREE.InstancedBufferGeometry
    this.materials = [];
	this.material = new THREE.RawShaderMaterial( {
			uniforms: {
                hasTex: { type: "i", value: 0.0 },
                tex: { type: "t", value: null },
                light: { type: "3f", value: light }
			},
			vertexShader: document.getElementById( 'vertexShader' ).textContent,
			fragmentShader: document.getElementById( 'fragmentShader' ).textContent,
			side: THREE.DoubleSide,
			transparent: false,
		} );
    this.multiMaterials = {};
    this.multiMaterial = new THREE.RawShaderMaterial( {
			uniforms: {
                hasTex: { type: "i", value: 0.0 },
                tex: { type: "t", value: null },
                light: { type: "3f", value: light }
			},
			vertexShader: document.getElementById( 'vertexShader' ).textContent,
			fragmentShader: document.getElementById( 'fragmentShader' ).textContent,
			side: THREE.DoubleSide,
			transparent: false,
		} );
        
	this.vertices = null;
	this.normals = null;
	this.indices = null;
	this.uvs = null;
  
    this.objLoader = new THREE.OBJLoader();
    this.mtlLoader = new THREE.MTLLoader();
    this.colladaLoader = new THREE.ColladaLoader();
    
    this.fetchTransforms(url, renderer_callback, onload_callback, onprogress_callback);	
}

FileModel.prototype = {
    // Retrieves transformations from transform file if it exists and passes them along to later stages of
    // geometry processing. Right now rotations are assumed to all be in original model space (order z, y, x).
    fetchTransforms: function( url, renderer_callback, onload_callback, onprogress_callback ) {
        const index = url.lastIndexOf(".");
        var transformsUrl = url.slice(0, index) + "."+TRANSFORM_FILE_EXTENSION; // <- TRANSFORM_FILE_EXTENSION defined in asset_create.js
        if (index == -1)
            transformsUrl = url + "."+TRANSFORM_FILE_EXTENSION;

        var rotations = new THREE.Matrix4();
        var scaling = new THREE.Matrix4();
        var translations = new THREE.Matrix4();
        var invert = false;

        var transformsLoader = new THREE.XHRLoader( this.manager );
        transformsLoader.load( transformsUrl, function ( text ) { // If we successfully load a transforms file pass along the transforms.
            const newlinePattern = /\n|\r\n/;
            const lines = text.split(newlinePattern);
            for (line of lines) {
                var tokens = line.split(" ");
                if (tokens.length >= 4)
                {   
                    var x = parseFloat(tokens[1]);
                    var y = parseFloat(tokens[2]);
                    var z = parseFloat(tokens[3]);
                    if (tokens[0] == "rotate")
                        rotations.makeRotationFromEuler(new THREE.Euler(x*DEGREES_TO_RADIANS, y*DEGREES_TO_RADIANS, 
                            z*DEGREES_TO_RADIANS, "ZYX")); // Use order ZYX so that it's like doing x, then y, then z all in original model space.
                    else if (tokens[0] == "scale")
                        scaling.makeScale(x, y, z);
                    else if (tokens[0] == "translate")
                        translations.makeTranslation(x, y, z);
                }
                else if (tokens.length >= 2) // Support uniform scaling.
                {
                    var scale = parseFloat(tokens[1]);
                    if (tokens[0] == "scale")
                        scaling.makeScale(scale, scale, scale);
                }
                else if (tokens[0] == "invert")
                    invert = true;
            }
            this.load(url, rotations, scaling, translations, invert, renderer_callback, onload_callback, onprogress_callback);
        }.bind(this),
        function () {}, 
        function () { // If we are not able to find/load the transforms file, load model without applying transforms.
            this.load(url, rotations, scaling, translations, false, renderer_callback, onload_callback, onprogress_callback);
        }.bind(this)); 
    },

    // check the file type and call the appropriate loader on the object
    // rotations, scaling, and translations are THREE.Matrix4 objects for transforming geometry once loaded.
    // invert is a boolean specifying whether normals need to be flipped.
    load: function( url, rotations, scaling, translations, invert, renderer_callback, onload_callback, onprogress_callback ) {
        // check file extension
        var type = url.split('.').pop();
        // if collada file
        if (type == 'dae') {
        // load and convert
            this.colladaLoader.load( url, function( collada ) {
                var dae = collada.scene;
                this.traverse(dae, rotations, scaling, translations, invert, renderer_callback, onload_callback, onprogress_callback);
                
            }.bind(this) );
        } else {
            // if OBJ file, check if MTL used
            var vertex_pattern = /v( +[\d|\.|\+|\-|e]+)( +[\d|\.|\+|\-|e]+)( +[\d|\.|\+|\-|e]+)/;
            var mtl_pattern = /^mtllib /;
            var path = url.substr(0, url.lastIndexOf("/")+1);
            var objfile = url.substring(url.lastIndexOf("/")+1);
            
            var loader = new THREE.XHRLoader( this.manager );
            loader.load( url, function ( text ) {
                var lines = text.split( '\n' );
                for ( var i = 0; i < lines.length; i ++ ) {
                    var line = lines[i];
                    if ( ( result = mtl_pattern.exec( line ) ) !== null ) {
                        var mtlfile = line.substring( 7 ).trim();
                        this.mtlLoader.setPath(path);
                        this.mtlLoader.setTexturePath(path);
                        this.mtlLoader.load(mtlfile, function(materials) {
                            materials.preload();
                            this.objLoader.setMaterials(materials);
                            this.objLoader.load(url, function(object) {
                                this.traverse(object, rotations, scaling, translations, invert, renderer_callback, onload_callback, onprogress_callback);
                            }.bind(this) );
                        }.bind(this) );
                        break;
                    } else if ( ( result = vertex_pattern.exec( line ) ) !== null ) {
                        this.objLoader.load(url, function(object) {
                            this.traverse(object, rotations, scaling, translations, invert, renderer_callback, onload_callback, onprogress_callback);
                        }.bind(this) );
                        break;
                    }
                }
            }.bind(this) );
        }
    },
  
    // traverse the loaded object, converting it to an InstancedBufferGeometry 
    // and processing materials
	traverse: function( object, rotations, scaling, translations, invert, renderer_callback, onload_callback, onprogress_callback ) {
		object.traverse( function( child ) {
			if (child instanceof THREE.Mesh) {
                var g = child.geometry;
                // Sometimes mesh transforms are in the parent Object3D instead of being baked in (noticed when loading dae).
                if (child.parent instanceof THREE.Object3D)
                {
                    g.scale(child.parent.scale.x, child.parent.scale.y, child.parent.scale.z);
                    var rotation = new THREE.Matrix4();
                    rotation.makeRotationFromQuaternion(child.parent.quaternion);
                    g.applyMatrix(rotation);
                    g.translate(child.parent.position.x, child.parent.position.y, child.parent.position.z); 
                }
                if (g.type === "Geometry") {
                    g = new THREE.BufferGeometry().fromGeometry(g);
                }
				if (g.attributes.position) {
					var instancedGeom = this.loadBuffers(g, invert);
                    this.geometries.push(instancedGeom);
                    
                    if (child.material.type === "MultiMaterial") {
                        var instancedMat = this.multiMaterial.clone();
                        for (var i=0; i<child.material.materials.length; i++) {
                            this.multiMaterials[child.material.materials[i].name] = child.material.materials[i].map;
                        }
                        this.materials.push(instancedMat);
                    } else {
                        var instancedMat = this.material.clone();
                        if (child.material.map) {
                            instancedMat.uniforms.hasTex.value = 1.0;
                            instancedMat.uniforms.tex.value = child.material.map;
                        }
                        this.materials.push(instancedMat);
                    }
				}
			}
		}.bind(this) );
        
        // scale and center
        this.processGeometry(this.geometries);
        // now apply transform file rotations.
        for (var i=0; i<this.geometries.length; i++) {
            g = this.geometries[i];
            g.applyMatrix(rotations);
        }
        // scale and center again.
        this.processGeometry(this.geometries);
        // apply transform file scaling.
        for (var i=0; i<this.geometries.length; i++) {
            g = this.geometries[i];
            g.applyMatrix(scaling);
        }
        // shift to ground level.
        this.levelGeometry(this.geometries);
        // finally apply transform file translations
        for (var i=0; i<this.geometries.length; i++) {
            g = this.geometries[i];
            g.applyMatrix(translations);
        }

        // load each piece
        for (var i=0; i<this.geometries.length; i++) {
            renderer_callback(this.geometries[i], this.materials[i]);
        }

        if (onload_callback)
            onload_callback();
	},
  
    // scale, center, compute normals over all loaded geometries
    processGeometry: function( geometries ) {
        var max = new THREE.Vector3(-Infinity,-Infinity,-Infinity);
        var min = new THREE.Vector3(Infinity,Infinity,Infinity);
        for (var i=0; i<geometries.length; i++) {
            g = geometries[i]
            
            g.computeBoundingBox();

            // Sometimes geometries don't have any vertices and should not count for determining the min and max.
            if (g.boundingBox.max.length() == 0 && g.boundingBox.min.length() == 0)
                continue;

            max.max(g.boundingBox.max);
            min.min(g.boundingBox.min);
        }

        // Find offset from center of all geometry:
        var modelBoundingBox = new THREE.Box3(min, max);
        var centerOffset = modelBoundingBox.center().negate();

        var size = new THREE.Vector3();
        size.subVectors(max, min);
        for (var i=0; i<geometries.length; i++) {
            g = geometries[i];

            g.translate(centerOffset.x, centerOffset.y, centerOffset.z);

            size.x = size.x == 0 ? 1 : size.x;
            size.y = size.y == 0 ? 1 : size.y;
            size.z = size.z == 0 ? 1 : size.z;
            var scale = Math.pow(size.x*size.y*size.z, 1/3);
            g.scale(1.0/scale, 1.0/scale, 1.0/scale);
        }
    },

    // Translate geometry along z-axis so that the bottom of it's bounding box is the x-z plane.
    levelGeometry: function ( geometries ) {
        var min = new THREE.Vector3(Infinity,Infinity,Infinity);
        for (var i=0; i<geometries.length; i++) {
            g = geometries[i]
            
            g.computeBoundingBox();

            // Sometimes geometries don't have any vertices and should not count for determining the min and max.
            if (g.boundingBox.max.length() == 0 && g.boundingBox.min.length() == 0)
                continue;

            min.min(g.boundingBox.min);
        }

        var z_offset = -min.z;
        for (var i=0; i<geometries.length; i++) {
            g = geometries[i];

            g.translate(0, 0, z_offset);
        }
    },

	loadBuffers: function( g, invert ) {
        var geometry = new THREE.InstancedBufferGeometry;
		var vertices = g.attributes.position;
        var normals = g.attributes.normal;
        var indices = g.attributes.index;
		var uvs = g.attributes.uv;
		
        var num = vertices.array.length/3;
        
        if (!indices) {
            var fArray = new Uint16Array( num );
            indices = new THREE.BufferAttribute( fArray, 3 );
            for (var i=0; i<num/3; i++) {
                indices.setXYZ(i, i*3, i*3+1, i*3+2);
            }
        }

        // Compute normals if any are missing. Note: I'm not sure that this code ever gets ran because our OBJLoader now 
        // creates normals for geometry that is missing them. Not sure if Collada can be missing normals. 
        if (!normals || (vertices.count != normals.count)) {
            var nArray = new Float32Array( num*3 );
            normals = new THREE.BufferAttribute( nArray, 3 );

            normalsPerVertex = new Array(num);
            for (var i = 0; i < normalsPerVertex.length; i++)
                normalsPerVertex[i] = [];

            for (var i = 0; i < indices.count*3; i++) {  
                    if ( (i % 3) == 0 ) // for every face 
                    { 
                        var index1 = indices.array[i];
                        var index2 = indices.array[i+1]; 
                        var index3 = indices.array[i+2]; 

                        var vertex1 = new THREE.Vector3(vertices.array[index1*3], vertices.array[index1*3+1], 
                            vertices.array[index1*3+2]); 
                        var vertex2 = new THREE.Vector3(vertices.array[index2*3], vertices.array[index2*3+1], 
                            vertices.array[index2*3+2]);
                        var vertex3 = new THREE.Vector3(vertices.array[index3*3], vertices.array[index3*3+1], 
                            vertices.array[index3*3+2]); 

                        var edge1 = new THREE.Vector3(0, 0, 0); 
                        var edge2 = new THREE.Vector3(0, 0, 0); 

                        var normal = new THREE.Vector3(0, 0, 0); 

                        // Calculate normal for vertex1 
                        if (invert)
                        {
                            edge1.subVectors(vertex3, vertex1);
                            edge2.subVectors(vertex2, vertex1);
                        } 
                        else
                        {
                            edge1.subVectors(vertex2, vertex1);
                            edge2.subVectors(vertex3, vertex1);
                        }
                        normal.crossVectors(edge1, edge2); 
                        normalsPerVertex[index1].push(normal.clone()); 

                        // Calculate normal for vertex2 
                        if (invert)
                        {
                            edge1.subVectors(vertex1, vertex2); 
                            edge2.subVectors(vertex3, vertex2); 
                        }
                        else
                        {
                            edge1.subVectors(vertex3, vertex2); 
                            edge2.subVectors(vertex1, vertex2); 
                        }
                        normal.crossVectors(edge1, edge2); 
                        normalsPerVertex[index2].push(normal.clone());
                        
                        // Calculate normal for i3 
                        if (invert)
                        {
                            edge1.subVectors(vertex2, vertex3); 
                            edge2.subVectors(vertex1, vertex3);
                        }
                        else
                        {
                            edge1.subVectors(vertex1, vertex3); 
                            edge2.subVectors(vertex2, vertex3); 
                        }
                        normal.crossVectors(edge1, edge2); 
                        normalsPerVertex[index3].push(normal.clone()); 
                    } 
            }
            // For each vertex, average normals across faces 
            for (var u = 0; u < normalsPerVertex.length; u++) { 
                var tempNormals = normalsPerVertex[u]; 
                var finalNormal = new THREE.Vector3(0,0,0);

                for (var v = 0; v < tempNormals.length; v++) { 
                    finalNormal.add(tempNormals[v]); 
                } 

                finalNormal.normalize();
                normals.setXYZ(u, finalNormal.x, finalNormal.y, finalNormal.z);
            }
        }
        else if (invert) // Else if we have normals, but they are inverted, then flip them right-side out.
        {
            var invertedNormals = normals.array.slice();
            for (var i = 0; i < invertedNormals.length; i++)
            {
                invertedNormals[i] = -invertedNormals[i];
            }
            normals.set(invertedNormals);
        }
        
        if (!uvs) {
            var uvArray = new Float32Array( num*2 ); 
            uvs = new THREE.BufferAttribute( uvArray, 2 );
            for (var i=0; i<num; i++) {
                uvs.setXY(i, 0, 0);
            }
        }
        
        geometry.addAttribute('position', vertices);
        geometry.addAttribute('normal', normals);
        geometry.addAttribute('uv', uvs);
        geometry.setIndex(indices);
        
        return geometry;
	},

	getGeometry: function() { return this.geometry; },
	
	getGeometries: function() { return this.geometries; },
  
	getMaterial: function() { return this.material; },

    getMaterials: function() { return this.materials; }
}