define(["storymaps/maptour/core/WebApplicationData",
		"storymaps/maptour/core/TourPointAttributes",
		"storymaps/maptour/core/FeatureServiceManager",
		"storymaps/maptour/core/MapTourHelper",
		// Desktop UI
		"storymaps/ui/multiTips/MultiTips",
		"storymaps/maptour/ui/desktop/Carousel",
		"storymaps/maptour/ui/desktop/PicturePanel",
		// Mobile UI
		"storymaps/maptour/ui/mobile/IntroView",
		"storymaps/maptour/ui/mobile/ListView",
		"storymaps/maptour/ui/mobile/InfoView",
		"storymaps/maptour/ui/mobile/Carousel",
		"storymaps/utils/Helper",
		"dojo/has"], 
	function (
		WebApplicationData, 
		TourPointAttributes,
		FeatureServiceManager, 
		MapTourHelper,
		MultiTips,
		DesktopCarousel,
		PicturePanel,
		IntroView,
		ListView,
		InfoView,
		MobileCarousel, 
		Helper, 
		has)
	{
		return function MainView() 
		{
			var _core = null;
			var _this = this;
			
			this.init = function(core) 
			{			
				_core = core;
				
				/*
				 // Disable CORS on IE 10
				 if( has("ie") == 10 ) {
					esriConfig.defaults.io.corsEnabledServers = [];
					esriConfig.defaults.io.corsDetection = false;
				}
				*/
				
				// Do not allow builder under IE 9
				if(app.isInBuilderMode && has("ie") && has("ie") < 9) {
					_core.initError("noBuilderIE8");
					return false;
				}
				
				// Url parameters handling
				var urlParams = esri.urlToObject(document.location.search).query || {};
				configOptions.sourceLayerTitle = (urlParams.sourceLayerTitle ? unescape(urlParams.sourceLayerTitle) : null) || configOptions.sourceLayerTitle;
				configOptions.firstRecordAsIntro = urlParams.firstRecordAsIntro
														? (urlParams.firstRecordAsIntro == "true" ? true : false)
														: configOptions.firstRecordAsIntro;
				configOptions.zoomLevel = urlParams.zoomLevel || configOptions.zoomLevel;
				
				// Desktop UI
				app.desktopCarousel = new DesktopCarousel("#footerDesktop .carousel", app.isInBuilderMode);
				app.desktopPicturePanel = new PicturePanel("#picturePanel", app.isInBuilderMode);
				// Mobile UI
				app.mobileIntroView = new IntroView("#introPanel");
				app.mobileListView = new ListView("#listPanel");
				app.mobileInfoView = new InfoView("#infoCarousel");
				app.mobileCarousel = new MobileCarousel("#footerMobile", app.isInBuilderMode);
				
				addMapTourBusinessToEsriGraphic();
				
				dojo.subscribe("CORE_UPDATE_EXTENT", this.setMapExtent);
				dojo.subscribe("CORE_PICTURE_CHANGED", selectedPointChange_afterStep2);
				dojo.subscribe("CORE_SELECTED_TOURPOINT_UPDATE", updateSelectedPointRenderer);
				
				// Global handler for not found image 
				window.mediaNotFoundHandler = function(that){
					that.src = MapTourHelper.getNotFoundMedia();
					// Avoid infinite loop if something is wront with the not found image
					that.onerror = '';
				};
				
				// Keybord event for previous/next pictures in viewer mode
				if( ! app.isInBuilderMode ) {
					$(window).keyup(function(e){
						if( e.keyCode == 39 )
							loadNextPicture();
						else if ( e.keyCode == 37 )
							loadPrevPicture();
					});
				}
				
				return true;
			}
			
			this.webmapLoaded = function()
			{
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
				
				// Initialize picture panel
				app.desktopPicturePanel.init(WebApplicationData.getColors()[1], ! app.data.sourceIsNotFSAttachments());
				dojo.subscribe("PIC_PANEL_PREV", loadPrevPicture);
				dojo.subscribe("PIC_PANEL_NEXT", loadNextPicture);
				
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
							if( app.isInBuilderMode || ! Helper.getAppID(_core.isProd()) ) {							
								// Count FS features and warn user if they are not all visible
								// There should always be the same number of feature now that the web map is loaded at full extent
								var queryCount = new esri.tasks.Query();
								queryCount.where = "1=1";
								app.data.getSourceLayer().queryCount(
									queryCount,
									function(nbFeature) {
										if( app.data.getSourceLayer().graphics.length != nbFeature ) {
											/*
											var webmapEditUrl = Helper.getWebmapViewerLinkFromSharingURL() + '?webmap=' + app.data.getWebMapItem().item.id;
											var popoverContent = app.data.getSourceLayer().graphics.length != 0 ? i18n.viewer.builderJS.dataWarningExtent : i18n.viewer.builderJS.dataWarningVisibi.replace('%MAPSIZE%', APPCFG.MINIMUM_MAP_WIDTH + 'px');
											
											if( app.isInBuilderMode )
												app.builder.setDataWarning(popoverContent, webmapEditUrl);
											*/
										}
	
										tourPointLayerLoaded(tourPoints);
									},
									// If the request fail, assume it's ok
									function() {
										tourPointLayerLoaded(tourPoints);
									}
								);
								
								// Set the nextId (for FS without attributes)
								if( app.data.sourceIsNotFSAttachments() && app.data.getSourceLayer().graphics.length )
									app.data.getSourceLayer()._nextId = app.data.getSourceLayer().graphics.slice(-1)[0].attributes[app.data.getSourceLayer().objectIdField] + 1;
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
					if( _core.isProd() )
						this.showInitPopup();
					else
						_core.portalLogin().then(this.showInitPopup, function(){ 
							_core.initError("noLayerNoHostedFS");
						});
				}
				// No data in view mode
				else if( Helper.getAppID(_core.isProd()) ) {
					if( app.data.userIsAppOwnerOrAdmin() ){
						loadingIndicator.setMessage(i18n.viewer.loading.loadBuilder);
						setTimeout(function(){
							app.header.switchToBuilder();
						}, 1200);
					}
					else
						_core.initError("noLayerView");
				}
				// No data in preview mode (should not happen)
				else {
					_core.initError("noLayer");
				}
			}
			
			function tourPointLayerLoaded(result)
			{
				console.log("maptour.core.Core - tourPointLayerLoaded");
				
				// Disallow builder on IE10/Windows 7 because it fails at CORS request that use POST
				// User should force render mode to IE9 manually as Windows 8 tablet doesn't support IE9 meta rendering
				// For specific project, that meta can be used after the viewport meta
				// <meta http-equiv="x-ua-compatible" content="IE=9" >
				if (app.isInBuilderMode && ! app.data.sourceIsNotFSAttachments() && has("ie") == 10 && navigator.userAgent.match('Windows NT 6.1')) {
					_core.initError("ie10Win7Explain");
					return false;
				}
				
				_core.cleanLoadingTimeout();
				
				// Hide the source layer
				if( app.data.getSourceLayer() )
					app.data.getSourceLayer().setVisibility(false);
				
				// Resize the app to be able to set the correct map extent
				_core.handleWindowResize();
				
				// Set Map extent to the map initial extent	
				_this.setMapExtent(Helper.getWebMapExtentFromItem(app.data.getWebMapItem().item)).then(function()
				{
					// If the first record is an introduction 
					if( (configOptions.firstRecordAsIntro || WebApplicationData.getFirstRecordAsIntro()) && result.graphics.length > 1 ) {
						app.data.setTourPoints(result.graphics.slice(0, APPCFG.MAX_ALLOWED_POINTS));
						app.data.setFirstPointAsIntroRecord();
						app.data.setCurrentPointByIndex(null);
						if( app.isInBuilderMode )
							$("#builderPanel3").toggle(app.data.hasIntroRecord());
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
					
					// Event handler for graphics
					dojo.connect(tourLayer, "onMouseOver", picLayer_onMouseOver);
					dojo.connect(tourLayer, "onMouseOut", picLayer_onMouseOut);
					dojo.connect(tourLayer, "onClick", picLayer_onClick);
					dojo.connect(app.map, "onClick", handleMapClick);
					
					// Save the tour layer
					app.data.setTourLayer(tourLayer);
					
					if(app.map.loaded)
						_core.appInitComplete();
					else
						dojo.connect(app.map, "onLoad", _core.appInitComplete);
				});
			}
			
			this.appInitComplete = function()
			{
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
				app.handleFirstExtentChange = dojo.connect(app.map, "onExtentChange", function(extent, delta) {
					dojo.disconnect(app.handleFirstExtentChange);
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
			
				// Display alll graphics layers except the one that is used as the sourceLayer
				$.each(app.map.graphicsLayerIds, function(i, layerName){
					if( layerName != app.data.getSourceLayer().id )
						$("#" + layerName + "_layer").css("visibility", "visible");
				});
	
				// Force early init of the picture panel
				if( app.data.getTourPoints().length ) 
					selectedPointChange_after(app.data.getIntroData());
				
				// Let time for the map renderer to update and initialize all UI components
				setTimeout(initUI, 0);
					
				// Show settings popup if not found fields mapping
				if ( app.isInBuilderMode && app.data.getFieldsConfig() && ! app.data.getFieldsConfig().allCriticalFieldsFound() )
					app.builder.openFieldsSettingOnStartup();
					
				if ( app.isInBuilderMode && ! app.data.sourceIsNotFSAttachments() && ! Helper.browserSupportAttachementUsingFileReader() )
					app.builder.showBrowserWarning();
					
				// Disable import on FS with attachments
				if (!app.data.sourceIsNotFSAttachments()) {
					$("#importPopupButton").attr("disabled", "disabled");
					$("#importPopupButton").attr("title", i18n.viewer.builderHTML.buttonImportDisabled);
				}
				
				// If there is data, the app is displayed after the first point is loaded
				// See forced call to selectedPointChange_after before
				if( ! app.data.getTourPoints().length )
					selectedPointChange_afterStep2();
			}
			
			function initUI()
			{
				var tourLayer  = app.data.getTourLayer();
				var appColors  = WebApplicationData.getColors();
				var tourPoints = app.data.getTourPoints();
				
				// Initialize desktop carousel
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
			}
			
			this.onHashChange = function()
			{
				if(location.hash == "#list") {
					$("#listViewLink").addClass("current");
					app.mobileListView.show();
				}
				else if (location.hash == "#info") {
					$("#infoViewLink").addClass("current");
					app.mobileInfoView.show();
				}
			}
			
			this.updateUI = function(tourPoints, appColors, editFirstRecord)
			{
				updateRenderer(editFirstRecord);
				
				app.desktopCarousel.update(tourPoints, appColors[2], appColors[1]);
				app.mobileCarousel.update(tourPoints, appColors[2]);
				app.mobileListView.update(tourPoints, appColors[2]);
				app.mobileInfoView.update(tourPoints, appColors[2]);
				app.desktopPicturePanel.update(appColors[1]);
				
				// Set the symbol, update UI component
				selectedPointChange_after(editFirstRecord ? app.data.getIntroData() : null);
			}
			
			this.resize = function(cfg)
			{
				// Feature Service creation
				if (app.isCreatingFS) {
					// Display the fatal error dialog box on mobile or the data popup on desktop
					$("#loadingOverlay").css("top", cfg.isMobileView ? "0px" : $("#header").height());
					$("#loadingOverlay").css("height", cfg.isMobileView ? $("body").height() : $("body").height() - $("#header").height());
					$("#header").css("display", cfg.isMobileView ? "none" : "block");
					$("#fatalError").css("display", cfg.isMobileView ? "block": "none");
				}
				
				if (cfg.isMobileView && cfg.isOnMobileMapView)
					$("#footerMobile").show();
				else
					$("#footerMobile").hide();
					
				app.desktopPicturePanel.resize(cfg.width - APPCFG.MINIMUM_MAP_WIDTH, cfg.height);
				app.desktopCarousel.resize();
					
				if (cfg.isMobileView)
					app.mapTips && app.mapTips.hide();
				else
					app.mapTips && app.mapTips.show();
	
				if (! cfg.isMobileView)
					app.desktopCarousel.checkItemIsVisible(app.data.getCurrentIndex());
			}
			
			//
			// Initialization
			//
			
			this.showInitPopup = function()
			{
				_core.cleanLoadingTimeout();
				app.isCreatingFS = true;
				_core.initError("noLayerMobile", null, true);
				_core.handleWindowResize();
				
				var resultDeferred = app.builder.presentInitPopup(app.portal, app.data.getWebMapItem());
				resultDeferred.then(
					function()
					{
						$('#initPopup').modal("hide");
						app.isCreatingFS = false;
						_core.prepareAppForWebmapReload();
						_core.loadWebMap(app.data.getWebMapItem().item.id);
					},
					function()
					{
						_core.replaceInitErrorMessage("noLayerView");
						$("#loadingOverlay").css("top", "0px");
						$("#header").css("display", "inherit");
						$("#fatalError").css("display", "block");
						
						app.isCreatingFS = false;
						_core.handleWindowResize();
					}
				);
			}
			
			/**
			 * Display the app
			 * Called through selectedPointChange_afterStep2
			 */
			function displayApp()
			{
				// If intro record, set enhanced mobile intro
				if ( app.data.getIntroData() && (! has("ie") || has("ie") > 8) ) 
					app.mobileIntroView.init(app.data.getIntroData(), WebApplicationData.getColors()[2]);
				
				_core.displayApp();
			}
			
			//
			// Map Tour layer events
			//
			
			function handleMapClick(e)
			{
				// Hide tooltip after click on the map in view mode
				if( ! e.graphic && ! app.isInBuilderMode )
					app.mapTips.hide();
			}
	
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
				if ( ! isCurrentGraphic || (! app.isInBuilderMode && ! MapTourHelper.isOnMobileView() && ! $(".multiTip").is(':visible') ) )
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
				if ( ! app.isInBuilderMode && ! MapTourHelper.isOnMobileView() && ! $(".multiTip").is(':visible') ) {
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
					_core.handleWindowResize();
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
					attributes.getThumbURL(),
					computePicturePanelButtonStatus(forcedRecord));
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
						try {
							_this.centerMap(graphic.geometry, appZoomLevel);
							var handle = dojo.connect(app.map, "onExtentChange", function() {
								dojo.disconnect(handle);
								setCurrentGraphicIcon(graphic);
							});
						} catch( e ) { }
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
				if( app.isLoading )
					displayApp();
			}
	
			function computePicturePanelButtonStatus(forceDisableLeft)
			{
				var index = app.data.getCurrentIndex();
				return {
					left: !! index && ! forceDisableLeft,
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
				if (index == null) {
					app.mobileIntroView.hide();
					index = -1;
					app.isFirstUserAction = true;
					dojo.disconnect(app.handleFirstExtentChange);
				}
	
				if ( index == app.data.getNbPoints() - 1 )
					return;
	
				selectedPointChange_before();
				app.data.setCurrentPointByIndex(index + 1)
				selectedPointChange_after();
			}
	
			function loadPictureAtIndex(index)
			{
				// Intro record
				if (app.data.getCurrentIndex() == null) {
					app.mobileIntroView.hide();
					app.isFirstUserAction = true;
					dojo.disconnect(app.handleFirstExtentChange);
				}
				
				if (index != app.data.getCurrentIndex()) {
					selectedPointChange_before();
					app.data.setCurrentPointByIndex(index);
					selectedPointChange_after();
				}
				else {
					var graphic = app.data.getCurrentGraphic();
					if (! visibleMapContains(graphic.geometry)) 
						_this.centerMap(graphic.geometry);
					checkPopoverState();
				}
			}
			
			//
			// Map Tour layer renderer
			//
			
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
			
			function updateRenderer(noRendererReset)
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
				if( ! noRendererReset && newIndex == -1 && tourPoints.length > 0 ) 
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
					app.builder.updateBuilderMoveable(graphic);
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
				if (! visibleMapContains(graphic.geometry))
					_this.centerMap(graphic.geometry);
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
						app.builder.createPinPopup(graphic, app.data.getCurrentIndex(), ! MapTourHelper.isOnMobileView());
					else 
						app.mapTips = new MultiTips({
							map: app.map,
							content: graphic.attributes.getName(),
							pointArray: [graphic],
							labelDirection: "auto",
							backgroundColor: APPCFG.POPUP_BACKGROUND_COLOR,
							borderColor: APPCFG.POPUP_BORDER_COLOR,
							pointerColor: APPCFG.POPUP_ARROW_COLOR,
							textColor: "#ffffff",
							offsetTop: 32,
							topLeftNotAuthorizedArea: has('touch') ? [40, 180] : [30, 150],
							mapAuthorizedWidth: MapTourHelper.isModernLayout() ? dojo.query("#picturePanel").position()[0].x : -1,
							mapAuthorizedHeight: MapTourHelper.isModernLayout() ? dojo.query("#footerDesktop").position()[0].y - dojo.query("#header").position()[0].h : -1,
							visible: ! MapTourHelper.isOnMobileView()
						});					
				});
			}
			
			//
			// Mobile
			//
			
			this.prepareMobileViewSwitch = function()
			{
				$(".mobileView").hide();
				$("#footerMobile").hide();
				$(".navBar span").removeClass("current");
				app.header.hideMobileBanner();
			}
			
			function showMobileViewInfo(tourPointIndex)
			{
				if( tourPointIndex != null)
					loadPictureAtIndex(tourPointIndex);
	
				location.hash = "#info";
			}
			
			//
			// Map manipulation
			//
			
			function visibleMapContains(geom)
			{
				var isDesktopModernUI = MapTourHelper.isModernLayout() && ! MapTourHelper.isOnMobileView();
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
			
			this.centerMap = function(geom, zoomLevel)
			{
				var isDesktopModernUI = MapTourHelper.isModernLayout() && ! MapTourHelper.isOnMobileView();
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
			
			this.setMapExtent = function(extent)
			{
				if( ! extent || ! extent.spatialReference || ! app.map || ! app.map.extent.spatialReference )
					return;
					
				if( app.map.spatialReference.wkid == extent.spatialReference.wkid )
					return setMapExtentStep2(extent);
				else {
					var resultDeferred = new dojo.Deferred();
					esri.config.defaults.geometryService.project([extent], app.map.spatialReference, function(features){
						if( ! features || ! features[0] )
							return;
						
						setMapExtentStep2(features[0]);
						resultDeferred.resolve();
					});
					return resultDeferred;
				}
			}
			
			function setMapExtentStep2(extent)
			{
				var isDesktopModernUI = MapTourHelper.isModernLayout() && ! MapTourHelper.isOnMobileView();			
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
			
			this.zoomToDeviceLocation = function(success, geom)
			{
				if( success ) {
					if( app.map.spatialReference.wkid == 102100 )
						geom = esri.geometry.geographicToWebMercator(geom);
					else if ( app.map.spatialReference.wkid != 4326 ) {
						esri.config.defaults.geometryService.project([geom], app.map.spatialReference, function(features){
							if( ! features || ! features[0] )
								return;
							
							_this.centerMap(features[0]);
						});
					}
					
					_this.centerMap(geom);
				}
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
			
			this.initLocalization = function()
			{
				app.desktopPicturePanel.initLocalization();
			}
		}
	}
);