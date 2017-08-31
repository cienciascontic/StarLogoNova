toggleBlanket = function() {
	$(".blanket").each(function() {
		if ($(this).css('display') == 'none') {
			$(this).css('display', 'block');
		} else {
			$(this).css('display', 'none');
		}
	});
}

popWindow = function(link, name, width, height){
	if(typeof(width)==='undefined') width = 500;
	if(typeof(height)==='undefined') height = 300;
	win = window.open(link,name,'width='+width+', height='+height+', titlebar=no,location=no,scrollbars=no,menubar=no')
	win.focus();
}

//the following is from the Django docs to make the AJAX form submissions work
$(document).ajaxSend(function(event, xhr, settings) {
  function getCookie(name) {
    var cookieValue = null;

    if (document.cookie && document.cookie != '') {
      var cookies = document.cookie.split(';');

      for (var i = 0; i < cookies.length; i++) {
        var cookie = jQuery.trim(cookies[i]);

        // Does this cookie string begin with the name we want?
        if (cookie.substring(0, name.length + 1) == (name + '=')) {
          cookieValue = decodeURIComponent(cookie.substring(name.length + 1));
          break;
        }
      }
    }

    return cookieValue;
  }

  function sameOrigin(url) {
    // url could be relative or scheme relative or absolute
    var host = document.location.host;
    // host + port
    var protocol = document.location.protocol;
    var sr_origin = '//' + host;
    var origin = protocol + sr_origin;

    // Allow absolute or scheme relative URLs to same origin
    return (url == origin || url.slice(0, origin.length + 1) == origin + '/') ||
           (url == sr_origin || url.slice(0, sr_origin.length + 1) == sr_origin + '/') ||
           // or any other URL that isn't scheme relative or absolute i.e relative.
           !(/^(\/\/|http:|https:).*/.test(url));
  }

  function safeMethod(method) {
    return (/^(GET|HEAD|OPTIONS|TRACE)$/.test(method));
  }

  if (!safeMethod(settings.type) && sameOrigin(settings.url)) {
    xhr.setRequestHeader("X-CSRFToken", getCookie('csrftoken'));
  }
});

function showLoadErrors(errors, status) {
	if (status != 200) {
		alert("Your project information did not save.");
	} else {
		console.log("in the getErrors function");
		if (errors[1] != "!") {
			alert(errors);
		} else {
			document.title = title;
		}
	}
}

getErrors = function(errors) {
	console.log("in the getErrors function");
	alert(errors);
};

get = function(project, autosave, saveTime, autosaveTime) {
	projectStr = project;

	console.log("variables are populated");

	if (saveTime < autosaveTime && project != autosave && autosave != "" && loggedIn && (editingOwnProject || collaborator)) {
		console.log("project: " + project);
		console.log("autosave: " + autosave);
		//var r = confirm("Your last auto-save is more recent than your latest manual save.\n\n If you'd like to load your most recent auto-save, click 'OK'.\n If you'd like to load your most recent manual save, click 'Cancel'.");
		//if (r) {
			projectStr = autosave;
		//}
	}
	console.log("About to try to inflate project string in djangoWL");
	if (!(projectStr[0] == '{')) {
		projectStr = sb.WebLogoDemo.inflateString(projectStr);
		projectStr = projectStr.replace(/\\\\n/g,"\\n");
	} else {
		projectStr = projectStr.replace(/\n/g, "\\n");
	}
	console.log("Attempting to load project in djangoweblogo: " + projectStr);
	sb.WebLogoDemo.loadProject(projectStr);
};

// Eva's stuff
var zoomable = false;
function setZoom(bool) {
	zoomable = bool;
}

function zoom() {
	return zoomable;
}

function updateTitle() {
	var t = document.getElementById("id_title");
	var title = t.value;
	var dic = {
		"title" : title,
	};
	var to = domain + abs_url + "title/";
	sb.WebLogoDemo.postWith(to, JSON.stringify(dic), function(errors, status){
									if (status != 200){
										alert("Your project information did not save.");
									} else {
										console.log("in the getErrors function");
										if (errors[1] != "!") {
											alert(errors);
										} else {
											document.title = title;
										}
									}
								});

};
function updateDescription() {
	var d = document.getElementById("d");
	var description = d.value;
	var dic = {
		"description" : description,
	};
	var to = domain + abs_url + "description/";
	sb.WebLogoDemo.postWith(to, JSON.stringify(dic), sb.WebLogoDemo.getErrors);

};

