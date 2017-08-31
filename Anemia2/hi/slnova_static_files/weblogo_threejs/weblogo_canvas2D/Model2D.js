/*
 * The Model2D class manages all the assets required for rendering instances of an agent with a particular shape.
 */
 
// assetUrl: The url path to the asset to use to create this model.
// rotGranularity: The number of discrete rotations for which this Model should have a unique sprite.
// callback: Optional argument for function to be run when model is ready to be used.
/* 
 * Constructor
 */
Model2D = function (assetUrl, rotGranularity, callback) 
{
	// Fields:
	this.modelPath = assetUrl; // Url to model asset.
	this.isLoaded = false; // Flag indicating whether Model has loaded sprites.
	this.rotationGranularity = rotGranularity; // The number of discrete rotations for which this Model has a 
											   // unique sprite.
	this.sprites = null; // Holds sprites for different rotations around z-axis.
	this.heightAdjust = 0.5; // World space distance to adjust z-height of model before rendering.
	this.sizeAdjust = 1.0; // Scale factor to adjust size of sprites before rendering.

	// Setup:
	var loader = new ModelLoader2D();
	loader.loadSprites(this, callback);
}


// Methods:
Model2D.prototype = 
{
	// Public Interface:
	
	// theta: Theta angle in degrees of the desired view perspective (spherical coordinates).
	// phi: Phi angle in degrees of the desired view perspective (spherical coordinates).
	/*
	 * Returns the sprite (an ImageBitmap) for rendering an agent from the desired perspective using this Model.
	 * Phi angle is clamped to the range [0, 180].
	 */
	getSprite: function (theta, phi)
	{
		// The theta and phi angles used to index to the correct sprite by converting phi degrees to a unit for angles where 
		// sprites.length = 180 degrees and theta degrees to sprites[0].length = 360 degrees.
		var thetaIndex = theta % 360;
		if (thetaIndex < 0 )
			thetaIndex = 360 + thetaIndex;
		thetaIndex = Math.round(thetaIndex * this.rotationGranularity / 360);
		if (thetaIndex == this.rotationGranularity)
			thetaIndex = 0;

		var phiIndex = phi;
		if (phiIndex < 0 )
			phiIndex = 0;
		if (phiIndex > 180)
			phiIndex = 180;
		phiIndex = Math.round(phiIndex * (this.rotationGranularity/2+1) / 180);
		if (phiIndex == (this.rotationGranularity/2+1))
			phiIndex--;

		var spriteIndex = phiIndex*this.rotationGranularity + thetaIndex;
		if (spriteIndex >= this.sprites.length)
			spriteIndex = this.sprites.length-1;
		return this.sprites[spriteIndex];
	},


	/*
	 * Returns the world space z-position adjustment to use when rendering this model.
	 */
	getHeightAdjustment: function ()
	{
		return this.heightAdjust;
	},


	/*
	 * Returns a scale factor for sprite size to use when rendering this model.
	 */
	getScaleFactor: function ()
	{
		return this.sizeAdjust;
	},


	/*
	 * Returns the number of discrete rotations for which this Model has a unique sprite.
	 */
	getRotationGranularity: function ()
	{
		return this.rotationGranularity;
	},


	// granularity: The new rotation granularity of the Model.
	/*
	 * Change the rotation granularity of the Model (the number of discrete rotations to have sprite representations for)
	 */
	setRotationGranularity: function (granularity)
	{
		this.rotationGranularity = granularity;
		var loader = new ModelLoader2D();
		this.isLoaded = false;
		loader.loadSprites(this);
	},
	
	
	/*
	 * Returns true if this Model is ready to return a sprite through getSprite().
	 */
	loaded: function ()
	{
		return this.isLoaded;
	}
}