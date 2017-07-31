$(document).ready(function() {
	if ($("select").length > 0) {
		$("select").each(function() {
			this.selectedIndex = 0;
		});
	}
	if ($(".backToPage").length > 0) {
		$(".backToPage").mouseenter(function() {
			$(".backArrow").trigger('hover');
		});
	}
});
