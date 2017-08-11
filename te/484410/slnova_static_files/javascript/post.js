postWith = function(to, data, callback) {
	//data["csrfmiddlewaretoken"] = '{{csrf_token}}';
	var xmlhttp;
	if (window.XMLHttpRequest) {
		// code for IE7+, Firefox, Chrome, Opera, Safari
		xmlhttp = new XMLHttpRequest();
	} else {// code for IE6, IE5
		xmlhttp = new ActiveXObject("Microsoft.XMLHTTP");
	}
	//console.log(JSON.stringify(xmlhttp));
	// console.log(xmlhttp);
	xmlhttp.open("POST", to, false);
	//console.log(JSON.stringify(xmlhttp));
	xmlhttp.setRequestHeader("Content-Type", "application/x-www-form-urlencoded");
	xmlhttp.setRequestHeader("X-CSRFToken", csrfmiddlewaretoken);
	xmlhttp.onreadystatechange = function() {//Call a function when the state changes.
		if (xmlhttp.readyState == 4 && xmlhttp.status == 200) {
			if (callback != null) {
				//callback(errors)
				callback(xmlhttp.responseText);
			}
		}
	}
	xmlhttp.send(data);
	//console.log(JSON.stringify(xmlhttp));
	if (xmlhttp.status == 200) {
		return true;
	} else {
		return false;
	}
}
createNewProject = function() {
	var newProjectBtn = document.getElementById("newProjectBtn");
	if (newProjectBtn) { // doesn't exist when looking at someone else's profile
		newProjectBtn.onclick = function() {
			popup('selectProjectTypeDiv');
		}
	}
}

// this is probably quite old or unnecessary
/*createNewProject = function(domain, user) {
 var dic = {};
 var to = domain + user+ "projects/new/";
 console.log(to);
 var newProjectBtn = document.getElementById("newProjectBtn");
 newProjectBtn.onclick = function() {
 var bool = postWith(to, JSON.stringify(dic), getProject);
 }
 }*/

// function for old pop up to create new project (still used in some places, like the nav bar)
create = function() {
	var radios = $('input');
	var value;
	for (var i = 0; i < radios.length; i++) {
		// get value from correct radio button:
		// last part is to not include new radio buttons used by new modals (which have class newRadio)
		if (radios[i].type === 'radio' && radios[i].checked && !$(radios[i]).hasClass('newRadio')) {
			// get value, set checked flag or do whatever you need to
			value = radios[i].value;
		}
	}
	var dic = {
		"type" : value
	};
	var to = domain + user + "projects/new/";
	// console.log(to);
	// console.log(dic);
	var bool = postWith(to, JSON.stringify(dic), getProject);
}

// new function for modal
createProjectFromModal = function() {
	var radios = document.getElementsByName('newProjectOptions');
	var value;
	for (var i = 0; i < radios.length; i++) {
		if (radios[i].type === 'radio' && radios[i].checked) {
			// get value, set checked flag or do whatever you need to
			value = radios[i].value;
		}
	}
	var dic = {
		"type" : value,
		"title" : document.getElementById('newProjectTitle').value
	};
	var to = domain + user + "projects/new/";
	var bool = postWith(to, JSON.stringify(dic), function(p){
    		window.location.assign("http://" + window.location.host + p);
    	});
}

// new function
createNewGallery = function() {
	var data = $('#new_gallery_form').serialize();
	var to = domain + user + "galleries/new/";
	// var bool = postWith(to, JSON.stringify(data), function(){});
	$.ajax({
		url : to,
		type : "POST",
		data : data,
		success : function(res, y) {
			if ( y != 'success') { // not sure when this would be called...

				// el.empty();
				// popup(windowname);
				// loadChangePage(windowname, changeType, val);
			}
			else{ // successfully got a response, check what it is (this changed with some changes in views.py, which I made to not return unmodified because I want to display the error message)
				if (res === 'You already have a gallery with that title.') {
					$('#new_gallery_modal_error').text('Error: '+res);
				} else {
					// success
					$('#new_gallery_modal_error').text('');
					window.location = res;

				}

				// location = res;
				// $('#new_gallery_modal').modal('toggle');
			}
		},
		complete : function() {

		},
		error : function(xhr, textStatus, thrownError) {
			alert('bad');
		}
	});
	return false;
}

function toggle(div_id) {
	var el = document.getElementById(div_id);
	// console.log(div_id, "display is currently", el.style.display)
	if (el.style.display == 'none') {
		el.style.display = 'block';
	} else if(el.style.display == ''){
		el.style.display = 'none';
		toggle(div_id);
	}else {
		el.style.display = 'none';
	}
	// console.log(div_id, "display is", el.style.display);
}

