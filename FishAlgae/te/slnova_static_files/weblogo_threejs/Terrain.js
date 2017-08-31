Terrain = function(w) {
    // texture map vars
    w = ~~w;
    this.canvas = document.createElement("canvas");
    this.ctx = this.canvas.getContext("2d");
    
    this.texture = new THREE.Texture(this.canvas)
    // uncomment the following line to disable texture smoothing, if desired
    this.texture.magFilter = THREE.NearestFilter;
    this.material = new THREE.MeshBasicMaterial({
                            map: this.texture, 
                            side: THREE.DoubleSide});
    this.material.needsUpdate = true;
    
    this.geometry = new THREE.PlaneGeometry( w+1,w+1, 1,1 );
    this.mesh =new THREE.Mesh(this.geometry, this.material);
        
    // math vars
    this.PIXELSPERPATCH = 10;
    this.MAPSIZE = ((w+1)/2);
    this.MAPSIZEINPIXELS = ~~(this.MAPSIZE * this.PIXELSPERPATCH);
    this.TEXTURESIZE = ~~((w+1)*this.PIXELSPERPATCH);
    this.STAMPRADIUS = ~~(this.TEXTURESIZE/(this.MAPSIZE*2)/2);
    
    this.canvas.width = Math.pow(2, Math.ceil( Math.log2((w+1)*this.PIXELSPERPATCH) ));
    this.canvas.height = Math.pow(2, Math.ceil( Math.log2((w+1)*this.PIXELSPERPATCH) ));

    // fix the UV mapping so that each "patch" of terrain gets a whole number of assigned pixels,
    // and we don't display the unused strip of texture beyond that.
    for (var triangle = 0; triangle < 2; triangle++) {
        for (var vertex = 0; vertex < 3; vertex++) {
            if (this.geometry.faceVertexUvs[0][triangle][vertex].x == 1) {
                this.geometry.faceVertexUvs[0][triangle][vertex].x = this.TEXTURESIZE / this.canvas.width;
            }
            if (this.geometry.faceVertexUvs[0][triangle][vertex].y == 0) {
                this.geometry.faceVertexUvs[0][triangle][vertex].y = 1-this.TEXTURESIZE / this.canvas.height;
            }
        }
    }
    this.geometry.uvsNeedUpdate = true;

    this.imageData = this.ctx.createImageData(this.TEXTURESIZE, this.TEXTURESIZE);   
    this.pixelData = this.imageData.data;

    this.clear();
    this.needsUpdate = true;

    this.thickLine = new ThickLine(this);    
}

