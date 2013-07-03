define(["storymaps/ui/inlineFieldEdit/InlineFieldEdit", "storymaps/ui/loadingIndicator/LoadingIndicator", "storymaps/maptour/core/MapTourHelper"], function(InlineFieldEdit, LoadingIndicator, MapTourHelper){
	return function CrossFader(selector, isInBuilderMode)
	{
		var _self = this;
		var _container = $(selector);
		var _current;
		var _other;	
		var _img1;
		var _img2;
		var _loadingIndicator = new LoadingIndicator("pictureLoadingIndicator");
		
		var _placard;
		var _placardContainer;
		var _toggle;
		
		var _actualImageWidth = 1;
		var _actualImageHeight = 1;
		
		var _isLegacyIE = (navigator.appVersion.indexOf("MSIE 7.0") > -1) || (navigator.appVersion.indexOf("MSIE 8.0") > -1);
		
		_img1 = document.createElement("img");
		$(_img1).attr("ondragstart", "return false");
		$(_img1).addClass("member-image");
		$(_img1).error(function(){ mediaNotFoundHandler(this); });
		
		_img2 = document.createElement("img");
		$(_img2).attr("ondragstart", "return false");
		$(_img2).addClass("member-image");
		$(_img2).error(function(){ mediaNotFoundHandler(this); });
		
		_placardContainer2 = $("<div id='placard-bg'></div>");
		_placard = $("<div id='placard'></div>");
		_placardContainer2.append(_placard);
		
		_toggle = $("<div id='toggle'>&#x25BC;</div>");
		_placardContainer = $("<div id='placardContainer'></div>");
		_placardContainer.append(_toggle);
		
		_placardContainer.append(_placardContainer2);
	
		$(_container).append(_img2);
		$(_container).append(_img1);
		$(_container).append(_placardContainer);

		$(_img1).load(onImageLoad);
		$(_img2).load(onImageLoad);
		
		$(_toggle).fastClick(function(e) {
			if ($(_placardContainer2).css('display')=='none'){
			  $(_toggle).html('&#x25BC;');
			}
			else{
			  $(_toggle).html('&#x25B2;');
			}
			$(_placardContainer2).slideToggle();
	    });
		
		_current = _img1;
		
		this.clean = function()
		{
			$(_placard).empty();
			$(_current).fadeTo("slow", 0);
			$(_other).fadeTo("slow", 0);
			_current = null
			_other = null;
			$("#placardContainer").fadeOut();
		}
		
		this.setSource = function(url,title,caption)
		{	
			setPlacard(title,caption);
			
			// IE requirement
			var foo = url;
			
			_current = (_current == _img1) ? _img2 : _img1;
			_other = (_current == _img1) ? _img2 : _img1;
	
			if (_current.src == url) {
				fade();
				onImageLoad();
			} 
			else {
				_current.src = url;
				_loadingIndicator.start();
			}
	
			$("#placardContainer").fadeIn();
		}
		
		this.invalidate = function() {
			$("#pictureLoadingIndicator").css("padding-top",($(_container).height() / 2 - (MapTourHelper.isModernLayout() ? 0 : 26)));
			$("#pictureLoadingIndicator").css("padding-left",($(_container).width()/2 - (MapTourHelper.isModernLayout() ? 54 : 6)));
			measure();
		}
		
		this.currentWidth = function() {
			return $(_current).outerWidth();
		}
		
		this.currentHeight = function() {
			return $(_current).outerHeight();
		}
		
		function onImageLoad(evt)
		{
			_actualImageWidth = _current.naturalWidth;
			_actualImageHeight = _current.naturalHeight;
			
			if (_actualImageWidth == null) {
				var tempImage = new Image();
				tempImage.src = $(_current).attr("src");
				_actualImageWidth = tempImage.width;
				_actualImageHeight = tempImage.height;
			}

			measure();
			fade();
			dojo.publish("CROSSFADER_CHANGE", [_actualImageWidth, _actualImageHeight]);
		}
		
		function measure()
		{
			var ALLOWABLE_WIDTH = $(_container).width()-6;
			var ALLOWABLE_HEIGHT = $(_container).height();
		
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
			$(_current).css("top",(ALLOWABLE_HEIGHT - $(_current).height()) / 2);
			
			$(_other).width($(_current).width());
			$(_other).height($(_current).height());
			$(_other).css("left", $(_current).css("left"));
			$(_other).css("top", $(_current).css("top"));
			
			resizePlacardContainer();
		}
		
		function resizePlacardContainer() {
			$(_placardContainer).css("bottom",($(_container).outerHeight() - _self.currentHeight()) / 2);
			/*
			if (!_isLegacyIE) {
				$(_placardContainer).css("bottom",parseInt($(_placardContainer).css("bottom")));
			}
			*/
			
			if (MapTourHelper.isModernLayout()) {
				$(_placardContainer).css("left", ($(_container).width() - _self.currentWidth()) / 2 - 1);
				$(_placardContainer).css("width", _self.currentWidth() - 2);
			}
			else {
				$(_placardContainer).css("left", ($(_container).width() - _self.currentWidth()) / 2 + 3);
				$(_placardContainer).css("width", _self.currentWidth() - 6);
			}
				
			/*
			if (!_isLegacyIE) {
				$(_placardContainer).css("left",parseInt($(_placardContainer).css("left")) + 3);
			}
			*/
		}
		
		function fade(evt) {		
			$(_current).addClass("current");
			$(_other).removeClass("current");
			
			$(_current).fadeTo("slow", 1);
			$(_other).fadeTo("slow", 0);
			// appears to be necessary to put this on a timer for legacy IE; otherwise
			// the hide executes first before the show?
			setTimeout(function(){
				_loadingIndicator.stop();
			}, 100);
		}
		
		function setPlacard(name, text)
		{			
			if (isInBuilderMode) {
				var nameLength = 254, descrLength = 1000;
				$.each(app.data.getSourceLayer().fields, function(i, field){
					if( field.name == app.data.getFieldsConfig().getNameField() )
						nameLength = field.length;
					if( field.name == app.data.getFieldsConfig().getDescriptionField() )
						descrLength = field.length;
				});
				
				name = "<p class='text_edit_label'>" + (name || i18n.viewer.headerJS.editMe) + "</p>";
				name += "<div class='text_edit_icon' title='"+i18n.viewer.crossFaderJS.setPicture+"'></div>";
				name += "<textarea rows='3' class='text_edit_input' type='text' " + (nameLength ? "maxlength='" + nameLength + "'" : "") + "></textarea>";
				
				text = "<p class='text_edit_label'>" + (text || i18n.viewer.headerJS.editMe) + "</p>";
				text += "<div class='text_edit_icon' title='"+i18n.viewer.crossFaderJS.setCaption+"'></div>";
				text += "<textarea rows='6' class='text_edit_input' type='text' " + (descrLength ? "maxlength='" + descrLength + "'" : "") + "></textarea>";
			}
			
			$(_placard).empty();
			$(_placard).append("<div class='name'>"+name+"<div/>");	
			$(_placard).append("<div class='description'>"+text+"<div/>");
			
			if( isInBuilderMode )
				new InlineFieldEdit(selector, null, editFieldsCallback);
		}
		
		function editFieldsCallback(src, value)
		{
			dojo.publish("CROSSFADER_DATA_UPDATE");
		}
		
		this.invalidate();
	}
});