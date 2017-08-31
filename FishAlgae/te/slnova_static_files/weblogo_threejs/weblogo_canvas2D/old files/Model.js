/*
 * The Model class manages all the assets required for rendering instances of an agent with a particular shape.
 */
 
// assetUrl: The url path to the asset to use to create this model.
// rotGranularity: The number of discrete rotations for which this Model should have a unique sprite.
// callback: Optional argument for function to be run when model is ready to be used.
/* 
 * Constructor
 */
Model = function (assetUrl, rotGranularity, callback) 
{
	// Fields:
	this.modelPath = assetUrl; // Url to model asset.
	this.isLoaded = false; // Flag indicating whether Model has loaded sprites.
	this.rotationGranularity = rotGranularity; // The number of discrete rotations for which this Model has a 
											   // unique sprite.
	this.sprites = null; // Holds sprites for different rotations around z-axis.

	// Setup:
	var loader = new ModelLoader();
	loader.loadSprites(this, callback);
}


// Methods:
Model.prototype = 
{
	// Public Interface:
	
	// heading: The heading of an agent being rendered with this model. Heading should be relative to view space.
	/*
	 * Returns the sprite (an ImageBitmap) for rendering an agent with the given heading using this Model.
	 */
	getSprite: function (heading)
	{
		// The heading is used to index to the correct sprite by converting degrees to a unit for angles where 
		// sprites.length = 360 degrees.
		var index = heading % 360;
		if (index < 0 )
			index = 360 + index;
		index = Math.round(index * this.sprites.length / 360);
		if (index == this.sprites.length)
			index = 0;

		return this.sprites[index];
	},


	/*
	 * Returns the number of discrete rotations for which this Model has a unique sprite.
	 */
	getRotationGranularity()
	{
		return this.rotationGranularity;
	},


	// granularity: The new rotation granularity of the Model.
	/*
	 * Change the rotation granularity of the Model (the number of discrete rotations to have sprite representations for)
	 */
	setRotationGranularity(granularity)
	{
		this.rotationGranularity = granularity;
		var loader = new ModelLoader();
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