Terrain.prototype = {
    getMesh: function() {return this.mesh},

    // Returns an object representing the terrain that may be used as a source for drawImage() by a 2d context.
    getImage: function() {return this.canvas},
    
    clear: function() {
        for (var y = 0; y < this.TEXTURESIZE; y++) {
            this.fillRow(0, this.TEXTURESIZE-1, y, 81, 197, 0); // terrain is "green" now
        }
        this.updateFromPixelArray();
    },
    
    // TESTING ONLY
    testPainting: function() {
        this.circle(-10,-10, 4, this.rgba(Math.random()*255,Math.random()*255,Math.random()*255))
        
        this.gridSquare(0,0, this.rgba(Math.random()*255,Math.random()*255,Math.random()*255))
        
        this.circle(10,10, 3, this.rgba(Math.random()*255,Math.random()*255,Math.random()*255))
        
        this.gridSquare(0,1, this.rgba(Math.random()*255,Math.random()*255,Math.random()*255))
        this.gridSquare(0,2, this.rgba(Math.random()*255,Math.random()*255,Math.random()*255))
        this.gridSquare(0,4, this.rgba(Math.random()*255,Math.random()*255,Math.random()*255))
        this.gridSquare(1,4, this.rgba(Math.random()*255,Math.random()*255,Math.random()*255))
        this.gridSquare(1,0, this.rgba(Math.random()*255,Math.random()*255,Math.random()*255))
        
        this.line(-5, -2, -7, 8, 2, this.rgba(Math.random()*255,Math.random()*255,Math.random()*255));
        
        this.mesh.material.map.needsUpdate = true;
        this.material.needsUpdate = true;
    },
    
    /**
     * Adapted from C code at https://en.wikipedia.org/wiki/Midpoint_circle_algorithm.
     * (Use above algorithm to calculate edge, but then fill rows between edges)
     */
    circlePixels: function(centerX, centerY, agentSize, r, g, b) {
        var x = ~~(agentSize*this.STAMPRADIUS);
        var y = 0;
        var cX = ~~this.xToU(centerX);
        var cY = ~~this.yToV(centerY);
        var err = ~~(1 - x);
        while(x >= y){
            // each call to fillRows fills the + and - y offset
            // of a given sweep from - to + the x offset.
            this.fillRows(-x + cX, x + cX, y + cY, -y + cY, r, g, b);
            this.fillRows(-y + cX, y + cX, x + cY, -x + cY, r, g, b);
            y++;
            err = err + 1 + 2*y;
            if (2*(err-x) + 1 > 0) {
                x--;
                err = err + 1 - 2*x;
            }
        }
        this.needsUpdate = true;
    },

    fillRow (xStart, xEnd, y, r, g, b) {
        if (y < 0 || y > this.TEXTURESIZE-1) {
            return;
        }
        var xStart = ~~Math.max(0, Math.min(xStart, this.TEXTURESIZE-1));
        var xEnd = ~~Math.max(0, Math.min(xEnd, this.TEXTURESIZE-1));
        for (var x = xStart; x <= xEnd; x++) {
            this.drawPixel(x, y, r, g, b);
        }
    },

    fillRows (xStart, xEnd, y1, y2, r, g, b) {
        if (y1 < 0 || y1 > this.TEXTURESIZE-1) {
            if (y2 < 0 || y2 > this.TEXTURESIZE-1) {
                return;  
            }
            y1 = y2;
        }
        else if (y2 < 0 || y2 > this.TEXTURESIZE-1) {
            y2 = y1;
        }
        var xStart = ~~Math.max(0, xStart);
        var xEnd = ~~Math.min(xEnd, this.TEXTURESIZE-1);
        for (var x = xStart; x <= xEnd; x++) {
            this.drawPixel(x, y1, r, g, b);
            this.drawPixel(x, y2, r, g, b);
        }
    },
    
    gridSquarePixels: function(x, y, r, g, b) {
        var pixStartX = this.xToU(Math.round(x))-this.STAMPRADIUS;
        var pixStartY = this.yToV(Math.round(y))-this.STAMPRADIUS;
        var pixEndX = pixStartX + this.STAMPRADIUS*2;
        var pixEndY = pixStartY + this.STAMPRADIUS*2;
        pixStartX = Math.max(0, Math.min(pixStartX, this.TEXTURESIZE-1));
        pixStartY = Math.max(0, Math.min(pixStartY, this.TEXTURESIZE-1));
        pixEndX = Math.max(0, Math.min(pixEndX, this.TEXTURESIZE));
        pixEndY = Math.max(0, Math.min(pixEndY, this.TEXTURESIZE));
        for (var pixy = pixStartY; pixy < pixEndY; pixy++) {
            for (var pixx = pixStartX; pixx < pixEndX; pixx++) {                
                this.drawPixel(pixx, pixy, r, g, b);
            }
        }
        this.needsUpdate = true;
    },
    
    line: function(x1, y1, x2, y2, size, r, g, b) {
        this.thickLine.drawSmooth(new Vector(this.xToU(x1),this.yToV(y1)), 
            new Vector(this.xToU(x2),this.yToV(y2)),
            size*this.STAMPRADIUS*2, r, g, b);
        this.needsUpdate = true;
    },
    
    xToU: function(x) {
        return (x*this.PIXELSPERPATCH)+this.MAPSIZEINPIXELS;
    },
    yToV: function(y) {
        return this.MAPSIZEINPIXELS-(y*this.PIXELSPERPATCH);
    },

    getPixelColorAt: function(x, y) {
        const offset = (~~this.xToU(x)+(~~this.yToV(y))*this.TEXTURESIZE)*4;
        return (this.pixelData[offset] << 16) + (this.pixelData[offset+1] << 8) + this.pixelData[offset+2];
    },    
    
    drawPixel: function(x, y, r, g, b) {
        x = ~~x;
        y = ~~y;
        const offset = (x+y*~~this.TEXTURESIZE)*4;
        this.pixelData[offset] = ~~r;
        this.pixelData[offset+1] = ~~g;
        this.pixelData[offset+2] = ~~b;
        this.pixelData[offset+3] = 255;                        
    },

    // set pixel to ((alpha*new)+((1-alpha)*old))
    blendPixel: function(x, y, r, g, b, alpha) {
        x = ~~x;
        y = ~~y;
        const offset = (x+y*~~this.TEXTURESIZE)*4;
        this.pixelData[offset] = ~~(this.pixelData[offset]*(1-alpha)+alpha*r);
        this.pixelData[offset+1] = ~~(this.pixelData[offset+1]*(1-alpha)+alpha*g);
        this.pixelData[offset+2] = ~~(this.pixelData[offset+2]*(1-alpha)+alpha*b);
        this.pixelData[offset+3] = 255;                        
    },
    
    updateFromPixelArray: function() {
        this.ctx.putImageData(this.imageData, 0, 0);
        this.mesh.material.map.needsUpdate = true;
        this.material.needsUpdate = true;
    },
    
    benchmark: function(fn) {
        var before = Date.now();
        fn.call(this);
        var after = Date.now();
        console.log("Time to run: "+(after-before));
    },
    
    testGetPixelColorAt: function() {
        var values = 0;
        for (var i = 0; i < 1000000; i++) {
            values = this.getPixelColorAt(Math.random()*100-50, Math.random()*100-50);
        }
        return values;
    },    
    
    testGridSquarePixels: function() {
        for (var i = 0; i < 1000000; i++) {
            this.gridSquarePixels(Math.random()*100-50, Math.random()*100-50, Math.random()*256, Math.random()*256, Math.random()*256);
        }
        this.updateFromPixelArray();
    },
    
    testCirclePixels: function() {
        for (var i = 0; i < 1000000; i++) {
            this.circlePixels(Math.random()*100-50, Math.random()*100-50, 3, Math.random()*256, Math.random()*256, Math.random()*256);
        }
        this.updateFromPixelArray();
    },

    testRegularLines: function() {
        for (var i = 0; i < 100000; i++) {
            this.line(Math.random()*10-5, Math.random()*10-5, 
                Math.random()*10-5, Math.random()*10-5, 
                Math.random()*3, ~~(Math.random()*256), ~~(Math.random()*256), ~~(Math.random()*256));
        }        
        this.needsUpdate = true;
    },

    testSmoothLines: function() {
        var t = new ThickLine(this);
        for (var angle = 0; angle < Math.PI*2; angle += Math.PI/8) {
            t.drawSmooth(new Vector(500+150*Math.cos(angle-Math.PI/4),500+150*Math.sin(angle-Math.PI/4)), 
                new Vector(500+150*Math.cos(angle-Math.PI/4)+300*Math.cos(angle),500+150*Math.sin(angle-Math.PI/4)+300*Math.sin(angle)), 
                40, ~~(Math.random()*256), ~~(Math.random()*256), ~~(Math.random()*256));
        }
    },

    testSmoothLinesSpeed: function() {
        var t = new ThickLine(this);
        for (var i = 0; i < 100000; i++) {
            // t.drawSmooth(new Vector(Math.random()*this.TEXTURESIZE,Math.random()*this.TEXTURESIZE), 
            //     new Vector(Math.random()*this.TEXTURESIZE,Math.random()*this.TEXTURESIZE), 
            //     Math.random()*30, ~~(Math.random()*256), ~~(Math.random()*256), ~~(Math.random()*256));
            t.drawSmooth(new Vector(Math.random()*100+100,Math.random()*100+100), 
                new Vector(Math.random()*100+100,Math.random()*100+100), 
                Math.random()*30, ~~(Math.random()*256), ~~(Math.random()*256), ~~(Math.random()*256));
        }
    },

    testSmoothCircles: function() {
        var t = new ThickLine(this);
        for (var i = 0; i < 100000; i++) {
            // t.drawSmooth(new Vector(Math.random()*this.TEXTURESIZE,Math.random()*this.TEXTURESIZE), 
            //     new Vector(Math.random()*this.TEXTURESIZE,Math.random()*this.TEXTURESIZE), 
            //     Math.random()*30, ~~(Math.random()*256), ~~(Math.random()*256), ~~(Math.random()*256));
            t.drawCircleSmooth(new Vector(Math.random()*1000,Math.random()*1000), 
                /*Math.random()*/15, ~~(Math.random()*256), ~~(Math.random()*256), ~~(Math.random()*256));
        }
        this.needsUpdate = true;        
    }
}


