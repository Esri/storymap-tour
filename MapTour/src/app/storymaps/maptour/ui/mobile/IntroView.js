define(["storymaps/maptour/core/MapTourHelper", "dojo/topic"], 
	function(MapTourHelper, topic){
		/**
		 * IntroView
		 * @class IntoView
		 * 
		 * Mobile intro view
		 */
		return function IntroView()
		{
			this.init = function(feature, bgColor)
			{
				$(".navBar span").removeClass("current");
				app.header.hideMobileBanner(true);
				location.hash = "";
				
				$("#introPanel").html(
					'<div class="slide">'
					+ ' <h2 class="tourPointName">' + ($('<div>' + feature.attributes.getName() + '</div>').html()) + '</h2>'
					+ ' <p class="tourPointDescription">' + feature.attributes.getDescription() + '</p>'
					+ (! feature.attributes.isVideo() && MapTourHelper.mediaIsSupportedImg(feature.attributes.getURL()) ? 
						'<img class="tourPointImg" src="' + feature.attributes.getURL() + '" />'
						: '<iframe class="tourPointIframe" src="' + feature.attributes.getURL() + '"></iframe>')
					+ ' <br /><br />'
					+ ' <button class="btn btn-large btn-primary">' +  i18n.viewer.mobileHTML.introStartBtn + '</button>'
					+ '</div>'
				);
				
				$("#introPanel").fastClick(function(){
					topic.publish("PIC_PANEL_NEXT");
				});
				
				var el = document.getElementById('introPanel');
				/*jshint -W064 */
				Hammer(el).on("swipeleft", function() {
					topic.publish("PIC_PANEL_NEXT");
				});
				Hammer(el).on("swiperight", function() {
					topic.publish("PIC_PANEL_NEXT");
				});
				
				$("#introPanel").css("background-color", bgColor);
				$("#introPanel").show();
			};
			
			this.hide = function()
			{
				$("#introPanel").find(".tourPointIframe").attr('src', '');
				$("#mapViewLink").addClass("current");
				$("#introPanel").hide();
			};
		};
	}
);