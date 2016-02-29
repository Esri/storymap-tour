define([], 
	function(){
		return {
			loadAllWebmapOnInit: false,
			checkConfigFileIsOK: function()
			{
				return APPCFG
					&& APPCFG.COLORS && APPCFG.COLORS.length == 3
					&& APPCFG.POPUP_BACKGROUND_COLOR
					&& APPCFG.POPUP_BORDER_COLOR
					&& APPCFG.POPUP_ARROW_COLOR
					&& APPCFG.COLOR_SCHEMES
					&& APPCFG.DISPLAY_LOCATE_BUTTON !== undefined
					&& APPCFG.DEFAULT_SHARING_URL
					&& APPCFG.DEFAULT_PROXY_URL 
					&& APPCFG.MINIMUM_MAP_WIDTH 
					&& APPCFG.TIMEOUT_VIEWER_LOAD
					&& APPCFG.TIMEOUT_VIEWER_REQUEST
					&& APPCFG.TIMEOUT_BUILDER_REQUEST
					&& APPCFG.MAX_ALLOWED_POINTS
					&& APPCFG.USE_STATIC_ICON
					&& APPCFG.USE_STATIC_ICON.enabled !== undefined
					&& APPCFG.USE_STATIC_ICON.url
					&& APPCFG.PIN_CFG 
					&& APPCFG.PIN_DEFAULT_CFG
					&& APPCFG.PIN_CFG[APPCFG.PIN_DEFAULT_CFG]
					&& APPCFG.ICON_CFG 
					&& APPCFG.EMBED !== undefined
					&& APPCFG.HEADER_LOGO_URL !== undefined 
					&& APPCFG.HEADER_LOGO_TARGET !== undefined
					&& APPCFG.HEADER_LINK_TEXT !== undefined
					&& APPCFG.HEADER_LINK_URL !== undefined
					&& APPCFG.HEADER_SOCIAL  
					&& APPCFG.FIELDS_CANDIDATE
					&& APPCFG.CORS_SERVER
					&& APPCFG.AUTHORIZED_IMPORT_SOURCE
					&& APPCFG.FLICKR_API_KEY
					&& APPCFG.FACEBOOK_APP_ID
					&& APPCFG.YOUTUBE_DISABLE_ON_PORTAL !== undefined
					&& APPCFG.YOUTUBE_API_KEY
					&& APPCFG.BING_MAPS_KEY !== undefined
					&& APPCFG.HELPER_SERVICES !== undefined
					&& APPCFG.HELPER_SERVICES.geometry !== undefined
					&& APPCFG.HELPER_SERVICES.geocode !== undefined;
			}
		};
	}
);