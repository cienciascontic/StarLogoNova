var container, stats, controls, camera, scene, renderer;

var modelManager;

var clearColor;

var instances = 10;
var seed = 0;

var agents = [];

function setCamera() {
	camera = new THREE.PerspectiveCamera( 50, window.innerWidth / window.innerHeight, 0.1, 10000 );
	camera.position.y = 20.0;
	camera.position.z = 220;
}

function setTerrain() {
	// ground
    terrain = new Terrain(100,100);
    var ground = terrain.getMesh();
	ground.rotation.x += Math.PI/2.0;
	ground.position.y -= 1.0/2.0;
	scene.add(ground);
}

function setLight() {
	var light = new THREE.DirectionalLight( 0xffffff, 3.5 );
	light.position.set( 1, 0, 0 );
	//scene.add( light );
}

function getAgent() {
	var scale = random()*2.0 + 5.0;
	var range = 100;
	return {
    // DANIEL - the shape attr controls whether it's a built-in or an obj (ModelManager loads)
		shape: 'triangle',//'obj/triangle/triangle.obj',//'dae/duck/duck.dae',//
		scale: [scale, scale, scale],
		rotate: [random()*360,random()*360,random()*360],
		translate: [random()*range-range/2,random()*100-50,random()*range-range/2],
		color: [random(), random(), random()]
	}
}

function setStats() {
	stats = new Stats();
	stats.domElement.style.position = 'absolute';
	stats.domElement.style.top = '0px';
	container.appendChild( stats.domElement );
}

function random() {
	var x = Math.sin(seed++) * 10000;
    return x - Math.floor(x);
}

function init() {	
	scene = new THREE.Scene();
	modelManager = new ModelManager(scene);
	
	container = document.getElementById( 'container' );
	
	renderer = new THREE.WebGLRenderer();
	clearColor = new THREE.Color(0x101010);
	renderer.setClearColor( clearColor );
	renderer.setPixelRatio( window.devicePixelRatio );
	renderer.setSize( window.innerWidth, window.innerHeight );
	container.appendChild( renderer.domElement );
	
	setCamera();
	setTerrain();
	setStats();
	
	controls = new THREE.OrbitControls( camera, renderer.domElement );
    controls.mouseButtons.ORBIT = THREE.MOUSE.RIGHT;
    controls.mouseButtons.PAN = THREE.MOUSE.LEFT;
	//controls.addEventListener( 'change', render );
	
    // TESTING ONLY (replace with agent queue from engine)
	for (var i = 0; i < instances; i++) {
		var agent = getAgent();
		agents.push(agent);
	}

	if ( !renderer.supportsInstancedArrays ) {
		document.getElementById( "notSupported" ).style.display = "";
		return;
	}

	window.addEventListener( 'resize', onWindowResize, false );
}

function onWindowResize( event ) {
	camera.aspect = window.innerWidth / window.innerHeight;
	camera.updateProjectionMatrix();

	renderer.setSize( window.innerWidth, window.innerHeight );
}

function animate() {
	requestAnimationFrame( animate );

	render();
	stats.update();
	controls.update();
}

function render() {
	var time = performance.now();
	var currentInstances = instances;//( Math.floor(time/1500) %(10) )*(instances/10.0) +1;
	
  if (count<10) {
    seed = 0;
    for ( var i = 0; i < currentInstances; i++ ) {
      var agent = agents[i];
      modelManager.add(agent);
    }
    modelManager.render();
    ++count;
  }
  renderer.render( scene, camera );
}

$( document ).ready(function() {
  count = 0;
	init();
	render();
});

$(window).keypress(function (e) {
  if (e.keyCode === 0 || e.keyCode === 32) {
    e.preventDefault();
    terrain.stamp();
    render();
  }
})