function blanket_size(popUpDivVar) {
	console.log(popUpDivVar);
	if ( typeof window.innerWidth != 'undefined') {
		viewportheight = window.innerHeight;
	} else {
		viewportheight = document.documentElement.clientHeight;
	}
	if ((viewportheight > document.body.parentNode.scrollHeight) && (viewportheight > document.body.parentNode.clientHeight)) {
		blanket_height = viewportheight;
	} else {
		if (document.body.parentNode.clientHeight > document.body.parentNode.scrollHeight) {
			blanket_height = document.body.parentNode.clientHeight;
		} else {
			blanket_height = document.body.parentNode.scrollHeight;
		}
	}
	var blanket = document.getElementById('blanket');
	blanket.style.height = blanket_height + 'px';
	var popUpDiv = document.getElementById(popUpDivVar);
	console.log(popUpDiv);
	//popUpDiv_height=blanket_height / 2 - 150;
	//popUpDiv.style.top = popUpDiv_height + 'px';

	popUpDiv_height = - popUpDiv.style.height.slice(0, -2) / 2;
	popUpDiv.style.marginTop = popUpDiv_height + 'px';
}

function window_pos(popUpDivVar) {

	if ( typeof window.innerWidth != 'undefined') {
		viewportwidth = window.innerHeight;
	} else {
		viewportwidth = document.documentElement.clientHeight;
	}
	if ((viewportwidth > document.body.parentNode.scrollWidth) && (viewportwidth > document.body.parentNode.clientWidth)) {
		window_width = viewportwidth;
	} else {
		if (document.body.parentNode.clientWidth > document.body.parentNode.scrollWidth) {
			window_width = document.body.parentNode.clientWidth;
		} else {
			window_width = document.body.parentNode.scrollWidth;
		}
	}
	var popUpDiv = document.getElementById(popUpDivVar);
	console.log(popUpDiv);
	//window_width = window_width / 2 - 150;
	//popUpDiv.style.left = window_width + 'px';

	popUpDiv_width = - popUpDiv.style.width.slice(0, -2) / 2;
	popUpDiv.style.marginLeft = popUpDiv_width + 'px';
}


function popup(windowname, stack=false) {
	try {
		blanket_size(windowname);
		window_pos(windowname);
	}
	catch(err) {}
	
	if (stack == false) {
		toggle('blanket');
	}
	toggle(windowname);
}


function loadChangePage(windowname, changeType, val) {
	if (changeType != "") {
		var title = val;
		// if (changeType == '/username/change/'){
		// title = 'Change Username';
		// }
		// else if (changeType == '/email/change/'){
		// title = 'Change Email';
		// }
		// else{
		// title = 'Change Password';
		// }
		var el = $("#" + windowname);
		el.empty();
		el.load(changeType + ' .form-inline', function(response, status, xhr) {
			el.append("<button id='cancelButton'>Cancel</button>");
			$('#cancelButton').click(function() {
				el.empty();
				popup(windowname);
			});
			$('.form-inline').css('margin-bottom', '0px');
			el.prepend('<h3 id="title">' + title + '</h3>');
			$('#title').css('margin-top', '0px');
			var textA = document.getElementsByTagName("textarea");
			if (textA.length > 0) {
				for (var i = 0; i < textA.length; i++) {
					textA[i].style.resize = "none";
				}
			}
			el.unbind('submit')
			if (changeType != '/username/change/' && changeType != '/email/change/' && changeType != '/password/change/') {
				el.submit(function() {
					$.ajax({
						url : $(el).children('.form-inline').attr('action'), // only get the form-inline elements for the correct popup (and no modals!)
						type : "POST",
						data : $(el).children('.form-inline').serialize(),
						success : function(res, y) {
							if ( y != 'success') {
								el.empty();
								popup(windowname);
								loadChangePage(windowname, changeType, val);
							}
							else{
								location = res;
							}
						},
						complete : function() {
						},
						error : function(xhr, textStatus, thrownError) {
							alert('bad');
						}
					});
					return false;
				});
			}
		});

		popup(windowname);
	}

}

function popUpPost(url){
	window.parent.location.href = url;
	window.close();
}

var maxprogress = 250;   // total to reach
var actualprogress = 0;  // current value
var numLoadingSteps = 3;
var itv = 0;  // id to setinterval
function prog(inc)
{
  if (isNaN(inc)) return;
  if(actualprogress >= maxprogress)
  {
    clearInterval(itv);
    return;
  }
  var progressnum = document.getElementById("progressnum");
  var indicator = document.getElementById("indicator");
  actualprogress += 0+inc;
  // console.log(inc);
  // console.log("inc: " + inc + " actualprogress: "+actualprogress);
  indicator.style.width=actualprogress + "px";
  //console.log("INDICATOR WIDTH: "+ indicator.style.width);
  progressnum.innerHTML = "<b>"+(Math.round(actualprogress/2.5)) + "% </b>";
  if(actualprogress == maxprogress) clearInterval(itv);
}