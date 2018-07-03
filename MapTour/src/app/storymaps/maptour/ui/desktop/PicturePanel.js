define(["storymaps/ui/crossfader/CrossFader",
		"storymaps/maptour/core/MapTourHelper",
		"storymaps/maptour/core/WebApplicationData",
		"storymaps/utils/Helper",
		"storymaps/utils/ResamplePicture",
		"dojo/topic",
		"dojo/query"],
	function(CrossFader, MapTourHelper, WebApplicationData, Helper, ResamplePicture, topic, query)
	{
		/**
		 * PicturePanel
		 * @class PicturePanel
		 *
		 * UI component that display a picture and previous/next button
		 * Emit picture change event through PIC_PANEL_PREV and PIC_PANEL_NEXT
		 */
		return function PicturePanel(selector, isInBuilderMode)
		{
			var isInit = false;
			var panel = $(selector);
			var SIDE_MARGIN = 45;
			var VERTICAL_MARGIN = 20;
			var POPOVER_DELAY = 2000;

			var crossfader = null;
			var currentImgSize = [];
			var pictureChanged = false;

			var _isModernLayout = false,
				_placardIsUnder = false,
				_mediaIsImg = true;

			// Builder - File Reader way
			var _changeMemoryImg = $('<img src=""/>'),
				_changeMemoryCanvas = $('<canvas width="140px" height="93px">'),
				_changePictureBtn = null,
				_changePictureInput = null,
				_changeThumbnailBtn = null,
				_changeThumbnailInput = null;

			// Builder Form way
			var _selectPictureInput = null,
				_selectThumbnailInput = null,
				_uploadPicAndThumb = null;

			function init(bgColor, isPicturesHosted, isModernLayout)
			{
				clean();
				$(selector + " #cfader").empty();

				this.update(bgColor, isModernLayout);

				crossfader = new CrossFader(selector + " #cfader", isInBuilderMode);

				// When img change, store it's size and reflow the app
				topic.subscribe("CROSSFADER_CHANGE", function(width, height){
					currentImgSize = [width, height];
					pictureChanged = true;
					topic.publish("CORE_RESIZE");
				});

				// Prevent double init when the webmap is reloaded
				if( ! isInit ) {
					$("#arrowPrev, .modern-layout-control.left").fastClick(function(){
						topic.publish("PIC_PANEL_PREV", null);
					});
					$("#arrowNext, .modern-layout-control.right").fastClick(function(){
						topic.publish("PIC_PANEL_NEXT", null);
					});

					if( MapTourHelper.isPanelsLayout() ) {
						$("#arrowPrev").appendTo($("#placard-bg"));
						$("#arrowNext").appendTo($("#placard-bg"));
					}
				}

				// Swipe event on picture panel
				var el = document.getElementById('picturePanel');
				/*jshint -W064 */
				Hammer(el).off("swipeleft").on("swipeleft", function() {
					topic.publish("PIC_PANEL_NEXT", null);
				});
				Hammer(el).off("swiperight").on("swiperight", function() {
					topic.publish("PIC_PANEL_PREV", null);
				});
				Hammer(el).off("tap").on("tap", function(e) {
					if( ! e || ! e.target )
						return;

					if ( e.gesture && e.gesture.srcEvent
							&& e.gesture.srcEvent.buttons !== undefined
							&& e.gesture.srcEvent.buttons != 1 )
						return;

					var target = $(e.target);

					if( ! target.is('img') || ! target.parent().hasClass('current') )
						return;

					topic.publish("PIC_PANEL_NEXT", null);

					/*
					var imgWidth = $(e.currentTarget).find('.member-image.current').width(),
						imgPos = $(e.currentTarget).find('.member-image.current').position().left || 0;

					if ( imgWidth && e.gesture && e.gesture.center && e.gesture.center.pageX ) {
						if ( e.gesture.center.pageX - imgPos - 45 > imgWidth / 2 )
							topic.publish("PIC_PANEL_NEXT", null);
						else
							topic.publish("PIC_PANEL_PREV", null);
					}
					*/

					//crossfader.fullScreen();
				});

				if( isInBuilderMode )
					initBuilder(isPicturesHosted);

				topic.subscribe("CROSSFADER_DATA_UPDATE", function(){
					topic.publish("CORE_RESIZE");
					saveEdits();
				});

				if( $("body").hasClass("side-panel") ) {
					$("#arrowPrev").attr("src","resources/icons/picturepanel-left-grey-crushed.png");
					$("#arrowNext").attr("src","resources/icons/picturepanel-right-grey-crushed.png");
				}

				isInit = true;
			}

			function update(bgColor, isModernLayout)
			{
				// Called before _isModernLayout is set so use the argument

				var isPanelsLayout = MapTourHelper.isPanelsLayout();

				if (! isModernLayout && ! isPanelsLayout)
					panel.css("background-color", bgColor);
				else
					panel.css("background-color", "inherit");

				if (isModernLayout) {
					$("#picturePanel").css("top", $("#header").height());
					$("#cfader").css("margin-left", 0);
					$("#arrowPrev, #arrowNext").addClass("disabled");
				}
				else if(isPanelsLayout) {
					$("#picturePanel").css("top", "auto");
				}
				else {
					$("#picturePanel").css("top", "auto");
					$("#cfader").css("margin-left", SIDE_MARGIN);
					$("#cfader").css("margin-top", VERTICAL_MARGIN);
					$(".modern-layout-control").addClass("disabled");
				}
			}

			function exitBuilderMode()
			{
				isInBuilderMode = false;
				crossfader.exitBuilderMode();
			}

			function clean()
			{
				if( crossfader )
					crossfader.clean();

				$("#arrowPrev, #arrowNext, .modern-layout-control").addClass("disabled");
				$(".btn-fullscreen", panel).addClass("disabled");
			}

			function firstDisplayCheck()
			{
				if( crossfader )
					crossfader.firstDisplayCheck();

				positionBuilderButtonBar();

				if( isInBuilderMode && app.data.getCurrentAttributes() == null )
					$(".editPictureButtons", panel).hide();
			}

			function updatePicture(picurl, name, caption, thumburl, buttonStatus, isModernLayout, placardIsUnder, mediaIsImg)
			{
				_isModernLayout = isModernLayout;
				_mediaIsImg = mediaIsImg;
				_placardIsUnder = ! isModernLayout && (placardIsUnder || ! mediaIsImg);

				if( crossfader )
					crossfader.setSource(picurl, name, caption, _isModernLayout, _placardIsUnder, _mediaIsImg);

				if ( buttonStatus.left && _isModernLayout )
					$(".modern-layout-control.left").removeClass("disabled");
				else if ( buttonStatus.left )
					$("#arrowPrev").removeClass("disabled");
				else
					$("#arrowPrev, .modern-layout-control.left").addClass("disabled");

				if( buttonStatus.right && _isModernLayout )
					$(".modern-layout-control.right").removeClass("disabled");
				else if ( buttonStatus.right )
					$("#arrowNext").removeClass("disabled");
				else
					$("#arrowNext, .modern-layout-control.right").addClass("disabled");

				if (isInBuilderMode) {
					$(".editPictureButtons", panel).show();
					setAttributesPopover(picurl, thumburl);
				}

				if($("body").hasClass("side-panel")){
					$(".btn-fullscreen").removeClass("disabled");
				}

				$(".btn-fullscreen", panel).removeClass("disabled");

				$(".member-image", panel).css("cursor", buttonStatus.right ? "pointer" : "default");
			}

			/**
			 * Resize the picture panel to fit in the given dimension
			 * @param {Object} panelAvailableWidth
			 * @param {Object} panelAvailableHeight
			 */
			function resize(panelAvailableWidth, panelAvailableHeight)
			{
				if( _isModernLayout ){
					resizeModernLayout(panelAvailableWidth  - APPCFG.MINIMUM_MAP_WIDTH, panelAvailableHeight);
					$("#picturePanel").css("top", $("#header").height());
				} else if( MapTourHelper.isPanelsLayout() ) {
					resizePanelsLayout((panelAvailableWidth - ($("body").hasClass("builder-mode") ? 60 : 0)) - $("#leftPanel").width(), panelAvailableHeight);
				} else
					resizeRegularLayout(panelAvailableWidth  - APPCFG.MINIMUM_MAP_WIDTH, panelAvailableHeight);

				resizeCommon();
			}

			function resizePanelsLayout(panelAvailableWidth, panelAvailableHeight)
			{
				$("#cfader").width($("body").width() * (2/3));
				$("#cfader").height(panelAvailableHeight);
				$("#cfader").css("margin", 0);
				panel.width(panelAvailableWidth);
				panel.height(panelAvailableHeight);
			}

			function resizeModernLayout(panelAvailableWidth, panelAvailableHeight)
			{
				// The future dimension of the image
				var width, height;

				// Panel dimension without margin
				var availableWidth = panelAvailableWidth - (2 * SIDE_MARGIN);
				availableWidth *= 0.95;

				panelAvailableHeight -= 10; // Carousel bottom margin
				var availableHeight = panelAvailableHeight - (2 * VERTICAL_MARGIN);

				// Picture panel width is at fixed size that depend of the available height
				// 4/3 bigger than the available height
				// Picture are not displayed at their maximum size regarding the constraint of having a 450px wide map
				// but the picture panel never change size between picture
				// it only change size when resizing
				height = availableHeight;
				width = Math.min(parseInt(availableHeight * 4/3, 10), availableWidth);

				// Crossfader height is the full height not just the image
				var cFaderHeight = height < availableHeight ? availableHeight : height;
				$("#cfader").width(width);
				$("#cfader").height(cFaderHeight);

				// Picture panel new dimension
				var ppWidth  = width;
				var ppHeight = height + (2 * VERTICAL_MARGIN);
				ppHeight = ppHeight < panelAvailableHeight ? panelAvailableHeight : ppHeight;
				panel.width(ppWidth);
				panel.height(ppHeight);

				$("#cfader").css("margin-top", (ppHeight - availableHeight) / 2);

				// Arrows position (timeout for IE)
				setTimeout(function(){
					var arrowY = $(".member-image.current").position().top + $(".member-image.current").height() / 2 - 6;
					$(".modern-layout-control").css("top", arrowY);

					$(".modern-layout-control.left").css("left", (panel.width() - $(".member-image.current").width()) / 2 + 2);
					$(".modern-layout-control.right").css("right", (panel.width() - $(".member-image.current").width()) / 2 + 6);
				}, 50);

				/*
				// Hide the picture panel if too small
				if( width < 300 || height < 300 )
					$("#picturePanel").css("display", "none");
				else
					$("#picturePanel").css("display", "block");
				*/
			}

			function resizeRegularLayout(panelAvailableWidth, panelAvailableHeight)
			{
				// The future dimension of the image
				var width, height;

				// Panel dimension without margin
				var availableWidth = panelAvailableWidth - (2 * SIDE_MARGIN);
				var availableHeight = panelAvailableHeight - (2 * VERTICAL_MARGIN);

				/*
				//
				// Alternative to have the picture panel fitting the image to have no grey space at all
				//

				// The image real dimension
				var imgWidth = currentImgSize[0];
				var imgHeight = currentImgSize[1];
				var imgRatio = imgWidth / imgHeight;

				// Compute how the image is bounded inside the panel
				var boundedWidth = imgWidth > availableWidth;
				var boundedHeight = imgHeight > availableHeight;

				// If bounded by width and height, find the most bounded dimension
				if( boundedWidth && boundedHeight ) {
					var widthRatio = imgWidth / availableWidth;
					var heightRatio = imgHeight / availableHeight;

					boundedWidth = widthRatio > heightRatio;
					boundedHeight = ! boundedWidth;
				}

				if ( boundedWidth ) {
					width = availableWidth;
					height = parseInt(width / imgRatio);
				}
				else if ( boundedHeight) {
					height = availableHeight;
					width = parseInt(height * imgRatio);
				}
				else {
					width = imgWidth;
					height = imgHeight;
				}

				if( width == undefined || height == undefined || app.data.getCurrentIndex() == -1 ) {
					width = (availableWidth - (2 * SIDE_MARGIN) + APPCFG.MINIMUM_MAP_WIDTH) / 2;
					height = availableHeight;
				}
				*/

				// Picture panel width is at fixed size that depend of the available height
				// 4/3 bigger than the available height
				// Picture are not displayed at their maximum size regarding the constraint of having a 450px wide map
				// but the picture panel never change size between picture
				// it only change size when resizing
				height = availableHeight;
				width = Math.min(parseInt(availableHeight * 4/3, 10), availableWidth);

				// Crossfader height is the full height not just the image
				var cFaderHeight = height < availableHeight ? availableHeight : height;
				$("#cfader").width(width);
				$("#cfader").height(cFaderHeight);

				// Picture panel new dimension
				var ppWidth  = width + (2 * SIDE_MARGIN);
				var ppHeight = height + (2 * VERTICAL_MARGIN);
				ppHeight = ppHeight < panelAvailableHeight ? panelAvailableHeight : ppHeight;
				panel.width(ppWidth);
				panel.height(ppHeight);

				// Arrows position
				$("#arrowPrev").css("top", (panel.height() / 2) - 22);
				$("#arrowNext").css("top", (panel.height() / 2) - 22);
			}

			function resizeCommon()
			{
				// Resize the crossfader
				if( crossfader )
					crossfader.invalidate();

				//
				// Limit placard height to the picture height with intermediate one-line layout
				//
				$("#placard").removeClass("one-line-layout");
				var imgDisplayedHeight = $("#cfader .current").height();
				if( !$("body").hasClass("side-panel") ) {
					if( ! isInBuilderMode && imgDisplayedHeight )
						$("#placardContainer .description").css("max-height", "inherit");

					if( $("#placardContainer")[0].scrollHeight > imgDisplayedHeight / 1.5 && ! _placardIsUnder ) {
						$("#placard").addClass("one-line-layout");

						if ( !isInBuilderMode && imgDisplayedHeight ) {
							$("#placardContainer .description").css("max-height", imgDisplayedHeight / 3);
						}
					}
				}

				if( ! $("body").hasClass("side-panel")) {
					$("#placard-bg").css("max-height", imgDisplayedHeight - 10 - (_isModernLayout ? 3 : 0));
				}

				positionBuilderButtonBar();

				if( pictureChanged ) {
					pictureChanged = false;
					if( $("body").hasClass("mobile-layout-scroll") || !$("body").hasClass("side-panel") || app.isInBuilderMode || !app.data.hasIntroRecord()  || (app.data.hasIntroRecord() && app.data.getCurrentIndex() != -1 && app.data.getCurrentIndex() != null))
						topic.publish("CORE_PICTURE_CHANGED");
				}
			}

			function positionBuilderButtonBar()
			{
				// Show builder button bar if a picture is loaded
				if ( isInBuilderMode && (app.data.getCurrentIndex() != -1 || app.data.isEditingFirstRecord()) ) {
					var buttonWidth = Math.max($(".editPictureButtons .modernBrowserWay a").eq(0).width(), $(".editPictureButtons .modernBrowserWay a").eq(1).width());
					if( buttonWidth )
						$(".editPictureButtons .modernBrowserWay a").width(buttonWidth);

					$(".editPictureButtons").css("width", $("#cfader .current").width());
					if( ! _isModernLayout )
						$(".editPictureButtons").css("margin-left", query("#cfader .current").length ? query("#cfader .current").position()[0].x : 0);
					else
						$(".editPictureButtons").css("margin-left", query("#cfader .current").length ? query("#cfader .current").position()[0].x - query("#cfader").position()[0].x : 0);

					$(".editPictureButtons").css("display", "block");

					// Hide buttons if there is no room
					if( $("#picturePanel").width() < $(".editPictureButtons > div").width() )
						$(".editPictureButtons > div").css("display", "none");
					else
						$(".editPictureButtons > div").css("display", "inline-block");

					// Position button bar
					$(".editPictureButtons").css("top", parseFloat($("#cfader > .current").first().css("top")) + 24);
				}
				else
					$(".editPictureButtons").css("display", "none");

			}

			///////////////////////////////
			//
			//         Builder
			//
			///////////////////////////////

			function initBuilder(isPicturesHosted)
			{
				initBuilderLocalization();

				$(".editPictureButtons > div > span", panel).hide();

				if( isPicturesHosted ) {
					if( Helper.browserSupportAttachementUsingFileReader() )
						initBuilderFileReader();
					else
						initBuilderForm();
				}
				else
					initBuilderAttributes();
			}

			function forceSaveEdits()
			{
				if( ! isInBuilderMode )
					return;

				var title, descr;

				// Get the value from the text input
				if( $('body').hasClass('side-panel') ) {
					title = $("#placard .name .text_edit_input").css("display") == "inline-block" ? $("#placard .name .text_edit_input").val() : $("#placard .name .text_edit_label").html();
					descr = $("#placard .description .text_edit_input").css("display") == "inline-block" ? $("#placard .description .text_edit_input").val() : $("#placard .description .text_edit_label").html();
				} else {
					title = $(selector + " .name .text_edit_input").css("display") == "inline-block" ? $(selector + " .name .text_edit_input").val() : $(selector + " .name .text_edit_label").html();
					descr = $(selector + " .description .text_edit_input").css("display") == "inline-block" ? $(selector + " .description .text_edit_input").val() : $(selector + " .description .text_edit_label").html();
				}

				saveEdits2(title, descr);
			}

			function saveEdits()
			{
				console.log("maptour.ui.PicturePanel - saveEdits");

				var title, descr;

				if( $('body').hasClass('side-panel') ) {
					title = $("#placard .name .text_edit_label").html();
					descr = $("#placard .description .text_edit_label").html();
				} else {
					title = $(selector + " .name .text_edit_label").html();
					descr = $(selector + " .description .text_edit_label").html();
				}

				saveEdits2(title, descr);
			}

			function saveEdits2(title, descr)
			{
				if(title == i18n.viewer.headerJS.editMe)
					title = "";
				if(descr == i18n.viewer.headerJS.editMe)
					descr = "";

				title = MapTourHelper.encodeText(title);
				descr = MapTourHelper.encodeText(descr);

				topic.publish("PIC_PANEL_EDIT", {
					title: title,
					description: descr
				});
			}

			// ---------------------
			// Builder - Attributes
			// ---------------------

			function initBuilderAttributes()
			{
				$(".editPictureButtons .attributesWay", panel).show();
				$(".builderImageTarget").addClass("attributesWay");
			}

			function setAttributesPopover(picUrl, thumbUrl)
			{
				if( ! $(".editPictureButtons .attributesWay form").is(":visible") && ! $(".builderImageTarget").hasClass("attributesWay") ){
					return;
				}

				if( $("body").hasClass("side-panel") ) {
					$(".builderImageTarget form").remove();
					panel.find(".builderImageTarget").popover('destroy');
					if( app.data.hasIntroRecord() && (app.data.getCurrentIndex() == null || app.data.getCurrentIndex() == -1) ) {
						panel.find(".builderImageTarget").popover({
							trigger: 'click',
							placement: function() {
								var left = $(".builderImageTarget").width()/2 - 189 + 'px';
								setTimeout(function(){
									$("#picturePanel .popover").css({left: left});
								}, 0);
							},
							html: true,
							// Inject the CSS properties
							content: '<script>'
										+ '$(".builderImageTarget").next(".popover").addClass("edit-attr-popover");'
										+ '</script>'
										+ '<div style="margin-bottom: 5px; margin-top: -5px;">'
										+ ' <input type="radio" name="editType" value="image" />&nbsp;' + i18n.viewer.builderHTML.addLabelPicUrl + '&nbsp;&nbsp;'
										+ ' <input type="radio" name="editType" value="video" disabled />&nbsp;' + i18n.viewer.builderHTML.addLabelVideo
										+ ' <a id="changePictureVideoTooltip"><img src="resources/icons/builder-help.png" style="vertical-align: -4px;"/></a>'
										+ '</div>'
										+ '<input type="text" value="' + picUrl + '"/>'
										+ '<button type="button" class="btn btn-small btn-primary disabled" onClick="app.desktopPicturePanel.editPointURL(0, true)">'+i18n.viewer.builderHTML.modalApply+'</button>'
										+ '<button type="button" class="btn btn-small" onClick="app.desktopPicturePanel.editPointURL(0, false)">'+i18n.viewer.builderHTML.modalCancel+'</button>'
										+ '<div class="error">' + i18n.viewer.addPopupJS.errorInvalidPicUrl + '</div>'
										+ '<script>'
											+ ' $("input[name=editType]").eq(' + (_mediaIsImg?0:1) + ').click();'
											+ " $('#changePictureVideoTooltip').popover({ \
													trigger: 'hover', \
													placement: 'bottom', \
													html: true, \
													content: '<div style=\"font-size: 14px; margin-bottom: 2px;\">" + (i18n.viewer.builderHTML.coverNoVideo.replace(/'/g, "\\'")) + "</div>'});"
										+ '</script>'
						});
					} else {
						panel.find(".builderImageTarget").popover({
							trigger: 'click',
							placement: function() {
								var left = $(".builderImageTarget").width()/2 - 189 + 'px';
								setTimeout(function(){
									$("#picturePanel .popover").css({left: left});
								}, 0);
							},
							html: true,
							// Inject the CSS properties
							content: '<script>'
										+ '$(".builderImageTarget").next(".popover").addClass("edit-attr-popover");'
										+ '</script>'
										+ '<div style="margin-bottom: 5px; margin-top: -5px;">'
										+ ' <input type="radio" name="editType" value="image" />&nbsp;' + i18n.viewer.builderHTML.addLabelPicUrl + '&nbsp;&nbsp;'
										+ ' <input type="radio" name="editType" value="video"' + (WebApplicationData.getDisableVideo() ? ' disabled':'') + '/>&nbsp;' + i18n.viewer.builderHTML.addLabelVideo
										+ ' <a id="changePictureVideoTooltip"><img src="resources/icons/builder-help.png" style="vertical-align: -4px;"/></a>'
										+ '</div>'
										+ '<input type="text" value="' + picUrl + '"/>'
										+ '<button type="button" class="btn btn-small btn-primary" onClick="app.desktopPicturePanel.editPointURL(0, true)">'+i18n.viewer.builderHTML.modalApply+'</button>'
										+ '<button type="button" class="btn btn-small" onClick="app.desktopPicturePanel.editPointURL(0, false)">'+i18n.viewer.builderHTML.modalCancel+'</button>'
										+ '<div class="error">' + i18n.viewer.addPopupJS.errorInvalidPicUrl + '</div>'
										+ '<script>'
										+ ' $("input[name=editType]").eq(' + (_mediaIsImg?0:1) + ').click();'
										+ " $('#changePictureVideoTooltip').popover({ \
												trigger: 'hover', \
												placement: 'bottom', \
												html: true, \
												content: '<div style=\"font-size: 14px; margin-bottom: 2px;\">" + (i18n.viewer.builderHTML.addMediaVideoHelpTooltip4.replace(/'/g, "\\'")) + "</div><img src=\"resources/icons/builder-picturepanel-tooltip-youtube.png\" width=\"245px\" />'});"
										+ '</script>'
						});
					}
				}
				else {
					panel.find(".editPictureButtons .attributesWay .btn-picture").popover('destroy');
					panel.find(".editPictureButtons .attributesWay .btn-picture").popover({
						trigger: 'click',
						placement: 'bottom',
						html: true,
						// Inject the CSS properties
						content: '<script>'
									+ '$(".editPictureButtons .attributesWay .btn-picture").next(".popover").addClass("edit-attr-popover");'
									+ '$(".editPictureButtons .attributesWay .btn-thumbnail").popover("hide");'
									+ '</script>'
									+ '<div style="margin-bottom: 5px; margin-top: -5px;">'
									+ ' <input type="radio" name="editType" value="image" />&nbsp;' + i18n.viewer.builderHTML.addLabelPicUrl + '&nbsp;&nbsp;'
									+ ' <input type="radio" name="editType" value="video"' + (WebApplicationData.getDisableVideo() ? ' disabled':'') + '/>&nbsp;' + i18n.viewer.builderHTML.addLabelVideo
									+ ' <a id="changePictureVideoTooltip"><img src="resources/icons/builder-help.png" style="vertical-align: -4px;"/></a>'
									+ '</div>'
									+ '<input type="text" value="' + picUrl + '"/>'
									+ '<button type="button" class="btn btn-small btn-primary" onClick="app.desktopPicturePanel.editPointURL(0, true)">'+i18n.viewer.builderHTML.modalApply+'</button>'
									+ '<button type="button" class="btn btn-small" onClick="app.desktopPicturePanel.editPointURL(0, false)">'+i18n.viewer.builderHTML.modalCancel+'</button>'
									+ '<div class="error">' + i18n.viewer.addPopupJS.errorInvalidPicUrl + '</div>'
									+ '<script>'
									+ ' $("input[name=editType]").eq(' + (_mediaIsImg?0:1) + ').click();'
									+ " $('#changePictureVideoTooltip').popover({ \
											trigger: 'hover', \
											placement: 'bottom', \
											html: true, \
											content: '<div style=\"font-size: 14px; margin-bottom: 2px;\">" + (i18n.viewer.builderHTML.addMediaVideoHelpTooltip4.replace(/'/g, "\\'")) + "</div><img src=\"resources/icons/builder-picturepanel-tooltip-youtube.png\" width=\"245px\" />'});"
									+ '</script>'
					});
				}

				panel.find(".editPictureButtons .attributesWay .btn-thumbnail").popover('destroy');
				panel.find(".editPictureButtons .attributesWay .btn-thumbnail").popover({
					trigger: 'click',
					placement: 'bottom',
					html: true,
					// Inject the CSS properties
					content: '<script>'
								+ '$(".editPictureButtons .attributesWay .btn-thumbnail").next(".popover").addClass("edit-attr-popover");'
								+ '$(".editPictureButtons .attributesWay .btn-picture").popover("hide");'
								+ '</script>'
								+ '<input type="text" value="' + thumbUrl + '"/>'
								+ '<button type="button" class="btn btn-small btn-primary" onClick="app.desktopPicturePanel.editPointURL(1, true)">'+i18n.viewer.builderHTML.modalApply+'</button>'
								+ '<button type="button" class="btn btn-small" onClick="app.desktopPicturePanel.editPointURL(1,false)">'+i18n.viewer.builderHTML.modalCancel+'</button>'
								+ '<div class="error">' + i18n.viewer.addPopupJS.errorInvalidThumbUrl + '</div>'
				});
			}

			function editPointURL(target, performSave)
			{
				var node;
				if( $("body").hasClass("side-panel") ) {
					node = $(".builderImageTarget");
				} else {
					node = ".editPictureButtons .attributesWay " + (target === 0 ? ".btn-picture" : ".btn-thumbnail");
				}

				var value = $(node).next(".popover").find("input[type=text]").val();
				var valueIsValid = MapTourHelper.validateURL(value);
				var isVideo = target === 0 && $("input[name=editType]:checked").val() == "video";

				if( performSave ) {
					if (!valueIsValid) {
						if (isVideo)
							$(node).next(".popover").find(".error").html(i18n.viewer.addPopupJS.errorInvalidVideoUrl);
						else if (target === 0)
							$(node).next(".popover").find(".error").html(i18n.viewer.addPopupJS.errorInvalidPicUrl);
					}
					$(node).next(".popover").find(".error").toggle(!valueIsValid);

					if( ! valueIsValid )
						return;

					if (isVideo && ! app.data.layerHasVideoField() && value.indexOf('isVideo') == -1)
						value = MapTourHelper.addIsVideoToURL(value);

					app.data.changeCurrentPointPicURL(target === 0 ? "picture" : "thumbnail", value, isVideo);
				}

				$(node).popover("hide");
			}

			// ---------------------------------------
			// Builder - Hosted Features - FileReader
			// ---------------------------------------

			function initBuilderFileReader()
			{
				panel.find(".builderImageTarget").popover({
					placement: function() {
						var left = $(".builderImageTarget").width()/2 - 189 + 'px';
						setTimeout(function(){
							$("#picturePanel .popover").css({left: left});
						}, 0);
					},
					trigger: 'manual',
					html: true,
					content: '<script>'
								+ ' $(".builderImageTarget").next(".popover").addClass("picturePanelPicturePopoverFR");'
								+ ' function closeMe(){$(".builderImageTarget").popover("hide");}'
								+ '</script>'
								+ '<div class="confirmationStep">'
								+ ' '+ i18n.viewer.picturePanelJS.popoverDeleteWarningPicAndThumb
								+ ' <button type="button" class="btn btn-danger btn-small" onclick="app.desktopPicturePanel.pictureConfirmation(true)">'+ i18n.viewer.builderJS.ok+'</button>'
								+ ' <button type="button" class="btn btn-small" onClick="app.desktopPicturePanel.pictureConfirmation(false)">'+ i18n.viewer.builderHTML.modalCancel+'</button>'
								+ '</div>'
								+ '<div class="waitStep" style="display: none; text-align:center">'
								+ ' '+i18n.viewer.picturePanelJS.popoverUploadingPhoto+' ... <img src="resources/icons/loader-upload.gif" class="addSpinner" alt="Uploading">'
								+ '</div>'
								+ '<div class="loadedStep" style="display: none; text-align:center">'
								+ ' '+i18n.viewer.picturePanelJS.popoverUploadSuccessful
								+ '</div>'
								+ '<div class="errorStep" style="display: none; color: red; text-align:center">'
								+ ' '+i18n.viewer.picturePanelJS.popoverUploadError
								+ ' <button type="button" class="btn btn-danger btn-small" onclick="closeMe()" style="vertical-align: 1px;">'+i18n.viewer.builderJS.gotIt+'</button>'
								+ '</div>'
					}
				);
				$(".editPictureButtons .modernBrowserWay", panel).show();
				$('.editPictureButtons .modernBrowserWay a.btn-picture').popover({
					placement: 'bottom',
					trigger: 'manual',
					html: true,
					content: '<script>'
								+ ' $(".editPictureButtons").find(".btn-picture").next(".popover").addClass("picturePanelPicturePopoverFR");'
								+ ' function closeMe(){$(".editPictureButtons").find(".btn-picture").popover("hide");}'
								+ '</script>'
								+ '<div class="confirmationStep">'
								+ ' '+ i18n.viewer.picturePanelJS.popoverDeleteWarningPicAndThumb
								+ ' <button type="button" class="btn btn-danger btn-small" onclick="app.desktopPicturePanel.pictureConfirmation(true)">'+ i18n.viewer.builderJS.ok+'</button>'
								+ ' <button type="button" class="btn btn-small" onClick="app.desktopPicturePanel.pictureConfirmation(false)">'+ i18n.viewer.builderHTML.modalCancel+'</button>'
								+ '</div>'
								+ '<div class="waitStep" style="display: none; text-align:center">'
								+ ' '+i18n.viewer.picturePanelJS.popoverUploadingPhoto+' ... <img src="resources/icons/loader-upload.gif" class="addSpinner" alt="Uploading">'
								+ '</div>'
								+ '<div class="loadedStep" style="display: none; text-align:center">'
								+ ' '+i18n.viewer.picturePanelJS.popoverUploadSuccessful
								+ '</div>'
								+ '<div class="errorStep" style="display: none; color: red; text-align:center">'
								+ ' '+i18n.viewer.picturePanelJS.popoverUploadError
								+ ' <button type="button" class="btn btn-danger btn-small" onclick="closeMe()" style="vertical-align: 1px;">'+i18n.viewer.builderJS.gotIt+'</button>'
								+ '</div>'
					}
				);

				$('.side-panel-upload input').change(function()
				{
					$('.builderImageTarget').popover('show');
				});

				$('.editPictureButtons .modernBrowserWay input').change(function()
				{
					$('.editPictureButtons .modernBrowserWay a.btn-picture').popover('show');
				});

				_changeThumbnailBtn.popover({
					placement: 'bottom',
					trigger: 'manual',
					html: true,
					content: '<script>'
								+ '$(".editPictureButtons").find(".btn-thumbnail").next(".popover").addClass("picturePanelThumbnailPopover");'
								+ 'function closeMe(){$(".editPictureButtons").find(".btn-thumbnail").popover("hide");}'
								+ '</script>'
								+ '<div class="confirmationStep">'
								+ ' '+ i18n.viewer.picturePanelJS.popoverDeleteWarningThumb+' '
								+ ' <button type="button" class="btn btn-danger btn-small" onclick="app.desktopPicturePanel.thumbnailConfirmation(true)">'+ i18n.viewer.builderJS.ok+'</button>'
								+ ' <button type="button" class="btn btn-small" onClick="app.desktopPicturePanel.thumbnailConfirmation(false)">'+ i18n.viewer.builderHTML.modalCancel+'</button>'
								+ '</div>'
								+ '<div class="waitStep" style="display: none; text-align:center">'
								+ ' '+ i18n.viewer.picturePanelJS.popoverUploadingThumbnail+' ... <img src="resources/icons/loader-upload.gif" class="addSpinner" alt="Uploading">'
								+ '</div>'
								+ '<div class="loadedStep" style="display: none; text-align:center">'
								+ ' '+i18n.viewer.picturePanelJS.popoverUploadSuccessful
								+ '</div>'
								+ '<div class="errorStep" style="display: none; color: red; text-align:center">'
								+ ' '+i18n.viewer.picturePanelJS.popoverUploadError
								+ ' <button type="button" class="btn btn-danger btn-small" onclick="closeMe()" style="vertical-align: 1px;">'+i18n.viewer.builderJS.gotIt+'</button> '
								+ '</div>'
					}
				);

				_changeThumbnailBtn && _changeThumbnailBtn.change(function()
				{
					_changeThumbnailBtn.popover('show');
				});
			}

			//
			// Picture change
			//

			function pictureConfirmation(confirmed)
			{
				var file;
				if( $("body").hasClass("side-panel") ) {
					file = $('.side-panel-upload input').get(0).files[0];
					_changePictureBtn = $('.builderImageTarget');
				} else {
					file = $('.editPictureButtons .modernBrowserWay input').get(0).files[0];
					_changePictureBtn = $('.editPictureButtons .modernBrowserWay a.btn-picture');
				}
				if( ! confirmed || ! file ) {
					clearPictureInput();
						_changePictureBtn.popover('hide');
					return;
				}

				var popover = _changePictureBtn.next(".popover");

				popover.find(".confirmationStep").css("display", "none");
				popover.find(".waitStep").css("display", "block");

				if (file.type === "image/jpeg"){
					var pictureReaderAsImg = new FileReader();
					pictureReaderAsImg.onloadend = function()
					{
						var pictureData = this.result;

						_changeMemoryImg.off('load').load(function(e){
							ResamplePicture.resample(
								_changeMemoryCanvas.get(0),
								_changeMemoryImg,
								e.currentTarget.naturalWidth,
								e.currentTarget.naturalHeight,
								app.config.thumbnailMaxWidth,
								app.config.thumbnailMaxHeight,
								window.orientation
							);

							app.data.changeCurrentPointPicAndThumbUsingData(
								pictureData,
								_changeMemoryCanvas.get(0).toDataURL("image/jpeg"),
								function(succeed){
									if( succeed ) {
										popover.find(".waitStep").css("display", "none");
										popover.find(".loadedStep").css("display", "block");
										setTimeout(function(){
											_changePictureBtn.popover('hide');
										}, POPOVER_DELAY);
									}
									else {
										popover.find(".waitStep").css("display", "none");
										popover.find(".errorStep").css("display", "block");
									}
								}
							);
							clearPictureInput();
						});

						_changeMemoryImg.attr("src", pictureData);
					};

					pictureReaderAsImg.readAsDataURL(file);
				}
				else {
					alert(i18n.viewer.addPopupJS.notJpg);
					popover.hide();
				}
			}

			function clearPictureInput()
			{
				if( $("body").hasClass("side-panel") ) {
					$('.side-panel-upload input').closest("form").get(0).reset();
				} else {
					$('.editPictureButtons .modernBrowserWay input').closest("form").get(0).reset();
				}

			}

			//
			// Thumbnail change
			//

			function thumbnailConfirmation(confirmed)
			{
				var file = _changeThumbnailInput.get(0).files[0];
				if( ! confirmed || ! file ) {
					clearThumbnailInput();
					_changeThumbnailBtn.popover('hide');
					return;
				}

				var popover =_changeThumbnailBtn.next(".popover");
				popover.find(".confirmationStep").css("display", "none");
				popover.find(".waitStep").css("display", "block");

				if (file.type === "image/jpeg"){
					var pictureReaderAsImg = new FileReader();
					pictureReaderAsImg.onloadend = function()
					{
						app.data.changeCurrentPointThumbnailUsingData(this.result, function(succeed){
							if( succeed ) {
								popover.find(".waitStep").css("display", "none");
								popover.find(".loadedStep").css("display", "block");
								setTimeout(function(){
									_changeThumbnailBtn.popover('hide');
								}, POPOVER_DELAY);
							}
							else {
								popover.find(".waitStep").css("display", "none");
								popover.find(".errorStep").css("display", "block");
							}
						});
						clearThumbnailInput();
					};

					pictureReaderAsImg.readAsDataURL(file);
				}
				else{
					alert(i18n.viewer.addPopupJS.notJpg);
					popover.hide();
				}
			}

			function clearThumbnailInput()
			{
				_changeThumbnailInput.closest("form").get(0).reset();
			}

			// ---------------------------------
			// Builder - Hosted Features - Form
			// ---------------------------------

			function initBuilderForm()
			{
				$(".editPictureButtons .oldBrowserWay", panel).show();
				_selectPictureInput.change(checkSelectionStatus);
				_selectThumbnailInput.change(checkSelectionStatus);

				_uploadPicAndThumb.popover({
					placement: 'bottom',
					html: true,
					content: '<script>'
								+ '$(".editPictureButtons .oldBrowserWay").find(".btn-upload").next(".popover").addClass("picturePanelPicturePopoverOLD");'
								+ 'function closeMe(){$(".editPictureButtons .oldBrowserWay").find(".btn-upload").popover("hide");}'
								+ '</script>'
								+ '<div class="confirmationStep">'
								+ ' '+ i18n.viewer.picturePanelJS.popoverDeleteWarningPicAndThumb
								+ ' <button type="button" class="btn btn-danger btn-small" onclick="app.desktopPicturePanel.formConfirmation(true)">'+ i18n.viewer.builderJS.ok+'</button>'
								+ ' <button type="button" class="btn btn-small" onClick="app.desktopPicturePanel.formConfirmation(false)">'+ i18n.viewer.builderHTML.modalCancel+'</button>'
								+ '</div>'
								+ '<div class="waitStep" style="display: none">'
								+ ' '+i18n.viewer.picturePanelJS.popoverUploadingPhoto+' ... <img src="resources/icons/loader-upload.gif" class="addSpinner" alt="Uploading">'
								+ '</div>'
								+ '<div class="loadedStep" style="display: none">'
								+ ' '+i18n.viewer.picturePanelJS.popoverUploadSuccessful
								+ '</div>'
								+ '<div class="errorStep" style="display: none; color: red">'
								+ ' '+i18n.viewer.picturePanelJS.popoverUploadError
								+ ' <button type="button" class="btn btn-danger btn-small" onclick="closeMe()" style="vertical-align: 1px;">'+i18n.viewer.builderJS.gotIt+'</button> '
								+ '</div>'
					}
				);
			}

			function checkSelectionStatus()
			{
				if( $(_selectPictureInput[0]).val() &&  $(_selectThumbnailInput[0]).val() )
					_uploadPicAndThumb.removeAttr("disabled");
				else
					_uploadPicAndThumb.attr("disabled", "true");
			}

			function formConfirmation(confirmed)
			{
				if( ! confirmed || ! $(_selectPictureInput[0]).val() || ! $(_selectThumbnailInput[0]).val() ) {
					_uploadPicAndThumb.popover('hide');
					return;
				}

				var popover =_uploadPicAndThumb.next(".popover");
				popover.find(".confirmationStep").css("display", "none");
				popover.find(".waitStep").css("display", "block");

				app.data.changeCurrentPointPicAndThumbUsingForm(
					"ppOldBrowserWayPicForm",
					"ppOldBrowserWayThumbForm",
					function(succeed) {
						if( succeed ) {
							clearPictureAndThumbnailForm();

							popover.find(".waitStep").css("display", "none");
							popover.find(".loadedStep").css("display", "block");

							setTimeout(function(){
								_uploadPicAndThumb.popover('hide');
							}, POPOVER_DELAY);
						}
						else {
							popover.find(".waitStep").css("display", "none");
							popover.find(".errorStep").css("display", "block");
						}
					}
				);
			}

			function clearPictureAndThumbnailForm()
			{
				_selectPictureInput.closest("form").get(0).reset();
				_selectThumbnailInput.closest("form").get(0).reset();
				_uploadPicAndThumb.attr("disabled", "true");
			}

			function initLocalization()
			{
				$("#arrowPrev").attr("src","resources/icons/picturepanel-left.png");
				$("#arrowNext").attr("src","resources/icons/picturepanel-right.png");
			}

			function initBuilderLocalization()
			{
				var modernBrowserDiv = $('.editPictureButtons .modernBrowserWay');
				modernBrowserDiv.find('a.btn-picture').html(modernBrowserDiv.find('a.btn-picture').html().replace('Browse', i18n.viewer.picturePanelJS.changePicAndThumb));
				modernBrowserDiv.find('a.btn-thumbnail').html(modernBrowserDiv.find('a.btn-thumbnail').html().replace('Browse', i18n.viewer.picturePanelJS.changeThumb));
				// Hide change thumbnail
				//modernBrowserDiv.find('a.btn-thumbnail')[0].style.display = "none";

				if( $("body").hasClass("side-panel") ) {
					//_changePictureInput = $('.side-panel-upload input');
					$(".builderImageTarget .file-input-name").hide();
					$(".builderImageTarget .file-input-wrapper").height($(".builderImageTarget").height());
					$(".builderImageTarget .file-input-wrapper").width($(".builderImageTarget").width());
					$(".builderImageTarget .file-input-wrapper").css("margin-top", "-30px");
					$(".builderImageTarget .file-input-wrapper").css("opacity", 0);
				} else {
					_changePictureBtn = modernBrowserDiv.find("a.btn-picture");
					_changePictureInput = modernBrowserDiv.find(".btn-picture input");
				}
				_changeThumbnailBtn = modernBrowserDiv.find("a.btn-thumbnail");
				_changeThumbnailInput = modernBrowserDiv.find(".btn-thumbnail input");

				var oldBrowserDiv = $('.editPictureButtons .oldBrowserWay');
				oldBrowserDiv.find('a.btn-picture').html(oldBrowserDiv.find('a.btn-picture').html().replace('Browse', i18n.viewer.picturePanelJS.selectPic));
				oldBrowserDiv.find('a.btn-thumbnail').html(oldBrowserDiv.find('a.btn-thumbnail').html().replace('Browse', i18n.viewer.picturePanelJS.selectThumb));
				oldBrowserDiv.find('.btn-upload').html(i18n.viewer.picturePanelJS.uploadPicAndThumb);
				_selectPictureInput = oldBrowserDiv.find(".btn-picture input");
				_selectThumbnailInput = oldBrowserDiv.find(".btn-thumbnail input");
				_uploadPicAndThumb = oldBrowserDiv.find(".btn-upload");

				$('.editPictureButtons .attributesWay .btn-picture').html(i18n.viewer.picturePanelJS.selectPic);
				$('.editPictureButtons .attributesWay .btn-thumbnail').html(i18n.viewer.picturePanelJS.selectThumb);
			}

			return {
				init: init,
				initLocalization: initLocalization,
				updatePicture: updatePicture,
				clean: clean,
				resize: resize,
				saveEdits: saveEdits,
				forceSaveEdits: forceSaveEdits,
				update: update,
				pictureConfirmation: pictureConfirmation,
				thumbnailConfirmation: thumbnailConfirmation,
				formConfirmation: formConfirmation,
				editPointURL: editPointURL,
				exitBuilderMode: exitBuilderMode,
				firstDisplayCheck: firstDisplayCheck
			};
		};
	}
);
