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
		"esri/arcgis/OAuthInfo",
		"esri/config",
		"esri/tasks/GeometryService",
		"esri/request",
		"esri/renderers/UniqueValueRenderer",
		"dojo/topic",
		"dojo/on",
		"dojo/_base/lang",
		"dojo/_base/array",
		"dojo/_base/kernel",
		"dojo/Deferred",
		"dojo/DeferredList",
		"dojo/query",
		"esri/geometry/Extent",
		"storymaps/utils/arcgis-html-sanitizer"],
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
		ArcGISOAuthInfo,
		esriConfig,
		GeometryService,
		esriRequest,
		UniqueValueRenderer,
		topic,
		on,
		lang,
		array,
		kernel,
		Deferred,
		DeferredList,
		query,
		Extent,
		Sanitizer)
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
				isGalleryCreation = false,
				sharingHostParam = Helper.getSharingHost();

			console.log("maptour.core.Core - init", builder);

			_mainView = mainView;

			initLocalization();

			if( builder != null ) {
				isDirectCreation = urlParams.fromScratch != null || urlParams.fromscratch != null;
				isInBuilderMode = isDirectCreation || Helper.getAppID(isProd());
				isGalleryCreation = urlParams.fromGallery != null;
			}

			if (isDirectCreation || isGalleryCreation) {
				WebApplicationData.setLayout("side-panel");
			}

			// If browser doesn't support history and it's direct or gallery mode where the URL will have to be rewritten later
			// Redirect to a URL that the browser will be able to overwrite
			// And put a token so that we don't loop in here
			if ( ! Helper.browserSupportHistory() && (isDirectCreation || isGalleryCreation) && urlParams.ieredirected == 'undefined' ) {
				window.location = document.location.protocol + "//" + document.location.host + document.location.pathname + "#" + document.location.search + "&ieredirected";
			}

			// Ignore index.html configuration on AGOL/Portal and development (except proxy/sharing URL)
			if( Helper.isArcGISHosted() || ! isProd() )
				configOptions = {
					proxyurl: configOptions.proxyurl,
					sharingurl: configOptions.sharingurl,
					oAuthAppId: configOptions.oAuthAppId
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
				},
				userCanEdit: false,
				sanitizer: new Sanitizer({
          whiteList: {
            hr: []
					}
				}, true)
			};

			if ( ! _mainView.init(this) )
				return;

			startLoadingTimeout();

			// Sharing URL
			if (sharingHostParam) {
				configOptions.sharingurl = sharingHostParam;
			}
			else if ( ! configOptions.sharingurl ) {
				// Determine if hosted or on a Portal
				var appLocation = document.location.pathname.indexOf("/apps/");
				if( appLocation == -1 )
					appLocation = document.location.pathname.indexOf("/home/");

				if( appLocation != -1 ) {
					// Get the portal instance name
					var instance = location.pathname.substr(0,appLocation);

					configOptions.sharingurl = "//" + location.host + instance + "/sharing/rest/content/items";
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

			// Proxy rules
			if ( APPCFG.PROXY_RULES && APPCFG.PROXY_RULES.length ) {
				$.each(APPCFG.PROXY_RULES, function(i, rule){
					if ( rule && rule.urlPrefix && rule.proxyUrl ) {
						urlUtils.addProxyRule(rule);
					}
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

			// Get portal info and configure the app

			esriRequest({
				url: arcgisUtils.arcgisUrl.split('/sharing/')[0] + "/sharing/portals/self",
				content: {"f": "json"},
				callbackParamName: "callback"
			}).then(lang.hitch(this, function(response){
				var trustedHost;
				if(response.authorizedCrossOriginDomains && response.authorizedCrossOriginDomains.length > 0) {
					for(var i = 0; i < response.authorizedCrossOriginDomains.length; i++) {
						trustedHost = response.authorizedCrossOriginDomains[i];
						// add if trusted host is not null, undefined, or empty string
						if(esri.isDefined(trustedHost) && trustedHost.length > 0) {
							esriConfig.defaults.io.corsEnabledServers.push({
								host: trustedHost,
								withCredentials: true
							});
						}
					}
				}

				// Use geocode service from the portal if none declared in config
				if (!APPCFG.HELPER_SERVICES.geocode.length && response.helperServices) {
					if (response.helperServices.geocode && response.helperServices.geocode.length && response.helperServices.geocode[0].url) {
						$.each(response.helperServices.geocode, function (index, geocoder){
							APPCFG.HELPER_SERVICES.geocode.push(geocoder);
						});
					}
				}

				// Use geometry service from the portal if none declared in config
				var geometryServiceURL;
				if (APPCFG.HELPER_SERVICES.geometry && APPCFG.HELPER_SERVICES.geometry.url) {
					geometryServiceURL = APPCFG.HELPER_SERVICES.geometry.url;
				}
				else if (response.helperServices.geometry && response.helperServices.geometry.url) {
					geometryServiceURL = response.helperServices.geometry.url;
				}
				esriConfig.defaults.geometryService = new GeometryService(geometryServiceURL);

				// Use bing key from the portal if none declared in config
				if( ! APPCFG.BING_MAPS_KEY && response.bingKey ) {
					APPCFG.BING_MAPS_KEY = response.bingKey;
				}

				// Disable feature service creation on Portal that don't have the required capabilities
				//  - looking at supportsSceneServices let us know if the Portal is using an ArcGIS Data Store has a managed DB
				//  - ArcGIS Data Store allow to create scalable Feature Service ; Portal configured against another DB don't support the same Feature Service creation API
				//  - the Feature Service creation API is only supported starting at Portal 10.4 but there is no way to know what version of Portal
				if( response.isPortal && ! response.supportsSceneServices && ! response.supportsHostedServices)
					APPCFG.AUTHORIZED_IMPORT_SOURCE.featureService = false;

				//  Not common, but some systems might be set up as a managed egdb instead of an arcgis data store.  See here for more info:
				//  https://devtopia.esri.com/WebGIS/arcgis-for-server/issues/4741#issuecomment-973189
				if( response.isPortal && !response.hasRelationalArcGISDataStore )
					APPCFG.AUTHORIZED_IMPORT_SOURCE.featureService = false;

				// Disable feature service creation as Portal for ArcGIS 10.2 doesn't support that yet
				//if( response.isPortal && APPCFG && APPCFG.AUTHORIZED_IMPORT_SOURCE )
					//APPCFG.AUTHORIZED_IMPORT_SOURCE.featureService = false;

				// Default basemap
				if ( response.defaultBasemap ) {
					var basemap = lang.clone(response.defaultBasemap);
					delete basemap.id;
					delete basemap.operationalLayers;
					$.each(basemap.baseMapLayers, function(i, layer){
						delete layer.resourceInfo;

						if ( ! layer.id )
							layer.id = "defaultBasemap";
						if ( ! layer.layerType )
							layer.layerType = "ArcGISTiledMapServiceLayer";
						if ( ! layer. opacity )
							layer.opacity = 1;
						if ( layer.visibility === undefined )
							layer.visibility = true;
					});

					app.defaultBasemap = basemap;

					if ( window.location.protocol == "https:" ) {
						if ( app.defaultBasemap && app.defaultBasemap.baseMapLayers && app.defaultBasemap.baseMapLayers.length ) {
							if ( app.defaultBasemap.baseMapLayers[0].url ) {
								app.defaultBasemap.baseMapLayers[0].url = app.defaultBasemap.baseMapLayers[0].url.replace('http://', 'https://');
							}
						}
					}
				}

				app.isPortal = !! response.isPortal;

				// Help URL on Portal for ArcGIS
				if ( app.isPortal && response.helpBase && response.portalHostname ) {
					// APPCFG.HELP_URL_PORTAL contains the page in the help doc
					// response.helpBase contains the path to the home of help
					// response.helpBase should always be relative to the hostname and include the optional portal instance name
					// response.portalHostname also include the portal instance name so we remove it first

					var portalHost = response.portalHostname.split('/')[0];

					APPCFG.HELP_URL_PORTAL = '//' + portalHost + response.helpBase + APPCFG.HELP_URL_PORTAL;
				}

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
			else if ( app.isDirectCreation && isProd() && ! Helper.getPortalUser() ) {
				redirectToSignIn();
			}
			// Direct creation and signed in
			else if ( app.isDirectCreation )
				portalLogin().then(function(){
					loadWebMap(MapTourBuilderHelper.getBlankWebmapJSON());
				});
			else if( Helper.isArcGISHosted() )
				showTemplatePreview();
			else if ( ! isProd() )
				initError("invalidConfigNoAppDev");
			else
				initError("invalidConfigNoWebmap");
		}

		function loadWebMappingApp(appId)
		{
			console.log("maptour.core.Core - loadWebMappingApp - appId:", appId);

			var urlParams = Helper.getUrlParams();
			var forceLogin = urlParams.forceLogin !== undefined;

			// Check if app is embedded
			var isEmbed = window.top !== window.self || APPCFG.EMBED || urlParams.embed || urlParams.embed === '';
			if (isEmbed) {
				$('body').addClass('isEmbed');
			}

			app.org = new arcgisPortal.Portal(configOptions.sharingurl.split('/sharing/')[0]);
			app.org.on("load", function(response){
				app.isPortal = !! response.isPortal;
			});

			// Pass cookie onto API to avoid infinite redirects
			IdentityManager.checkSignInStatus(app.org.url+'/sharing/rest/');

			// If app is configured to use OAuth
			if ( configOptions.oAuthAppId ) {
				var info = new ArcGISOAuthInfo({
					appId: configOptions.oAuthAppId,
					popup: false,
					portalUrl: 'https:' + configOptions.sharingurl.split('/sharing/')[0]
				});

				IdentityManager.registerOAuthInfos([info]);

				IdentityManager.checkSignInStatus(info.portalUrl).then(
					function() {
						// User has signed-in using oAuth
						if ( !app.isInBuilderMode )
							portalLogin().then(function() {
								loadWebMappingAppStep2(appId);
							});
						else
							portalLogin().then(function() {
								loadWebMappingAppStep2(appId);
							});
					},
					function() {
						// Not signed-in, redirecting to OAuth sign-in page if builder
						if (!app.isInBuilderMode){
							loadWebMappingAppStep2(appId);
						} else {
							portalLogin().then(function() {
								loadWebMappingAppStep2(appId);
							});
						}
					}
				);
			}
			else {
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
					if(app.data.getAppItem().created > APPCFG.HTML_SANITIZER_DATE){
						var sanitizedValues = app.sanitizer.sanitize(response);
						WebApplicationData.set(sanitizedValues);
					} else{
						WebApplicationData.set(response);
					}

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

				app.userCanEdit = app.data.userIsAppOwner();

				// Prevent app from accessing the cookie in viewer when user is not the owner
				if ( ! app.isInBuilderMode && ! app.userCanEdit ) {
					if( ! document.__defineGetter__ ) {
						Object.defineProperty(document, 'cookie', {
							get: function(){ return ''; },
							set: function(){ return true; }
						});
					}
					else {
						document.__defineGetter__("cookie", function() { return ''; });
						document.__defineSetter__("cookie", function() {} );
					}
				}

				if( configOptions.authorizedOwners && configOptions.authorizedOwners.length > 0 && configOptions.authorizedOwners[0] ) {
					var ownerFound = false;

					if( itemRq.results[0].owner )
						ownerFound = $.inArray(itemRq.results[0].owner, configOptions.authorizedOwners) != -1;

					if ( ! ownerFound && configOptions.authorizedOwners[0] == "*" )
						ownerFound = true;

					if (!ownerFound) {
						initError("invalidConfigOwner");
						return;
					}
				}

				// App proxies
				if (itemRq.results[0] && itemRq.results[0].appProxies) {
					var layerMixins = array.map(itemRq.results[0].appProxies, function (p) {
						return {
							"url": p.sourceUrl,
							"mixin": {
								"url": p.proxyUrl
							}
						};
					});
					app.data.setAppProxies(layerMixins);
				}

				// If in builder, check that user is app owner or org admin
				if (app.isInBuilderMode && isProd() && !app.userCanEdit) {
					initError("notAuthorized");
					return;
				}

				// Force side-panel for preview/demo
				//WebApplicationData.setLayout("side-panel");
				var webmapId = WebApplicationData.getWebmap() || Helper.getWebmapID(isProd());
				if (webmapId)
					loadWebMap(webmapId);
				// Come back from the redirect below, create a new webmap
				else if (app.isGalleryCreation){
					WebApplicationData.setTitle(app.data.getAppItem().title);
					WebApplicationData.setSubtitle(app.data.getAppItem().description);
					WebApplicationData.setLayout("side-panel");
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
						// If in builder, check that user is user can create/edit item
						if (app.isInBuilderMode && ! app.data.checkUserItemPrivileges()) {
							initError("notAuthorizedBuilder");
							return;
						}

						// Use bing key from the portal if none declared in config
						if( ! APPCFG.BING_MAPS_KEY && app.portal.bingKey ) {
							APPCFG.BING_MAPS_KEY = app.portal.bingKey;
						}

						app.userCanEdit = app.data.userIsAppOwner();

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

			// Fix a Chrome freeze when map have a large initial extent (level 16 and up)
			// Set the zoomDuration to 50ms, set back to default in see MainView.displayApp
			// Using a value of 0ms create tile loading issue for all app life, it
			//  looks like the API would not load all zoom level but resample lower level
			if( has("chrome") ) {
				esriConfig.defaults.map.zoomDuration = 5;
			}

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
					showAttribution: true,
					wrapAround180: false,
					smartNavigation: false
				},
				ignorePopups: true,
				bingMapsKey: APPCFG.BING_MAPS_KEY,
				layerMixins: app.data.getAppProxies()
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

				if ( ! ownerFound && configOptions.authorizedOwners[0] == "*" )
					ownerFound = true;

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
			var title = configOptions.title || WebApplicationData.getTitle() || app.data.getAppItem().title || response.itemInfo.item.title;
			var subtitle = configOptions.subtitle || WebApplicationData.getSubtitle() || response.itemInfo.item.snippet;

			app.data.webAppData && app.data.webAppData.setTitle(title);

			var layout = WebApplicationData.getLayout() || configOptions.layout || (Object.keys(app.data.webAppData.getAllValues()).length == 1 ? "side-panel" : "three-panel") || ( !app.isGalleryCreation && !app.isDirectCreation ? "three-panel" : "side-panel" );
			if( ! WebApplicationData.getLayout() )
				WebApplicationData.setLayout(layout);

			applyUILayout(layout, MapTourHelper.isOnMobileView());

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
					|| isProd() && app.userCanEdit)
					&& ! urlParams.preview,
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

			if( $("body").hasClass("side-panel")) {
				$('.mapCommandHomeBtn').addClass('esri-icon esri-icon-home');
				$('#mainMap_zoom_location div').addClass('esri-icon esri-icon-locate');
				$('.mapCommandHomeBtn').parent().append($("mainMap_container"));
			}

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

			// Update URL for hosted apps so that when shared it will have the proper metadata on social medias
			if ( document.location.pathname.match(/\/apps\/[a-zA-Z]+\/$/)
					&& document.location.search.match(/^\?appid=/)
					&& (! has('ie') || has('ie') >= 10) ) {
				History.replaceState({}, "", "index.html" + document.location.search + document.location.hash);
			}
		}

		function displayApp()
		{
			$("#loadingOverlay, #loadingIndicator, #loadingMessage").fadeOut();

			setTimeout(function(){
				app.isLoading = false;
			}, 50);
		}

		function initError(error, message, noDisplay)
		{
			hideUI();
			cleanLoadingTimeout();
			$("#loadingIndicator, #loadingMessage").hide();

			if( error == "noLayerView" ) {
				loadingIndicator.setMessage(i18n.viewer.errors[error], true);
				return;
			}
			//else if ( error != "initMobile" )
				//loadingIndicator.forceHide();

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

		function applyUILayout(layout, isMobile)
		{
			if(!layout && app.isLoading && app.isGalleryCreation) {
				layout = "side-panel";
			}

			if(app.isInBuilderMode && app.data.sourceIsFS() && layout != "side-panel"){
				$(".editPictureButtons .modernBrowserWay a").width("120px");
				$(".editPictureButtons .modernBrowserWay a").css("margin-top", 0);
				$(".editPictureButtons .modernBrowserWay a").css("opacity", 1);
				$(".editPictureButtons .modernBrowserWay .btn-picture").height("auto");
				$(".editPictureButtons .modernBrowserWay .btn-thumbnail").height("auto");
				$(".editPictureButtons .modernBrowserWay").show();
			}
			if(layout == "integrated"){
				$("body").removeClass("side-panel");
				$(".member-image img").css("opacity", "1");
				$(".member-image").css("background-image", "none");
				$("body").removeClass("mobile-layout-scroll");
				$("body").addClass("modern-layout");
				$("#contentPanel").append($("#mapPanel"));
				$("#cfader").append($("#placardContainer"));
				$("#picturePanel").css('right', '4px');
				$("#picturePanel").css('left', 'auto');
				$(".rightArea").append($(".logo"));
				$(".textArea").css("padding-left", "25px");
				$("#basemapChooser .dijitTitlePaneTextNode").html(i18n.viewer.builderJS.switchBM);
				$(".dijitTitlePaneTextNode").removeClass('fa fa-2x fa-th-large');
				$("#headerDesktop .text_edit_icon").removeClass("pencilIconDiv");
				$('.member-image.current').after($('.btn-fullscreen'));
				$('.mapCommandHomeBtn').parent().append($("mainMap_zoom_slider"));
				$('.mapCommandHomeBtn').removeClass("sidePanelHome");
				$('.mapCommandHomeBtn').removeClass('esri-icon esri-icon-home');
				$('#mainMap_zoom_location div').removeClass('esri-icon esri-icon-locate');
				$("#mainMap_zoom_location img").show();
				$(".builderImageTarget").hide();
				$("#leftPanel").height(0);
			}else if(layout == "side-panel" && !isMobile){
				$("body").removeClass("modern-layout");
				$("body").removeClass("mobile-layout-scroll");
				$("body").addClass("side-panel");
				if( 'objectFit' in document.documentElement.style === false )
					$(".side-panel .member-image.current").css("background-image", "url(" + $(".side-panel .member-image.current img").attr('src') + ")");
				$("#headerDesktop").prepend($(".logo"));
				$("#placardContainer").css({top:0});
				$("#placardContainer").css({bottom:0});
				$("#placardContainer").css({left:0});
				$("#picturePanel").width($("body").width() * (2/3));
				$("#picturePanel").css('left', $("#leftPanel").width());
				$("#contentPanel").prepend($(".btn-fullscreen"));
				$(".dijitTitlePaneTextNode").empty();
				$(".dijitTitlePaneTextNode").addClass('fa fa-2x fa-th-large');
				$("#headerDesktop .text_edit_icon").addClass("pencilIconDiv");
				$("#arrowPrev").appendTo($("#placard-bg"));
				$("#arrowNext").appendTo($("#placard-bg"));
				$("#arrowPrev").attr("src","resources/icons/picturepanel-left-grey-crushed.png");
				$("#arrowNext").attr("src","resources/icons/picturepanel-right-grey-crushed.png");
				$("#placard-bg").css("max-height", "none");
				$(".member-image.current").css('left', 0);
				$('.mapCommandHomeBtn').addClass('esri-icon esri-icon-home');
				$('#mainMap_zoom_location div').addClass('esri-icon esri-icon-locate');
				$("#mainMap_zoom_location img").hide();
				$('.mapCommandHomeBtn').parent().append($("mainMap_container"));
				$("#placardContainer").removeClass("placardUnder");
				$(".textArea").css("padding-left", "0px");
				if( $('.logo img').css("display") == "block" || $('.logo img').css("display") == "inline" ) {
					setTimeout(function(){
						$(".textArea").css("left", $('.logo img').width() + 12);
					}, 0);
				} else {
					setTimeout(function(){
						$(".textArea").css("left", $('.logo').width() + 12);
					}, 0);
				}
				$("#leftPanel").append($("#mapPanel"));
				$("#leftPanel").append($("#placardContainer"));
				if( app.isInBuilderMode && app.data.sourceIsFS() && layout == "side-panel" ) {
					$(".file-input-name").hide();
					$(".builderImageTarget .file-input-wrapper").height($(".builderImageTarget").height());
					$(".builderImageTarget .file-input-wrapper").width($(".builderImageTarget").width());
					$(".builderImageTarget .file-input-wrapper").css("margin-top", "-30px");
					$(".builderImageTarget .file-input-wrapper").css("opacity", 0);
				}

				//$(".esriSimpleSliderDecrementButton span").text('');
				//$(".esriSimpleSliderDecrementButton span").addClass("esri-icon esri-icon-minus")
				//handleWindowResize();
			}else if(layout == "side-panel" && isMobile){
				// Switch to Mobile Scroll Layout
				$("body").removeClass("modern-layout");
				$("body").addClass("side-panel");
				$(".member-image img").css("opacity", "1");
				$(".member-image").css("background-image", "none");
				$("body").addClass("mobile-layout-scroll");
				$("#mobile-scroll-story-contenthand").before($("#mapPanel"));
				$("#cfader").append($("#placardContainer"));
				$("#picturePanel").prepend($("#arrowPrev"));
				$("#picturePanel").css('left', 0);
				$("#picturePanel").append($(".btn-fullscreen"));
				$("#arrowPrev").css("position", "absolute");
				$("#picturePanel").append($("#arrowNext"));
				$(".rightArea").append($(".logo"));
				$("#basemapChooser .dijitTitlePaneTextNode").html(i18n.viewer.builderJS.switchBM);
				$(".dijitTitlePaneTextNode").removeClass('fa fa-2x fa-th-large');
				$("#headerDesktop .text_edit_icon").removeClass("pencilIconDiv");
				$('.mapCommandHomeBtn').addClass('esri-icon esri-icon-home');
				$("#mainMap_zoom_location img").hide();
				$('#mainMap_zoom_location div').addClass('esri-icon esri-icon-locate');
				$('.mapCommandHomeBtn').parent().append($("mainMap_container"));
				$("#leftPanel").height("35%");
				$("#leftPanel").width($("body").width() * (1/3));
			}else{
				$("body").removeClass("modern-layout");
				$("body").removeClass("side-panel");
				$(".member-image img").css("opacity", "1");
				$(".member-image").css("background-image", "none");
				$("body").removeClass("mobile-layout-scroll");
				$("#contentPanel").append($("#mapPanel"));
				$("#cfader").append($("#placardContainer"));
				$("#picturePanel").prepend($("#arrowPrev"));
				$("#picturePanel").css('left', 0);
				$('.member-image.current').after($('.btn-fullscreen'));
				$("#arrowPrev").css("position", "absolute");
				$("#arrowPrev").attr("src","resources/icons/picturepanel-left.png");
				$("#arrowNext").attr("src","resources/icons/picturepanel-right.png");
				$("#picturePanel").append($("#arrowNext"));
				$(".rightArea").append($(".logo"));
				$(".textArea").css("padding-left", "25px");
				$("#basemapChooser .dijitTitlePaneTextNode").html(i18n.viewer.builderJS.switchBM);
				$(".dijitTitlePaneTextNode").removeClass('fa fa-2x fa-th-large');
				$("#headerDesktop .text_edit_icon").removeClass("pencilIconDiv");
				$('.mapCommandHomeBtn').parent().append($("mainMap_zoom_slider"));
				$('.mapCommandHomeBtn').removeClass("sidePanelHome");
				$('.mapCommandHomeBtn').removeClass('esri-icon esri-icon-home');
				$('#mainMap_zoom_location div').removeClass('esri-icon esri-icon-locate');
				$("#mainMap_zoom_location img").show();
				$(".builderImageTarget").hide();
				$("#leftPanel").height(0);
				$("#leftPanel").width($("body").width() * (1/3));
			}

			if(app.isInBuilderMode)
			{
				if( ! app.data.sourceIsNotFSAttachments()) {
					if( Helper.browserSupportAttachementUsingFileReader() ){
						$(".editPictureButtons .modernBrowserWay", $("#picturePanel")).show();
						$(".editPictureButtons .attributesWay", $("#picturePanel")).hide();
					}else{
						$(".editPictureButtons .oldBrowserWay", $("#picturePanel")).show();
						$(".editPictureButtons .attributesWay", $("#picturePanel")).hide();
					}
				}
				else{
					$(".editPictureButtons .attributesWay", $("#picturePanel")).show();
					$(".editPictureButtons .modernBrowserWay", $("#picturePanel")).hide();
					$(".editPictureButtons .oldBrowserWay", $("#picturePanel")).hide();
				}
			}
			if(!app.isLoading) {
				//_mainView.updateRenderer();
			}

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

			// Mobile scroll layout needs to be applied only on with side-panel desktop
			if ((!isMobileView && $("body").hasClass("mobile-layout-scroll"))
				|| (isMobileView && $("body").hasClass("side-panel"))
			) {
				applyUILayout(WebApplicationData.getLayout() || configOptions.layout, isMobileView);
			}

			var widthViewport = $("body").width();
			var heightViewport = $("body").height();
			var heightHeader = $("#header").height();
			var heightFooter = $("#footer").height();
			var heightMiddle = heightViewport - (heightHeader + heightFooter /*+ (!$("body").hasClass("side-panel") && app.embedBar && app.embedBar.initiated ? 26 : 0)*/);

			app.header.resize(widthViewport);

			_mainView.resize({
				isMobileView: isMobileView,
				isOnMobileMapView: isOnMobileMapView,
				width: widthViewport,
				height: heightMiddle
			});

			if( ! app.initScreenIsOpen ) {
				$("#contentPanel").height($('body').hasClass('mobile-view') && $('body').hasClass('mobile-layout-scroll') ? '100%' : heightMiddle + (isMobileView ? 0 : MapTourHelper.isModernLayout() ? heightFooter : 0));
			}
			if(app.embedBar && app.embedBar.initiated){
				$("#contentPanel").height($("#contentPanel").height() - 26);
			}
			$("#contentPanel").width(widthViewport);

			if(!app.isInBuilderMode)
				$("#placard .description").css("overflow-y", "auto");

			// Force a browser reflow by reading #picturePanel width
			// Using the value computed in desktopPicturePanel.resize doesn't works
			if( $("body").hasClass("side-panel") ) {
				if( $('.logo img').css("display") == "block" || $('.logo img').css("display") == "inline" ) {
					setTimeout(function() {
						$(".textArea").css("left", $('.logo img').width() + 12);
					}, 0);
				} else {
					setTimeout(function() {
						$(".textArea").css("left", $('.logo').width() + 12);
					}, 0);
				}
				if ($("body").hasClass("mobile-layout-scroll")) {
					$("#leftPanel").width('100%');
					$("#mapPanel").width('100%');
				} else if ($("body").hasClass("builder-mode")) {
					if((widthViewport - 60) * (1/3) > 500) {
						$("#leftPanel").width((widthViewport - 60) * (1/3));
						$("#mapPanel").width((widthViewport - 60) * (1/3));
						$("#placardContainer").width((widthViewport - 60) * (1/3));
						$("#placard").css("max-width", (widthViewport - 60) * (1/3));
						$("#picturePanel").width((widthViewport - 60) * (2/3));
						$("#picturePanel").css('left', $("#leftPanel").width() + 60);
					} else {
						$("#leftPanel").width(500);
						$("#mapPanel").width(500);
						$("#placardContainer").width(500);
						$("#placard").css("max-width", "500px");
						$("#picturePanel").width($("body").width() - 560);
					}
					if( app.data.hasIntroRecord() ) {
						$("#arrowPrev").css("top", "60px");
						$("#arrowNext").css("top", "60px");
					}
				} else {
					if((widthViewport) * (1/3) <= 400) {
						$("#leftPanel").width(400);
						$("#mapPanel").width(400);
						$("#placardContainer").width(400);
						$("#picturePanel").width( widthViewport - 400);
					} else {
						$("#leftPanel").width( widthViewport * (1/3));
						$("#mapPanel").width( widthViewport * (1/3));
						$("#placardContainer").width( widthViewport * (1/3));
						$("#picturePanel").width( widthViewport * (2/3));
					}
					$("#picturePanel").css('left', $("#leftPanel").width());
					$("#arrowPrev").css("top", "20px");
					$("#arrowNext").css("top", "20px");
				}
				if( app.data.hasIntroRecord() && !$("body").hasClass("builder-mode"))
					$("#splashText").css("max-height", $(window).height() - 375 - (0.1 * $(window).height()));
			} else {
				$("#mapPanel").width( widthViewport - $("#picturePanel").width() );
				$("#placard").css("max-width", "none");
			}

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

			$("#loadingIndicator").show();
			loadingIndicator.setMessage(i18n.viewer.loading.step2);
			startLoadingTimeout();

			handleWindowResize();
		}

		function showTemplatePreview()
		{
			window.location = app.isPortal && APPCFG.HELP_URL_PORTAL ? APPCFG.HELP_URL_PORTAL : APPCFG.HELP_URL;
		}

		function redirectToSignIn()
		{
			loadingIndicator.setMessage(i18n.viewer.loading.redirectSignIn + "<br />" + i18n.viewer.loading.redirectSignIn2);
			setTimeout(function(){
				window.location = arcgisUtils.arcgisUrl.split('/sharing/rest/')[0]
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

			$("#loadingIndicator, #loadingMessage").hide();
			loadingIndicator.setMessage(i18n.viewer.loading.fail + '<br /><button type="button" class="btn btn-medium btn-info" style="margin-top: 5px;" onclick="document.location.reload()">' + i18n.viewer.loading.failButton + '</button>', true);
			app.map && app.map.destroy();
		}

		function initLocalization()
		{
			document.documentElement.lang = kernel.locale;
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
