console = window.console || {
	log : function() {
	}
};
var user = "";

// runs when left/right arrows are clicked (for gallery scrolling)
// @param the numeric ID of the gallery div box
// takes the current selected box and scrolls to the left/right edge of that box
// if no box is selected, shifts left/right the width of one box (220px)
// note: finds the 'selected' box associated with the given gallery ID
function left(num) {
	var ID = '#' + num;
	var selected = $(ID).find(".selected");
	console.log(ID + " L scrollPos: " + $(ID).scrollLeft());
	if (selected.length != 0) {
		console.log(ID + " L selPos: " + selected.position().left);
		$(ID).scrollLeft($(ID).scrollLeft() + selected.position().left - 6);
	} else {
		$(ID).scrollLeft($(ID).scrollLeft() - 220);
	}
}

function right(num) {
	var ID = '#' + num;
	var selected = $(ID).find(".selected");
	console.log(ID + " R scrollPos: " + $(ID).scrollLeft());
	if (selected.length != 0) {
		console.log(ID + " R selPos: " + selected.position().left);
		$(ID).scrollLeft($(ID).scrollLeft() + selected.width() + selected.position().left + 12);
	} else {
		$(ID).scrollLeft($(ID).scrollLeft() + 220);
	}
}

// function to highlight the leftmost visible box as 'selected'
// calculates the position of the scrollbox, setting the leftmost edge of the galleryDisplay as
// zero, sets any box with position (relative to the left edge of the galleryDisplay) between
// zero and -220 as 'selected'.
$(function() {
	$(".galleryDisplay").bind('scroll', function() {
		$('.img').each(function() {
			var post = $(this);
			var position = post.position().left - $(".galleryDisplay").scrollLeft();

			if ((post.position().left <= 0) && (post.position().left >= -220)) {
				post.addClass('selected');
			} else {
				post.removeClass('selected');
			}
		});
	});
});

$(document).ready(function() {
	$("select").each(function() {
		this.selectedIndex = 0;
	});
});

authenticated = function(){
	// user = "{{u.get_absolute_url}}";
	// editPreference = function(url){
	// if(url != ''){
	// this.popupWin=window.open(url,'','width=300,height=250,titlebar=no, toolbar=no, scrollbars=no');
	// console.log();
	// this.popupWin.onload = function(){
	// var elems = this.document.getElementsByTagName('*'), i;
	// for (i in elems) {
	// if((' ' + elems[i].className + ' ').indexOf(' ' + 'form-inline' + ' ')
	// > -1) {
	// elems[i].scrollIntoView();
	// }
	// }
	// }
	// this.popupWin.onload();
	// this.popupWin.focus();
	// }
	// }
	console = window.console || {
		log : function() {
		}
	};
	var csrfmiddlewaretoken = '{{csrf_token}}';
	submitUsername = function() {
		var u = document.getElementById("id_username");
		var newUsername = u.value;
		var dic = {
			"username" : newUsername
		};
		var to = "/username/change/";
		console.log(to);
		bool = sb.WebLogoDemo.postWith(to, JSON.stringify(dic), function(result) {
			if (result[1] != "!") { // check if result has errors
				alert(result);
			} else {
				window.location =  "/" + newUsername + "/userinfo?changed=username";
			}
		});
	}

	submitEmail = function() {
		var new_email = document.getElementById("id_email");
		var newEmail = new_email.value;
		var dic = {
			"email" : newEmail
		};
		var to =  "/email/change/";
		console.log(to);
		bool = sb.WebLogoDemo.postWith(to, JSON.stringify(dic), function(result) {
			if (result[1] != "!") { // check if result has errors
				alert(result);
			} else {
				window.location = "/" + username + "/userinfo?changed=email";
			}
		});
	}

	changePage = function(locate) {
		console.log(locate)
		if (locate == "") {
		} else if (locate == "/classes/new/") {
			loadChangePage('popUpBoxLarge', locate, 'Create New Class');
		} else {
			location = locate;
		}
	}

	// function loadChangePage(windowname, changeType){
	// var el = $("#"+windowname);
	// console.log(el);
	// el.load('/email/change/ .form-inline');
	// popup(windowname);
	// }

}
