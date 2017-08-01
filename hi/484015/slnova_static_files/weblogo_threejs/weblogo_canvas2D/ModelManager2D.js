/*
 * The ModelManager2D is responsible for handling all 2D drawing assets (loading, storing, organizing, and creating assets).
 */

// rotGranularity: Rotation granularity (number of discrete rotations represented by each model) to use for models.
/*
 * Constructor for the ModelManager.
 */
ModelManager2D = function (rotGranularity)
{	
	this.builtIn = ['sphere', 'cube', 'pyramid', 'triangle'];
	this.rotationGranularity = rotGranularity; // Number of discrete rotations represented by each model
	this.modelMap = new Map(); // Stores models.
	this.tagToUrl = new Map(); // Maps tag aliases to model urls.
}


// Methods:
ModelManager2D.prototype = 
{
	// Public Interface:
	
	// model: url or tag specifying the sprite source for the model.
	// callback: optional argument for function to be executed when model is ready.
	/*
	 * Returns a model loaded from the given url/tag and calls callback when the model is
	 * ready to be used if callback is defined. 
	 */
	getModel: function (model, callback) 
	{
		const tagRegEx = /asset_3D Model_[0-9]+/;

		// If model is not an unassociated tag.
    	if (!(tagRegEx.test(model) && !this.tagToUrl.has(model)))
		{
			var fileUrl = model;
            if (this.tagToUrl.has(model))
                fileUrl = this.tagToUrl.get(model);

			if (!this.modelMap.has(fileUrl))
				this.modelMap.set(fileUrl, new Model2D(fileUrl, this.rotationGranularity, callback));
			else if (callback)
				callback();
		
			return this.modelMap.get(fileUrl);
		}
		else if (callback)
			callback();
	},

	// model: a model url/tag
	/*
	 * Returns true if model corresponds to a built-in shape.
	 */
	isBuiltIn: function(model) 
	{
		if (this.builtIn.indexOf(model)>-1) return true;
		return false;
	},

	// tag: An alias for url.
	// url: A string representing the url for a model.
	/*
	 * Register tag as an alias for url so that models with tag as their shape will render with the model
	 * loaded by url.
	 */
	associateTagToUrl: function(tag, url) 
	{
        this.tagToUrl.set(tag, url);
    },

    /*
	 * Clears all Models and unassociate all tags.
	 */
	clearModels: function() 
	{
		this.tagToUrl.clear();
		this.modelMap.clear();
	},

	// granularity: New rotation granularity for models.
	/*
	 * Set a new rotation granularity for all models.
	 */
	setRotationGranularity: function(granularity)
	{
		this.rotationGranularity = granularity;
		// TODO: Force aleady loaded models to use new granularity.
	}
}