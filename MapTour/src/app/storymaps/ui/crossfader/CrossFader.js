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
			$(_container).append(_container1).append(_container2).append(_fullScreenBtn).append(_placardContainer);
	
			$(_img1).load(onImageLoad);
			$(_img2).load(onImageLoad);
			
			// Display full screen and modern button layout on image hover
			$('.member-image img, .member-image iframe').hover(function(e){ 
				// Only on the current image
				if( ! $(e.target).parent().hasClass('current') ) 
					return;
				
				var isHoverPicture = e.type == "mouseenter" 
					|| $(e.relatedTarget).hasClass('modern-layout-control')
					|| $(e.relatedTarget).hasClass('btn-fullscreen')
					|| $(e.relatedTarget).is('#placardContainer')
					|| $(e.relatedTarget).parents('#placardContainer').length
					|| $(e.relatedTarget).hasClass('editPictureButtons')
					|| $(e.relatedTarget).parents('.editPictureButtons').length;

				_fullScreenBtn.toggleClass("hover", !! isHoverPicture);
				
				if ( _isModernLayout )
					$(".modern-layout-control").toggleClass("hover", !! isHoverPicture);
			});
			
			$('#placardContainer').hover(function(e){
				if ( $(e.relatedTarget).hasClass('modern-layout-control') )
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
			if( ! app.isInBuilderMode ) {
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
				
				_current = _current == _container1 ? _container2 : _container1;
				_other = _current == _container1 ? _container2 : _container1;
		
				var mediaEl = $(_current).find(mediaIsImg ? 'img' : 'iframe');
				$(_current).children().hide();
				mediaEl.show();
				
				if ( ! mediaIsImg )
					url = MapTourHelper.checkVideoURL(url);
		
				if (mediaEl.attr('src') == url) {
					onImageLoad();
				} 
				else {
					mediaEl.attr('src', url);
					if ( ! app.isLoading )
						_loadingIndicator.start();
				}
				
				if( ! _mediaIsImg ) {
					$(_placardContainer).toggleClass("force-hidden", ! isInBuilderMode && title === "" && caption === "");
					
					// Magic static ratio - needs to be worked out
					_actualImageWidth = 400 * 16 / 8;
					_actualImageHeight = 400;
					
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
				$("#pictureLoadingIndicator").css("padding-top",($(_container).height() / 2 - (_isModernLayout ? 30 : 26)));
				$("#pictureLoadingIndicator").css("padding-left",($(_container).width()/2 - (_isModernLayout ? 54 : 6)));
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
				
				$(_current).css("left",(ALLOWABLE_WIDTH - $(_current).width()) / 2);
				$(_current).css("top",Math.floor((ALLOWABLE_HEIGHT - $(_current).height()) / 2));
								
				resizePlacardContainer();
				
				_fullScreenBtn.css("right", (ALLOWABLE_WIDTH - $(_current).width()) / 2 + 6);
				_fullScreenBtn.css("top", parseFloat($("#cfader > .current").first().css("top")) + 5);
			}
			
			function resizePlacardContainer()
			{
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
					name += "<div class='text_edit_icon' title='"+i18n.viewer.crossFaderJS.setPicture+"'></div>";
					name += "<textarea rows='3' class='text_edit_input' type='text' spellcheck='true'" + (nameLength ? "maxlength='" + (nameLength - (name.match(/=/g)||[]).length) + "'" : "") + "></textarea>";
					
					text = "<div class='text_edit_label'>" + (text || i18n.viewer.headerJS.editMe) + "</div>";
					text += "<div class='text_edit_icon' title='"+i18n.viewer.crossFaderJS.setCaption+"'></div>";
					text += "<textarea rows='6' class='text_edit_input' type='text' spellcheck='true'" + (descrLength ? "maxlength='" + (descrLength - (text.match(/=/g)||[]).length) + "'" : "") + "></textarea>";
				}
				else { 
					$(_placardContainer).toggleClass("no-description", text === "");
					$(_placardContainer).toggleClass("force-hidden", name === "" && text === "");
				}
				
				// Picture panel is not in the tab list except if there is an intro record
				var tabOrder = "tabindex='-1' aria-hidden='true'";
				
				if ( app.isLoading && app.data.hasIntroRecord() )
					tabOrder = "tabindex='0'";
				
				$(_placard).empty();
				$(_placard).append("<div class='name' " + tabOrder + ">"+name+"<div/>");	
				$(_placard).append("<div class='description' " + tabOrder + "'>"+text+"<div/>");
				
				// Remove user generated content links from the tab navigation
				if ( ! app.isInBuilderMode ) {
					$(_placard).find("a").attr("tabindex", "-1");
				}
				
				if (isInBuilderMode) {
					new InlineFieldEdit(
						selector, 
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