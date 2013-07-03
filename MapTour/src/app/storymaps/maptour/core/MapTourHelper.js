define([], function(){
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
		isSupportedMedia: function(name)
		{
			return name.endsWith('.jpg');
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
			var symbol = new esri.symbol.PictureMarkerSymbol(
				this.getSymbolUrl(color, number), 
				iconSpec.width, 
				iconSpec.height
			);
			symbol.setOffset(iconSpec.offsetX, iconSpec.offsetY);
			return symbol;
		},
		getSymbolMobileClip: function()
		{
			return APPCFG.ICON_CFG['normal'].clipRules;
		},
		isModernLayout: function()
		{
			return $("body").hasClass("modern-layout");
		}
	}
});