$('#submit_tag').click(function () {
	addTag();
	$('#id_tag').val('');
});

$('#id_tag').keydown(function(e) {
	if (e.keyCode == 13) {
		addTag();
		$('#id_tag').val('');
	}
});

function addTag() {
	if ($('#id_tag').val().trim()) {
		console.log('non empty tag');
		var tagName = $("#id_tag").val();
		var dic = {
			"tags" : tagName,
		};
		var to = domain + abs_url + "tags/";
		sb.WebLogoDemo.postWith(to, JSON.stringify(dic), function (response, status) {
			document.getElementById('all_tags').innerHTML += response;
		});
	}
};

function removeTag(obj) {
	console.log(obj.parentNode.childNodes[1].innerHTML);
	var to = domain + abs_url + "removeTag/";
	var dic = {
		"tags": obj.parentNode.childNodes[1].innerHTML
	}
	sb.WebLogoDemo.postWith(to, JSON.stringify(dic), function (response, status) {
		document.getElementById('all_tags').removeChild(obj.parentNode);
	});
}

function updateRating() {
	console.log(currentRating);
	var rating = 1 - currentRating;
	var dic = {
		"rating" : rating,
	};
	console.log(dic);
	var to = domain + abs_url + "rate/";
	console.log(to);
	sb.WebLogoDemo.postWith(to, JSON.stringify(dic), sb.WebLogoDemo.getErrors);
	var newScore = parseInt($("#current_score").html()) + parseInt(rating) - currentRating;
	$("#current_score").text(newScore);
	currentRating = rating;
	console.log("rating " + rating);
	if (rating == 0) {
		$("#ratebtn").replaceWith('<button class="btn" id="ratebtn" onclick="updateRating();" {% if ownProject or collab %}style="display:none"{% endif %}>Like</button>');
	} else {
		$('#ratebtn').replaceWith('<button id="ratebtn" class="btn btn-success" onclick="updateRating();" {% if ownProject or collab %}style="display:none"{% endif %}>Like</button>');
	}
	/*var bool = sb.WebLogoDemo.postWith(to, JSON.stringify(dic), sb.WebLogoDemo.getErrors);
	 if (!bool) {
	 alert("Your project information did not save.");
	 }*/
};

function callAS() {
	getFlexApp("WebLogo").callAS();
}

