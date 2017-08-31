/* NOTE: In terms of being able to boost performance, MIP maps seem to be a failed experiment. I think I need to do more testing with larger (512x512 maybe)
 * images to see the effects of MIP mapping. For now this has been put off to the side and is not integrated into the renderer. This class might get absorbed
 * into the Sprite class if MIP maps do get integrated. 
 */

/*
 * The MipMap object represents a collection of MIP map levels for an image used for rendering. It supports utilities for organizing 
 * and accessing the different MIP map levels of an image.
 */

 // source: One of two options:
 //		1: An ImageBitmap object to construct a MipMap for. The bitmap parameter is used as the highest resolution MIP level.
 //		2: An array of ImageBitmap objects to be interpreted as MIP levels of an image. Should be ordered from highest resolution MIP 
 //			level to lowest.
 /*
  * Constructor generates a MipMap object for the provided ImageBitmap or Creates a MipMap object from an array of pre-calculated
  * MIP levels (an array of ImageBitmap objects from highest resolution MIP level to lowest).
  */
 MipMap = function (source)
 {
 	this.mipLevels = []; // Array of ImageBitmaps for each MIP level.

 	this.fullWidth = bitmap.width; // Width of the highest resolution MIP level.
 	this.fullHeight = bitmap.height; // Height of the highest resolution MIP level.

 	if (source instanceof ImageBitmap)
 		this.generateMipLevels(source);
 	else
 		this.mipLevels = source;
 }


// Methods:
MipMap.prototype = 
{
	// Public Interface:

	// requestWidth: The desired width to render the returned ImageBitmap.
	// requestHeight: The desired height to render the returned ImageBitmap.
	/*
	 * Retrieves an ImageBitmap for the appropriate MIP map level based on the desired dimensions given.
	 */
	getMipLevel: function (requestWidth, requestHeight)
	{
		// Find the closest MIP level match larger or the same length as the desired length in both width and height
		var bestForWidth = ?;
		var bestForHeight = ?;

		if (bestForWidth >= bestForHeight)
			return this.mipLevels[bestForWidth];
		else
			return this.mipLevels[bestForHeight];
	},


	// Private Methods:

	// bitmap: An ImageBitmap object to generate MIP map levels from. The bitmap parameter is used as the highest resolution MIP level.
	/*
	 * Generates MIP map levels from the given 
	 */
	generateMipLevels: function (bitmap)
	{
		this.mipLevels.push(bitmap); // Use original image as top level.

		var canvas = document.createElement("canvas");
		var context = canvas.getContext("2d");
	}
}