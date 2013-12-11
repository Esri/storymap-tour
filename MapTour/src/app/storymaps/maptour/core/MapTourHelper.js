define(["storymaps/maptour/core/WebApplicationData", "esri/symbols/PictureMarkerSymbol"], 
	function(WebApplicationData, PictureMarkerSymbol){
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
				return APPCFG.ICON_CFG[type || 'normal'];
			},
			getSymbol: function(color, number, type, doNotAllowStatic)
			{
				var iconSpec = APPCFG.ICON_CFG[type || 'normal'];
				var isStatic = ! doNotAllowStatic && APPCFG.USE_STATIC_ICON && APPCFG.USE_STATIC_ICON.enabled;
				var symbol = null;
				
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
				
				return symbol;
			},
			getSymbolMobileClip: function()
			{
				return APPCFG.ICON_CFG.normal.clipRules;
			},
			isModernLayout: function()
			{
				return $("body").hasClass("modern-layout");
			}
		};
	}
);