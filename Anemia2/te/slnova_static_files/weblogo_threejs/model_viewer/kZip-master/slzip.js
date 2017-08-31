/**
* Create a new StarLogoZipManager to read/create a zip
* @param file - A zip file, usually uploaded via file input (optional)
* @param onLoad_callback {function} - Function to call when file has finished reading. May take in 
*                                       this as its only argument (optional). Param added by Malcolm Wetzstein.
* @param onProgress_callback {function} - Function to call as progress is made when reading the zip. Takes in an event
* 										as its only argument. Param added by Malcolm Wetzstein.
* @param error_callabck {function} - Function to call if there is an error reading zip.
*                                       error will be passed as param (optional).
* @return {obj} A StarLogoZipManager
*/
var StarLogoZipManager = function(file, onLoad_callback, onProgress_callback, error_callback, allowed_extensions) {
	const SUPPORTED_IMAGE_FORMATS = ["jpeg", "jpg", "png", "tif", "tiff", "gif", "bmp"];
	
    var that = this;
    var zipName = file.name;
    var reader = new FileReader();
    reader.onprogress = onProgress_callback;
    if (!allowed_extensions || allowed_extensions.length == 0)
    {
        var allowed_extensions = ["jpg", "png", "jpeg", "txt"];
    }
    // Dictionary of file contents
    // Key is file name
    var files = {};
    var zip;
    // Regular expression for file extension
    var re = /(?:\.([^.]+))?$/;

    /*
     * Malcolm Wetzstein
     */
    this.onZipLoad = onLoad_callback;
    var extensions = {}; // Dictionary of file extensions. Filenames are keys.

    this.getFileExtension = function (filename) 
    {
        if (filename in extensions)
            return extensions[filename];
        else
            return false;
    }
    /*
     * Malcolm Wetzstein
     */
    
    // zipName: Name to give zip file, minus the file extension (".zip").
    /**
    * Create a new zip file containing files currently being managed.
    * @return the new zip file.
    */
    this.getZip = function()
    {
        var all_files = files;
        var zip = new JSZip();
        var filenames = Object.keys(all_files);
        for (var x = 0;x < filenames.length; x += 1)
        {
            var file_name = filenames[x];
            console.log(file_name);
            var extension = re.exec(file_name)[1];
            
            if (SUPPORTED_IMAGE_FORMATS.lastIndexOf(extension) > -1)
            	zip.file(file_name, all_files[file_name], {base64: true});
            else
            	zip.file(file_name, all_files[file_name]);  
        }
        
        // Return new zip file.
        return new File([zip.generate({type:"blob"})], zipName);
    }
    
    /**
    * Update a file with new contents
    * @param {string} old_filename - Name of file to be updated (before name change). 
                                    Should match a key of files
    * @param {string} new_contents - New contents for the file
    * @param {string} new_filename - New name for the file (optional)
    * @return {boolean} - Returns true if file exists, else false
    */
    this.updateFile = function(old_filename, new_contents, new_filename)
    {
        if (old_filename in files)
        {
            if (new_filename)
            {
                var extension = re.exec(new_filename)[1];
                if (allowed_extensions.indexOf(extension) < 0)
                {
                    return false;
                }
                files[new_filename] = new_contents;
                delete files[old_filename];
            } else {
                files[old_filename] = new_contents;
                return true;
            }
        } else {
            return false;
        }
    }
    
    /**
    * Add a new file to this ZipFileManager
    * @param {string} filename - The name of the file to be added
    * @param {string} contents - The contents for the file to be added
    * @returns {boolean} - True if file added, else false
    */
    this.addFile = function(filename, contents)
    {
        var extension = re.exec(filename)[1];
        if (allowed_extensions.indexOf(extension) < 0)
        {   
            files[filename] = contents;
            return true;
        } else {
            return false;
        }
    }
    
    /**
    * Delete a specific file
    * @param {string} filename - The name of the file to be deleted
    * @return {boolean} - True if file existed, else False
    */
    this.deleteFile = function(filename)
    {
        if (filename in files)
        {
            delete files[filename];
            return true;
        } else {
            return false;
        }
    }
    
    /**
        Save a new text file in our files dictionary
        (Works for any file that should be read as text)
    */
    var handleNewTextFile = function(new_entry)
    {
        var name = new_entry.name;
        var content = (new_entry.asText());
        files[name] = content;
        extensions[name] = re.exec(name)[1];
    }
    /**
        Save a new binary image file in our files dictionary
        Works for any image file that can be encoded into base64 string
    */
    var handleNewImageFile = function(entry)
    {
        console.log("Image File");
//        console.log(entry.asText());
        files[entry.name] = btoa(entry.asBinary());
        extensions[entry.name] = re.exec(entry.name)[1];
    }
    
    /**
    * Read a zip file and extract all of the files in it
    * All extracted files placed in our files dictionary
    * @requires handleNewTextFile
    * @requires handleNewImageFile
    * @param f {obj} Zip File
    * @param zipManager - Instance of this StarLogoZipManager. Parameter added by Malcolm Wetzstein.
    * @return none
    */
    var readZip = function(f, zipManager)
    {
        reader.onload = (function(theFile) {
        return function(e) {
          try {
            var dateBefore = new Date();
            // read the content of the file with JSZip
            zip = new JSZip(e.target.result);
            var dateAfter = new Date();
              
            $.each(zip.files, function (index, zipEntry) {
                var file_name = zipEntry.name;
                // We ignore those weird files MAC adds to every directory
                if (file_name.indexOf("__MACOSX") < 0)
                {
                    var extension = re.exec(file_name)[1];
                    
                    if (SUPPORTED_IMAGE_FORMATS.lastIndexOf(extension) > -1)
                    	handleNewImageFile(zipEntry);
                    else
                    	handleNewTextFile(zipEntry); 
                }
                console.log(files);
            });
        zipManager.onZipLoad(zipManager);

          } catch(err) {
              console.log("Zip Read Error");
              console.log(err);
              if (error_callback)
              {
                  error_callback(err.message);
              }
          }
        }
      })(f);
    reader.readAsArrayBuffer(f);
        console.log("Finish2");
    }
    
    
    /**
    * Getters for private vars in this class
    */
    
    /**
    * @returns {array} - List of Filenames
    */
    this.getFilenames = function() { return Object.keys(files); };
    /**
    * @returns {dictionary} - File contents. File names are keys
    */
    this.getAllFiles = function() { return files; }
    /**
    * @param {string} file_name - Name of file to retrieve contents of
    * @returns {string} - Content of given file
    */
    this.getFile = function(file_name)
    {
        if (file_name in files)
        {
            console.log(files);
            return files[file_name];
        } else {
            console.log(Object.keys(files));
            return false;
        }
    }
    /**
    * @returns {string} - Regular expression for extracting file extension
    */
    this.getExtensionExpression = function() { return re; }
    
    // When initialized, read the zip file (if it exists)
    if (file)
    {
        readZip(file, this);
    }
}