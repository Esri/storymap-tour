define(["storymaps/maptour/core/WebApplicationData", "esri/symbols/PictureMarkerSymbol"],
	function(WebApplicationData, PictureMarkerSymbol){
		var _myCanvas, _context, _icon, _icon2, _icon3;
		/**
		 * MapTourHelper
		 * @class MapTourHelper
		 *
		 * Collection of helper functions specific to Map Tour
		 */
		return {
			isOnMobileView: function()
			{
				return $("#headerMobile").css("display") == "block";
			},
			/*
			 * Data
			 */
			// Used by FS Manager
			isSupportedImgExt: function(name)
			{
				return (/((\.jp(e)?g)|(.png)|(.gif)|(.bmp))$/i).test(name);
			},
			// Used by core
			mediaIsSupportedImg: function(mediaUrl)
			{
				// Blank URL -> display the picture not found thumb
				if( ! mediaUrl )
					return true;

				// If contains isVideo it's a video
				if( mediaUrl.indexOf('isVideo') != -1 )
					return false;

				// If picture extension or URL contains isImage
				if ( (/((\.jp(e)?g)|(.png)|(.gif)|(.bmp))$/i).test(mediaUrl) || mediaUrl.indexOf('isImage') > -1 )
					return true;

				// Created with 2.1
				// Or created prior 2.1 but updated with 2.1
				//  - prior 2.1 get templateCreation = 2.1 when app was saved through builder
				//  - prior 2.1 that will be saved with 2.2+ doesn't have video yet -> video will have #isVideo
				if( WebApplicationData.getTemplateCreation() == "2.1" )
					// The tour has been limited to images or a FS contains image except if using isVideo
					return WebApplicationData.getDisableVideo() || app.data.sourceIsFS();

				// Prior to 2.1 and 2.2+ -> videos need to contains #isVideo or use the attribute 'isVideo'
				// Attribute has to be checked before calling mediaIsSupportedImg
				return true;
			},
			// Used by Add/modify
			validateImageURL: function(url)
			{
				// Doesn't suppport relative path
				// I guess it's ok has it make no sense for a webmap
				// and Chrome doesn't put http:// when copying from the browser address bar
				return (/^(((ftp|http|https):(\/\/))|(\/\/))(\w+:{0,1}\w*@)?(\S+)(:[0-9]+)?(\/|\/([\w#!:.?+=&%@!\-\/]))?((\.jp(e)?g)|(.png)|(.gif)|(.bmp))$/i).test(url)
						|| url.indexOf('#isImage') > -1;
			},
			validateURL: function(url)
			{
				// Doesn't support relative path
				// I guess it's ok has it make no sense for a webmap
				// and Chrome doesn't put http:// when copying from the browser address bar
				return (/^(((ftp|http|https):(\/\/))|(\/\/))(\w+:{0,1}\w*@)?(\S+)(:[0-9]+)?(\/|\/([\w#!:.?+=&%@!\-\/]))?$/i).test(url);
			},
			// Add #isVideo or ?isVideo or &isVideo in the URL
			addIsVideoToURL: function(url)
			{
				var dashIndex = url.indexOf('#');
				if( dashIndex > 0 )
					return url.slice(0, dashIndex)
						+ (url.indexOf('?') ? "&" : "?")
						+ "isVideo"
						+ url.slice(dashIndex);
				else
					return url + '#isVideo';
			},
			getNotFoundMedia: function()
			{
				return document.location.protocol
					+ '//'
					+ document.location.host
					+ document.location.pathname.split('/').slice(0,-1).join('/')
					+ '/resources/icons/picture-not-available.png';
			},
			/*
			 * Name/description manipulation introduced in 2.2
			 *  - text need to be encoded to be properly saved in FS
			 *  - using decodeURI on a text that hasn't been encoded can fail if it contains special character like %
			 *  - encoding/decoding only if the template is 2.2+ is not ok as old tour would still fail
			 *  - can't use encodeURI to be compatible with AGOL
			 */
			encodeText: function(text)
			{
				if ( ! app.data.sourceIsFS() )
					return text;

				var encodedText = '';
				try {
					encodedText = text.replace(/=([^"])/g, '%3D$1');
					//encodedText = encodeURIComponent(text);
				} catch(e) {
					return text;
				}
				return encodedText;
			},
			decodeText: function(text)
			{
				if(app.data.getAppItem().created > APPCFG.HTML_SANITIZER_DATE){
					text = app.sanitizer.sanitize(text);
				}
				if ( ! app.data.sourceIsFS() )
					return text;

				var decodedText = '';
				try {
					decodedText = text.replace(/%3D/g, '=');
					//decodedText = decodeURIComponent(text);
				} catch(e) {
					return text;
				}
				return decodedText;
			},
			checkVideoURL: function(url)
			{
				if ( url.match("youtube.com/embed") ) {
					if ( ! url.match("wmode=") ) {
						if( url.match(/\?/) )
							url	+= "&wmode=opaque";
						else
							url += "?wmode=opaque";
					}
				}
				return url;
			},
			/*
			 * Map Symbol
			 */
			getSymbolUrl: function(color, number)
			{
				color = color ? (""+color).toLowerCase() : '';
				var pinCfg = APPCFG.PIN_CFG[color] || APPCFG.PIN_CFG[APPCFG.PIN_DEFAULT_CFG];
				return pinCfg.iconPath + number + ".png";
			},
			getSymbolCss: function(color)
			{
					color = color ? (""+color).toLowerCase() : '';
					var pinCfg = APPCFG.PIN_CFG[color] || APPCFG.PIN_CFG[APPCFG.PIN_DEFAULT_CFG];
					return pinCfg.cssClass;
			},
			getSymbolColors: function()
			{
				var list = [];
				for(var color in APPCFG.PIN_CFG)
					list.push(color);
				return list;
			},
			colorExists: function(color)
			{
				color = color ? (""+color).toLowerCase() : '';
				return APPCFG.PIN_CFG[color] ? true : false;
			},
			getDefaultColor: function()
			{
				return APPCFG.PIN_DEFAULT_CFG;
			},
			getSymbolConfig: function(type)
			{
				if( $("body").hasClass("side-panel") ) {
					return APPCFG.ICON_CUSTOM_CFG[type  || 'normal'];
				} else {
					return APPCFG.ICON_CFG[type || 'normal'];
				}
			},
			loadCustomIcon: function()
			{
				// Canvas icons
				_myCanvas = document.createElement('canvas');

				_context = _myCanvas.getContext('2d');
				_icon = new Image();
				_icon.src = APPCFG.PIN_CFG.custom.iconPath;

				_icon.onload = function(){
					_context.drawImage(_icon, 0, 0);
					_context.font = _myCanvas.width/3.8 + "pt open_sanssemibold, sans-serif";
				};

				_icon2 = new Image();
				_icon2.src = APPCFG.PIN_CFG.custom.iconPath2;

				_icon3 = new Image();
				_icon3.src = APPCFG.PIN_CFG.custom.iconPath3;
			},
			getSymbol: function(color, number, type, doNotAllowStatic)
			{
				var symbol = null;
				color = color && typeof color == "string" ? color.toLowerCase() : 'r';
				if(!type){
					type = "normal";
				}

				if( $("body").hasClass("side-panel") ) {
					if(color != "r" && color != "g" && color != "b" && color != "p")
						color = APPCFG.PIN_DEFAULT_CFG;
					var newColor = this.getCustomColor((color || APPCFG.PIN_DEFAULT_CFG), type);
					var newCanvas = document.createElement('canvas');
					newCanvas.width = 77;
					newCanvas.height = 120;
					var newContext = newCanvas.getContext('2d');
					newContext.font = newCanvas.width/3 + "pt pt open_sanssemibold, sans-serif";
					/*if(type == "normal") {
						newContext.globalAlpha = 0.9;
					}*/
					newContext.drawImage(_myCanvas, 0, 0);

					// examine every pixel,
					// change any old rgb to the new-rgb
					// pull the entire image into an array of pixel data
					var imageData = newContext.getImageData(0, 0, 77, 120);

					for (var i=0;i<imageData.data.length;i+=4)
					{
						// change to your new rgb
						imageData.data[i] = this.hexToRgb(newColor).r;
						imageData.data[i+1] = this.hexToRgb(newColor).g;
						imageData.data[i+2] = this.hexToRgb(newColor).b;
					}

					// put the altered data back on the canvas
					newContext.putImageData(imageData,0,0);

					if(type != "selected"){
						newContext.drawImage(_icon2, 0, 0);
					} else {
						newContext.drawImage(_icon3, 0, 0);
					}

					var label = number;
					newContext.textAlign = "center";
					newContext.fillStyle = 'white';
					if( number < 10 ){
						newContext.fillText(label, newCanvas.width/2.1, newCanvas.height/2.3);
					} else {
						newContext.fillText(label, newCanvas.width/2.0, newCanvas.height/2.3);
					}
					symbol = new PictureMarkerSymbol(
						newCanvas.toDataURL(),
						31,
						49
					);
					symbol.setOffset(APPCFG.ICON_CUSTOM_CFG.normal.offsetX, APPCFG.ICON_CUSTOM_CFG.normal.offsetY);
				} else {
					var iconSpec = APPCFG.ICON_CFG[type || 'normal'];

					var isStatic = ! doNotAllowStatic && APPCFG.USE_STATIC_ICON && APPCFG.USE_STATIC_ICON.enabled;

					if ( isStatic )
						symbol = new PictureMarkerSymbol(
							APPCFG.USE_STATIC_ICON.url,
							APPCFG.USE_STATIC_ICON.width || iconSpec.width,
							APPCFG.USE_STATIC_ICON.height || iconSpec.height
						);
					else
						symbol = new PictureMarkerSymbol(
							this.getSymbolUrl(color, number),
							iconSpec.width,
							iconSpec.height
						);

					if ( ! isStatic || (!APPCFG.USE_STATIC_ICON.width || !APPCFG.USE_STATIC_ICON.height))
						symbol.setOffset(iconSpec.offsetX, iconSpec.offsetY);
				}

				return symbol;
			},
			hexToRgb: function(hex)
			{
				// Expand shorthand form (e.g. "03F") to full form (e.g. "0033FF")
				var shorthandRegex = /^#?([a-f\d])([a-f\d])([a-f\d])$/i;
				hex = hex.replace(shorthandRegex, function(m, r, g, b) {
					return r + r + g + g + b + b;
				});

				var result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
				return result ? {
					r: parseInt(result[1], 16),
					g: parseInt(result[2], 16),
					b: parseInt(result[3], 16)
				} : null;
			},
			getCustomColor: function(color, type)
			{
				if(!type) {
					type = "selected";
				}
				if( color == "r" || color == "R") {
					return type == "selected" ? APPCFG.ICON_CUSTOM_SELECTED_COLOR.r : APPCFG.ICON_CUSTOM_COLORS.r;
				} else if ( color == "b" || color == "B") {
					return type == "selected" ? APPCFG.ICON_CUSTOM_SELECTED_COLOR.b : APPCFG.ICON_CUSTOM_COLORS.b;
				} else if ( color == "g" || color == "G") {
					return type == "selected" ? APPCFG.ICON_CUSTOM_SELECTED_COLOR.g : APPCFG.ICON_CUSTOM_COLORS.g;
				} else if ( color == "p" || color == "P"){
					return type == "selected" ? APPCFG.ICON_CUSTOM_SELECTED_COLOR.p : APPCFG.ICON_CUSTOM_COLORS.p;
				} else {
					return;
				}
			},
			getSymbolMobileClip: function()
			{
				return APPCFG.ICON_CFG.normal.clipRules;
			},
			isModernLayout: function()
			{
				return $("body").hasClass("modern-layout");
			},
			isPanelsLayout: function()
			{
				return $("body").hasClass("side-panel");
			}
		};
	}
);
