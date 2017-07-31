/*
 * The Sprite class represents a renderable image that defines how much its width and height should be
 * scaled given the desired 3D scaling factors in the x, y, and z dimensions. 
 * 
 * Note: This class still needs to be integrated into the renderer so that viewport no longer tries to figure out rendering scale for bitmaps
 * (should not be the viewport's job to do so).
 */

// Declared here so that each Sprite does not have to create its own canvas for rotating images.
const SPRITE_CANVAS = document.createElement("canvas");
const SPRITE_CONTEXT = SPRITE_CANVAS.getContext("2d");

// spriteSheet: An ImageBitmap for the spritesheet of a SpriteSheetModel.
// widthInX: The component of the Sprite's render width (in pixels) that is scaled by the model's x size.
// widthInY: The component of the Sprite's render width (in pixels) that is scaled by the model's y size.
// widthInZ: The component of the Sprite's render width (in pixels) that is scaled by the model's z size.
// heightInX: The component of the Sprite's render height (in pixels) that is scaled by the model's x size.
// heightInY: The component of the Sprite's render height (in pixels) that is scaled by the model's y size.
// heightInZ: The component of the Sprite's render height (in pixels) that is scaled by the model's z size.
// sourceX: The x pixel coordinate in spriteSheet corresponding to the top left of this Sprite's image.
// sourceY: The y pixel coordinate in spriteSheet corresponding to the top left of this Sprite's image.
// sourceWidth: The width in pixels of this Sprite's image in spriteSheet.
// sourceHeight: The height in pixels of this Sprite's image in spriteSheet. 
/*
 * Constructor. 
 */
Sprite = function (spriteSheet, widthInX, widthInY, widthInZ, heightInX, heightInY, heightInZ, sourceX, sourceY, sourceWidth, sourceHeight)
{
	// Fields:
	this.bitmap = spriteSheet;
	this.widthInX = widthInX;
	this.widthInY = widthInY;
	this.widthInZ = widthInZ;
	this.heightInX = heightInX;
	this.heightInY = heightInY;
	this.heightInZ = heightInZ;
	this.sourceX = sourceX;
	this.sourceY = sourceY;
	this.sourceWidth = sourceWidth;
	this.sourceHeight = sourceHeight;
}


// Methods:
Sprite.prototype = 
{
	// xScale: X scaling factor of agent being rendered with this Sprite.
	// yScale: Y scaling factor of agent being rendered with this Sprite.
	// zScale: Z scaling factor of agent being rendered with this Sprite.
	/* 
	 * Returns the world space width that should be projected by the camera in order to
	 * render this Sprite.
	 */
	getWorldWidth: function (xScale, yScale, zScale)
	{
		return this.widthInX*xScale + this.widthInY*yScale + this.widthInZ*zScale;
	},

	// xScale: X scaling factor of agent being rendered with this Sprite.
	// yScale: Y scaling factor of agent being rendered with this Sprite.
	// zScale: Z scaling factor of agent being rendered with this Sprite.
	/* 
	 * Returns the world space height that should be projected by the camera in order to
	 * render this Sprite.
	 */
	getWorldHeight: function (xScale, yScale, zScale)
	{
		return this.heightInX*xScale + this.heightInY*yScale + this.heightInZ*zScale;
	},

	/*
	 * Returns the bitmap to use when rendering this Sprite, passed as image to drawImage().
	 */
	getBitmap: function ()
	{
		return this.bitmap;
	},

	/*
	 * Returns the value that should be passed for sx when drawing this Sprite with drawImage().
	 */
	getSourceX: function ()
	{
		return this.sourceX;
	},

	/*
	 * Returns the value that should be passed for sy when drawing this Sprite with drawImage().
	 */
	getSourceY: function ()
	{
		return this.sourceY;
	},

	/*
	 * Returns the value that should be passed for sWidth when drawing this Sprite with drawImage().
	 */
	getSourceWidth: function ()
	{
		return this.sourceWidth;
	},

	/*
	 * Returns the value that should be passed for sHeight when drawing this Sprite with drawImage().
	 */
	getSourceHeight: function ()
	{
		return this.sourceHeight;
	}
}