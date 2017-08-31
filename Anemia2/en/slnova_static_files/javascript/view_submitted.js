$(document).ready(function() {
	$("#projInfo").height($(window).height() - 220);
	$(".heading").css("top", 0);
	$("li").click(function(e) {
		listSelect($(e.target));
	});
});
$(window).resize(function() {
	$("#projInfo").height($(window).height() - 220);
});
function listSelect(target) {
	console.log(target.attr('id'));
	if (!target.hasClass("view")) {
		$("li").each(function() {
			if ($(this).hasClass("view")) {
				$(this).removeClass("view")
			}
		});
		target.addClass("view");
		$("#viewInfo").load(target.attr('id') + " #projectInfo");
	}
}