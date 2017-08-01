// setTimeout(function(){

// var old = UIIntentionalStream.instance.loadOlderPosts;
// UIIntentionalStream.instance.loadOlderPosts = function() {
//     // hook before call
//     var ret = old.apply(this, arguments);
//     // hook after call
//     return ret;
// };

// var old function(project, autosave, saveTime, autosaveTime) {
// get = function() {

//     var ret = old.apply(this, arguments);

window.onload = function() {

    // Hide FPS counter
    document.getElementById('stats').style.display = "none";

    // Get the text in the title
    var titleText = document.getElementById('id_title').value

    // Get the text in the description
    var descText = document.getElementById('d').value

    // Get the description box container
    var ctr = document.getElementById('id_title').parentElement
    ctr.style.float = "none";
    ctr.style.margin = "auto";

    var hdr = document.createElement('h3');
    hdr.innerText = titleText
    hdr.id = "hdr"
    var desc = document.createElement('div');
    desc.innerHTML = "<p>" + descText + "</p>"
    desc.id = "desc"

    // Appending items to each other
    ctr.appendChild(hdr);
    ctr.appendChild(desc);

    console.log(ctr)

    // Hide the old elements
    document.getElementById('id_title').style.display = "none";
    document.getElementById('d').style.display = "none";


    document.getElementById('viewBtn').style.color = "orange";
    document.getElementById('editBtn').style.color = "";


    // Hide block editor
    document.getElementById('blockWS').style.display = "none";



    window.toggleMode = function() {
        
        if (document.getElementById('blockWS').style.display == "none") {
            document.getElementById('blockWS').style.display = "";
            document.getElementById('id_title').style.display = "";
            document.getElementById('d').style.display = "";
            document.getElementById('hdr').style.display = "none";
            document.getElementById('desc').style.display = "none";
            document.getElementById('viewBtn').style.color = "";
            document.getElementById('editBtn').style.color = "orange";
        } else {
            document.getElementById('blockWS').style.display = "none";
            document.getElementById('id_title').style.display = "none";
            document.getElementById('d').style.display = "none";

            var hdr = document.getElementById('hdr');
            hdr.innerText = document.getElementById('id_title').value
            hdr.style.display = "";

            var desc = document.getElementById('desc')
            desc.innerText = document.getElementById('d').value
            desc.style.display = "";   

            document.getElementById('viewBtn').style.color = "orange";
            document.getElementById('editBtn').style.color = "";
        }
    }
    viewport.camera.viewWidth = 800;
    viewport.needsUpdate = true;
}