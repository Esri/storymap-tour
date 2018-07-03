define(["storymaps/ui/inlineFieldEdit/InlineFieldEdit",
		"storymaps/ui/loadingIndicator/LoadingIndicator",
		"storymaps/maptour/core/MapTourHelper",
		"dojo/topic",
		"dojo/has"],
	function(
		InlineFieldEdit,
		LoadingIndicator,
		MapTourHelper,
		topic,
		has
	){
		return function CrossFader(selector, isInBuilderMode)
		{
			var _self = this;
			// Root container
			var _container = $(selector);

			var _isModernLayout = false,
				_placardIsUnder = false,
				_mediaIsImg = true;

			// Media (img/frame) container
			var _container1, _container2;
			var _img1, _img2;
			var _iframe1, _iframe2;
			var _fullScreenBtn;
			var _fullScreenOpening = false;
			var _fullScreenPreventOpening = false;

			// Reference to the current and other media container
			var _current, _other;

			var _loadingIndicator = new LoadingIndicator("pictureLoadingIndicator");

			var _placard;
			var _placardContainer;
			var _placardContainer2;
			var _toggle;

			var _actualImageWidth = 1;
			var _actualImageHeight = 1;

			// Temporary store title and caption while image is loading
			var _title, _caption;

			// First media container
			_container1 = document.createElement("div");
			$(_container1).addClass("member-image");

			_img1 = document.createElement("img");
			$(_img1).attr("ondragstart", "return false");
			$(_img1).error(function(){ mediaNotFoundHandler(this); });

			_iframe1 = document.createElement("iframe");

			// Second media container
			_container2 = document.createElement("div");
			$(_container2).addClass("member-image");

			_img2 = document.createElement("img");
			$(_img2).attr("ondragstart", "return false");
			$(_img2).error(function(){ mediaNotFoundHandler(this); });

			_iframe2 = document.createElement("iframe");

			// Full screen button
			_fullScreenBtn = $('<span class="btn-fullscreen disabled"></span>');
			$(document).bind('cbox_complete', function(){
				$('#cboxLoadedContent img').click(function(){
					// Workaround for click delay on touch device
					if( _fullScreenOpening )
						return;
					$.colorbox.close();
				});
			});

			// Placard
			_placardContainer2 = $("<div id='placard-bg'></div>");
			_placard = $("<div id='placard'></div>");
			_placardContainer2.append(_placard);

			_toggle = $("<div id='toggle'></div>");
			_placardContainer = $("<div id='placardContainer'></div>");
			_placardContainer.append(_toggle);

			_placardContainer.append(_placardContainer2);

			$(_container1).append(_img1).append(_iframe1);
			$(_container2).append(_img2).append(_iframe2);
			if(MapTourHelper.isPanelsLayout()){
				if( $("#placardContainer").length ) {
					$("#arrowPrev").appendTo($("#leftPanel"));
					$("#arrowNext").appendTo($("#leftPanel"));
					$("#placardContainer").remove();
				}
				$(_container).append(_container1).append(_container2);
				$("#contentPanel").append(_fullScreenBtn);
				$(_placardContainer).insertAfter($("#mapPanel"));
				$("#arrowPrev").appendTo($("#placard-bg"));
				$("#arrowNext").appendTo($("#placard-bg"));
				$('#toggle').hide();
			}else{
				$(_container).append(_container1).append(_container2).append(_fullScreenBtn).append(_placardContainer);
			}

			$(_img1).load(onImageLoad);
			$(_img2).load(onImageLoad);

			// Display full screen and modern button layout on image hover
			$('.member-image img, .member-image iframe').hover(function(e){
				// Only on the current image
				if( ! $(e.target).parent().hasClass('current') )
					return;

				var isHoverPicture;

				if( $("body").hasClass("side-panel") ) {
					isHoverPicture = e.type == "mouseenter"
						|| $(e.relatedTarget).hasClass('btn-fullscreen');
				} else {
					isHoverPicture = e.type == "mouseenter"
						|| $(e.relatedTarget).hasClass('modern-layout-control')
						|| $(e.relatedTarget).hasClass('btn-fullscreen')
						|| $(e.relatedTarget).is('#placardContainer')
						|| $(e.relatedTarget).parents('#placardContainer').length
						|| $(e.relatedTarget).hasClass('editPictureButtons')
						|| $(e.relatedTarget).parents('.editPictureButtons').length;
				}

				_fullScreenBtn.toggleClass("hover", !! isHoverPicture);

				if ( _isModernLayout )
					$(".modern-layout-control").toggleClass("hover", !! isHoverPicture);
			});

			$('#placardContainer').hover(function(e){
				if ( $(e.relatedTarget).hasClass('modern-layout-control') || $("body").hasClass('side-panel'))
					return;

				_fullScreenBtn.toggleClass("hover", e.type != "mouseleave");
				if ( _isModernLayout )
					$(".modern-layout-control").toggleClass("hover", e.type != "mouseleave");
			});

			$(_toggle).fastClick(function() {
				$(_toggle).toggleClass('closed', $(_placardContainer2).css('display') != 'none');
				$(_placardContainer2).slideToggle();
			});


			// Keybord event up/down arrow to toggle the placard
			if( ! app.isInBuilderMode && ! $("body").hasClass("side-panel")) {
				$(window).keyup(function(e){
					if ( $("#placardContainer").hasClass("placardUnder") )
						return;

					$(_toggle).toggleClass('closed', e.keyCode == 40);
					if( e.keyCode == 40 )
						$(_placardContainer2).slideUp();
					else if ( e.keyCode == 38 )
						$(_placardContainer2).slideDown();
				});
			}

			_current = _container1;

			this.clean = function()
			{
				$(_placard).empty();
				$(_current).fadeTo("slow", 0);
				$(_other).fadeTo("slow", 0);
				_current = null;
				_other = null;
				$("#placardContainer").fadeOut();
			};

			this.setSource = function(url, title, caption, isModernLayout, placardIsUnder, mediaIsImg)
			{
				_isModernLayout = isModernLayout;
				_placardIsUnder = placardIsUnder;
				_mediaIsImg = mediaIsImg;

				_title = title;
				_caption = caption;

				// IE requirement
				var foo = url;
				foo = foo;

				$(_current).find('iframe').attr("src", "");

				if($("body").hasClass("side-panel") && $("body").hasClass("builder-mode")) {
					$(".builderImageTarget").show();
				}

				_current = _current == _container1 ? _container2 : _container1;
				_other = _current == _container1 ? _container2 : _container1;

				var mediaEl = $(_current).find(mediaIsImg ? 'img' : 'iframe');
				$(_current).children().hide();
				mediaEl.show();

				if ( ! mediaIsImg )
					url = MapTourHelper.checkVideoURL(url);

				if (mediaEl.attr('src') == url && 'objectFit' in document.documentElement.style === true) {
					onImageLoad();
				}
				else {
					var _protocolUrl = url;
					if(app.org && app.org.allSSL && app.data.isFSWithURLFields() && url.slice(0,5) != 'https'){
						_protocolUrl = 'https:' + url.slice(5);
						mediaEl.attr('src', 'https:' + url.slice(5));
					}

					if ('objectFit' in document.documentElement.style === false) {
						mediaEl.parent().css({
							backgroundImage: 'url(' + _protocolUrl + ')'
						});
						mediaEl.parent().attr("alt", "");
						mediaEl.attr('src', _protocolUrl);
					} else{
						mediaEl.attr('src', _protocolUrl);
					}

					mediaEl.attr("alt", "");

					if ( ! app.isLoading )
						_loadingIndicator.start();
				}

				if( ! _mediaIsImg ) {
					$(_placardContainer).toggleClass("force-hidden", ! $("body").hasClass("side-panel") && ! isInBuilderMode && title === "" && caption === "");

					// Magic static ratio - needs to be worked out
					_actualImageWidth = 400 * 16 / 8;
					_actualImageHeight = 400;

					if( $("body").hasClass("side-panel") && app.data.hasIntroRecord() && ( app.data.getCurrentIndex() == -1 || app.data.getCurrentIndex() == null ) ) {
						$(_current).find('img').attr('src', '');
						mediaEl.attr('src', '');
						setTimeout(function() {
							$(".builderImageTarget").popover('show');
						}, 500);
					}


					setTimeout(function(){
						fade();
						setPlacard(title, caption);
						topic.publish("CROSSFADER_CHANGE", [_actualImageWidth, _actualImageHeight]);
					}, 800);
				}

				$("#placardContainer").fadeIn();

				_fullScreenBtn.unbind('click').click(this.fullScreen);
			};

			this.invalidate = function()
			{
				$("#pictureLoadingIndicator").css("padding-top",($(_container).height() / 2 - (_isModernLayout || $("body").hasClass("side-panel") ? 30 : 26)));
				$("#pictureLoadingIndicator").css("padding-left",($(_container).width()/2 - (_isModernLayout || $("body").hasClass("side-panel") ? 54 : 6)));
				measure();
			};

			this.currentWidth = function()
			{
				return $(_current).outerWidth();
			};

			this.currentHeight = function()
			{
				return $(_current).outerHeight();
			};

			function onImageLoad()
			{
				_actualImageWidth = $(_current).find('img')[0].naturalWidth;
				_actualImageHeight = $(_current).find('img')[0].naturalHeight;

				if (_actualImageWidth == null) {
					var tempImage = new Image();
					tempImage.src = $(_current).find('img').eq(0).attr("src");
					_actualImageWidth = tempImage.width;
					_actualImageHeight = tempImage.height;
				}

				measure();
				fade();
				setPlacard(_title, _caption);

				topic.publish("CROSSFADER_CHANGE", [_actualImageWidth, _actualImageHeight]);
			}

			function measure()
			{
				var ALLOWABLE_WIDTH = $(_container).width()-6;
				var ALLOWABLE_HEIGHT = $(_container).height();

				if(MapTourHelper.isPanelsLayout()){
					$(_current).width(ALLOWABLE_WIDTH + 6);
					$(_current).height(ALLOWABLE_HEIGHT);
					$(".member-image").css({top: 0});
					return;
				}

				if ( _placardIsUnder )
					ALLOWABLE_HEIGHT -= 70;

				var currentAR = _actualImageWidth / _actualImageHeight;
				var allowableAR = ALLOWABLE_WIDTH / ALLOWABLE_HEIGHT;

				if (currentAR > allowableAR) {
					$(_current).width(ALLOWABLE_WIDTH);
					$(_current).height(ALLOWABLE_WIDTH / currentAR);
				} else {
					$(_current).height(ALLOWABLE_HEIGHT);
					$(_current).width(ALLOWABLE_HEIGHT * currentAR);
				}

				if(!$("body").hasClass("side-panel")){
					$(_current).css("left",(ALLOWABLE_WIDTH - $(_current).width()) / 2);
				}
				$(_current).css("top",Math.floor((ALLOWABLE_HEIGHT - $(_current).height()) / 2));

				resizePlacardContainer();

				_fullScreenBtn.css("right", (ALLOWABLE_WIDTH - $(_current).width()) / 2 + 6);
				_fullScreenBtn.css("top", parseFloat($("#cfader > .current").first().css("top")) + 5);
			}

			function resizePlacardContainer()
			{
				if(MapTourHelper.isPanelsLayout()){
					return;
				}

				// Placard under media
				if ( _placardIsUnder ) {
					$(_placardContainer).addClass("placardUnder");
					$(_placardContainer).css("height", "auto");

					var availableHeight = $(_container).height() - $(_current).height(),
						placardFullHeight = $("#placardContainer")[0].scrollHeight;

					var pictureTop,
						placardHeight,
						placardTop,
						placardBottom;

					// Prevent collapsed placard on previous picture
					$(_placardContainer).find("#placard-bg").css("display", "block");

					// If placard is taller than the available space or application loading
					// No margin and constrain it's height
					if( placardFullHeight > (availableHeight-40) ) {
						pictureTop = 0;
						placardHeight = Math.max(availableHeight - 30, 50);
						placardTop = "auto";
						placardBottom = 0;
					}
					// Compute margin on top of picture and under the placard
					else {
						pictureTop = (availableHeight - placardFullHeight - 25) / 2;
						placardHeight = "auto";
						placardTop = $(_current).height() + pictureTop + 25;
						placardBottom = "auto";
					}

					$(_placardContainer).css("height", placardHeight);
					$(_placardContainer).css("top", placardTop);
					$(_placardContainer).css("bottom", placardBottom);
					$(_current).css("top", pictureTop);
				}
				// Placard hover media
				else {
					$(_placardContainer).removeClass("placardUnder");

					$('#toggle').toggle(!MapTourHelper.isPanelsLayout());

					$(_placardContainer).css("height", "auto");
					$(_placardContainer).css("top", "auto");
					$(_placardContainer).css("bottom", Math.ceil(($(_container).outerHeight() - _self.currentHeight()) / 2));
				}

				// Width - horizontal positionning
				if (_isModernLayout) {
					$(_placardContainer).css("left", ($(_container).width() - _self.currentWidth()) / 2 - 1);
					$(_placardContainer).css("width", _self.currentWidth() - 2);
				}
				else {
					$(_placardContainer).css("left", ($(_container).width() - _self.currentWidth()) / 2 + 3);
					$(_placardContainer).css("width", _self.currentWidth() - 6);
				}

				if (has("ie") == 7 || has("ie") == 8) {
					$(_placardContainer).css("left", parseInt($(_placardContainer).css("left"), 10) - 3 + (_isModernLayout ? 3 : 0));
				}
			}

			function fade()
			{
				$(_current).addClass("current");
				$(_other).removeClass("current");

				$(_current).fadeTo("slow", 1);
				$(_other).fadeTo("slow", 0, function(){
					$(_other).hide();
				});
				// appears to be necessary to put this on a timer for legacy IE; otherwise
				// the hide executes first before the show?
				setTimeout(function(){
					_loadingIndicator.stop();
				}, 100);
			}

			function setPlacard(name, text)
			{
				var nameLength = app.data.sourceIsFS() ? 254 : 1000,
					descrLength = 1000;

				if (isInBuilderMode) {
					$.each(app.data.getSourceLayer().fields, function(i, field){
						if( field.name == app.data.getFieldsConfig().getNameField() )
							nameLength = field.length || nameLength;
						if( field.name == app.data.getFieldsConfig().getDescriptionField() )
							descrLength = field.length || descrLength;
					});

					name = "<div class='text_edit_label'>" + (name || i18n.viewer.headerJS.editMe) + "</div>";
					if( $("body").hasClass("side-panel") ){
						name += "<div class='pencilIconDiv'><i class='fa fa-pencil' title='"+i18n.viewer.crossFaderJS.setPicture+"'></i></div>";
					} else {
						name += "<div class='text_edit_icon' title='"+i18n.viewer.crossFaderJS.setPicture+"'></div>";
					}
					name += "<textarea rows='3' class='text_edit_input' type='text' spellcheck='true'" + (nameLength ? "maxlength='" + (nameLength - (name.match(/=/g)||[]).length) + "'" : "") + "></textarea>";

					text = "<div class='text_edit_label'>" + (text || i18n.viewer.headerJS.editMe) + "</div>";
					if( $("body").hasClass("side-panel") ){
						text += "<div class='pencilIconDiv'><i class='fa fa-pencil' title='"+i18n.viewer.crossFaderJS.setCaption+"'></i></div>";
					} else {
						text += "<div class='text_edit_icon' title='"+i18n.viewer.crossFaderJS.setCaption+"'></div>";
					}
					text += "<textarea rows='6' class='text_edit_input' type='text' spellcheck='true'" + (descrLength ? "maxlength='" + (descrLength - (text.match(/=/g)||[]).length) + "'" : "") + "></textarea>";
				}
				else {
					$(_placardContainer).toggleClass("no-description", text === "");
					$(_placardContainer).toggleClass("force-hidden", ! $("body").hasClass("side-panel") && name === "" && text === "");
				}

				// Picture panel is not in the tab list except if there is an intro record
				var tabOrder = "tabindex='-1' aria-hidden='true'";

				if ( app.isLoading && app.data.hasIntroRecord() )
					tabOrder = "tabindex='0'";

				$(_placard).empty();
				if( $("body").hasClass("side-panel") ){
					if( app.data.hasIntroRecord() && (app.data.getCurrentIndex() == null || app.data.getCurrentIndex() == -1 ) ){
						$(_placard).append("<div class='cover-builder'><div class='cover-config'>" + i18n.viewer.builderHTML.coverBuilder + "<i class='fa fa-small fa-question-circle cover-builder-tooltip' title='" + i18n.viewer.builderHTML.coverPreview + "'></i></div></div>");
						$(_placard).append("<div class='feature-id'></div>");
						$(_placard).append("<div class='name' " + tabOrder + ">"+name+"</div>");
						if ( $("body").hasClass('builder-mode') ) {
							$("#arrowPrev").hide();
							if ( app.data.hasIntroRecord() && ! app.data.getIntroData().attributes.isVideo() && MapTourHelper.mediaIsSupportedImg(app.data.getIntroData().attributes.getURL() ) ) {
								$(".cover-novideo-tooltip").hide();
							}
						}
					}
					if( app.data.getCurrentIndex() > -1 && app.data.getCurrentIndex() != null){
						if($("body").hasClass('builder-mode')){
							if( app.data.getCurrentIndex() > 0 && !MapTourHelper.isModernLayout()/*|| (app.data.hasIntroRecord() && app.data.getCurrentIndex() === 0)*/ ) {
								$("#arrowPrev").show();
							} else {
								$("#arrowPrev").hide();
							}
							$(_placard).append("<div class='cover-builder' style='background-color: white;'><div class='btn btn-primary coverRecordButton'>" + i18n.viewer.builderHTML.cover + "</div><i class='fa fa-small fa-exclamation-circle cover-novideo-tooltip' title='" + i18n.viewer.builderHTML.coverNoVideo + "'></i></div>");
							$(".cover-novideo-tooltip").css("margin-left", $(".coverRecordButton").width() + 57);

							if ( app.data.hasIntroRecord() && ! app.data.getIntroData().attributes.isVideo() && MapTourHelper.mediaIsSupportedImg(app.data.getIntroData().attributes.getURL() ) ) {
								$(".cover-novideo-tooltip").hide();
							} else {
								$(".cover-novideo-tooltip").show();
							}
						}
						var color = app.data.getCurrentAttributes().getColor() || APPCFG.PIN_DEFAULT_CFG;
						color = color && typeof color == "string" ? color.toLowerCase() : 'r';
						if(color != "r" && color != "g" && color != "b" && color != "p")
							color = APPCFG.PIN_DEFAULT_CFG;
						var textColor = MapTourHelper.getCustomColor(color);

						if(app.data.getCurrentIndex()+1 < 10){
							$(_placard).append("<div class='feature-id' style='margin-left: 25px; width: 25px; color:" + textColor + ";'>"+(app.data.getCurrentIndex()+1)+"</div>");
							$(_placard).append("<div style='margin-left: 15px' class='name' " + tabOrder + ">"+name+"</div>");
						} else {
							$(_placard).append("<div class='feature-id' style='letter-spacing: -2px; color:" + textColor + ";'>"+(app.data.getCurrentIndex()+1)+"</div>");
							$(_placard).append("<div class='name' " + tabOrder + ">"+name+"</div>");
						}
					}
					$("#contentPanel").prepend($(".btn-fullscreen"));

					if( app.data.hasIntroRecord() && app.isInBuilderMode ) {
						$(".cover-builder").show();
						$("#placard .name .fa-pencil").css("top", "73px");
						$(".side-panel.builder-mode #arrowPrev").css("top", "60px");
						$(".side-panel.builder-mode #arrowNext").css("top", "60px");
					} else {
						$(".cover-builder").hide();
						$("#placard .name .fa-pencil").css("top", "33px");
						$(".side-panel.builder-mode #arrowPrev").css("top", "30px");
						$(".side-panel.builder-mode #arrowNext").css("top", "30px");
					}
				} else {
					$(_placard).append("<div class='name' " + tabOrder + ">"+name+"</div>");
					if($("body").hasClass('builder-mode')){
						if( app.data.getCurrentIndex() > 0 && !MapTourHelper.isModernLayout()) {
							$("#arrowPrev").show();
						} else {
							$("#arrowPrev").hide();
						}
					}
				}
				$(_placard).append("<div class='description' " + tabOrder + "'>"+text+"</div>");

				if( $("body").hasClass("side-panel") ){
					var descriptionHeight = $("#placard-bg").height() - $(".cover-builder").height() - $(".name").height();
					$(".description").height(descriptionHeight - 70);
					if( app.data.hasIntroRecord() && app.isInBuilderMode ) {
						$("#placard .description").css("margin-top", "-60px");
					}
				}

				$(_placard).find('a:not([target])').attr('target', '_blank');

				// Remove user generated content links from the tab navigation
				if ( ! app.isInBuilderMode ) {
					$(_placard).find("a").attr("tabindex", "-1");
				}

				if (isInBuilderMode) {
					if(!app.data.hasIntroRecord()){
						$(".coverRecordButton").toggle();
					}
					$(".coverRecordButton").click(coverRecordClick);
					new InlineFieldEdit(
						//selector,
						"#placard",
						function(){
							_fullScreenPreventOpening = true;
						},
						editFieldsCallback
					);
					checkBuilderTextarea();

					// Check textarea maximum length according to character escaping rules
					// '=' need to be escaped to it will take 2 char, need to adjust maxlength
					$(_placard).find(".name .text_edit_input").keyup(function(){
						var nbCharToEscape = ($(this).val().match(/=/g)||[]).length;
						$(this).attr("maxlength", nameLength - nbCharToEscape);
					});
					$(_placard).find(".description .text_edit_input").keyup(function(){
						var nbCharToEscape = ($(this).val().match(/=/g)||[]).length;
						$(this).attr("maxlength", descrLength - nbCharToEscape);
					});
				}
			}

			function coverRecordClick()
			{
				app.data.setCurrentPointByGraphic(app.data.getIntroData());
				topic.publish("CORE_UPDATE_UI", { editFirstRecord: true });
				$("#arrowPrev").addClass("disabled");
			}

			function checkBuilderTextarea()
			{
				// Sad trick when placard is under picture layout
				// Otherwise the textarea and container will overflow without scrollbar
				if( _placardIsUnder ) {
					var nameHeight = $(_placard).find(".name .text_edit_label")[0].scrollHeight;
					var descHeight = $(_placard).find(".description .text_edit_label")[0].scrollHeight;

					$(_placard).find(".name .text_edit_input").css("height", nameHeight < 96 ? "50px" : "auto");
					$(_placard).find(".description .text_edit_input").css("height", descHeight < 96 ? "50px" : "auto");
				}
			}

			this.fullScreen = function()
			{
				if( _fullScreenPreventOpening )
					return;

				_fullScreenOpening = true;

				if( _mediaIsImg ) {
					$.colorbox({
						href: $('.member-image.current img').attr('src'),
						photo: true,
						title: _title,
						scalePhotos: true,
						maxWidth: '90%',
						maxHeight: '90%'
					});
				}
				else {
					$.colorbox({
						href: $('.member-image.current iframe'),
						inline: true,
						title: _title,
						width: '80%',
						height: '80%'
					});
				}

				setTimeout(function(){
					_fullScreenOpening = false;
				}, 800);
			};

			this.firstDisplayCheck = function()
			{
				if (isInBuilderMode)
					checkBuilderTextarea();

				resizePlacardContainer();
				if( !$("body").hasClass("side-panel") )
					_fullScreenBtn.css("top", parseFloat($("#cfader > .current").first().css("top")) + 5);
			};

			this.exitBuilderMode = function()
			{
				isInBuilderMode = false;

				var name = $(_placard).find(".name .text_edit_label").html();
				var desc = $(_placard).find(".description .text_edit_label").html();

				$(_placard).empty();
				$(_placard).append("<div class='name'>" + name + "<div/>");
				$(_placard).append("<div class='description'>" + desc + "<div/>");
			};

			function editFieldsCallback()
			{
				topic.publish("CROSSFADER_DATA_UPDATE");
				setTimeout(function(){
					_fullScreenPreventOpening = false;
				}, 250);
			}

			this.invalidate();
		};
	}
);
