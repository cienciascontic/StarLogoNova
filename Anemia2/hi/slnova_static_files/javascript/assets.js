/* assets.js
 *
 * Front-end Javascript related to asset management, including uploading, tagging, and searching.
 *
 * Dependencies:
 * 	- sb.WebLogoDemo
 *	- jQuery
 */

var PRELOAD_PANEL_STACK = "preloading";
window.addEventListener("load", function() {
	
	AssetManager.populateShapeManager();
	uploadAndPreviewAssets();
	AssetManager.populateSoundManager();
	
	// Search the database for assets matching the search query and display the results.
	$("#soundManager").find("#inp-search").keydown(function(e) {
		if (e.keyCode == 13) {
			Howler.unload();
			AssetManager.clearSounds();
			var category = "Sound";
			var query = $("#soundManager").find("#inp-search").val();
			if (query == "") {
				AssetManager.populateSoundManager();
			} else {
				var to = "/assetsearch?category=" + category + "&q=" + query;
				var xhr = new XMLHttpRequest();
				xhr.open("GET", to, true);
				xhr.onreadystatechange = function() {
					if (xhr.readyState == 4 && xhr.status == 200) {
						$("#soundManager").find("#assetsAvailable").html(xhr.responseText);
					}
				};
				xhr.send();
			}
		}

	});
	
	$("#shapeManager").find("#inp-search").keydown(function(e) {
		if (e.keyCode == 13) {
			var category = "3D Model";
			var query = $("#shapeManager").find("#inp-search").val();
			if (query == "") {
				AssetManager.populateShapeManager();
			} else {
				var to = "/assetsearch?category=" + category + "&q=" + query;
				var xhr = new XMLHttpRequest();
				xhr.open("GET", to, true);
				xhr.onreadystatechange = function() {
					if (xhr.readyState == 4 && xhr.status == 200) {
						$("#shapeManager").find("#assetsAvailable").html(xhr.responseText);
					}
				};
				xhr.send();
			}
		}

	});
	
});

