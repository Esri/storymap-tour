define(["esri/map",
		"esri/arcgis/Portal",
		"esri/arcgis/utils",
		"storymaps/utils/Helper",
		"storymaps/utils/MovableGraphic",
		// Core
		"storymaps/maptour/core/TourData",
		"storymaps/maptour/core/WebApplicationData",
		"storymaps/maptour/core/FeatureServiceManager",
		"storymaps/maptour/core/TourPointAttributes",
		"storymaps/maptour/core/MapTourHelper",
		// Desktop/Mobile UI
		"storymaps/maptour/ui/Header",
		"storymaps/maptour/ui/MapCommand",
		// Desktop UI
		"storymaps/ui/multiTips/MultiTips",
		"storymaps/maptour/ui/desktop/Carousel",
		"storymaps/maptour/ui/desktop/PicturePanel",
		// Mobile UI
		"storymaps/maptour/ui/mobile/IntroView",
		"storymaps/maptour/ui/mobile/ListView",
		"storymaps/maptour/ui/mobile/InfoView",
		"storymaps/maptour/ui/mobile/Carousel",
		"dojo/has"],
	function(Map,
				Portal,
				Utils,
				Helper,
				MovableGraphic,
				TourData,
				WebApplicationData,
				FeatureServiceManager,
				TourPointAttributes,
				MapTourHelper,
				Header,
				MapCommand,
				MultiTips,
				DesktopCarousel,
				PicturePanel,
				IntroView,
				ListView,
				InfoView,
				MobileCarousel,
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

		//
		// Initialization
		//

		function init(builder)
		{
			console.log("maptour.core.Core - init");

			initLocalization();
			
			var isInBuilderMode = builder != null && Helper.getAppID(isProd());

			if( ! checkConfigFileIsOK() ) {
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
				isFirstUserAction: false,
				mapTips: null,
				// Builder
				builder: builder,
				isInBuilderMode: isInBuilderMode,
				builderMovableGraphic: null,
				isCreatingFS: false,
				// Common UI
				mapCommand: null,
				header: new Header("#header", isInBuilderMode),
				// Desktop UI
				desktopCarousel: new DesktopCarousel("#footerDesktop .carousel", isInBuilderMode),
				desktopPicturePanel: new PicturePanel("#picturePanel", isInBuilderMode),
				// Mobile UI
				mobileIntroView: new IntroView("#introPanel"), 
				mobileListView: new ListView("#listPanel"),
				mobileInfoView: new InfoView("#infoCarousel"),
				mobileCarousel: new MobileCarousel("#footerMobile", isInBuilderMode),
				// Config
				config: {
					thumbnailMaxWidth: 140,
					thumbnailMaxHeight: 93,
					picRecommendedWidth: 1090,
					picRecommendedHeight: 725
				},
				loadingTimeout: null,
				filterMouseHoverEvent: false
			};
			
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
			
			// Disable CORS IE 10
			/*
			 if( has("ie") == 10 ) {
				esriConfig.defaults.io.corsEnabledServers = [];
				esriConfig.defaults.io.corsDetection = false;
			}
			*/
			
			// Disallow builder on IE10/Windows 7 because it fails at CORS request that use POST
			// User should force render mode to IE9 manually as Windows 8 tablet doesn't support IE9 meta rendering
			// For specific project, that meta can be used after the viewport meta
			// <meta http-equiv="x-ua-compatible" content="IE=9" >
			if (app.isInBuilderMode && has("ie") == 10 && navigator.userAgent.match('Windows NT 6.1')) {
				initError("ie10Win7Explain");
				return;
			}
			
			// Do not allow builder under IE 9
			if(app.isInBuilderMode && has("ie") && has("ie") < 9) {
				initError("noBuilderIE8");
				return;
			}
			
			// Url parameters handling
			var urlParams = esri.urlToObject(document.location.search).query || {};
			configOptions.sourceLayerTitle = (urlParams.sourceLayerTitle ? unescape(urlParams.sourceLayerTitle) : null) || configOptions.sourceLayerTitle;
			configOptions.firstRecordAsIntro = urlParams.firstRecordAsIntro
													? (urlParams.firstRecordAsIntro == "true" ? true : false)
													: configOptions.firstRecordAsIntro;
			configOptions.zoomLevel = urlParams.zoomLevel || configOptions.zoomLevel;
			
			// Set a variable timeout deping on the application mode
			if( isInBuilderMode )
				esri.config.defaults.io.timeout = APPCFG.TIMEOUT_BUILDER_REQUEST;
			else
				esri.config.defaults.io.timeout = APPCFG.TIMEOUT_VIEWER_REQUEST;

			addMapTourBusinessToEsriGraphic();
			
			// Global handler for not found image 
			window.mediaNotFoundHandler = function(that){
				that.src = MapTourHelper.getNotFoundMedia();
				// Avoid infinite loop if something is wront with the not found image
				that.onerror = '';
			};

			// Run the app when jQuery is ready
			$(document).ready( dojo.hitch(this, initStep2) );
		}

		function initStep2()
		{
			console.log("maptour.core.Core - initStep2");
					
			// Initialize localization
			app.header.initLocalization();
			app.desktopPicturePanel.initLocalization();

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
			//  OR production and there is a cookie -> sign in the user by reusing the cookie
			//  OR production, builder and no esri cookie -> shoud always redirect to portal login page
			if ( forceLogin || (isProd() && Helper.getPortalUser()) || (isProd() && app.isInBuilderMode && ! Helper.getPortalUser()) )
				portalLogin().then(
					function() {
						// If in builder, check that we are on an orga and user has the expected privileges
						if( app.isInBuilderMode && ! app.data.userIsOrgaPublisher() )
							initError("notAuthorized");
						else							
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
				},
				error: function(){ }
			});
			
			var appDeferedList = new dojo.DeferredList([itemRq, dataRq]);
			appDeferedList.then(function(){
				if (!dataRq.results || !dataRq.results[0] || !itemRq.results || !itemRq.results[0]) {
					initError("invalidApp");
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
			var portalUrl = configOptions.sharingurl.split('/').slice(0,3).join('/') + '/';
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
				// Workaround the debug limitation
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
					|| isProd() && app.data.userIsAppOwnerOrAdmin() && app.data.userIsOrgaPublisher()),
				WebApplicationData.getHeaderLinkText() == undefined ? APPCFG.HEADER_LINK_TEXT : WebApplicationData.getHeaderLinkText(),
				WebApplicationData.getHeaderLinkURL() == undefined ? APPCFG.HEADER_LINK_URL : WebApplicationData.getHeaderLinkURL()
			);
			document.title = title;

			// Initialize picture panel
			app.desktopPicturePanel.init(appColors[1]);
			dojo.subscribe("PIC_PANEL_PREV", loadPrevPicture);
			dojo.subscribe("PIC_PANEL_NEXT", loadNextPicture);
			
			// If a layer was specified in config
			if( configOptions.sourceLayerTitle ) {
				var webmapLayers = app.data.getWebMapItem() 
									&& app.data.getWebMapItem().itemData
									? app.data.getWebMapItem().itemData.operationalLayers : [];
				
				for (var i = app.map.graphicsLayerIds.length-1; i >= 0; i--) {
					var layerId = app.map.graphicsLayerIds[i];
					var layer = app.map._layers[layerId];

					if( layerId.split('_').length == 3 ) 
						layerId = layerId.split('_').slice(0,2).join('_');	
					
					// Exclude map notes and not point layers
					if( layerId.match(/^mapNotes_/) || layer.geometryType != "esriGeometryPoint" )
						continue;
					
					// Loop through webmap layers to see if title match
					for(var j = 0; j < webmapLayers.length; j++) {
						if( webmapLayers[j].id == layerId && webmapLayers[j].title.toUpperCase() == configOptions.sourceLayerTitle.toUpperCase() ) {
							app.data.setSourceLayer(layer);
							break;
						}
					}
					
					if( app.data.getSourceLayer() )
						break;
				}
			}
			else {
				// Elect the tour point layer - the upper visible point layer exluding map notes 
				for (var i = app.map.graphicsLayerIds.length-1; i >= 0; i--) {
					var layerName = app.map.graphicsLayerIds[i];
					var layer = app.map._layers[layerName];
					// Catch visible FS and webmap embedded point layers
					if( (layer.visible == true || layer.visible == undefined) 
							&& layer.type == "Feature Layer" 
							&& layer.geometryType == "esriGeometryPoint" 
							&& ! layerName.match(/^mapNotes_/) )
					{
						// If it's a webmap layer check that all mandatory fields are present to allow additional decoration layer
						if( ! layer.url && layer.graphics && layer.graphics.length > 0 ) {
							var fields = app.data.electFields(layer.graphics[0].attributes);
							
							if (fields && fields.allWebmapLayerMandatoryFieldsFound()) {
								app.data.setSourceLayer(layer);
								break;
							}
						}
						else {
							app.data.setSourceLayer(layer);
							break;
						}
					}
				}
			}
			
			// If in builder mode and the layer 
			// - is an FS that doesn't meet requirements, unselect the layer, so FS creation can popup
			// - is an embedded layer -> fail
			if( app.isInBuilderMode ) {
				if( app.data.sourceIsFS() && ! app.data.getSourceLayer().hasAttachments )
					app.data.setSourceLayer(null);
				if (app.data.sourceIsWebmap()) {
					initError("noBuilderWebmapData");
					return;
				}
			}
			
			// FeatureLayer
			if ( app.data.sourceIsFS() ) {
				// Give full editing privileges for hosted FS
				if (app.isInBuilderMode) {
					app.data.getSourceLayer().setUserIsAdmin(true);
					if( ! app.data.getSourceLayer().credential )
						app.data.getSourceLayer()._forceIdentity(function(){});
				}
				
				var layerLoaded = function() {
					loadingIndicator.setMessage(i18n.viewer.loading.step3);
					
					var FSManager = new FeatureServiceManager();
					dojo.subscribe("FS_MANAGER_LAYER_LOADED", function(tourPoints) {
						// If in builder or preview mode
						if( app.isInBuilderMode || ! Helper.getAppID(isProd()) ) {							
							// Count FS features and warn user if they are not all visible
							// There should always be the same number of feature now that the web map is loaded at full extent
							var queryCount = new esri.tasks.Query();
							queryCount.where = "1=1";
							app.data.getSourceLayer().queryCount(
								queryCount,
								function(nbFeature) {
									if( app.data.getSourceLayer().graphics.length != nbFeature ) {
										var webmapEditUrl = Helper.getWebmapViewerLinkFromSharingURL() + '?webmap=' + app.data.getWebMapItem().item.id;
										var popoverContent = app.data.getSourceLayer().graphics.length != 0 ? i18n.viewer.builderJS.dataWarningExtent : i18n.viewer.builderJS.dataWarningVisibi.replace('%MAPSIZE%', APPCFG.MINIMUM_MAP_WIDTH + 'px');
										
										if( app.isInBuilderMode )
											app.builder.setDataWarning(popoverContent, webmapEditUrl);
									}

									tourPointLayerLoaded(tourPoints);
								},
								// If the request fail, assume it's ok
								function() {
									tourPointLayerLoaded(tourPoints);
								}
							); 
						}
						else
							tourPointLayerLoaded(tourPoints);
					});

					FSManager.process(app.data.getSourceLayer(), app.data.isFSWithURLFields());
				};
				
				if( has("ie") > 0 && has("ie") < 9 )
					setTimeout(layerLoaded, 1000);
				else {
					var handle = dojo.connect(app.map, 'onUpdateEnd', function(){
						dojo.disconnect(handle);
						layerLoaded();
					});
				}
			}
			// Webmap layer (shp, csv)
			else if( app.data.sourceIsWebmap() ) {
				loadingIndicator.setMessage(i18n.viewer.loading.step3);
				
				var graphics = [];
				$(app.data.getSourceLayer().graphics).each(function(i, graphic) {
					graphics.push(new esri.Graphic(
						new esri.geometry.Point(graphic.geometry.x, graphic.geometry.y, graphic.geometry.spatialReference),
						null,
						new TourPointAttributes(graphic, null, null, true)
					));
				});

				tourPointLayerLoaded({ graphics: graphics });
			}
			// No data and in builder mode -> open the FS creation popup 
			else if( app.isInBuilderMode ) {
				if( isProd() )
					initDataPopup();
				else
					portalLogin().then(initDataPopup, function(){ 
						initError("noLayerNoHostedFS");
					});
			}
			// No data in view mode
			else if( Helper.getAppID(isProd()) ) {
				initError("noLayerView");
			}
			// No data in preview mode (should not happen)
			else {
				initError("noLayer");
			}
		}
		
		function initDataPopup()
		{
			// Check that we are on an orga and user has the privileges to create service
			if( ! app.data.userIsOrgaPublisher() ) {
				if( app.data.sourceIsFS() )
					initError("noLayerNoHostedFS");
				else
					initError("noBuilderWebmapData");
				return;
			}
			
			cleanLoadingTimeout();
			app.isCreatingFS = true;
			initError("noLayerMobile", null, true);
			handleWindowResize();
			
			var resultDeferred = app.builder.presentDataPopup(app.portal, app.data.getWebMapItem());
			resultDeferred.then(
				function()
				{
					app.isCreatingFS = false;
					prepareAppForWebmapReload();
					loadWebMap(app.data.getWebMapItem().item.id);
				},
				function()
				{
					replaceInitErrorMessage("noLayerView");
					$("#loadingOverlay").css("top", "0px");
					$("#header").css("display", "inherit");
					$("#fatalError").css("display", "block");
					
					app.isCreatingFS = false;
					handleWindowResize();
				}
			);
		}

		function tourPointLayerLoaded(result)
		{
			console.log("maptour.core.Core - tourPointLayerLoaded");
			
			// Resize the app to be able to set the correct map extent
			handleWindowResize();
			
			// Set Map extent to the map initial extent	
			setMapExtent(Helper.getWebMapExtentFromItem(app.data.getWebMapItem().item)).then(function()
			{
				// If the first record is an introduction 
				if( configOptions.firstRecordAsIntro && result.graphics.length > 1 ) {
					app.data.setIntroData(result.graphics[0]);
					app.data.setTourPoints(result.graphics.slice(1, APPCFG.MAX_ALLOWED_POINTS + 1));
					app.data.setCurrentPointByIndex(null);
				}
				else {
					app.data.setTourPoints(result.graphics.slice(0, APPCFG.MAX_ALLOWED_POINTS));
					app.data.setCurrentPointByIndex(result.graphics.length ? 0 : -1);
				}
				
				if( result.graphics.length >= APPCFG.MAX_ALLOWED_POINTS )
					app.data.setMaxAllowedFeatureReached(true);
	
				var tourPoints = app.data.getTourPoints();
	
				// Create a graphics layer for Map Tour data
				var tourLayer = new esri.layers.GraphicsLayer({ id: 'mapTourGraphics' });
	
				// Add ALL graphics to the layer (include hiddens that can become visible)
				var allTourPoints = app.data.getTourPoints(true);
				$(allTourPoints).each(function(index, graphic) {
					tourLayer.add(graphic);
				});
				
				// Create a unique value renderer based on the ID field
				var renderer = new esri.renderer.UniqueValueRenderer(null, app.data.getFeatureIDField());
				
				//  Add renderer values
				$(tourPoints).each(function(index, graphic) {
					renderer.addValue({
						value:  graphic.attributes.getID(),
						symbol: MapTourHelper.getSymbol(graphic.attributes.getColor(), index + 1)
					});
				});
	
				// Assign the renderer and add the layer
				tourLayer.setRenderer(renderer);
				app.map.addLayer(tourLayer);
				
				// Save the tour layer
				app.data.setTourLayer(tourLayer);
	
				// Initialize desktop carousel
				var appColors = WebApplicationData.getColors();
				app.desktopCarousel.init(tourPoints, appColors[2], appColors[1]);
				dojo.subscribe("CAROUSEL_CLICK", loadPictureAtIndex);
	
				// Initialize mobile UI on IE > 8
				if (dojo.isIE == undefined || dojo.isIE > 8) {
					app.mobileCarousel.init(tourPoints, appColors[2]);
					dojo.subscribe("CAROUSEL_SWIPE", loadPictureAtIndex);
					app.mobileListView.init(tourPoints, appColors[2]);
					app.mobileInfoView.init(app.data.getTourPoints(), appColors[2]);
					dojo.subscribe("OPEN_MOBILE_INFO", showMobileViewInfo);
					dojo.subscribe("MOBILE_INFO_SWIPE", loadPictureAtIndex);
				}
				
				// Hide the original layer, a new one has been created
				if( app.data.getSourceLayer() )
					app.data.getSourceLayer().setVisibility(false);
	
				// Event handler for graphics
				dojo.connect(tourLayer, "onMouseOver", picLayer_onMouseOver);
				dojo.connect(tourLayer, "onMouseOut", picLayer_onMouseOut);
				dojo.connect(tourLayer, "onClick", picLayer_onClick);
				dojo.connect(app.map, "onClick", handleMapClick);
	
				dojo.subscribe("CORE_UPDATE_UI", updateUI);
				dojo.subscribe("CORE_UPDATE_EXTENT", setMapExtent);
				dojo.subscribe("CORE_SELECTED_TOURPOINT_UPDATE", updateSelectedPointRenderer);
				dojo.subscribe("CORE_PICTURE_CHANGED", selectedPointChange_afterStep2);
				dojo.subscribe("CORE_RESIZE", handleWindowResize);
	
				if(app.map.loaded)
					appInitComplete();
				else
					dojo.connect(app.map, "onLoad", appInitComplete);
			});
		}
		
		function zoomToDeviceLocation(success, geom)
		{
			if( success ) {
				if( app.map.spatialReference.wkid == 102100 )
					geom = esri.geometry.geographicToWebMercator(geom);
				else if ( app.map.spatialReference.wkid != 4326 )
					return;
				
				centerMap(geom);
			}
		}

		function appInitComplete()
		{
			console.log("maptour.core.Core - initMap");
			// Map command buttons
			app.mapCommand = new MapCommand(
				app.map, 
				function(){
					setMapExtent(Helper.getWebMapExtentFromItem(app.data.getWebMapItem().item));
				},
				app.isInBuilderMode ? zoomToDeviceLocation : null
			);
			
			// Display alll graphics layers except the one that is used as the sourceLayer
			$.each(app.map.graphicsLayerIds, function(i, layerName){
				if( layerName != app.data.getSourceLayer().id )
					$("#" + layerName + "_layer").css("visibility", "visible");
			});

			// Load the app with the first point
			if( app.data.getTourPoints().length ) 
				selectedPointChange_after(app.data.getIntroData());

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
				
				prepareMobileViewSwitch();

				if(location.hash == "#list") {
					$("#listViewLink").addClass("current");
					app.mobileListView.show();
				}
				else if (location.hash == "#info") {
					$("#infoViewLink").addClass("current");
					app.mobileInfoView.show();
				}
				else {
				 	$("#mapViewLink").addClass("current");
					showMobileViewMap();
				}
			}
			
			// Hide header after first map interaction
			var firstExtentChange = true;
			var handle1 = dojo.connect(app.map, "onExtentChange", function(extent, delta){
				if( ! firstExtentChange && delta && (delta.x || delta.y) ) {
					app.header.hideMobileBanner();
					dojo.disconnect(handle1);
				}
				else
					firstExtentChange = false;
			});
			
			//  After the initial map extent change, flag that next action will be the first user action
			var handle2 = dojo.connect(app.map, "onExtentChange", function(extent, delta) {
				dojo.disconnect(handle2);
				app.isFirstUserAction = true;
			});
			
			// Make sure that the current marker is displayed in front of others
			dojo.connect(app.map, "onExtentChange", function(extent, delta) {
				var currentPoint = app.data.getCurrentGraphic();
				if( currentPoint ) {
					if (extent.contains(currentPoint.geometry)) {
						try {
							currentPoint.getDojoShape().moveToFront();
						} 
						catch (e) {
						}
					}
				}
			});
			
			// Show settings popup if not found fields mapping
			if ( app.isInBuilderMode && ! app.data.getFieldsConfig().allCriticalFieldsFound() )
				app.builder.openFieldsSettingOnStartup();
				
			if ( app.isInBuilderMode && isOldBrowser() )
				app.builder.showBrowserWarning();
			
			// If there is data, the app is displayed after the first point is loaded
			// See forced call to selectedPointChange_after before
			if( ! app.data.getTourPoints().length )
				selectedPointChange_afterStep2();
		}
		
		function displayApp()
		{
			// If intro record, set enhanced mobile intro
			if ( app.data.getIntroData() && (! has("ie") || has("ie") > 8) ) 
				app.mobileIntroView.init(app.data.getIntroData(), WebApplicationData.getColors()[2]);
			
			// Show the app is the timeout hasn't be fired			
			if( app.loadingTimeout != null ) {
				$("#loadingOverlay").fadeOut();
				loadingIndicator.stop();
			}
			
			cleanLoadingTimeout();
		}

		function initError(error, message, noDisplay)
		{	
			hideUI();
			cleanLoadingTimeout();
			loadingIndicator.stop();
			
			if( error == "noLayerView" ) {
				var optionalButton = app.data.userIsAppOwnerOrAdmin() ? '<br /><button type="button" style="margin-top: 6px" class="btn btn-small btn-info" style="vertical-align: 2px" onclick="app.header.switchToBuilder()">' +  i18n.viewer.desktopHTML.builderButton + '</button>' : '';
				
				loadingIndicator.setMessage(i18n.viewer.errors[error] + optionalButton, true);
				return;
			}
			else
				loadingIndicator.forceHide();

			
			$("#fatalError .error-msg").html(i18n.viewer.errors[error]);
			if( ! noDisplay ) 
				$("#fatalError").show();
		}
		
		function replaceInitErrorMessage(error)
		{
			$("#fatalError .error-msg").html(i18n.viewer.errors[error]);
		}

		/**
		 * Add two new function to esri.graphic that control the state of the tour point
		 */
		function addMapTourBusinessToEsriGraphic()
		{
			/**
			 * Return true if the tour point has been updated between the last save
			 * A tour point has been updated if the geometry or name or descriptiona attributes has changed
			 */
			esri.Graphic.prototype.hasBeenUpdated = function()
			{
				var originalGeom = this.attributes.getOriginalGraphic().geometry;
				return this.attributes.hasBeenUpdated()
						|| this.geometry.x != originalGeom.x
						|| this.geometry.y != originalGeom.y;
			}

			/**
			 * Get the updated feature for commiting to Feature service
			 * Commit change to the original feature and return the original feature
			 */
			esri.Graphic.prototype.getUpdatedFeature = function()
			{
				this.attributes.commitUpdate();

				var originalGeom = this.attributes.getOriginalGraphic().geometry;
				originalGeom.x = this.geometry.x;
				originalGeom.y = this.geometry.y;

				return this.attributes.getOriginalGraphic();
			}

			/**
			 * Restore the attributes and geometry to the data source.
			 * Discard all changes in the app
			 */
			esri.Graphic.prototype.restoreOriginal = function()
			{
				this.attributes.restoreOriginal();

				var originalGeom = this.attributes.getOriginalGraphic().geometry;
				this.geometry.x = originalGeom.x;
				this.geometry.y = originalGeom.y;
			}
		}

		//
		// Map Tour layer events
		//

		function picLayer_onClick(event)
		{
			if( event.graphic != app.data.getCurrentGraphic() ) {
				// IE fire an extra event after the renderer is updated that we need to filter
				app.filterMouseHoverEvent = true;
				
				selectedPointChange_before();
				app.data.setCurrentPointByGraphic(event.graphic);
				selectedPointChange_after();
				
				// IE
				setTimeout(function(){
					app.filterMouseHoverEvent = false;
				}, 500);
			}
			else
				checkPopoverState();
		}

		function picLayer_onMouseOver(event)
		{
			if (Helper.isMobile() || app.filterMouseHoverEvent)
				return;

			app.map.setMapCursor("pointer");

			var graphic = event.graphic;
			var isCurrentGraphic = graphic == app.data.getCurrentGraphic();
			if ( ! isCurrentGraphic )
				updateGraphicIcon(graphic, "hover");
			
			// Show the tooltip if it's not current point or if no black popover is displayed in view mode
			if ( ! isCurrentGraphic || (! app.isInBuilderMode && ! isOnMobileView() && ! $(".multiTip").is(':visible') ) )
				displayHoverTooltip(graphic);
		}

		function picLayer_onMouseOut(event)
		{
			app.map.setMapCursor("default");
			hideHoverTooltip();

			var graphic = event.graphic;
			if (graphic != app.data.getCurrentGraphic())
				updateGraphicIcon(graphic, "normal");
		}
		
		//
		// Tooltip/popover in view mode 
		//
		
		function displayHoverTooltip(graphic)
		{
			var ptScreen = app.map.toScreen(graphic.geometry);
			var x = ptScreen.x;
			var y = ptScreen.y;
			
			$("#hoverInfo").html(graphic.attributes.getName());

			if ( x <= $("#mainMap").width() - 230 )
				$("#hoverInfo").css("left", x + 15);
			else
				$("#hoverInfo").css("left", x - 25 - $("#hoverInfo").width());

			if ( y >= $("#hoverInfo").height() + 50 )
				$("#hoverInfo").css("top", y - 35 - $("#hoverInfo").height());
			else
				$("#hoverInfo").css("top", y - 15 + $("#hoverInfo").height());

			$("#hoverInfo").show();
		}
		
		function hideHoverTooltip()
		{
			$("#hoverInfo").hide();
		}
		
		function checkPopoverState(){
			if ( ! app.isInBuilderMode && ! isOnMobileView() && ! $(".multiTip").is(':visible') ) {
				hideHoverTooltip();
				app.mapTips && app.mapTips.show();
			}
		}

		//
		// Picture change handling
		//

		function selectedPointChange_before()
		{
			updateGraphicIcon(app.data.getCurrentGraphic(), "normal");
			
			// Hide the mobile header if it hasn't been closed once
			if( app.header.mobileHeaderIsInFirstState() )
				app.header.hideMobileBanner();
			
			if( configOptions.firstRecordAsIntro )
				app.mobileIntroView.hide();
				
			if (app.isInBuilderMode) {
				app.desktopPicturePanel.forceSaveEdits();
				
				if (app.builderMoveEvents) 
					app.builderMoveEvents.clean();
			}
		}

		function selectedPointChange_after(forcedRecord)
		{
			console.log("maptour.core.Core - selectedPointChange_after");

			var attributes = forcedRecord ? forcedRecord.attributes : app.data.getCurrentAttributes();

			if( ! attributes ) {
				console.error("selectedPointChange_after - invalid point");
				// To be sure to update picture panel
				handleWindowResize();
				selectedPointChange_afterStep2();
				app.desktopPicturePanel.clean();
				return;
			}
			
			// Update the picture panel
			// Once the image is loaded, selectedPointChange_afterStep2 is called through an event
			app.desktopPicturePanel.updatePicture(
				attributes.getURL(),
				attributes.getName(),
				attributes.getDescription(),
				computePicturePanelButtonStatus());
		}
		
		function selectedPointChange_afterStep2()
		{
			var index = app.data.getCurrentIndex();
			var graphic = app.data.getCurrentGraphic();
			
			// Clean popover
			hideHoverTooltip();
			app.mapTips && app.mapTips.clean();
				
			// Apply the selected zoom level on first user action
			if( app.isFirstUserAction ) {
				app.isFirstUserAction = false;
				var appZoomLevel = parseInt( WebApplicationData.getZoomLevel() != "" && WebApplicationData.getZoomLevel() != undefined ? WebApplicationData.getZoomLevel() : configOptions.zoomLevel);
				
				if ( appZoomLevel !== "" && appZoomLevel != -1 && (""+appZoomLevel != "NaN") && appZoomLevel != app.map.getZoom() ) {
					centerMap(graphic.geometry, appZoomLevel);
					var handle = dojo.connect(app.map, "onExtentChange", function() {
						dojo.disconnect(handle);
						setCurrentGraphicIcon(graphic);
					});
				}
				else 
					setCurrentGraphicIcon(graphic);
			}
			else
				setCurrentGraphicIcon(graphic);
	
			// Update the desktop carousel
			app.desktopCarousel.setSelectedIndex(index);

			// Update the mobile carousel
			app.mobileCarousel.setSelectedPoint(index);
			
			// If it's the first loading, display the app
			if( app.loadingTimeout )
				displayApp();
		}

		function computePicturePanelButtonStatus()
		{
			var index = app.data.getCurrentIndex();
			return {
				left: !! index,
				right: index != app.data.getNbPoints() - 1
			};
		}

		//
		// Picture change through UI element
		//

		function loadPrevPicture()
		{
			var index = app.data.getCurrentIndex();
			if ( ! index )
				return;

			selectedPointChange_before();
			app.data.setCurrentPointByIndex(index - 1);
			selectedPointChange_after();
		}

		function loadNextPicture()
		{
			var index = app.data.getCurrentIndex();

			// Intro record
			if( index == null )
				index = -1;

			if ( index == app.data.getNbPoints() - 1 )
				return;

			selectedPointChange_before();
			app.data.setCurrentPointByIndex(index + 1)
			selectedPointChange_after();
		}

		function loadPictureAtIndex(index)
		{
			if (index != app.data.getCurrentIndex()) {
				selectedPointChange_before();
				app.data.setCurrentPointByIndex(index);
				selectedPointChange_after();
			}
			else {
				var graphic = app.data.getCurrentGraphic();
				if (!visibleMapContains(graphic.geometry)) 
					centerMap(graphic.geometry);
				checkPopoverState();
			}
		}

		//
		// UI
		//
		
		function visibleMapContains(geom)
		{
			var isDesktopModernUI = MapTourHelper.isModernLayout() && ! isOnMobileView();
			if( ! isDesktopModernUI )
				return app.map.extent.contains(geom);
			
			var visibleExtent = new esri.geometry.Extent(
				app.map.extent.xmin,
				app.map.extent.ymin + ((10 + dojo.position(dojo.byId("footer")).h) * app.map.__LOD.resolution),
				app.map.extent.xmin + (dojo.position(dojo.byId("picturePanel")).x * app.map.__LOD.resolution),
				app.map.extent.ymax,
				app.map.extent.spatialReference
			);
			
			/*
			var testLayer = esri.layers.GraphicsLayer();
			testLayer.add(new esri.Graphic(visibleExtent,new esri.symbol.SimpleFillSymbol()))
			app.map.addLayer(testLayer);
			*/
			
			return visibleExtent.contains(geom);
		}
		
		function centerMap(geom, zoomLevel)
		{
			var isDesktopModernUI = MapTourHelper.isModernLayout() && ! isOnMobileView();
			if( ! isDesktopModernUI && ! zoomLevel )			
				app.map.centerAt(geom);
			if( ! isDesktopModernUI && zoomLevel )
				app.map.centerAndZoom(geom, zoomLevel);
			else {
				var offsetX = 20 + dojo.position(dojo.byId("picturePanel")).x / 2;
				var offsetY = 10 + dojo.position(dojo.byId("footer")).h / 2;
				
				if ( ! zoomLevel )
					app.map.centerAt(
						geom.offset(
							offsetX * app.map.__LOD.resolution,
							- offsetY * app.map.__LOD.resolution
						)
					);
				else
					app.map.centerAndZoom(
						geom.offset(
							offsetX * app.map._params.lods[zoomLevel].resolution,
							- offsetY * app.map._params.lods[zoomLevel].resolution
						),
						zoomLevel
					);
			}
		}
		
		function setMapExtent(extent)
		{
			var isDesktopModernUI = MapTourHelper.isModernLayout() && ! isOnMobileView();			
			if( ! isDesktopModernUI )
				return app.map.setExtent(extent, true);
			else {
				var offsetX = 10 + dojo.position(dojo.byId("picturePanel")).w;
				var offsetY = 10 + dojo.position(dojo.byId("footer")).h;
				
				var extentResX = extent.getWidth() / app.map.width;
				var extentResY = extent.getHeight() / app.map.height;
				
				var newExtent = new esri.geometry.Extent({
					xmin: extent.xmin,
					ymin: extent.ymin - extentResY * offsetY,
					xmax: extent.xmax + extentResX * offsetX,
					ymax: extent.ymax,
					spatialReference: extent.spatialReference
				});
				
				/*
				var testLayer = esri.layers.GraphicsLayer();
				testLayer.add(new esri.Graphic(extent,new esri.symbol.SimpleFillSymbol()))
				testLayer.add(new esri.Graphic(newExtent,new esri.symbol.SimpleFillSymbol()))
				app.map.addLayer(testLayer);
				*/
				
				var lods = app.map._params.lods;
				var level = Helper.getFirstLevelWhereExtentFit(newExtent, app.map);
				if( level != -1 ) {
					var newCenter = new esri.geometry.Point(
						extent.getCenter().x + (app.map.width / 2 - (dojo.position(dojo.byId("picturePanel")).x / 2)) * lods[level].resolution,
						extent.getCenter().y - (10 + dojo.position(dojo.byId("footer")).h / 2) * lods[level].resolution,
						extent.spatialReference
					);
					return app.map.centerAndZoom(newCenter, level);
				}
				else
					return app.map.setExtent(newExtent);
			}
		}
		
		function applyUILayout(layout)
		{
			$("body").toggleClass("modern-layout", layout == "integrated");
		}

		/**
		 * Refresh the UI when tour points have changed
		 */
		function updateUI()
		{
			console.log("maptour.core.Core - updateUI");
			var tourPoints = app.data.getTourPoints();
			
			applyUILayout(WebApplicationData.getLayout());
			
			updateRenderer();

			// Update UI components
			var appColors = WebApplicationData.getColors();
			app.desktopCarousel.update(tourPoints, appColors[2], appColors[1]);
			app.mobileCarousel.update(tourPoints, appColors[2]);
			app.mobileListView.update(tourPoints, appColors[2]);
			app.mobileInfoView.update(tourPoints, appColors[2]);
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
			
			app.desktopPicturePanel.update(appColors[1]);
			
			// Set the symbol, update UI component
			selectedPointChange_after();
			
			handleWindowResize();
		}
		
		function updateSelectedPointRenderer(param)
		{
			var graphic = app.data.getCurrentGraphic();
			
			// Only catch color change
			if( param.name != undefined || ! param.color )
				return;
			
			updateRenderer();
			updateGraphicIcon(graphic, "selected");
			moveGraphicToFront(graphic);
		}
		
		function updateRenderer()
		{
			var tourPoints = app.data.getTourPoints();
			var currentId = app.data.getCurrentId();
			var newIndex = -1;
			
			// Update the layer renderer
			var renderer = new esri.renderer.UniqueValueRenderer(null, app.data.getFeatureIDField());
			$(tourPoints).each(function(index, graphic) {
				renderer.addValue({
					value: graphic.attributes.getID(),
					symbol: MapTourHelper.getSymbol(graphic.attributes.getColor(), index + 1)
				});

				if( graphic.attributes.getID() == currentId )
					newIndex = index;
			});
			app.data.getTourLayer().setRenderer(renderer);
			app.map.setExtent(app.map.extent);
			
			// Current point has been removed or something
			if( newIndex == -1 && tourPoints.length > 0 ) 
				newIndex = 0;
			
			// Set the selected point
			app.data.setCurrentPointByIndex(newIndex);
		}

		function setCurrentGraphicIcon(graphic)
		{
			if( ! app.map || ! graphic )
				return;

			updateGraphicIcon(graphic, "selected");
			
			if (app.isInBuilderMode)
				updateBuilderMoveable(graphic);
		}
		
		function updateBuilderMoveable(graphic)
		{
			app.builderMoveEvents && app.builderMoveEvents.clean();
				if ( ! isOnMobileView() ) {
					 app.builderMoveEvents = new MovableGraphic(
					 	app.map, 
						app.data.getTourLayer(), 
						graphic, 
						app.builder.movedPin, 
						app.builder.hidePinPopup
					);
				}
		}

		function updateGraphicIcon(graphic, type)
		{
			if( ! graphic )
				return;

			var symbol = graphic.getLayer().renderer._symbols[graphic.attributes.getID()];
			var iconCfg = APPCFG.ICON_CFG[type];
			if( ! iconCfg )
				return;

			if( type == "selected" )
				setTimeout(function(){moveGraphicToFront(graphic); }, 0);
			else
				app.map.setExtent(app.map.extent);
				
			symbol.setWidth(iconCfg.width).setHeight(iconCfg.height).setOffset(iconCfg.offsetX, iconCfg.offsetY);
		}
		
		/**
		 * Put the graphic to front
		 * @param {Object} graphic
		 */
		function moveGraphicToFront(graphic)
		{
			if (!visibleMapContains(graphic.geometry))
				centerMap(graphic.geometry);
			// Do not center the map if the app is loading (i.e. if the point is in the initial extent it doesn't need to be centered)
			else if ( ! app.loadingTimeout )
				app.map.setExtent(app.map.extent);
			
			var handle = dojo.connect(app.map, "onExtentChange", function() {
				dojo.disconnect(handle);

				try {
					graphic.getDojoShape().moveToFront();
				}
				catch (e) { }
				
				// Create the popover
				if( app.isInBuilderMode )
					app.builder.createPinPopup(graphic, app.data.getCurrentIndex(), ! isOnMobileView());
				else 
					app.mapTips = new MultiTips({
						map: app.map,
						content: graphic.attributes.getName(),
						pointArray: [graphic],
						labelDirection: "auto",
						backgroundColor: "#444444",
						pointerColor: "#444444",
						textColor: "#ffffff",
						offsetTop: 32,
						topLeftNotAuthorizedArea: has('touch') ? [40, 180] : [30, 150],
						mapAuthorizedWidth: MapTourHelper.isModernLayout() ? dojo.query("#picturePanel").position()[0].x : -1,
						mapAuthorizedHeight: MapTourHelper.isModernLayout() ? dojo.query("#footerDesktop").position()[0].y - dojo.query("#header").position()[0].h : -1,
						visible: ! isOnMobileView()
					});					
			});
		}
		
		function handleMapClick(e)
		{
			// Hide tooltip after click on the map in view mode
			if( ! e.graphic && ! app.isInBuilderMode )
				app.mapTips.hide();
		}

		function handleWindowResize()
		{
			var currentIndex = app.data.getCurrentIndex();
			var currentGraphic = app.data.getCurrentGraphic();
			var isMobileView = isOnMobileView();
			var isOnMobileMapView = $("#mapViewLink").hasClass("current");

			// Feature Service creation
			if (app.isCreatingFS) {
				// Display the fatal error dialog box on mobile or the data popup on desktop
				$("#loadingOverlay").css("top", isMobileView ? "0px" : $("#header").height());
				$("#header").css("display", isMobileView ? "none" : "block");
				$("#fatalError").css("display", isMobileView ? "block": "none");
			}
			
			if( isMobileView )
				$("body").addClass("mobile-view");
			else
				$("body").removeClass("mobile-view");

			if (isMobileView && isOnMobileMapView)
				$("#footerMobile").show();
			else
				$("#footerMobile").hide();

			var widthViewport = $("body").width();
			var heightViewport = $("body").height();
			var heightHeader = $("#header").height();
			var heightFooter = $("#footer").height();
			var heightMiddle = heightViewport - (heightHeader + heightFooter);
			
			// Header
			$("#headerDesktop .textArea").width(widthViewport - $("#headerDesktop .rightArea").outerWidth() - 35);

			$("#contentPanel").height(heightMiddle + (isMobileView ? 0 : MapTourHelper.isModernLayout() ? heightFooter : 0));
			$("#contentPanel").width(widthViewport);

			app.desktopPicturePanel.resize(widthViewport - APPCFG.MINIMUM_MAP_WIDTH, heightMiddle);
			app.desktopCarousel.resize();
			
			// Force a browser reflow by reading #picturePanel width 
			// Using the value computed in desktopPicturePanel.resize doesn't works
			$("#mapPanel").width( widthViewport - $("#picturePanel").width() );
			
			// Take care of builder panels
			if (app.isInBuilderMode) {
				// Top panel - Assign to all td the maximum width of the first or second columns 
				var buttonWidth = Math.max($("#builderPanel > div > button").eq(0).width(), $("#builderPanel > div > button").eq(1).width());
				$("#builderPanel > div > button").eq(0).width(buttonWidth);
				$("#builderPanel > div > button").eq(1).width(buttonWidth);
						
				// Top panel - reposition
				$("#builderPanel").css("margin-left", $("body").width() / 2 - $("#builderPanel").width() / 2 - 18);
				
				// Bottom panel - button size and reposition
				if ($("#organizeSlidesButton").width() > 0) {
					$("#builderPanel2 button").width($("#organizeSlidesButton").width() > $("#addPopupButton").width() ? $("#organizeSlidesButton").width() : $("#addPopupButton").width());
					$("#builderPanel2").css("margin-left", $("body").width() / 2 - $("#builderPanel2").outerWidth() / 2);
				}
			}
			
			if (app.isInBuilderMode && currentGraphic) {
				updateBuilderMoveable(currentGraphic);
				
				if (isMobileView)
					app.mapTips && app.builder.hidePinPopup();
				else 
					app.mapTips && app.mapTips.show();
			}
			
			if (isMobileView)
				app.mapTips && app.mapTips.hide();
			else
				app.mapTips && app.mapTips.show();

			if (! isMobileView)
				app.desktopCarousel.checkItemIsVisible(currentIndex);
				
			if (app.map && (! isMobileView || (isMobileView && isOnMobileMapView)))
				app.map.resize(true);
			
			// Change esri logo size
			if( isMobileView )
				$("#mainMap .esriControlsBR > div").first().removeClass("logo-med").addClass("logo-sm");
			else
				$("#mainMap .esriControlsBR > div").first().removeClass("logo-sm").addClass("logo-med");
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

		function isOnMobileView()
		{
			return $("#headerMobile").css("display") == "block";
		}

		function prepareMobileViewSwitch()
		{
			$(".mobileView").hide();
			$("#footerMobile").hide();
			$(".navBar span").removeClass("current");
			app.header.hideMobileBanner();
			
			// If exiting from intro screen
			if( app.data.getCurrentIndex() == null )
				loadPictureAtIndex(0);
		}

		function showMobileViewMap()
		{
			$("#contentPanel").show();
			$("#footerMobile").show();
			$("#mapPanel").show();
			
			app.mobileCarousel.setSelectedPoint(app.data.getCurrentIndex());
			handleWindowResize();
		}

		function showMobileViewInfo(tourPointIndex)
		{
			if( tourPointIndex != null)
				loadPictureAtIndex(tourPointIndex);

			location.hash = "#info";
		}
		
		//
		// Misc
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
			if( esri.id && esri.id.dialog && esri.id.dialog._alreadyInitialized && ! esri.id.mapTourTimeoutAlreadyFired) {
				clearTimeout(app.loadingTimeout);
				startLoadingTimeout();
				// Set a flag only if the dialog isn't showned now, so next timeout will fail
				if( ! esri.id._busy ) 
					esri.id.mapTourTimeoutAlreadyFired = true;
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
		
		function isOldBrowser()
		{
			return ! Helper.browserSupportAttachementUsingFileReader();
		}
		
		function checkConfigFileIsOK()
		{
			return APPCFG
				&& APPCFG.COLORS && APPCFG.COLORS.length == 3
				&& APPCFG.COLOR_SCHEMES
				&& APPCFG.DEFAULT_SHARING_URL 
				&& APPCFG.MINIMUM_MAP_WIDTH 
				&& APPCFG.TIMEOUT_VIEWER_LOAD
				&& APPCFG.TIMEOUT_VIEWER_REQUEST
				&& APPCFG.TIMEOUT_BUILDER_REQUEST
				&& APPCFG.MAX_ALLOWED_POINTS
				&& APPCFG.PIN_CFG 
				&& APPCFG.PIN_DEFAULT_CFG
				&& APPCFG.PIN_CFG[APPCFG.PIN_DEFAULT_CFG]
				&& APPCFG.ICON_CFG 
				&& APPCFG.HEADER_LOGO_URL != undefined 
				&& APPCFG.HEADER_LOGO_TARGET != undefined
				&& APPCFG.HEADER_LINK_TEXT != undefined
				&& APPCFG.HEADER_LINK_URL != undefined
				&& APPCFG.FIELDS_CANDIDATE
				&& APPCFG.CORS_SERVER;
		}

		return {
			init: init,
			isProd: isProd
		};
	}
);