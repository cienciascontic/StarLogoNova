ShapeModel = function ( type, light ) {
	this.type = type;
	
	this.geometry = new THREE.InstancedBufferGeometry();
	this.material = new THREE.RawShaderMaterial( {
			uniforms: {
                hasTex: { type: "i", value: 0.0 },
                tex: { type: "t", value: null },
                light: { type: "3f", value: light }
            },
            vertexShader: document.getElementById( 'vertexShader' ).textContent,
            fragmentShader: document.getElementById( 'fragmentShader' ).textContent,
            side: THREE.DoubleSide,
            transparent: false
    } );
            
	this.vertices = null;
	this.normals = null;
	this.indices = null;
	this.uvs = null;
	
	this.loadBuffers();
}

ShapeModel.prototype = {
	
    // loads buffers with the geometry of a built-in shape
	loadBuffers: function() {
		switch(this.type.toLowerCase()) {
			case 'cube':
				this.vertices = new THREE.BufferAttribute( new Float32Array( [
					// Front
					-.5, .5, 1,
					.5, .5, 1,
					-.5, -.5, 1,
					.5, -.5, 1,
					// Back
					.5, .5, 0,
					-.5, .5, 0,
					.5, -.5, 0,
					-.5, -.5, 0,
					// Left
					-.5, .5, 0,
					-.5, .5, 1,
					-.5, -.5, 0,
					-.5, -.5, 1,
					// Right
					.5, .5, 1,
					.5, .5, 0,
					.5, -.5, 1,
					.5, -.5, 0,
					// Top
					-.5, .5, 1,
					.5, .5, 1,
					-.5, .5, 0,
					.5, .5, 0,
					// Bottom
					.5, -.5, 1,
					-.5, -.5, 1,
					.5, -.5, 0,
					-.5, -.5, 0
				] ), 3 );
				
				this.normals = new THREE.BufferAttribute( new Float32Array( [
					// Front
					0,0,1,
					0,0,1,
					0,0,1,
					0,0,1,
					// Back
					0,0,-1,
					0,0,-1,
					0,0,-1,
					0,0,-1,
					// Left
					-1,0,0,
					-1,0,0,
					-1,0,0,
					-1,0,0,
					// Right
					1,0,0,
					1,0,0,
					1,0,0,
					1,0,0,
					// Top
					0,1,0,
					0,1,0,
					0,1,0,
					0,1,0,
					// Bottom
					0,-1,0,
					0,-1,0,
					0,-1,0,
					0,-1,0
				] ), 3 );
				
				this.uvs = new THREE.BufferAttribute( new Float32Array( [
					//x    y    z
					// Front
					0, 0,
					1, 0,
					0, 1,
					1, 1,
					// Back
					1, 0,
					0, 0,
					1, 1,
					0, 1,
					// Left
					1, 1,
					1, 0,
					0, 1,
					0, 0,
					// Right
					1, 0,
					1, 1,
					0, 0,
					0, 1,
					// Top
					0, 0,
					1, 0,
					0, 1,
					1, 1,
					// Bottom
					1, 0,
					0, 0,
					1, 1,
					0, 1
				] ), 2 );
				
				this.indices = new THREE.BufferAttribute( new Uint16Array( [
					0, 1, 2,
					2, 1, 3,
					4, 5, 6,
					6, 5, 7,
					8, 9, 10,
					10, 9, 11,
					12, 13, 14,
					14, 13, 15,
					16, 17, 18,
					18, 17, 19,
					20, 21, 22,
					22, 21, 23
				] ), 3);
				
				this.geometry.addAttribute('position', this.vertices);
				this.geometry.addAttribute('normal', this.normals);
				this.geometry.addAttribute('uv', this.uvs);
				this.geometry.setIndex(this.indices);
				
				break;
			case 'pyramid':
				this.vertices = new THREE.BufferAttribute( new Float32Array( [
					// Top
					0, 0, 1,
					// Corners
					0.5, 0, 0,
					-0.5, 0.7, 0,
					-0.5, -0.7, 0,
				] ), 3 );
				
				this.normals = new THREE.BufferAttribute( new Float32Array( [
					// Top
					0,0,1,
					// Corners
					1,0,0,
					-0.5, 0.7, 0,
					-0.5, -0.7, 0,
				] ), 3 );
				
				this.indices = new THREE.BufferAttribute( new Uint16Array( [
					0, 1, 2,
					0, 2, 3,
					0, 3, 1,
					3, 2, 1
				] ), 3);
        
                this.uvs = new THREE.BufferAttribute( new Float32Array( [
					0, 0,
					1, 0,
					0, 1,
					1, 1,
				] ), 2 );
				
				this.geometry.addAttribute('position', this.vertices);
				this.geometry.addAttribute('normal', this.normals);
				this.geometry.addAttribute('uv', this.uvs);
				this.geometry.setIndex(this.indices);
				
				break;
            case 'triangle':
				this.vertices = new THREE.BufferAttribute( new Float32Array( [
					0, 0, 0,
					0, 1, 0,
					1, 0, 0,
				] ), 3 );
				
				this.normals = new THREE.BufferAttribute( new Float32Array( [
					0,0,1,
					0,0,1,
					0,0,1,
				] ), 3 );
				
				this.indices = new THREE.BufferAttribute( new Uint16Array( [
					0, 1, 2,
				] ), 3);
        
				this.uvs = new THREE.BufferAttribute( new Float32Array( [
					//x    y    z
					// Front
					0, 0,
					1, 0,
					0, 1,
				] ), 2 );
        
				this.geometry.addAttribute('position', this.vertices);
				this.geometry.addAttribute('normal', this.normals);
				this.geometry.addAttribute('uv', this.uvs);
				this.geometry.setIndex(this.indices);
				
				break;
            case 'sphere':
                var sphere = new THREE.BufferGeometry().fromGeometry(new THREE.SphereGeometry( .5, 16, 16 ));
                this.vertices = sphere.attributes.position;
                this.normals = sphere.attributes.normal;
				this.uvs = sphere.attributes.uv;

				// loop over all vertices and raise z by .5 so the sphere sits "on" the ground
				// rather than halfway into it. (z is every 3rd item in the array)
				var count = this.vertices.count*this.vertices.itemSize;
				for (var i = 2; i < count; i+=3) {
					this.vertices.array[i] += .5;
				}
                
				this.geometry.addAttribute('position', this.vertices);
				this.geometry.addAttribute('normal', this.normals);
				this.geometry.addAttribute('uv', this.uvs);
                
                break;
		}
	},

    getGeometry: function() { return this.geometry },
	getGeometries: function() { return [this.geometry]; },
	
    getMaterial: function() { return this.material },
	getMaterials: function() { return [this.material]; }
}