ThickLine = function(terrain) {
    var terrain = terrain;

    this.drawSmooth = function(p0, p1, thickness, r, g, b) {
        if (p0.y > p1.y) {
            var temp = p0;
            p0 = p1;
            p1 = temp;
        }
        const radius = thickness / 2;
        const paddedRadius = radius + .5;
        //const radSqrd = radius*radius;
        const offset = new Vector(p1.x - p0.x, p1.y - p0.y);
        const slope = offset.x != 0 ? offset.y/offset.x : 1000000; //m=rise/run
        const intercept = p0.y-slope*p0.x; //b = y-mx
        const slopeUnitVec = offset.normalize();
        const slopeRise1 = slopeUnitVec.scale(1/slopeUnitVec.y);
        const perpendicularUnitVec = new Vector(-slopeUnitVec.y, slopeUnitVec.x);
        const p0topTangentPoint = p0.add(perpendicularUnitVec.scale(radius));
        const p0bottomTangentPoint = p0.subtract(perpendicularUnitVec.scale(radius));
        const p1topTangentPoint = p1.add(perpendicularUnitVec.scale(radius));
        const p1bottomTangentPoint = p1.subtract(perpendicularUnitVec.scale(radius));
        var minx = Math.min(p0bottomTangentPoint.x, p0topTangentPoint.x, p1bottomTangentPoint.x, p1topTangentPoint.x);
        var miny = Math.min(p0bottomTangentPoint.y, p0topTangentPoint.y, p1bottomTangentPoint.y, p1topTangentPoint.y);
        var maxx = Math.max(p0bottomTangentPoint.x, p0topTangentPoint.x, p1bottomTangentPoint.x, p1topTangentPoint.x);
        var maxy = Math.max(p0bottomTangentPoint.y, p0topTangentPoint.y, p1bottomTangentPoint.y, p1topTangentPoint.y);

        // loop from smallest to largest possible y value. For each y row,
        // fill in each pixel from the leftmost to rightmost, blending as
        // needed if pixels are along a boundary 
        var startX, endX;

        // Special-case bounding boxes for nearly vertical or horizontal lines
        if (Math.abs(offset.x) < 1 || Math.abs(offset.y) < 1) {
            startX = ~~(Math.min(p0.x, p1.x) - paddedRadius);
            endX = ~~(Math.max(p0.x, p1.x) + paddedRadius);
            // discard min/max x/y values that aren't really relevant, so
            // that all of the pixels on those rows/colums get a change to be rendered.
            if (Math.abs(offset.x) < 1) {
                minx = 0;
                maxx = terrain.TEXTURESIZE;
            } else {
                miny = 0;
                maxy = terrain.TEXTURESIZE;
            }
            for (var y = ~~(p0.y - paddedRadius); y <= ~~(p1.y + paddedRadius); y++) {
                this.conditionalFillRow(startX, endX, y, r, g, b, slope, -1, intercept, radius,
                    minx, miny, maxx, maxy,
                    p0, p1);
            }
        }

        // normal case bounding using a generous "walked" line between the tangent points
        for (var y = ~~(p0.y - paddedRadius); y <= ~~(p1.y + paddedRadius); y++) {
            if (y <= p0topTangentPoint.y) {
                startX = ~~(p0.x - paddedRadius);
            } else if (y >= p1topTangentPoint.y) {
                startX = ~~(p1.x - paddedRadius);
            } else {
                startX += slopeRise1.x;
            }
            if (y <= p0bottomTangentPoint.y) {
                endX = ~~(p0.x + paddedRadius);
            } else if (y >= p1bottomTangentPoint.y) {
                endX = ~~(p1.x + paddedRadius);
            } else {
                endX += slopeRise1.x;
            }
            // fill in the row
            this.conditionalFillRow(startX, endX, y, r, g, b, slope, -1, intercept, radius,
                 minx, miny, maxx, maxy,
                 p0, p1);
        }
        terrain.needsUpdate = true;
    }

    this.conditionalFillRow = function(xStart, xEnd, y, r, g, b, A, B, C, radius, minx, miny, maxx, maxy, p0, p1) {
        y = ~~y;
        if (y < 0 || y > terrain.TEXTURESIZE-1) {
            return;
        }

        const yPlusHalf = y+.5;
        xStart = ~~Math.max(0, Math.min(xStart, terrain.TEXTURESIZE-1));
        xEnd = ~~Math.max(0, Math.min(xEnd, terrain.TEXTURESIZE-1));
        // if this is a row for the circle end cap, render circle row instead
        if (yPlusHalf <= miny || yPlusHalf >= maxy) {
            var centerPoint = Math.abs(y - p0.y) < Math.abs(y - p1.y) ? p0 : p1;
            this.conditionalFillCircleRow(xStart, xEnd, y, r, g, b, radius, centerPoint);
            return;
        } 
        // If this row contains any part of an end cap, render those first separately
        // and then tighten the bounds on the x coords so those pixels won't be 
        // rendered again.
        if (xStart + .5 <= minx) {
            var centerPoint = Math.abs(xStart - p0.x) < Math.abs(xStart - p1.x) ? p0 : p1;
            this.conditionalFillCircleRow(xStart, ~~(minx-.5), y, r, g, b, radius, centerPoint);
            xStart = ~~(minx+.5);
        }
        if (xEnd + .5 >= maxx) {
            var centerPoint = Math.abs(xEnd - p0.x) < Math.abs(xEnd - p1.x) ? p0 : p1;
            this.conditionalFillCircleRow(~~(maxx+.5), xEnd, y, r, g, b, radius, centerPoint);
            xEnd = ~~(maxx-.5);
        }

        // Pre-calculated; used in finding perpendicual distance to the line 
        // (see https://en.wikipedia.org/wiki/Distance_from_a_point_to_a_line)
        const oneOverRadical = 1/Math.sqrt(A*A + B*B);
        
        const radiusDiff = this.calcRadiusDiff(A);
        // pixel alpha = distance the center point is inside the outer radius / distance between inner and outer radii
        const oneOverDiag = .5/radiusDiff;

        const innerRadius = Math.max(0, radius - radiusDiff);
        const outerRadius = radius + radiusDiff;
        const BYPlusC = B*(yPlusHalf) + C;
        var dist;

        var xPlusHalf;
        for (var x = xStart; x <= xEnd; x++) {
            xPlusHalf = x + .5;
            if (A < 1000000) {
                dist = Math.abs((A*xPlusHalf + BYPlusC)*oneOverRadical);
            } else {
                dist = Math.abs(xPlusHalf-p0.x);
            }
            if (dist <= innerRadius) {
                terrain.drawPixel(x, y, r, g, b);
            } else if (dist <= outerRadius) {
                var alpha = (outerRadius-dist)*oneOverDiag;
                terrain.blendPixel(x, y, r, g, b, alpha);
            }
        }
    },

    // calculate the "radiusDiff", the maximum distance that the center point of
    // a pixel can be from a line with the given slope while still having some portion of the pixel
    // intersected by the line. This is essentially 1/2 of the length of a line
    // segment that spans a pixel at that line's slope, so it varies from .5 to .5*sqrt(2).
    this.calcRadiusDiff = function(slope) {
        var smallestLeg = slope==0 ? 0 : Math.min(Math.abs(slope), Math.abs(1/slope));//Math.min(Math.abs(offset.x/offset.y), Math.abs(offset.y/offset.x));
        var radiusDiff = Math.sqrt(1+smallestLeg*smallestLeg)/2;
        return radiusDiff;
    }

    this.conditionalFillCircleRow = function(xStart, xEnd, y, r, g, b, radius, centerPoint) {
        xStart = ~~xStart;
        xEnd = ~~xEnd;
        for (var x = xStart; x <= xEnd; x++) {
            this.conditionalFillCirclePixel(x, y, r, g, b, radius, centerPoint);

        }
    },

    this.conditionalFillCirclePixel = function(x, y, r, g, b, radius, centerPoint) {
        y = ~~y;
        x = ~~x;
        var offset = new Vector(x + .5, y + .5).subtract(centerPoint);
        var dist = offset.length();

        // First, crude check - if the center is at least .71 (slightly more than (sqrt(2) / 2))
        // pixel units inside the radius, we know this is a fully-enclosed pixel. And if the
        // center is more than .71 outside the radius, this pixel isn't lit at all.
        if (dist <= radius - .71) {
            terrain.drawPixel(x, y, r, g, b);
        } 
        else if (dist <= radius + .71) {
            // If we're in between (likely lit but not full), calculate a careful distance check taking
            // into account the direction this pixel is from center, and shade it accordingly.
            var radiusDiff = this.calcRadiusDiff(offset.y/offset.x);
            var alpha = Math.max(0, Math.min((radius + radiusDiff - dist)*.5/radiusDiff, 1));
            terrain.blendPixel(x, y, r, g, b, alpha);
        }
    },

    this.drawCircleSmooth = function(centerPoint, radius, r, g, b) {
        var startY = Math.max(0, ~~(centerPoint.y-radius-.5));
        var startX = Math.max(0, ~~(centerPoint.x-radius-.5));
        var endY = Math.min(terrain.TEXTURESIZE-1, ~~(centerPoint.y+radius+.5));
        var endX = Math.min(terrain.TEXTURESIZE-1, ~~(centerPoint.x+radius+.5));
        for (var y = startY; y <= endY; y++) {
            for (var x = startX; x <= endX; x++) {
                this.conditionalFillCirclePixel(x, y, r, g, b, radius, centerPoint);
            }
        }
    }
}

Vector = function(x, y) {
    this.x = x;
    this.y = y;
}

Vector.prototype = {
    normalize: function() {
        return this.scale(1/this.length());
    },
    length: function() {
        return Math.sqrt(this.x * this.x + this.y * this.y);
    },
    scale: function(factor) {
        return new Vector(this.x*factor, this.y*factor);
    },
    add: function(v) {
        return new Vector(this.x + v.x, this.y + v.y);
    },
    subtract: function(v) {
        return new Vector(this.x-v.x, this.y-v.y);
    }
}






