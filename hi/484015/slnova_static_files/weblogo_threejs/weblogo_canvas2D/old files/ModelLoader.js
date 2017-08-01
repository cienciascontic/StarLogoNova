/*
 * The ModelLoader is responsible for taking an asset and loading the necessary sprites to represent a model for 
 * that asset.
 */

const SUPPORTED_SPRITE_FORMATS = ["jpeg", "jpg", "png", "gif", "bmp"];

const BUILT_IN_SHAPES = 
[
	'sphere', 
	'cube', 
	'pyramid', 
	'triangle'
];

const BUILT_IN_RESOLUTION = 512; // Used for generated sprites.


/* 
 * Constructor
 */
 ModelLoader = function ()
 {
 	this.canvas = document.createElement("canvas");
 	this.context = this.canvas.getContext("2d");
 }


 // Methods
 ModelLoader.prototype = 
 {
 	// Public Interface:

	// model: Model to load sprites into.
	// callback: Optional argument for a function to be called when this loader loads enough for the model to be rendered.
 	/*
	 * Loads sprites into a Model using its asset source and properties.
	 */
	loadSprites: function (model, callback)
	{
		var loader = this;
		var loadBitmaps = function (bitmap) 
					{
						model.sprites = []; // Make sure there are no previously created sprites in the list before populating.
						model.sprites.push(bitmap); // Push original sprite.
						model.isLoaded = true;

						if (callback)
							callback();

						// Push rotations.
						for (var i = 1; i < model.getRotationGranularity(); i++)
						{
							loader.addRotation(model, i * 360 / model.getRotationGranularity());
						}
					};
		var onFailure = function (reason)
					{
						alert("Could not create sprite bitmap for " + model.modelPath + ". " + reason);
					};

		if (BUILT_IN_SHAPES.lastIndexOf(model.modelPath) > -1)
		{
			this.canvas.width = BUILT_IN_RESOLUTION;
			this.canvas.height = BUILT_IN_RESOLUTION;
			this.context.fillStyle = "white";

			this.context.beginPath();
			if (model.modelPath == "sphere")
				this.context.arc((BUILT_IN_RESOLUTION+1)/2, (BUILT_IN_RESOLUTION+1)/2, (BUILT_IN_RESOLUTION+1)/2, 0, Math.PI*2);
			else if (model.modelPath == "cube")
				this.context.rect(0, 0, BUILT_IN_RESOLUTION, BUILT_IN_RESOLUTION);
			else if (model.modelPath == "pyramid")
			{
				// Top triangle.
				this.context.moveTo(0, 0);
				this.context.lineTo((BUILT_IN_RESOLUTION+1)/2, (BUILT_IN_RESOLUTION+1)/2);
				this.context.lineTo(BUILT_IN_RESOLUTION, 0);
				this.context.closePath();
				this.context.fill();

				// Left triangle.
				this.context.fillStyle = "#FDFDFD";
				this.context.beginPath();
				this.context.moveTo(0, 0);
				this.context.lineTo((BUILT_IN_RESOLUTION+1)/2, (BUILT_IN_RESOLUTION+1)/2);
				this.context.lineTo(0, BUILT_IN_RESOLUTION);
				this.context.closePath();
				this.context.fill();

				// Right triangle.
				this.context.fillStyle = "#F0F0F0";
				this.context.beginPath();
				this.context.moveTo(BUILT_IN_RESOLUTION, 0);
				this.context.lineTo((BUILT_IN_RESOLUTION+1)/2, (BUILT_IN_RESOLUTION+1)/2);
				this.context.lineTo(BUILT_IN_RESOLUTION, BUILT_IN_RESOLUTION);
				this.context.closePath();
				this.context.fill();

				// Bottom triangle.
				this.context.fillStyle = "#EDEDED";
				this.context.beginPath();
				this.context.moveTo(0, BUILT_IN_RESOLUTION);
				this.context.lineTo((BUILT_IN_RESOLUTION+1)/2, (BUILT_IN_RESOLUTION+1)/2);
				this.context.lineTo(BUILT_IN_RESOLUTION, BUILT_IN_RESOLUTION);
			}
			else // Assume triangle
			{
				this.context.moveTo(0, 0);
				this.context.lineTo(BUILT_IN_RESOLUTION, (BUILT_IN_RESOLUTION+1)/2);
				this.context.lineTo(0, BUILT_IN_RESOLUTION);
			}

			this.context.closePath();
			this.context.fill();

			createImageBitmap(this.canvas).then(loadBitmaps, onFailure);
		}
		else
		{
			var fileType = model.modelPath.split(".").slice(-1)[0];
			if (SUPPORTED_SPRITE_FORMATS.lastIndexOf(fileType) < 0)
			{
				this.canvas.width = BUILT_IN_RESOLUTION;
				this.canvas.height = BUILT_IN_RESOLUTION;
				this.context.fillStyle = "black";
				this.context.fillRect(0, 0, BUILT_IN_RESOLUTION, BUILT_IN_RESOLUTION);

				var firstLetter = model.modelPath.split("/").slice(-1)[0][0].toUpperCase();
				this.context.fillStyle = "white";
				this.context.font = BUILT_IN_RESOLUTION+"px sans-serif";
				this.context.textAlign = "center";
				this.context.textBaseline = "middle";
				this.context.fillText(firstLetter, BUILT_IN_RESOLUTION/2, BUILT_IN_RESOLUTION/2);

				createImageBitmap(this.canvas).then(loadBitmaps, onFailure);
			}
			else
			{

				var spriteImage = new Image();
				spriteImage.crossOrigin = "anonymous";
				spriteImage.onload = function () 
				{ 
					createImageBitmap(this).then(loadBitmaps, onFailure); 
				};
				spriteImage.src = model.modelPath;
				spriteImage.onerror = function() 
					{ 
						alert("Could not load sprite asset for " + model.modelPath + "."); 
					};
			}
		}
	},


	// Private Methods

	// model: Model to load the rotated sprite into.
	// rotation: Angle in degrees to rotate generated sprite. 
	/*
	 * Generates a rotation of a Model's sprite for heading 0 and adds it to the Model's sprites.
	 */
	addRotation: function (model, rotation)
	{
		this.context.clearRect(0, 0, this.canvas.width, this.canvas.height);

		var radians = rotation * Math.PI / 180;
		var originalWidth = model.sprites[0].width;
		var originalHeight = model.sprites[0].height;

		// Size scratch canvas to fit entire rotated image. <- TODO: get this to work properly! Right now images scale too large 
		// at certain angles.
		this.canvas.width = Math.round(originalWidth * Math.abs(Math.cos(radians)) + 
			originalHeight * Math.abs(Math.sin(radians)));
		this.canvas.height = Math.round(originalWidth * Math.abs(Math.sin(radians)) + 
			originalHeight * Math.abs(Math.cos(radians)));

		// Transform canvas to draw rotated sprite.
		this.context.save();
		this.context.translate(this.canvas.width/2.0, this.canvas.height/2.0);
		this.context.rotate(radians);

		this.context.drawImage(model.sprites[0], -originalWidth/2.0, -originalHeight/2.0, originalWidth, originalHeight);

		this.context.restore();

		createImageBitmap(this.canvas).then(
			function (bitmap) 
			{
				model.sprites.push(bitmap);
			},
			function (reason)
			{
				alert("Could not create rotated bitmap for " + model.modelPath + ". " + reason);
			}); 
	}
 }