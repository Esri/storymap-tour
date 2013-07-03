define(["esri/map",
		"esri/arcgis/Portal",
		"esri/arcgis/utils",
		"storymaps/utils/Helper",
		// Core
		"storymaps/maptour/core/Config",
		"storymaps/maptour/core/TourData",
		"storymaps/maptour/core/WebApplicationData",
		"storymaps/maptour/core/TourPointAttributes",
		"storymaps/maptour/core/MapTourHelper",
		// Desktop/Mobile UI
		"storymaps/ui/header/Header",
		"storymaps/maptour/ui/MapCommand",
		"dojo/has"],
	function(Map,
				Portal,
				Utils,
				Helper,
				Config,
				TourData,
				WebApplicationData,
				TourPointAttributes,
				MapTourHelper,
				Header,
				MapCommand,
				has)
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
			}
		}

		//
		// Initialization
		//

		function init(mainView, builder)
		{
			console.log("maptour.core.Core - init");
			
			_mainView = mainView;

			initLocalization();
			
			var isInBuilderMode = builder != null && Helper.getAppID(isProd());

			if( ! Config.checkConfigFileIsOK() ) {
				initError("invalidConfig");
				return;
			}
			
			// Application global object
			app = {
				// esri.Map
				map: null,
				// esri.arcgis.Portal
				portal: null,
				// Data model
				data: new TourData(),
				mapTips: null,
				// Builder
				builder: builder,
				isInBuilderMode: isInBuilderMode,
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
			
			// Modify that condition and user and password values if you don't want to have to manually login during development
			if ( false && !isProd() ) {
				dojo.connect(esri.id, 'onDialogCreate', function(){
					dojo.connect(esri.id.dialog, 'onShow', function(){
						esri.id.dialog.txtUser_.set('value', 'guest');
						esri.id.dialog.txtPwd_.set('value', 'guest');
						esri.id.dialog.btnSubmit_.onClick();
					});
				});
			}
			
			startLoadingTimeout();

			// Set the Portal
			// - if configOptions.sharingurl is set use that URL
			// - if app is not on *.arcgis.com : use AGO
			// - otherwise use the web server name and port
			if (!configOptions.sharingurl) {
				if( ! Helper.isArcGISHosted(isProd()) )
					configOptions.sharingurl = location.protocol + APPCFG.DEFAULT_SHARING_URL;
				else
					configOptions.sharingurl = location.protocol + '//' + location.host + "/sharing/content/items";
			}
			else
				configOptions.sharingurl = location.protocol + configOptions.sharingurl;

			if (configOptions.geometryserviceurl)
				esri.config.defaults.geometryService = new esri.tasks.GeometryService(location.protocol + configOptions.geometryserviceurl);

			configOptions.proxyurl = configOptions.proxyurl ? location.protocol + configOptions.proxyurl : location.protocol + '//' + location.host + "/sharing/proxy";

			esri.arcgis.utils.arcgisUrl = configOptions.sharingurl;
			esri.config.defaults.io.proxyUrl = configOptions.proxyurl;
			
			// Allow IE9 to save over HTTP
			esri.id && esri.id.setProtocolErrorHandler(function(){ return true; });
			
			// USE CORS to save the web app configuration during developement
			if( isInBuilderMode && APPCFG.CORS_SERVER ) {
				$.each(APPCFG.CORS_SERVER, function(i, server){
					esriConfig.defaults.io.corsEnabledServers.push(server);
				});
			}
			
			// Set a variable timeout deping on the application mode
			if( isInBuilderMode )
				esri.config.defaults.io.timeout = APPCFG.TIMEOUT_BUILDER_REQUEST;
			else
				esri.config.defaults.io.timeout = APPCFG.TIMEOUT_VIEWER_REQUEST;

			// Run the app when jQuery is ready
			$(document).ready( dojo.hitch(this, initStep2) );
		}

		function initStep2()
		{
			console.log("maptour.core.Core - initStep2");
					
			// Initialize localization
			app.header.initLocalization();
			_mainView.initLocalization();

			$(window).resize(handleWindowResize);
			
			// Disable form submit on enter key
			$("form").bind("keydown", function(e) {
				if (e.keyCode == 13)
					return false;
			});

			var appId = Helper.getAppID(isProd());
			var webmapId = Helper.getWebmapID(isProd());

			// Basic styling in case something isn't public
			dojo.connect(esri.id, "onDialogCreate", styleIdentityManager);
			
			dojo.subscribe("CORE_UPDATE_UI", updateUI);
			dojo.subscribe("CORE_RESIZE", handleWindowResize);
			
			loadingIndicator.setMessage(i18n.viewer.loading.step2);
			
			// Mobile carousel and list view numbering
			Helper.addCSSRule(".tpIcon {" + MapTourHelper.getSymbolMobileClip() + "}");

			// Load using a Web Mapping Application item
			if (appId)
				loadWebMappingApp(appId);
			// Load using a web map and is hosted on AGO -> template preview
			else if( webmapId && (Helper.isArcGISHosted(isProd()) || isPreviewForced()) )
				showTemplatePreview();
			// Load using a webmap -> user hosted
			else if( webmapId )
				loadWebMap(webmapId);
			else if( Helper.isArcGISHosted(isProd()) )
				showTemplatePreview();
			else
				initError("invalidConfigNoWebmap");
		}

		function loadWebMappingApp(appId)
		{
			console.log("maptour.core.Core - loadWebMappingApp - appId:", appId);
			
			var urlParams = esri.urlToObject(document.location.search).query || {};
			var forceLogin = urlParams.forceLogin != undefined;
			
			// If forceLogin parameter in URL
			//  OR production and there is an esri cookie -> sign in the user by reusing the cookie
			//  OR production, builder and no esri cookie -> will redirect to portal login page
			if ( forceLogin || (isProd() && Helper.getPortalUser()) || (isProd() && app.isInBuilderMode && ! Helper.getPortalUser()) )
				portalLogin().then(
					function() {
						loadWebMappingAppStep2(appId);
					}, 
					function() { 
						initError("notAuthorized");
					}
				);
			// Production in user mode without cookie or dev in view/edit
			else
				loadWebMappingAppStep2(appId);
		}
		
		function loadWebMappingAppStep2(appId)
		{
			// Get application item
			var itemRq = esri.request({
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
			var dataRq = esri.request({
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
			
			var appDeferedList = new dojo.DeferredList([itemRq, dataRq]);
			appDeferedList.then(function(){
				if (!dataRq.results || !dataRq.results[0] || !itemRq.results || !itemRq.results[0]) {
					if( itemRq.results && itemRq.results[1] && itemRq.results[1] && itemRq.results[1].httpCode == 403 )
						initError("notAuthorized");
					else
						initError("invalidApp");
					return;
				}
				
				// If in builder, check that user is app owner or org admin
				if (app.isInBuilderMode && isProd() && !app.data.userIsAppOwnerOrAdmin()) {
					initError("notAuthorized");
					return;
				}

				var webmapId = WebApplicationData.getWebmap() || Helper.getWebmapID(isProd());
				if (webmapId)
					loadWebMap(webmapId);
				else
					initError("invalidApp");
			});
		}
		
		function portalLogin()
		{
			var resultDeferred = new dojo.Deferred();
			var portalUrl = configOptions.sharingurl.split('/sharing/')[0];
			app.portal = new esri.arcgis.Portal(portalUrl);

			dojo.connect(esri.id, "onDialogCreate", styleIdentityManagerForLoad);
			app.portal.signIn().then(
				function() {
					resultDeferred.resolve();
				},
				function(error) {
					resultDeferred.reject();
				}
			);
			
			return resultDeferred;
		}

		function loadWebMap(webmapId)
		{
			console.log("maptour.core.Core - loadWebMap - webmapId:", webmapId);
			
			var mapDeferred = esri.arcgis.utils.createMap(webmapId, "mainMap", {
				mapOptions: {
					slider: true,
					autoResize: false,
					// Force the web map extent to the world to get all data from the FS
					extent : new esri.geometry.Extent({
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
				bingMapsKey: configOptions.bingmapskey
			});

			mapDeferred.addCallback(function(response){
				// Workaround a debug limitation
				setTimeout(function(){ webMapInitCallback(response); }, 0);
			});
			mapDeferred.addErrback(function(){
				initError("createMap");
			});   
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

			// Initialize header
			// Title/subtitle are the first valid string from: index.html config object, web application data, web map data
			var title = configOptions.title || WebApplicationData.getTitle() || response.itemInfo.item.title;
			var subtitle = configOptions.subtitle || WebApplicationData.getSubtitle() || response.itemInfo.item.snippet;
			
			applyUILayout(WebApplicationData.getLayout() || configOptions.layout);

			var appColors = WebApplicationData.getColors();
			var logoURL = WebApplicationData.getLogoURL() || APPCFG.HEADER_LOGO_URL;
			var logoTarget = (logoURL == APPCFG.HEADER_LOGO_URL) ? APPCFG.HEADER_LOGO_TARGET : WebApplicationData.getLogoTarget();
			
			app.header.init(
				title,
				subtitle,
				appColors[0],
				logoURL,
				logoTarget,
				! app.isInBuilderMode && (
					(! isProd() && Helper.getAppID(isProd()))
					|| isProd() && app.data.userIsAppOwnerOrAdmin()),
				WebApplicationData.getHeaderLinkText() == undefined ? APPCFG.HEADER_LINK_TEXT : WebApplicationData.getHeaderLinkText(),
				WebApplicationData.getHeaderLinkURL() == undefined ? APPCFG.HEADER_LINK_URL : WebApplicationData.getHeaderLinkURL()
			);
			document.title = $('<div>' + title + '</div>').text();

			_mainView.webmapLoaded();
		}
		
		function appInitComplete()
		{
			console.log("maptour.core.Core - initMap");
			
			// Map command buttons
			new MapCommand(
				app.map, 
				function(){
					_mainView.setMapExtent(Helper.getWebMapExtentFromItem(app.data.getWebMapItem().item));
				},
				app.isInBuilderMode ? _mainView.zoomToDeviceLocation : null
			);
			
			// Resize everything after picture has been set
			handleWindowResize();

			// On mobile, force start on the Map view except if it's the intro
			if (location.hash)
				location.hash = "map";

			// On mobile, change view based on browser history
			window.onhashchange = function(e){				
				// If no hash and there is intro data, it's init, so skip
				if( (location.hash == "" || location.hash == "#")  && app.data.getIntroData() )
					return;
				
				_mainView.prepareMobileViewSwitch();

				if(location.hash == "#map") {
				 	$("#mapViewLink").addClass("current");
					showMobileViewMap();
				}
				else
					_mainView.onHashChange();
			}
			
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
			else if ( ! error == "initMobile" )
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
			
			// TODO: app title/subtitle are not restored
			
			app.header.setColor(appColors[0]);
			
			var logoURL = WebApplicationData.getLogoURL() || APPCFG.HEADER_LOGO_URL;
			app.header.setLogoInfo(
				logoURL,
				logoURL == APPCFG.HEADER_LOGO_URL ? 
					APPCFG.HEADER_LOGO_TARGET 
					: WebApplicationData.getLogoTarget()
			);
			app.header.setTopRightLink(
				WebApplicationData.getHeaderLinkText() == undefined ? APPCFG.HEADER_LINK_TEXT : WebApplicationData.getHeaderLinkText(),
				WebApplicationData.getHeaderLinkURL() == undefined ? APPCFG.HEADER_LINK_URL : WebApplicationData.getHeaderLinkURL()
			);
			
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
			$(".esriSignInDialog").find(".dijitDialogPaneContentArea:first-child").find(":first-child").first().after("<div id='dijitDialogPaneContentAreaLoginText'>Please sign in with an account on <a href='http://" + esri.id._arcgisUrl + "' title='" + esri.id._arcgisUrl + "' target='_blank'>" + esri.id._arcgisUrl + "</a> to access the application.</div>");
		}
		
		function styleIdentityManagerForLoad()
		{
			// Hide default message
			$(".esriSignInDialog").find("#dijitDialogPaneContentAreaLoginText").css("display", "none");

			// Setup a more friendly text
			$(".esriSignInDialog").find(".dijitDialogPaneContentArea:first-child").find(":first-child").first().after("<div id='dijitDialogPaneContentAreaAtlasLoginText'>Please sign in with an account on <a href='http://" + esri.id._arcgisUrl + "' title='" + esri.id._arcgisUrl + "' target='_blank'>" + esri.id._arcgisUrl + "</a> to configure this application.</div>");
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
			if( esri.id && esri.id.dialog && esri.id.dialog._alreadyInitialized && ! esri.id.loadingTimeoutAlreadyFired) {
				clearTimeout(app.loadingTimeout);
				startLoadingTimeout();
				// Set a flag only if the dialog isn't showned now, so next timeout will fail
				if( ! esri.id._busy ) 
					esri.id.loadingTimeoutAlreadyFired = true;
				return;
			}
			
			loadingIndicator.stop();
			loadingIndicator.setMessage(i18n.viewer.loading.fail + '<br /><button type="button" class="btn btn-medium btn-info" style="margin-top: 5px;" onclick="document.location.reload()">' + i18n.viewer.loading.failButton + '</button>', true);
			app.map && app.map.destroy();
		}
		
		function initLocalization()
		{
			dojo.query('#fatalError .error-title')[0].innerHTML = i18n.viewer.errors.boxTitle;
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