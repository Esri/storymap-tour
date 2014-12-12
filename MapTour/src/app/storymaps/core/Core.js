define(["esri/map",
		"esri/arcgis/Portal",
		"esri/arcgis/utils",
		"storymaps/utils/Helper",
		"esri/urlUtils",
		// Core
		"storymaps/maptour/core/Config",
		"storymaps/maptour/core/TourData",
		"storymaps/maptour/core/WebApplicationData",
		"storymaps/maptour/core/TourPointAttributes",
		"storymaps/maptour/core/MapTourHelper",
		// Desktop/Mobile UI
		"storymaps/ui/header/Header",
		"storymaps/ui/mapCommand/MapCommand",
		// Builder
		"storymaps/maptour/builder/MapTourBuilderHelper",
		// Utils
		"dojo/has",
		"esri/IdentityManager",
		"esri/config",
		"esri/tasks/GeometryService",
		"esri/request",
		"dojo/topic",
		"dojo/on",
		"dojo/_base/lang",
		"dojo/Deferred",
		"dojo/DeferredList",
		"dojo/query",
		"esri/geometry/Extent"],
	function(
		Map,
		arcgisPortal,
		arcgisUtils,
		Helper,
		urlUtils,
		Config,
		TourData,
		WebApplicationData,
		TourPointAttributes,
		MapTourHelper,
		Header,
		MapCommand,
		MapTourBuilderHelper,
		has,
		IdentityManager,
		esriConfig,
		GeometryService,
		esriRequest,
		topic,
		on,
		lang,
		Deferred,
		DeferredList,
		query,
		Extent)
	{
		/**
		 * Core
		 * @class Core
		 *
		 * MapTour viewer/builder Main class
		 * Handling of view mode UI
		 */
		
		// Development options
		// Values are enforced at build time
		var CONFIG = {
			forcePreviewScreen: "TPL_PREVIEW_FALSE", // TPL_PREVIEW_FALSE || TPL_PREVIEW_TRUE
			environment: "TPL_ENV_DEV" // TPL_ENV_DEV || TPL_ENV_PRODUCTION
		};
		
		var _mainView = null;
		
		// IE8
		if(typeof String.prototype.trim !== 'function') {
			String.prototype.trim = function() {
				return this.replace(/^\s+|\s+$/g, ''); 
			};
		}
		if (!Date.now) {
			Date.now = function() {
				return new Date().valueOf();
			};
		}

		//
		// Initialization
		//

		function init(mainView, builder)
		{
			var urlParams = Helper.getUrlParams(), 
				isInBuilderMode = false,
				isDirectCreation = false,
				isGalleryCreation = false;
			 
			console.log("maptour.core.Core - init", builder);
			
			_mainView = mainView;

			initLocalization();
			
			if( builder != null ) {
				isDirectCreation = urlParams.fromScratch != null || urlParams.fromscratch != null;
				isInBuilderMode = isDirectCreation || Helper.getAppID(isProd());
				isGalleryCreation = urlParams.fromGallery != null;
			}
			
			// If browser doesn't support history and it's direct or gallery mode where the URL will have to be rewritten later
			// Redirect to a URL that the browser will be able to overwrite
			// And put a token so that we don't loop in here
			if ( ! Helper.browserSupportHistory() && (isDirectCreation || isGalleryCreation) && urlParams.ieredirected == null ) {
				window.location = document.location.protocol + "//" + document.location.host + document.location.pathname + "#" + document.location.search + "&ieredirected";
			}

			// Ignore index.html configuration on AGOL/Portal and development (except proxy/sharing URL)
			if( Helper.isArcGISHosted() || ! isProd() )
				configOptions = {
					proxyurl: configOptions.proxyurl,
					sharingurl: configOptions.sharingurl
				};

			if( ! Config.checkConfigFileIsOK() ) {
				initError("invalidConfig");
				return;
			}
			
			// Application global object
			app = {
				// esri/map
				map: null,
				// esri/arcgis/Portal
				portal: null,
				// Data model
				data: new TourData(),
				mapTips: null,
				// Builder
				builder: builder,
				isInBuilderMode: isInBuilderMode,
				isDirectCreation: isDirectCreation,
				isGalleryCreation: isGalleryCreation,
				isDirectCreationFirstSave: isDirectCreation,
				builderMovableGraphic: null,
				isCreatingFS: false,
				// UI
				mapCommand: null,
				header: new Header("#header", isInBuilderMode),
				// Flags
				isLoading: true,
				loadingTimeout: null,
				isFirstUserAction: false,
				filterMouseHoverEvent: false,
				// Config
				config: {
					thumbnailMaxWidth: 140,
					thumbnailMaxHeight: 93,
					picRecommendedWidth: 1090,
					picRecommendedHeight: 725
				}
			};
			
			if ( ! _mainView.init(this) )
				return;
			
			startLoadingTimeout();

			// Sharing URL
			if ( ! configOptions.sharingurl ) {
				// Determine if hosted or on a Portal 
				var appLocation = document.location.pathname.indexOf("/apps/");
				if( appLocation == -1 )
					appLocation = document.location.pathname.indexOf("/home/");
				
				if( appLocation != -1 ) {
					// Get the portal instance name
					var instance = location.pathname.substr(0,appLocation);
					 
					configOptions.sharingurl = "//" + location.host + instance + "/sharing/content/items";
					configOptions.proxyurl =  "//" + location.host + instance +  "/sharing/proxy";
				}
				else
					configOptions.sharingurl = APPCFG.DEFAULT_SHARING_URL;					
			}
			arcgisUtils.arcgisUrl = location.protocol + configOptions.sharingurl;
			
			// Proxy URL
			if( ! configOptions.proxyurl )
				configOptions.proxyurl = APPCFG.DEFAULT_PROXY_URL;
			esriConfig.defaults.io.proxyUrl = location.protocol + configOptions.proxyurl;

			// Allow IE9 to save over HTTP
			IdentityManager && IdentityManager.setProtocolErrorHandler(function(){ return true; });
			
			// USE CORS to save the web app configuration during developement
			if( isInBuilderMode && APPCFG.CORS_SERVER ) {
				$.each(APPCFG.CORS_SERVER, function(i, server){
					esriConfig.defaults.io.corsEnabledServers.push(server);
				});
			}
			
			// Set timeout depending on the application mode
			esriConfig.defaults.io.timeout = isInBuilderMode ? APPCFG.TIMEOUT_BUILDER_REQUEST : APPCFG.TIMEOUT_VIEWER_REQUEST;
			
			// Fix for multiple twitter bootstrap popup to be open simultaneously
			$.fn.modal.Constructor.prototype.enforceFocus = function () {};

			// Run the app when jQuery is ready
			$(document).ready( lang.hitch(this, initStep2) );
		}

		function initStep2()
		{
			console.log("maptour.core.Core - initStep2");
		
			// Get portal info
			// If geometry, geocode service or bing maps key are defined by portal,
			// they override the configuration file values
		
			esriRequest({
				url: arcgisUtils.arcgisUrl.split('/sharing/')[0] + "/sharing/rest/portals/self",
				content: {"f": "json"},
				callbackParamName: "callback"
			}).then(lang.hitch(this, function(response){
				var geometryServiceURL, geocodeServices;
				
				if (commonConfig && commonConfig.helperServices) {
					if (commonConfig.helperServices.geometry && commonConfig.helperServices.geometry) 
						geometryServiceURL = location.protocol + commonConfig.helperServices.geometry.url;
					if (commonConfig.helperServices.geocode && commonConfig.helperServices.geocode.length && commonConfig.helperServices.geocode[0].url) 
						geocodeServices = commonConfig.helperServices.geocode;
					// Deprecated syntax
					else if (commonConfig.helperServices.geocode && commonConfig.helperServices.geocode && commonConfig.helperServices.geocode.url) 
						geocodeServices = [{
							name: "myGeocoder",
							url: commonConfig.helperServices.geocode.url
						}];
				}
				
				if (response.helperServices) {
					if (response.helperServices.geometry && response.helperServices.geometry.url) 
						geometryServiceURL = response.helperServices.geometry.url;
					
					if (response.helperServices.geocode && response.helperServices.geocode.length && response.helperServices.geocode[0].url ) 
						geocodeServices = response.helperServices.geocode;
				}

				esriConfig.defaults.geometryService = new GeometryService(geometryServiceURL);
				configOptions.geocodeServices = geocodeServices;

				if( response.bingKey )
					commonConfig.bingMapsKey = response.bingKey;
				
				// Disable feature service creation as Portal for ArcGIS 10.2 doesn't support that yet
				if( response.isPortal && APPCFG && APPCFG.AUTHORIZED_IMPORT_SOURCE )
					APPCFG.AUTHORIZED_IMPORT_SOURCE.featureService = false;

				app.isPortal = !! response.isPortal;

				initStep3();
			}), function(){
				initError("portalSelf");
			});
		}
		
		function initStep3()
		{
			console.log("maptour.core.Core - initStep3");
			
			var appId = Helper.getAppID(isProd());
			var webmapId = Helper.getWebmapID(isProd());
					
			// Initialize localization
			app.header.initLocalization();
			_mainView.initLocalization();

			$(window).resize(handleWindowResize);
			
			// Disable form submit on enter key
			$("form").bind("keydown", function(e) {
				if (e.keyCode == 13)
					return false;
			});

			// Basic styling in case something isn't public
			on(IdentityManager, "dialog-create", styleIdentityManager);
			
			topic.subscribe("CORE_UPDATE_UI", updateUI);
			topic.subscribe("CORE_RESIZE", handleWindowResize);
			
			loadingIndicator.setMessage(i18n.viewer.loading.step2);
			
			// Mobile carousel and list view numbering
			Helper.addCSSRule(".tpIcon {" + MapTourHelper.getSymbolMobileClip() + "}");

			// Load using a Web Mapping Application item
			if (appId)
				loadWebMappingApp(appId);
			// Load using a web map and is hosted on AGO -> template preview
			else if( webmapId && (Helper.isArcGISHosted() || isPreviewForced()) )
				showTemplatePreview();
			// Load using a webmap -> user hosted
			else if( webmapId )
				loadWebMap(webmapId);
			// Direct creation and not signed-in
			else if ( app.isDirectCreation && isProd() && ! Helper.getPortalUser() )
				redirectToSignIn();
			// Direct creation and signed in
			else if ( app.isDirectCreation )
				portalLogin().then(function(){
					loadWebMap(MapTourBuilderHelper.getBlankWebmapJSON());
				});
			else if( Helper.isArcGISHosted() )
				showTemplatePreview();
			else
				initError("invalidConfigNoWebmap");
		}

		function loadWebMappingApp(appId)
		{
			console.log("maptour.core.Core - loadWebMappingApp - appId:", appId);
			
			var urlParams = Helper.getUrlParams();
			var forceLogin = urlParams.forceLogin !== undefined;
			
			// If forceLogin parameter in URL OR builder
			if ( forceLogin || app.isInBuilderMode )
				portalLogin().then(
					function() {
						loadWebMappingAppStep2(appId);
					}, 
					function() { 
						initError("notAuthorized");
					}
				);
			// Production in view mode
			else
				loadWebMappingAppStep2(appId);
		}
		
		function loadWebMappingAppStep2(appId)
		{
			// Get application item
			var itemRq = esriRequest({
				url: configOptions.sharingurl + "/" + appId + "",
				content: {
					f: "json"
				},
				callbackParamName: "callback",
				load: function (response) {
					app.data.setAppItem(response);
				},
				error: function() { }
			});

			// Get application config
			var dataRq = esriRequest({
				url: configOptions.sharingurl + "/" + appId + "/data",
				content: {
					f: "json"
				},
				callbackParamName: "callback",
				load: function (response) {
					WebApplicationData.set(response);
					app.data.webAppData = WebApplicationData;
				},
				error: function(){ }
			});
			
			var appDeferedList = new DeferredList([itemRq, dataRq]);
			appDeferedList.then(function(){
				if (!dataRq.results || !dataRq.results[0] || !itemRq.results || !itemRq.results[0]) {
					if( itemRq.results && itemRq.results[1] && itemRq.results[1] && itemRq.results[1].httpCode == 403 )
						initError("notAuthorized");
					else
						initError("invalidApp");
					return;
				}
				
				// If in builder, check that user is app owner or org admin
				if (app.isInBuilderMode && isProd() && !app.data.userIsAppOwner()) {
					initError("notAuthorized");
					return;
				}

				var webmapId = WebApplicationData.getWebmap() || Helper.getWebmapID(isProd());
				if (webmapId)
					loadWebMap(webmapId);
				// Come back from the redirect below, create a new webmap
				else if (app.isGalleryCreation){
					WebApplicationData.setTitle(app.data.getAppItem().title);
					WebApplicationData.setSubtitle(app.data.getAppItem().description);
					loadWebMap(MapTourBuilderHelper.getBlankWebmapJSON());
				}
				// ArcGIS Gallery page start the app with an appid that doesn't include a webmap
				else if (Helper.getPortalUser() || ! isProd())
					redirectToBuilderFromGallery();
				else
					initError("invalidApp");
			});
		}
		
		function portalLogin()
		{
			var resultDeferred = new Deferred();
			var portalUrl = configOptions.sharingurl.split('/sharing/')[0];
			app.portal = new arcgisPortal.Portal(portalUrl);

			on(IdentityManager, "dialog-create", styleIdentityManagerForLoad);
			
			app.portal.on("load", function(){
				app.portal.signIn().then(
					function() {
						resultDeferred.resolve();
					},
					function() {
						resultDeferred.reject();
					}
				);
			});
			
			return resultDeferred;
		}

		function loadWebMap(webmapIdOrJSON)
		{
			console.log("maptour.core.Core - loadWebMap - webmapId:", webmapIdOrJSON);
			
			arcgisUtils.createMap(webmapIdOrJSON, "mainMap", {
				mapOptions: {
					slider: true,
					autoResize: false,
					// Force the web map extent to the world to get all data from the FS
					extent : new Extent({
						xmax: 180,
						xmin: -180,
						ymax: 90,
						ymin: -90,
						spatialReference: {
							wkid:4326
						}
					}),
					showAttribution: true
				},
				ignorePopups: true,
				bingMapsKey: commonConfig.bingMapsKey
			}).then(
				lang.hitch(this, function(response){
					webMapInitCallback(response);
				}),
				lang.hitch(this, function(){
					initError("createMap");
				})
			);  
		}

		function webMapInitCallback(response)
		{
			console.log("maptour.core.Core - webMapInitCallback");
			
			if( configOptions.authorizedOwners && configOptions.authorizedOwners.length > 0 && configOptions.authorizedOwners[0] ) {
				var ownerFound = false;
				
				if( response.itemInfo.item.owner ) 
					ownerFound = $.inArray(response.itemInfo.item.owner, configOptions.authorizedOwners) != -1;
				
				if (!ownerFound) {
					initError("invalidConfigOwner");
					return;
				}
			}
			
			app.map = response.map;
			app.data.setWebMapItem(response.itemInfo);
			
			app.map.disableKeyboardNavigation();

			// Initialize header
			// Title/subtitle are the first valid string from: index.html config object, web application data, web map data
			var title = configOptions.title || WebApplicationData.getTitle() || response.itemInfo.item.title;
			var subtitle = configOptions.subtitle || WebApplicationData.getSubtitle() || response.itemInfo.item.snippet;
			
			applyUILayout(WebApplicationData.getLayout() || configOptions.layout);

			var urlParams = Helper.getUrlParams();
			var appColors = WebApplicationData.getColors();
			var logoURL = WebApplicationData.getLogoURL() || APPCFG.HEADER_LOGO_URL;
			var logoTarget = (logoURL == APPCFG.HEADER_LOGO_URL) ? APPCFG.HEADER_LOGO_TARGET : WebApplicationData.getLogoTarget();
			
			app.header.init(
				! app.isInBuilderMode && (APPCFG.EMBED || urlParams.embed || urlParams.embed === ''),
				title,
				subtitle,
				appColors[0],
				logoURL,
				logoTarget,
				! app.isInBuilderMode && (
					(! isProd() && Helper.getAppID(isProd()))
					|| isProd() && app.data.userIsAppOwner()),
				WebApplicationData.getHeaderLinkText() === undefined ? APPCFG.HEADER_LINK_TEXT : WebApplicationData.getHeaderLinkText(),
				WebApplicationData.getHeaderLinkURL() === undefined ? APPCFG.HEADER_LINK_URL : WebApplicationData.getHeaderLinkURL(),
				WebApplicationData.getSocial()
			);
			document.title = title ? $('<div>' + title + '</div>').text() : 'Map Tour';

			_mainView.webmapLoaded();
		}
		
		function appInitComplete()
		{
			console.log("maptour.core.Core - initMap");
			
			// Map command buttons
			app.mapCommand = new MapCommand(
				app.map, 
				function(){
					_mainView.setMapExtent(Helper.getWebMapExtentFromItem(app.data.getWebMapItem().item));
				},
				_mainView.zoomToDeviceLocation,
				APPCFG.DISPLAY_LOCATE_BUTTON || WebApplicationData.getZoomLocationButton()
			);
			
			// Resize everything after picture has been set
			handleWindowResize();

			// On mobile, force start on the Map view except if it's the intro
			if (location.hash && Helper.browserSupportHistory())
				location.hash = "map";

			// On mobile, change view based on browser history
			window.onhashchange = function(){				
				// If no hash and there is intro data, it's init, so skip
				if( (location.hash === "" || location.hash === "#")  && app.data.getIntroData() )
					return;
				
				if ( app.data.getIntroData() && app.data.getCurrentIndex() == null )
					topic.publish("PIC_PANEL_NEXT");
				
				_mainView.prepareMobileViewSwitch();

				if(location.hash == "#map") {
					$("#mapViewLink").addClass("current");
					showMobileViewMap();
				}
				else
					_mainView.onHashChange();
			};
			
			_mainView.appInitComplete();
			app.builder && app.builder.appInitComplete();
		}
		
		function displayApp()
		{
			app.isLoading = false;
			$("#loadingOverlay").fadeOut();
			loadingIndicator.stop();
		}
		
		function initError(error, message, noDisplay)
		{	
			hideUI();
			cleanLoadingTimeout();
			loadingIndicator.stop();
			
			if( error == "noLayerView" ) {
				loadingIndicator.setMessage(i18n.viewer.errors[error], true);
				return;
			}
			else if ( error != "initMobile" )
				loadingIndicator.forceHide();
			
			$("#fatalError .error-msg").html(i18n.viewer.errors[error]);
			if( ! noDisplay ) 
				$("#fatalError").show();
		}
		
		function replaceInitErrorMessage(error)
		{
			$("#fatalError .error-msg").html(i18n.viewer.errors[error]);
		}

		//
		// UI
		//
		
		function applyUILayout(layout)
		{
			$("body").toggleClass("modern-layout", layout == "integrated");
		}

		/**
		 * Refresh the UI when tour points have changed
		 */
		function updateUI(params)
		{
			console.log("maptour.core.Core - updateUI");
			var tourPoints = app.data.getTourPoints();
			var appColors = WebApplicationData.getColors();
			var editFirstRecord = params && params.editFirstRecord;
			
			applyUILayout(WebApplicationData.getLayout());
			
			app.header.setTitleAndSubtitle(
				WebApplicationData.getTitle() || app.data.getWebMapItem().item.title,
				WebApplicationData.getSubtitle() || app.data.getWebMapItem().item.snippet
			);
			app.header.setColor(appColors[0]);
			
			var logoURL = WebApplicationData.getLogoURL() || APPCFG.HEADER_LOGO_URL;
			app.header.setLogoInfo(
				logoURL,
				logoURL == APPCFG.HEADER_LOGO_URL ? 
					APPCFG.HEADER_LOGO_TARGET 
					: WebApplicationData.getLogoTarget()
			);
			app.header.setTopRightLink(
				WebApplicationData.getHeaderLinkText() === undefined ? APPCFG.HEADER_LINK_TEXT : WebApplicationData.getHeaderLinkText(),
				WebApplicationData.getHeaderLinkURL() === undefined ? APPCFG.HEADER_LINK_URL : WebApplicationData.getHeaderLinkURL()
			);
			app.header.setSocial(WebApplicationData.getSocial());
			
			_mainView.updateUI(tourPoints, appColors, editFirstRecord);
			
			handleWindowResize();
		}
		
		function handleWindowResize()
		{
			
			var isMobileView = MapTourHelper.isOnMobileView();
			var isOnMobileMapView = $("#mapViewLink").hasClass("current");
			
			if( isMobileView )
				$("body").addClass("mobile-view");
			else
				$("body").removeClass("mobile-view");

			var widthViewport = $("body").width();
			var heightViewport = $("body").height();
			var heightHeader = $("#header").height();
			var heightFooter = $("#footer").height();
			var heightMiddle = heightViewport - (heightHeader + heightFooter);
			
			app.header.resize(widthViewport);
			
			_mainView.resize({
				isMobileView: isMobileView,
				isOnMobileMapView: isOnMobileMapView,
				width: widthViewport,
				height: heightMiddle
			});
			
			if( ! app.initScreenIsOpen )
				$("#contentPanel").height(heightMiddle + (isMobileView ? 0 : MapTourHelper.isModernLayout() ? heightFooter : 0));
			$("#contentPanel").width(widthViewport);
			
			// Force a browser reflow by reading #picturePanel width 
			// Using the value computed in desktopPicturePanel.resize doesn't works
			$("#mapPanel").width( widthViewport - $("#picturePanel").width() );
			
			if (app.isInBuilderMode){
				app.builder.resize({
					isMobileView: isMobileView
				});
			}
			
			if (app.map && (! isMobileView || (isMobileView && isOnMobileMapView))){
				try {
					app.map.resize(true);
				} catch( e ){ }
			}
			
			// Change esri logo size
			if( isMobileView )
				$("#mainMap .esriControlsBR > div").first().removeClass("logo-med").addClass("logo-sm");
			else
				$("#mainMap .esriControlsBR > div").first().removeClass("logo-sm").addClass("logo-med");
		}

		//
		// Login in dev environnement
		//
		
		function styleIdentityManager()
		{
			// Override for bootstrap conflicts
			$(".esriSignInDialog td label").siblings("br").css("display", "none");
			$(".esriSignInDialog .dijitDialogPaneContentArea div:nth(1)").css("display", "none");
			$(".esriSignInDialog .dijitReset.dijitInputInner").css("padding", "0px");
			$(".esriSignInDialog .dijitReset.dijitInputInner").css("margin-bottom", "0px");
			$(".esriSignInDialog .dijitReset.dijitInputInner").css("border", "none");
			$(".esriSignInDialog .dijitReset.dijitInputInner").css("border-radius", "0px");
			$(".esriSignInDialog .dijitReset.dijitInputInner").css("-webkit-border-radius", "0px");
			$(".esriSignInDialog .dijitReset.dijitInputInner").css("-moz-border-radius", "0px");
			$(".esriSignInDialog .dijitReset.dijitInputInner").css("box-shadow", "none");
			$(".esriSignInDialog .dijitReset.dijitInputInner").css("-webkit-box-shadow", "none");
			$(".esriSignInDialog .dijitReset.dijitInputInner").css("-moz-box-shadow", "none");
			$(".esriSignInDialog .dijitReset.dijitValidationContainer").css("display", "none");
			$(".esriSignInDialog .esriErrorMsg").css("margin-top", "10px");

			// Edit title
			$(".esriSignInDialog").find(".dijitDialogTitleBar").find(".dijitDialogTitle").first().html("Authentication is required");

			// Hide default message
			$(".esriSignInDialog").find(".dijitDialogPaneContentArea:first-child").find(":first-child").first().css("display", "none");

			// Setup a more friendly text
			$(".esriSignInDialog").find(".dijitDialogPaneContentArea:first-child").find(":first-child").first().after("<div id='dijitDialogPaneContentAreaLoginText'>Please sign in with an account on <a href='http://" + IdentityManager._arcgisUrl + "' title='" + IdentityManager._arcgisUrl + "' target='_blank'>" + IdentityManager._arcgisUrl + "</a> to access the application.</div>");
		}
		
		function styleIdentityManagerForLoad()
		{
			// Hide default message
			$(".esriSignInDialog").find("#dijitDialogPaneContentAreaLoginText").css("display", "none");

			// Setup a more friendly text
			$(".esriSignInDialog").find(".dijitDialogPaneContentArea:first-child").find(":first-child").first().after("<div id='dijitDialogPaneContentAreaAtlasLoginText'>Please sign in with an account on <a href='http://" + IdentityManager._arcgisUrl + "' title='" + IdentityManager._arcgisUrl + "' target='_blank'>" + IdentityManager._arcgisUrl + "</a> to configure this application.</div>");
		}
		
		function prepareAppForWebmapReload()
		{
			$("#mainMap_root").remove();
			
			$("#header").css("display", "inherit");
			$(".mobileView").css("display", "inherit");
			$("#footer").css("display", "inherit");
			$("#fatalError").css("display", "none");
			$("#loadingOverlay").css("top", "0px");
			
			loadingIndicator.start();
			
			loadingIndicator.setMessage(i18n.viewer.loading.step2);
			startLoadingTimeout();
			
			handleWindowResize();
		}
		
		function showTemplatePreview()
		{
			window.location.replace('preview.html');
		}
		
		function redirectToSignIn()
		{
			loadingIndicator.setMessage(i18n.viewer.loading.redirectSignIn + "<br />" + i18n.viewer.loading.redirectSignIn2);
			setTimeout(function(){
				window.location = arcgisUtils.arcgisUrl.split('/sharing/')[0] 
					+ "/home/signin.html?returnUrl=" 
					+ encodeURIComponent(document.location.href);
			}, 2000);
		}
		
		function redirectToBuilderFromGallery()
		{
			// TODO display another redirect message
			loadingIndicator.setMessage(i18n.viewer.loading.loadBuilder);
			setTimeout(function(){
				window.location = document.location.href + "&fromGallery";
			}, 1200);
		}
		
		function hideUI()
		{
			$("#header").hide();
			$(".mobileView").hide();
			$("#footer").hide();
			$(".modal").hide();
		}

		//
		// Mobile
		//

		function showMobileViewMap()
		{
			$("#contentPanel").show();
			$("#footerMobile").show();
			$("#mapPanel").show();
			
			app.mobileCarousel.setSelectedPoint(app.data.getCurrentIndex());
			handleWindowResize();
		}

		//
		// App init
		//
		
		function startLoadingTimeout()
		{
			// First view loading time before failure
			app.loadingTimeout = setTimeout(appLoadingTimeout, APPCFG.TIMEOUT_VIEWER_LOAD);
		}
		
		function cleanLoadingTimeout()
		{
			if (typeof app != "undefined" && app.loadingTimeout) {
				clearTimeout(app.loadingTimeout);
				app.loadingTimeout = null;
			}
		}
		
		function appLoadingTimeout()
		{
			// Restart the timeout if the dialog is shown or has been shown and the timeout hasn't been fired after it has been closed
			if( IdentityManager && IdentityManager.dialog && IdentityManager.dialog._alreadyInitialized && ! IdentityManager.loadingTimeoutAlreadyFired) {
				clearTimeout(app.loadingTimeout);
				startLoadingTimeout();
				// Set a flag only if the dialog isn't showned now, so next timeout will fail
				if( ! IdentityManager._busy ) 
					IdentityManager.loadingTimeoutAlreadyFired = true;
				return;
			}
			
			loadingIndicator.stop();
			loadingIndicator.setMessage(i18n.viewer.loading.fail + '<br /><button type="button" class="btn btn-medium btn-info" style="margin-top: 5px;" onclick="document.location.reload()">' + i18n.viewer.loading.failButton + '</button>', true);
			app.map && app.map.destroy();
		}
		
		function initLocalization()
		{
			query('#fatalError .error-title')[0].innerHTML = i18n.viewer.errors.boxTitle;
		}
		
		function isProd()
		{
			// Prevent the string from being replaced
			return CONFIG.environment != ['TPL','ENV','DEV'].join('_');
		}
		
		function isPreviewForced()
		{
			// Prevent the string from being replaced
			return CONFIG.forcePreviewScreen == ['TPL','PREVIEW','TRUE'].join('_');
		}

		return {
			init: init,
			isProd: isProd,
			appInitComplete: appInitComplete,
			displayApp: displayApp,
			
			cleanLoadingTimeout: cleanLoadingTimeout,
			initError: initError,
			handleWindowResize: handleWindowResize,
			prepareAppForWebmapReload: prepareAppForWebmapReload,
			loadWebMap: loadWebMap,
			replaceInitErrorMessage: replaceInitErrorMessage,
			portalLogin: portalLogin
		};
	}
);