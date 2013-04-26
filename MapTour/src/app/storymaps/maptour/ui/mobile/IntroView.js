define([], function(){
	/**
	 * IntroView
	 * @class IntoView
	 * 
	 * Mobile intro view
	 */
	return function IntroView(selector)
	{
		this.init = function(feature, bgColor)
		{
			$(".navBar span").removeClass("current");
			app.header.hideMobileBanner(true);
			location.hash = "";
			
			$("#introPanel").html(
				  '<div class="slide">'
				+ ' <h2 class="tourPointName">' + feature.attributes.getName() + '</h2>'
				+ ' <p class="tourPointDescription">' + feature.attributes.getDescription() + '</p>'
				+ ' <img class="tourPointImg" src="' + feature.attributes.getURL() + '">'
				+ '</div>'
			);
			
			$("#introPanel").css("background-color", bgColor);
			$("#introPanel").show();
		}
		
		this.hide = function()
		{
			$("#introPanel").hide();
			
			if( location.hash == "" || location.hash == "#" )
				location.hash = "map";
		}
	}
});