// module AssetManager
var AssetManager = (function() {
	var projectAssets = [];
	var previewing_sounds = {};
	var callback = null;

	/* populateAssetManager
	 *
	 * Get all public or user-uploaded assets and assets in current project and display them
	 * in the asset manager.
	 *
	 * Required: None
	 *
	 * Returns: None
	 */
	var populate = function(type) {
		sb.WebLogoDemo.postWith(userUrl + 'searchassets/', JSON.stringify({
			'type': type
		}), function(response, status) {
			
			if (status == 200) {
				if (type == "3D Model") {
					$("#shapeManager").find("#assetsAvailable").html(response);}
				else if (type == "Sound") {
					$("#soundManager").find("#assetsAvailable").html(response);}

				sb.WebLogoDemo.postWith(userUrl + 'listassets/', JSON.stringify({
					'projectID' : project_ID,
					'revision_number' : revnumber,
					'type': type
				}), function(response, status) {
					if (type == "3D Model") {
						$("#shapeManager").find("#assetsInProject").html(response);
					}
					else if (type == "Sound") {
						$("#soundManager").find("#assetsInProject").html(response);
					}
					
					//populate drop down menu
					if (type == "3D Model") {
						var divs = document.getElementById('assetsInProject').getElementsByTagName("span");
						var imgs = $("#shapeManager").find("#assetsInProject").find("img");
					}
					else if (type == "Sound") {
						var divs = $("#soundManager").find("#assetsInProject").find("span");
						var imgs = $("#soundManager").find("#assetsInProject").find("img");
					} 
					
					var i;
					for ( i = 0; i < divs.length; i++) {
						var id = divs[i].className;
						if (!(checkAsset(id))) {
							projectAssets.push({
								'label' : divs[i].innerHTML,
								'value' : {
									'id' : Number(divs[i].className),
									'type': type,
									'file' : imgs[i].alt,
										toString : function() {
										return "asset_".concat(this['type']).concat("_").concat(this['id']);
										}
								}
							});
						}
					}
				});
			}
		});
	};
	
	/* checkAsset: checks to see if asset is already in project
	 * 
	 * Parameter: assetID
	 * 
	 * Returns: true if project contains asset with id=assetID or else false
	 */
	var checkAsset = function(assetID) {
		var i;
		for ( i = 0; i < projectAssets.length; i++) {
			if (projectAssets[i]['value']['id'] == assetID) {
				return true;
			}
		}
		return false;
	};
	var openAssetManager = function(cb) {
		callback = cb;
	}
	
	/* getProjectAssets: gets assets according to type
	 * 
	 * Parameter: type of asset (string)
	 * 
	 * Returns: array of assets of a particular type (e.g. 3D Model)
	 */
	var getProjectAssets = function(type) {
		var projectShapes = [];
		var projectSounds = [];
		for ( i = 0; i < projectAssets.length; i++) {
			asset = projectAssets[i];
	    	if (asset.value.type == "3D Model") {
	    		projectShapes.push(asset);
	    	}
	    	else if (asset.value.type == "Sound") {
	    		projectSounds.push(asset);
	    	}
	    }
	    if (type == "3D Model") {
	    	return projectShapes;
	    }
	    else if (type == "Sound") {
	    	return projectSounds;
	    }
	};

	/* selectAsset
	 *
	 * Parse URL data of the asset to be added and POST to Django. Update the HTML template with the response.
	 *
	 * Required:
	 *	[0] assetID (int) - the ID of the asset that needs to be added
	 *
	 * Returns: None
	 */
	var selectAsset = function(assetID, type) {
		var to = userUrl + 'getasset/';
		var data_dic = {
			'ID' : assetID,
			'projectID' : project_ID,
			'revision_number' : revnumber
		};
		sb.WebLogoDemo.postWith(to, JSON.stringify(data_dic), function(response, status) {
			if (getProjectAssets(type).length == 0) {
				if (type == "3D Model") 
					$("#shapeManager").find('#assetsInProject').html(response);
				else
					$("#soundManager").find('#assetsInProject').html(response);
			} else {
				if (type == "3D Model") 
					$("#shapeManager").find('#assetsInProject').append(response);
				else
					$("#soundManager").find('#assetsInProject').append(response);
			}
			var temp = document.createElement("div");
			temp.innerHTML = response;
			var file = temp.getElementsByTagName("img")[0].alt;
			var thumbnail = temp.getElementsByTagName("img")[0].src;
			delete temp;
			
			if (type == "3D Model") {
				var title = $("#assetsInProject .assetItem ." + assetID).text();
			}
			else if (type == "Sound") {
				var title = $("#soundManager #assetsInProject .assetItem ." + assetID).text();
			}
			
			for ( i = 0; i < projectAssets.length; i++) {
				if (projectAssets[i]['value']['id'] == assetID) {
					return null;
				}
			}
			
			var asset = {"title": title, "value":{
					'id' : assetID,
					'type': type,
					'file' : file,
						toString : function() {
						return "asset_".concat(this['type']).concat("_").concat(this['id']);
				}},
			 "thumbnail": thumbnail };
			console.log("asset object is", asset);
			
			projectAssets.push({
				'label' : title,
				'value' : {
					'id' : assetID,
					'type': type,
					'file' : file,
						toString : function() {
						return "asset_".concat(this['type']).concat("_").concat(this['id']);
					}
				}
			});
			
			callback(asset);

		});
	};

	/* removeProjectAsset: removes asset from array project_assets
	 * 
	 * Parameter: asset id of asset to be removed (string)
	 * 
	 * Returns: modified array
	 */
	var removeProjectAsset = function(assetID) {
		var i;
		for ( i = 0; i < projectAssets.length; i++) {
			if (projectAssets[i]['value']['id'] == assetID) {
				projectAssets.splice(i, 1);
			}
		}
	};
	
	/* removeAsset
	 *
	 * Parse URL data of the asset to be removed and POST to Django. Update the HTML template with the response.
	 *
	 * Required:
	 *	[0] assetID (int) - the ID of the asset that needs to be removed
	 *
	 * Returns: None
	 */
	var removeAsset = function(assetID, type) {
		if (type == "3D Model") {
			var title = $("#assetsInProject .assetItem ." + assetID).text();
		}
		else if (type == "Sound") {
			var title = $("#soundManager #assetsInProject .assetItem ." + assetID).text();
		}
		
		if (confirm("Are you sure you want to remove " + title + " from this project?")) {
			var i;
			for ( i = 0; i < projectAssets.length; i++) {
				if (projectAssets[i]['value']['id'] == assetID) {
					projectAssets.splice(i, 1);
				}
			}
				var to = userUrl + 'removeasset/';
				var data_dic = {
					'ID' : assetID,
					'projectID' : project_ID,
					'revision_number' : revnumber,
					'type': type
				};
				sb.WebLogoDemo.postWith(to, JSON.stringify(data_dic), function(response, status) {
					if (type == "3D Model") {
						$("#shapeManager").find("#assetsInProject").html(response);
					}
					else if (type == "Sound") {
						$("#soundManager").find("#assetsInProject").html(response);
					}
				});
			}
	};
	
	const PRELOAD_CACHE_PREFIX = "model/";
	var current_models = {};
	var current_sounds = {};
	
	// Should add to 100. Affects how much of progress bar is taken up by each step.
	const DOWNLOAD_PERCENTAGE = 70;
	const UNZIP_PERCENTAGE = 20;
	const TEXTURE_PERCENTAGE = 10;

	/* loadAsset: loads appropriate asset
	 * 
	 * Parameteres: id (int), type of asset (string)
	 * 
	 * Returns: none
	 * Either creates a Howl object for sound asset or loads shape to cache 
	 */
	var loadAsset = function(assetID, type) {
		var tag = "asset_" + type + "_" + assetID; // Alias for asset url, used with shapes.
			
		sb.WebLogoDemo.postWith(userUrl + 'loadasset/', JSON.stringify({
			'assetID': assetID
		}), function(response, status) {
			//response is the string of the url for the asset file
			if (type == "Sound") {
				for (key in current_sounds) {
					if (key == assetID) {
						var exists = true;
					}
				}
				if (!exists) {
					var sound = new Howl({
			      		src: [response]
			    	});
			    	current_sounds[assetID] = sound;
				}
			}
			else if (type == "3D Model") {
				// If already preloaded, skip preloading process.
				if (current_models.hasOwnProperty(assetID))
					return;
				else
					current_models[assetID] = null;
				
				// Push loading progress panel over the viewport div so user knows asset is still loading.
				var assetName;
				for (var asset of projectAssets)
				{
					if (asset.value.id == assetID)
						assetName = asset.label;
				}
				
				/* This used to happen on window load, but sometimes loadAsset gets
				 * called before that? I moved the panel stack creation code to here
				 * and it resolved the issue where the panel stack had not been created
				 * yet before loadAsset pushes a loading panel. We only create the panel 
				 * stack if it hasn't been created yet. - Malcolm
				 */
				if (!document.getElementById(PRELOAD_PANEL_STACK))
				{
					// Setup progress panel stack for assets being preloaded.
					const MAX_NUM_PANELS = 10;
					var preloading_stack = createPanelStack(PRELOAD_PANEL_STACK, MAX_NUM_PANELS);
					preloading_stack.style.top = "100px";
					preloading_stack.style.right = "0";
					document.getElementById("container").appendChild(preloading_stack);
				}
				
				// Now push new loading panel. 
				var loadingPanel = createLoadingPanel("Preload_"+assetID, assetName, 0.3);
				pushPanelToStack(loadingPanel.id, PRELOAD_PANEL_STACK);
				// This function is sometimes called before AssetManager can be populated, so we have to get the title from the server.
				if (!assetName)
				{
					var to = userUrl + 'assettitle/';
					var data_dic = { 'assetID' : assetID };
					sb.WebLogoDemo.postWith(to, JSON.stringify(data_dic), function(response, status) {
						updatePanelMessage(loadingPanel.id, response);
					});
				}
				
				var xhr = new XMLHttpRequest();
				xhr.open("GET", response);
				xhr.responseType = "blob";
				xhr.onload = function ()
					{
						var modelBlob = xhr.response;
						var zip = new StarLogoZipManager(modelBlob, 
								function ()
								{
									THREE.Cache.enabled = true;
							
									var filenames = zip.getFilenames();
									
									var geometryFileURL = null;
									var imageFilenames = [];
									for (filename of filenames)
									{
										var extension = zip.getFileExtension(filename);
										
										// Hold onto URL for geometry file to preload in viewport.
										if (SUPPORTED_MODEL_FORMATS.indexOf(extension) > -1)
											geometryFileURL = PRELOAD_CACHE_PREFIX+assetID+"/"+filename;
										
										if (SUPPORTED_IMAGE_FORMATS.indexOf(extension) > -1)
											imageFilenames.push(filename);
										// Postpone loading and caching images.
										else
											THREE.Cache.add(PRELOAD_CACHE_PREFIX+assetID+"/"+filename, 
												zip.getFile(filename));
									}
									
									// If there were no textures associated with the file, then go ahead and start loading the model.
									if (imageFilenames.length == 0)
									{
										updatePanelProgress("Preload_"+assetID, 100);
										viewport.loadModel(geometryFileURL, tag, 
												function () { destroyLoadingPanel("Preload_"+assetID); });
									}
									// Otherwise need to wait till last image is loaded before creating the FileModel.
									else
									{
										for (var i = 0; i < imageFilenames.length; i++)
										{
											var imageDataUrl = "data:image/" + zip.getFileExtension(imageFilenames[i]) + 
												";base64," + zip.getFile(imageFilenames[i]);
											var image = new Image();
											image.src = imageDataUrl;
											THREE.Cache.add(PRELOAD_CACHE_PREFIX+assetID+"/"+imageFilenames[i], image);
											if (i == imageFilenames.length - 1) 
											{
												var loadGeo = function () { 
													updatePanelProgress("Preload_"+assetID, 100);
													viewport.loadModel(geometryFileURL, tag,
															function () { destroyLoadingPanel("Preload_"+assetID); });
												}
												image.onload = loadGeo;
												
												var onErrorScope = { filename: imageFilenames[i] };
												image.onerror =  function () {
													console.log("Attempt to load image file type unsupported on browser: ", 
															this.filename);
													var canvas = document.createElement("canvas");
													canvas.width = 64;
													canvas.height = 64;
													var context = canvas.getContext("2d");
													context.fillStyle = "white";
													context.fillRect(0, 0, canvas.width, canvas.height);
													
													var replacementImage = new Image();
													replacementImage.src = canvas.toDataURL("image/png");
													THREE.Cache.add(PRELOAD_CACHE_PREFIX+this.filename, replacementImage);
													replacementImage.onload = loadGeo;
												}.bind(onErrorScope);
											}
										}
									}
								},
								function (event)
								{
									if (event.lengthComputable)
									{
										var percentLoaded = event.loaded/event.total*UNZIP_PERCENTAGE + DOWNLOAD_PERCENTAGE;
										updatePanelProgress("Preload_"+assetID, percentLoaded);
									}
								});
					};
				xhr.onprogress = function (event) 
					{
						if (event.lengthComputable)
						{
							var percentLoaded = event.loaded/event.total*DOWNLOAD_PERCENTAGE;
							updatePanelProgress("Preload_"+assetID, percentLoaded);
						}
					};
				xhr.send();
			}
			
		});
	};
	
	/* playSound: plays a sound
	 * 
	 * Parameter: id of sound to be played (int)
	 * 
	 * Returns: none
	 * Creates a sound if sound has not been previously loaded then plays it
	 */
	var playSound = function(assetID) {
		if (typeof assetID !== Number) {
			var temp = assetID.split("_");
			assetID = temp[temp.length - 1];
		}
		for (key in current_sounds) {
			if (key == assetID) {
				var exists = true;
			}
		}
		if (exists) {
			var sound = current_sounds[assetID];
			sound.stop();
			sound.play();
		}
		else {
			sb.WebLogoDemo.postWith(userUrl + 'loadasset/', JSON.stringify({
				'assetID': assetID
			}), function(response, status) {
				
				var sound = new Howl({
		      		src: [response]
		    	});
		    	current_sounds[assetID] = sound;
		    	sound.play();
		});
		}
		
	};
	
	return {
		populateShapeManager : function() {
			populate("3D Model");
		},
		populateSoundManager : function() {
			populate("Sound");
		},
		getLink : function(label) {
			return assetLinks[label];
		},
		selectShape : function(assetID) {
			selectAsset(assetID, "3D Model");
		},
		selectSound : function(assetID) {
			selectAsset(assetID, "Sound");
		},
		getProjectAssets : function() {
			return projectAssets;
		},
		removeShape : function(assetID) {
			removeAsset(assetID, "3D Model");
		},
		removeSound : function(assetID) {
			removeAsset(assetID, "Sound");
		},
		loadSound : function(assetID) {
			loadAsset(assetID, "Sound");
		},
		loadShape : function(assetID) {
			loadAsset(assetID, "3D Model");
		},
		playSound : function(assetID) {
			playSound(assetID);
		},
		// The 4 functions below are used for previewing sounds in sound manager
		checkSounds: function(assetID) {
			for (key in previewing_sounds) {
				if (key == assetID) {
					return true;
				}
			}
			return false;
		},
		clearSounds: function() {
			previewing_sounds = {};
		},
		addSound: function(id, sound) {
			previewing_sounds[id] = sound;
		},
		getSound: function(id) {
			return previewing_sounds[id];
		},
		open: function(cb) {
			openAssetManager(cb);
		}
		
	};

})();

/* readFile
 *
 * Log the contents of the file.
 *
 * Required:
 *	[0] file - the file to be read
 *
 * Returns: None
 */
function readFile(file) {
	var read = new FileReader();
	read.onloadend = function() {
		console.log(read.result);
	};
	read.readAsBinaryString(file);
}







