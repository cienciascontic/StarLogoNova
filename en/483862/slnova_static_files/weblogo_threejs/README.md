# StarLogo Renderer

## Components

### Viewport
Sets up the 3D world (terrain, camera controls, renderer). Contains the render() loop which calls the animate() function for each frame, updating the world as necessary.

### ModelManager
Holds the batch information for each model. The Viewport adds all models to the ModelManager (per frame), and the ModelManager keeps this batch data. When the Viewport calls render(), the ModelManager pushes this data to the shader. 

### Models
A model holds an InstancedBufferGeometry with the appropriate vertices, faces, normals, and uvs. It also keeps the appropriate materials for texturing this model.

*ShapeModel(type)* Loads a built-in shape. The vertices are hard-coded into the ShapeModel.js file. Types currently supported: 'sphere', 'cube', 'pyramid', 'triangle'. 

*FileModel(url, callback)* Loads a model from a URL, calls the callback on the loaded model. Currently supports OBJ and DAE files.  

### Terrain
Creates the terrain geometry and keeps the texture buffer for stamping. Supports stamp(), circle(), line(), gridSquare(), and clear() functions.

## Engine-facing Functions
*Viewport.animate()* calls modelManager.add(agent) while iterating over the agents list. It then calls modelManager.render() to load batches and render the scene.

*Viewport.loadModel(url, tag)* calls modelManger and loads the model from the given url under the given asset tag (used in the engine for pre-loading). Agents whose shape is tag will be rendered using the loaded model.

*Viewport.terrain* stores the Terrain object. Used for stamping. 
    
*ModelManager.add()* depends on agent structure from engine. Currently expects rotation, scale, translation, color, and url/shape.