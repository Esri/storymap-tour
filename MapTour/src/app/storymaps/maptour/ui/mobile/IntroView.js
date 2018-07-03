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

				var getStringLengthClassname = function(string, name) {
					var length = $('<p>' + string + '</p>').text().length;

					if (length === 0) {
						return 'hidden';
					} else if ((name && length < 15) || (!name && length < 40)) {
						return 'text-size-1';
					} else if ((name && length < 25) || (!name && length < 90)) {
						return 'text-size-2';
					} else if ((name && length < 50) || (!name && length < 150)) {
						return 'text-size-3';
					} else {
						return 'text-size-4';
					}
				};

				var newUrl = feature.attributes.getURL();
				var img = document.createElement('img');
				img.src = app.data.getIntroData().attributes.getURL();

				if(app.data.getIntroData().attributes.getURL().indexOf("'")) {
					// Check for apostrophe
					var aposIndices = [];
					for(var i = 0; i < app.data.getIntroData().attributes.getURL().length; i++) {
							if (app.data.getIntroData().attributes.getURL()[i] === "'") aposIndices.push(i);
					}
					if(aposIndices.length) {
						$.each(aposIndices, function(i, index) {
							newUrl = [app.data.getIntroData().attributes.getURL().slice(0, index), '\\', app.data.getIntroData().attributes.getURL().slice(index)].join('');
						});
					}
				}

				var scrollHtml = '<div class="slide scroll-layout" alt="" style="background-image: '
				+ (! feature.attributes.isVideo() && MapTourHelper.mediaIsSupportedImg(feature.attributes.getURL()) ?
				("url(" + newUrl + ")") : 'none')+ '">'
				+ '<div class="text-wrapper">'
				+ ' <h2 class="tourPointName ' + getStringLengthClassname(feature.attributes.getName(), true) +'">'
				+ ($('<div>' + feature.attributes.getName() + '</div>').html()) + '</h2>'
				+ ' <p class="tourPointDescription ' + getStringLengthClassname(feature.attributes.getDescription()) +'">'
				+ feature.attributes.getDescription() + '</p></div>'
				+ '<button type="button" class="reset-btn icon-down-open-big scroll-indicator start-button"></button>'
				+ '</div>';

				var classicHtml = '<div class="slide classic">'
				+ ' <h2 class="tourPointName">' + ($('<div>' + feature.attributes.getName() + '</div>').html()) + '</h2>'
				+ ' <p class="tourPointDescription">' + feature.attributes.getDescription() + '</p>'
				+ (! feature.attributes.isVideo() && MapTourHelper.mediaIsSupportedImg(feature.attributes.getURL()) ?
					'<img class="tourPointImg" src="' + feature.attributes.getURL() + '" />'
					: '<iframe class="tourPointIframe" src="' + feature.attributes.getURL() + '"></iframe>')
				+ ' <br /><br />'
				+ ' <button class="btn btn-large btn-primary start-button">' +  i18n.viewer.mobileHTML.introStartBtn + '</button>'
				+ '</div>';

				$("#introPanel").html(scrollHtml + classicHtml);

				if( ! feature.attributes.getName().length ) {
					$("#introPanel .scroll-layout .text-wrapper").hide();
				}

				var firstShow = true;
				var hideIntro = function() {
					if (firstShow) {
						firstShow = false;
						topic.publish("PIC_PANEL_NEXT");
					} else {
						$("#introPanel").addClass('hiding-intro');
						setTimeout(function() {
							$("#introPanel").removeClass('hiding-intro');
							$("#introPanel").hide();
						}, 600);
					}
					$("#splashPanel").css("bottom", "2000px");
				};

				$("#introPanel .start-button").fastClick(hideIntro);
				$("#introPanel .slide .text-wrapper").on('scroll', function(e) {
					e.stopPropagation();
				});
				$("#introPanel").on('touchstart touchmove scroll', function( e ) {
					e.preventDefault();
					// e.stopPropagation();
				});

				var el = document.getElementById('introPanel');
				/*jshint -W064 */
				Hammer(el).on("swipeup", hideIntro);

				var resizeIntro = function() {
					// Center title
					if ($('body').hasClass('mobile-layout-scroll')) {
						var maxTitleHeight = $(document).height()
							- $('#headerMobile').outerHeight()
							- $('#introPanel .scroll-indicator').outerHeight()
							- 50;
						var titleHeight = $("#introPanel .slide .text-wrapper").outerHeight() > maxTitleHeight
							? maxTitleHeight : undefined;
						var marginTop = titleHeight === undefined
							? (maxTitleHeight - $("#introPanel .slide .text-wrapper").outerHeight())/2 + $('#headerMobile').outerHeight() + 20
							: ($('#headerMobile').outerHeight() + 20);
						$("#introPanel .slide .text-wrapper").css({
							height: titleHeight,
							maxHeight: maxTitleHeight,
							marginTop: marginTop
						});
					} else {

						if(app.embedBar && app.embedBar.initiated){
						} else {
							$("#introPanel").css('height', $('#infoPanel').height() - 40);
						}
					}
				};

				$("#introPanel").css("background-color", bgColor);
				$("#introPanel").show();
				resizeIntro();

				$(window).on('resize', resizeIntro);
			};

			this.hide = function()
			{
				$("#introPanel").find(".tourPointIframe").attr('src', '');
				$("#mapViewLink").addClass("current");
        // Slide up intro
				$("#introPanel").addClass('hiding-intro');
				setTimeout(function() {
					$("#introPanel").removeClass('hiding-intro');
					$("#introPanel").hide();
				}, 600);
			};
		};
	}
);
