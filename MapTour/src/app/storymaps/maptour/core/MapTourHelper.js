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
				
				// If contains #isVideo it's a video
				if( mediaUrl.indexOf('#isVideo') != -1 )
					return false;
				 
				return (/((\.jp(e)?g)|(.png)|(.gif)|(.bmp))$/i).test(mediaUrl)
						// Url contains a #isImage
						|| mediaUrl.indexOf('#isImage') > -1
						// The template hasn't been openned with builder 2.1 yet, it can't contains videos
						// Template just published with an embedded layer that include with videos will be considered images...
						// Using a webmap with the DL instead of an APPID => only images except if using #isVideo
						|| ! WebApplicationData.getTemplateCreation()
						// The tour has been limited to videos 
						|| WebApplicationData.getDisableVideo()
						// A FS contains image except if using #isVideo
						|| app.data.sourceIsFS();
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
				// Doesn't suppport relative path
				// I guess it's ok has it make no sense for a webmap 
				// and Chrome doesn't put http:// when copying from the browser address bar
				return (/^(((ftp|http|https):(\/\/))|(\/\/))(\w+:{0,1}\w*@)?(\S+)(:[0-9]+)?(\/|\/([\w#!:.?+=&%@!\-\/]))?$/i).test(url);
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
			getSymbol: function(color, number, type)
			{
				var iconSpec = APPCFG.ICON_CFG[type || 'normal'];
				var symbol = new PictureMarkerSymbol(
					this.getSymbolUrl(color, number), 
					iconSpec.width, 
					iconSpec.height
				);
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