var viewport;
$(document).ready(function() {

    sb.WebLogoDemo.init();
    sb.WebLogoDemo.run();
    
    var container = $('#container')[0];
    WidgetManager = slnova.WidgetSpace.getInstance();
    WidgetManager.decorate(container);
    
    try {
    	if (render_mode == "3d")
    		viewport = new Viewport('container');
    	else
    		viewport = new Viewport2D('container');
    }
    catch(e) {
    	if (e == Viewport.prototype.WEBGL_NOT_SUPPORTED || e == Viewport.prototype.INSTANCING_NOT_SUPPORTED)
    	{
    		if (window.confirm("Your hardware does not support 3D mode. Press OK to load project in 2D mode."))
    			window.location.href = window.location.href+"?2d=true";
    	}
    }

    // Listen for when widget edit mode is switched, and enable/disable
    // camera controls accordingly.
    var oldEditMode = WidgetManager.setEditMode;
    WidgetManager.setEditMode = function(value) {
    	oldEditMode.call(WidgetManager, value);
    	viewport.toggleControls(value);
    	// since we don't currently have change events for widgets,
    	// just indicate that something has changed whenever edit mode changes.
    	sb.WebLogoDemo.needsSave = true;
			sb.WebLogoDemo.enableSaveButton();
    }
    // edit mode starts as false, so start camera controls as false too.
    viewport.toggleControls(false);

    Helper.KeyManager.init();
    Helper.Utils.init();
    viewport.setAgentStates(Execution.AgentController.states);
    viewport.setAgentPrevStates(Execution.AgentController.prevStates);
    viewport.animate();
    
  // dummy call; normally AJAX calls this to load the project
	get(JSON.stringify(project), "", 0, 0);
	
	// Make the scriptBlocks drawer and cut/copy/trash toolbar sticky when the user scrolls down
	$('.sbDrawerHolder').addClass('sbSticky');
	$('.sbToolBar').addClass('sbSticky');
	
	var logoHeight = $('#logo').height();
	var navbarHeight = $('#toolbar').height();
	var topDrawerHolder = $('.sbDrawerHolder').offset().top - logoHeight;
  	var topToolBar = $('.sbToolBar').offset().top - navbarHeight;
 	
	function onScroll(event) {
		// Y-Position of Scroll
		var yPos = $(this).scrollTop();
		var drawerHeight = $(window).height() - logoHeight - $('.sbDrawerLabel').height() - 5;
		var bottomFooter = $('footer').offset().top;
		var pageHolderLeft = $('.sbDrawerHolder').offset().left + 
			parseFloat($('.sbDrawerHolder').css('width')) + 
			parseFloat($('.sbDrawerHolder').css('margin-right'));

		// if we've scrolled down so the footer is visible...
		if((yPos + $(window).height()) > bottomFooter) {
			// ... then subtract the visible portion of the footer so the drawer doesn't overlap the footer
			drawerHeight -= ((yPos + $(window).height()) - bottomFooter);
		}
		// if we've scrolled down so that the top of the drawer is passing under the logo
		if (yPos > topDrawerHolder) {
			// ... then stick the drawer at that position
			$('.sbDrawerHolder').addClass('sbFixed');
			$('.sbDrawerHolder').css({'top' : logoHeight});
			$('.sbDrawers').css({'height': drawerHeight});
			// the page holder needs to stay to the right of the sticky drawer
			$('.sbPageHolder').offset({left : pageHolderLeft});
			$('.sbPageTabBar').offset({left : pageHolderLeft});
		} else {
			// otherwise let the drawer return to it's natural position
			$('.sbDrawerHolder').removeClass('sbFixed');
			$('.sbDrawerHolder').css({'top' : ''});
			// instead of removing the height, let the default scriptBlocks behavior take over
			//$('.sbDrawers').css({'height': ''}); 
			$('.sbPageHolder').css({'left':''});
			$('.sbPageTabBar').css({'left':''});
		}
		// the cut/copy/trash toolbar aligns under the header NOT the logo
		if (yPos > topToolBar) {
			$('.sbToolBar').addClass('sbFixed');
			$('.sbToolBar').css({'top' : navbarHeight,
				'right' : ($(window).width() - ($('.sbPageHolder').offset().left + $('.sbPageHolder').outerWidth()))
			});
		} else {
			$('.sbToolBar').removeClass('sbFixed');
			$('.sbToolBar').css({'right':'', 'top' : ''});
		};
	}
	$(window).scroll(onScroll);

	// Sets longest width for .sbDrawerHolder
	function longestWidth() {
		var longestBlockWidth = 0;
		var $sbBlock;
		$('.sbBlockLayoutParent').each(function(){
			$sbBlock = $(this);
			if ($sbBlock.width() > longestBlockWidth) {
				longestBlockWidth = $sbBlock.width();
			}
		});
		return longestBlockWidth;
	}
	// Resizable DrawerHolder & Function to Limit its Stretch:
	$('.sbDrawerHolder').resizable({
		handles: 'e',
		alsoResize: '.sbPageHolder',
		resize: function( event, ui ) {
			// Force script window to resize
			sb.WebLogoDemo.workspace.resize();
		},
		maxWidth: longestWidth() + 25, // 25 is added to add a small amount of arbitrary space between the DrawerHolder's edge and its blocks
		resize: function( event, ui ) {
			// Force script window to resize
			sb.WebLogoDemo.workspace.resize();
			onScroll();
			//console('onscroll');
		},
		stop: function( event, ui ) {
			// Force script window to resize
			sb.WebLogoDemo.workspace.resize();
			onScroll();
		}
	});
});

function changeSpeedSlider() {
	var speed = document.getElementById('slider').value;
	document.getElementById('speedSliderValue').innerHTML = speed;
	viewport.setExecRate(speed);
}

function togglePlay() {
	var status = document.getElementById('speedSliderButton').innerHTML;
	if (status.charCodeAt() == 9654) {
		document.getElementById('speedSliderButton').innerHTML = "ll";
		viewport.setExecRate(document.getElementById('slider').value);
	}
	else {
		document.getElementById('speedSliderButton').innerHTML = "&#9654;";
		viewport.setExecRate(0);
	}
}
