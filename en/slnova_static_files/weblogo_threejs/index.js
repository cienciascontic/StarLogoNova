var viewport;
var seed = 0;

// TESTING ONLY random utility
function random() {
    var x = Math.sin(seed++) * 10000;
    return x - Math.floor(x);
}

// TESTING ONLY------------------------------------------------------------
Viewport.prototype.getAgent = function() {
    var scale = random()*2.0 + 5.0;
    var range = 100;
    return {
        shape: 'sphere',//'obj/carrot/carrot.obj',//'dae/duck/duck.dae',//
        scale: [scale, scale, scale],
        rotate: [random()*360,random()*360,random()*360],
        translate: [random()*range-range/2,random()*100-50,random()*range-range/2],
        color: [random(), random(), random()]
    }
}

$( document ).ready(function() {
    viewport = new Viewport('container');
    viewport.agents = [];
    // (replace with agent queue from engine)
    for (var i = 0; i < viewport.instances; i++) {
        var agent = viewport.getAgent();
        viewport.agents.push(agent);
    }
	viewport.animate();
});

$(window).keypress(function (e) {
  if (e.keyCode === 0 || e.keyCode === 32) {
    e.preventDefault();
    viewport.terrain.stamp();
    viewport.render();
  }
})