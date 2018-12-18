define(["storymaps/maptour/core/WebApplicationData",
		"storymaps/maptour/core/TourPointAttributes",
		"storymaps/maptour/core/FeatureServiceManager",
		"storymaps/maptour/core/MapTourHelper",
		// Desktop UI
		"storymaps/ui/multiTips/MultiTips",
		"storymaps/maptour/ui/desktop/Carousel",
		"storymaps/maptour/ui/desktop/PicturePanel",
		"storymaps/ui/autoplay/Autoplay",
		"storymaps/ui/EmbedBar/EmbedBar",
		// Mobile UI
		"storymaps/maptour/ui/mobile/IntroView",
		"storymaps/maptour/ui/mobile/ListView",
		"storymaps/maptour/ui/mobile/InfoView",
		"storymaps/maptour/ui/mobile/Carousel",
		"storymaps/utils/Helper",
		"storymaps/utils/FlickrConnector",
		"dojo/has",
		"esri/tasks/query",
		"esri/layers/GraphicsLayer",
		"esri/renderers/UniqueValueRenderer",
		"esri/graphic",
		"esri/geometry/Point",
		"esri/geometry/Extent",
		"esri/config",
		"esri/geometry/webMercatorUtils",
		"dojo/topic",
		"dojo/Deferred",
		"dojo/dom",
		"dojo/on",
		"dojo/_base/connect",
		"dojo/_base/lang",
		"dojo/query",
		"dojo/dom-geometry"],
	function (
		WebApplicationData,
		TourPointAttributes,
		FeatureServiceManager,
		MapTourHelper,
		MultiTips,
		DesktopCarousel,
		PicturePanel,
		Autoplay,
		EmbedBar,
		IntroView,
		ListView,
		InfoView,
		MobileCarousel,
		Helper,
		FlickrConnector,
		has,
		Query,
		GraphicsLayer,
		UniqueValueRenderer,
		Graphic,
		Point,
		Extent,
		esriConfig,
		webMercatorUtils,
		topic,
		Deferred,
		dom,
		on,
		connect,
		lang,
		domQuery,
		domGeom)
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
				var urlParams = Helper.getUrlParams();
				configOptions.sourceLayerTitle = (urlParams.sourceLayerTitle ? unescape(urlParams.sourceLayerTitle) : null) || configOptions.sourceLayerTitle;
				configOptions.firstRecordAsIntro = urlParams.firstRecordAsIntro
														? urlParams.firstRecordAsIntro == "true"
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

				app.flickr = new FlickrConnector(APPCFG.FLICKR_API_KEY);

				/*
				 * Autoplay in viewer mode
				 */
				if ( ! app.isInBuilderMode && urlParams.autoplay !== undefined && urlParams.autoplay !== "false" ) {
					app.autoplay = new Autoplay(
						$("#autoplay"),
						// Callback that navigate to the next section
						function() {
							var nextIndex = 0;

							if( app.data.getCurrentIndex() != app.data.getNbPoints() -1 ) {
								nextIndex = app.data.getCurrentIndex() + 1;
							}

							// Intro record
							if ( app.data.getCurrentIndex() === null && app.data.getNbPoints() >= 1 ) {
								nextIndex = 0;
								if( $("body").hasClass("side-panel") ) {
									$("#splashPanel").animate({
										bottom: "2000px"
									}, 900);
								}
							}

							// Delay the event so Autoplay has received the updated index before the event is fired
							setTimeout(function(){
								loadPictureAtIndex(nextIndex);
							}, 50);

							return nextIndex;
						}
					);

					// Start when app is ready
					topic.subscribe("maptour-ready", function(){
						if ( ! $("body").hasClass("mobile-view") ) {
							app.autoplay.start();
						}
					});

					// Inform autoplay of story navigation events
					topic.subscribe("maptour-point-change-after", function(index) {
						app.autoplay.onNavigationEvent(index);
					});
				}

				MapTourHelper.loadCustomIcon();

				addMapTourBusinessToEsriGraphic();

				topic.subscribe("CORE_UPDATE_EXTENT", this.setMapExtent);
				topic.subscribe("CORE_PICTURE_CHANGED", selectedPointChange_afterStep2);
				topic.subscribe("CORE_SELECTED_TOURPOINT_UPDATE", updateSelectedPointRenderer);
				topic.subscribe("PIC_PANEL_PREV", loadPrevPicture);
				topic.subscribe("PIC_PANEL_NEXT", loadNextPicture);

				// Global handler for not found image
				window.mediaNotFoundHandler = function(that){
					that.src = MapTourHelper.getNotFoundMedia();

					if($("body").hasClass("side-panel")) {
						setTimeout(function() {
							$(that).css("object-fit", "contain");
						}, 500);
					}
					// Avoid infinite loop if something is wrong with the not found image
					that.onerror = '';
				};

				// Keybord event for previous/next pictures in viewer mode
				if( ! app.isInBuilderMode ) {
					$(window).keyup(function(e){
						// Enter or right arrow or down arrow or page down
						if( e.keyCode == 13 || e.keyCode == 39 || e.keyCode == 34 )
							loadNextPicture();
						else if ( e.keyCode == 37 || e.keyCode == 33 )
							loadPrevPicture();
					});
				}

				// Prevent iPad vertical bounce effect
				// except on few containers that needs that
				if ( has("touch") ) {
					$(document).bind(
						'touchmove',
						function(e) {
							if( ! $(e.target).parents('#helpPopup, #placardContainer, #introPanel, #infoPanel, #popupViewGeoTag, #mobile-scroll-story-content').length && ! $(e.target).hasClass('subtitle') )
								e.preventDefault();
						}
					);
				}

				// Prevent focus on mousedown but allow it with keyboard
				$("body").on("mousedown", "*", function(e) {
					if (($(this).is(":focus") || $(this).is(e.target)) && $(this).css("outline-style") == "none") {
						$(this).css("outline", "none").on("blur", function() {
							$(this).off("blur").css("outline", "");
						});
					}

					if ( $(this).parents("#placard > div").length ) {
						$(this).parents("#placard > div").css("outline", "none").on("blur", function() {
							$(this).off("blur").css("outline", "");
						});
					}
					else if ( $(this).parents("#headerDesktop .title").length ) {
						$(this).parents("#headerDesktop .title").css("outline", "none").on("blur", function() {
							$(this).off("blur").css("outline", "");
						});
					}
					else if ( $(this).parents("#headerDesktop .subtitle").length ) {
						$(this).parents("#headerDesktop .subtitle").css("outline", "none").on("blur", function() {
							$(this).off("blur").css("outline", "");
						});
					}
				});

				// Detect focus on the title to avoid losing the current point if
				//  the app has previously navigated using the mouse
				/*
				var preventTitleFocusAction = false;
				$("#headerDesktop .title").click(function(){
					preventTitleFocusAction = true;
				});

				$("#headerDesktop .title").focusin(function(e){
					setTimeout(function(){
						if ( ! preventTitleFocusAction ) {
							if ( app.data.getCurrentIndex() > 0 ) { //  && ! e.relatedTarget
								if ( app.data.getCurrentIndex() < app.data.getNbPoints() - 1 )
									topic.publish("CAROUSEL_CLICK", app.data.getCurrentIndex() + 1);
							}
						}

						preventTitleFocusAction = false;
					}, 300);
				});
				*/

				/*
				$(document).on('keydown', function(e){
					if( e.keyCode === 9 ) {
						var focusElem = $(":focus");

						if ( ! focusElem.length ) {
							setTimeout(function(){
								if ( ! e.shiftKey  ) {
									if ( app.data.getCurrentIndex() < app.data.getNbPoints() - 1 )
										topic.publish("CAROUSEL_CLICK", app.data.getCurrentIndex() + 1);
								}
								else {
									if ( app.data.getCurrentIndex() > 0 )
										topic.publish("CAROUSEL_CLICK", app.data.getCurrentIndex() - 1);
								}
							}, 50);

						}
					}
				});
				*/

				if( has("touch") )
					$("body").addClass("hasTouch");

				if ( APPCFG.USE_STATIC_ICON && APPCFG.USE_STATIC_ICON.enabled )
					$("body").addClass("notNumbered");

				return true;
			};

			this.webmapLoaded = function()
			{
				var i,
					layerId,
					layerName,
					layer;

				// If a layer was specified in config
				if( configOptions.sourceLayerTitle ) {
					var webmapLayers = app.data.getWebMapItem()
										&& app.data.getWebMapItem().itemData
										? app.data.getWebMapItem().itemData.operationalLayers : [];

					for (i = app.map.graphicsLayerIds.length-1; i >= 0; i--) {
						layerId = app.map.graphicsLayerIds[i];
						layer = app.map._layers[layerId];

						if( layerId.split('_').length == 3 )
							layerId = layerId.split('_').slice(0,2).join('_');
						else if( layerId.split('_').length == 2 )
							layerId = layerId.split('_').slice(0,1).join('_');

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
					for (i = app.map.graphicsLayerIds.length-1; i >= 0; i--) {
						layerName = app.map.graphicsLayerIds[i];
						layer = app.map._layers[layerName];

						// Catch visible FS and webmap embedded point layers
						if( (layer.visible || layer.visible === undefined)
								&& (layer.type == "Feature Layer" || layer._collection)
								&& layer.geometryType == "esriGeometryPoint"
								&& ! layerName.match(/^mapNotes_/) )
						{
							// If it's a webmap layer check that all mandatory fields are present to allow additional decoration layer
							if( ! layer.url ) {
								var fields = app.data.electFieldsFromFieldsList(layer.fields);

								if (fields && fields.allWebmapLayerMandatoryFieldsFound()) {
									app.data.setSourceLayer(layer);
									break;
								}
							}
							// If it's a FS perform less check to allow for enterprise integration where fiels are different
							// Acceptable as FS decoration layer should be under map tour data layer
							else {
								app.data.setSourceLayer(layer);
								break;
							}
						}
					}
				}

				// Initialize Embed bar
				var urlParams = esri.urlToObject(document.location.search).query || {};
				var classicEmbedMode = urlParams.classicEmbedMode ? true : urlParams.classicEmbedMode === "" ? true : urlParams.classicembedmode ? true : urlParams.classicembedmode === "" ? true : false;
				var strings = i18n.viewer.embedBar;
				lang.mixin(strings, {
					open: i18n.viewer.share.shareLinkOpen,
					close: i18n.viewer.bannerNotification.close,
					shareFacebook: i18n.viewer.desktopHTML.facebookTooltip,
					shareTwitter: i18n.viewer.desktopHTML.twitterTooltip
				});
				app.embedBar = new EmbedBar({
					classicEmbedMode: classicEmbedMode,
					strings: strings,
					appCreationDate: app.data.getAppItem().created,
					june2018ReleaseDate: APPCFG.JUNE_CREATED_DATE,
					isBuilder: app.isInBuilderMode,
					isMobile: false,
					isEsriLogo: !WebApplicationData.getLogoURL() ? true : false,
					logoPath: "resources/icons/esri-logo-black.png",
					logoElements: [$(".headerLogoImg"), $(".scroll-layout-banner")],
					taglineElements: [$(".msLink"), $(".mobile-scroll-story-tag-link")],
					shareElements: [$(".share_facebook"), $(".share_twitter"), $(".share_bitly")],
					appTitle: WebApplicationData.getTitle(),
					bitlyCreds: [APPCFG.HEADER_SOCIAL.bitly.key, APPCFG.HEADER_SOCIAL.bitly.login]
				});

				// Initialize picture panel
				app.desktopPicturePanel.init(
					WebApplicationData.getColors()[1],
					! app.data.sourceIsNotFSAttachments(),
					MapTourHelper.isModernLayout()
				);

				if ( MapTourHelper.isPanelsLayout() ) {
					$("#leftPanel").append($('#mapPanel'));
					$("#leftPanel").append($('#placardContainer'));
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
						topic.subscribe("FS_MANAGER_LAYER_LOADED", function(tourPoints) {
							// If in builder or preview mode
							if( app.isInBuilderMode || ! Helper.getAppID(_core.isProd()) ) {
								// Count FS features and warn user if they are not all visible
								// There should always be the same number of feature now that the web map is loaded at full extent
								var queryCount = new Query();
								queryCount.where = "1=1";
								app.data.getSourceLayer().queryCount(
									queryCount,
									function(nbFeature) {
										if( app.data.getSourceLayer().graphics.length != nbFeature ) {
											/*
											var webmapEditUrl = Helper.getWebmapViewerLinkFromSharingURL(arcgisUtils.arcgisUrl) + '?webmap=' + app.data.getWebMapItem().item.id;
											var popoverContent = app.data.getSourceLayer().graphics.length != 0 ? i18n.viewer.builderJS.dataWarningExtent : i18n.viewer.builderJS.dataWarningVisibi.replace('%MAPSIZE%', APPCFG.MINIMUM_MAP_WIDTH + 'px');
											popoverContent += ' <button type="button" class="btn btn-small" onclick="window.open(\'' + webmapEditUrl + '\', \'_blank\');">'+i18n.viewer.builderJS.dataWarningEdit+'</button>';
											popoverContent += ' <button type="button" class="btn btn-small" onclick="app.builder.destroyDataWarning()">'+i18n.viewer.builderJS.dataWarningClose+'</button>';

											if( app.isInBuilderMode )
												app.builder.setDataWarning(popoverContent, true);
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
						on.once(app.map, 'update-end', function(){
							layerLoaded();
						});
					}
				}
				// Webmap layer (shp, csv)
				else if( app.data.sourceIsWebmap() ) {
					loadingIndicator.setMessage(i18n.viewer.loading.step3);

					var graphics = [];
					$(app.data.getSourceLayer().graphics).each(function(i, graphic) {
						graphics.push(new Graphic(
							new Point(graphic.geometry.x, graphic.geometry.y, graphic.geometry.spatialReference),
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
					if( app.userCanEdit ){
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
			};

			function tourPointLayerLoaded(result)
			{
				console.log("maptour.core.Core - tourPointLayerLoaded");

				// Disallow builder on IE10/Windows 7 because it fails at CORS request that use POST
				// User should force render mode to IE9 manually as Windows 8 tablet doesn't support IE9 meta rendering
				// For specific project, that meta can be used after the viewport meta
				// <meta http-equiv="x-ua-compatible" content="IE=9" >
				if (app.isInBuilderMode && ! app.data.sourceIsNotFSAttachments() && has("ie") == 10 && navigator.userAgent.match('Windows NT 6.1')) {
					_core.initError("ie10Win7Explain");
					return;
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
					// Look for an URL index parameter
					var urlParams = esri.urlToObject(document.location.search).query || {};
					var forceStartIndex = parseInt(urlParams.index, 10);

					// Set the data
					app.data.setTourPoints(result.graphics.slice(0, APPCFG.MAX_ALLOWED_POINTS));

					// If the index parameter isn't valid discard it
					if( forceStartIndex && (isNaN(forceStartIndex) || forceStartIndex < 0 || forceStartIndex > app.data.getTourPoints().length) )
						forceStartIndex = null;

					// Apply the zoom level if starting on a specific point
					if ( forceStartIndex )
						app.isFirstUserAction = true;

					// If the first record is an introduction
					if( (configOptions.firstRecordAsIntro || WebApplicationData.getFirstRecordAsIntro()) && result.graphics.length > 1 ) {
						app.data.setFirstPointAsIntroRecord();

						if( forceStartIndex ) {
							app.data.setCurrentPointByIndex(forceStartIndex - 1);
							if( $("body").hasClass("side-panel") ) {
								$("#splashPanel").css("bottom", "2000px");
							}
						} else {
							app.data.setCurrentPointByIndex(null);
						}

						if( app.isInBuilderMode )
							$("#builderPanel3").toggle(app.data.hasIntroRecord());
					}
					else {
						if( forceStartIndex )
							app.data.setCurrentPointByIndex(forceStartIndex - 1);
						else
							app.data.setCurrentPointByIndex(result.graphics.length ? 0 : -1);
					}

					if( result.graphics.length >= APPCFG.MAX_ALLOWED_POINTS )
						app.data.setMaxAllowedFeatureReached(true);

					var tourPoints = app.data.getTourPoints();

					// Create a graphics layer for Map Tour data
					var tourLayer = new GraphicsLayer({ id: 'mapTourGraphics' });

					// Add ALL graphics to the layer (include hiddens that can become visible)
					var allTourPoints = app.data.getTourPoints(true);
					$(allTourPoints).each(function(index, graphic) {
						tourLayer.add(graphic);
					});

					// Create a unique value renderer based on the ID field
					var renderer = new UniqueValueRenderer(null, app.data.getFeatureIDField());

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
					connect.connect(tourLayer, "onMouseOver", picLayer_onMouseOver);
					connect.connect(tourLayer, "onMouseOut", picLayer_onMouseOut);
					on(tourLayer, "click", picLayer_onClick);
					on(app.map, "click", handleMapClick);

					// Save the tour layer
					app.data.setTourLayer(tourLayer);

					if(app.map.loaded)
						_core.appInitComplete();
					else
						on(app.map, "load", function() {
							// Bing basemap -> zoom another time
							if( app.map._bingLogo ) {
								on.once(app.map, "update-end", function(){
									_this.setMapExtent(Helper.getWebMapExtentFromItem(app.data.getWebMapItem().item)).then(_core.appInitComplete);
								});
							}
							else
								_core.appInitComplete();
						});
				});
			}

			this.appInitComplete = function()
			{
				// Hide header after first map interaction
				on.once(app.map, "extent-change", function(){
					app.header.hideMobileBanner();
				});

				// Make sure that the current marker is displayed in front of others
				on(app.map, "extent-change", function(data) {
					var currentPoint = app.data.getCurrentGraphic();
					if( currentPoint ) {
						if (data.extent.contains(currentPoint.geometry)) {
							try {
								currentPoint.getDojoShape().moveToFront();
							}
							catch (e) {
							}
						}
					}
				});

				// Display all graphics layers except the one that is used as the sourceLayer
				$.each(app.map.graphicsLayerIds, function(i, layerName){
					if( layerName != app.data.getSourceLayer().id )
						$('g[id="' + layerName + '_layer"]').css("visibility", "visible");
				});

				// Picture panel init
				if( app.data.getTourPoints().length )
					selectedPointChange_after(app.data.getCurrentGraphic() || app.data.getIntroData());

				// Let time for the map renderer to update and initialize all UI components
				setTimeout(initUI, 0);

				// If the layer used for Map Tour has changed
				if( app.isInBuilderMode && WebApplicationData.getSourceLayer() && app.data.getSourceLayer().id != WebApplicationData.getSourceLayer() )
					app.builder.setDataWarning(i18n.viewer.builderHTML.dataSourceWarning, true);
				// If points have been added outside of the interactive builder
				else if ( app.isInBuilderMode && app.data.detectDataAddedOutsideOfBuilder() )
					app.builder.setOrganizeWarning();

				// In V2.1 images needed to end with a valid extension
				// In 2.2 not needed anymore but check is still needed for tour created with 2.1 that have disabled videos
				if (app.isInBuilderMode && app.data.sourceIsNotFSAttachments())
					app.builder.checkPicturesExtension(false);

				// Show settings popup if not found fields mapping
				if ( app.isInBuilderMode && app.data.getFieldsConfig() && ! app.data.getFieldsConfig().allCriticalFieldsFound() )
					app.builder.openFieldsSettingOnStartup();

				if ( app.isInBuilderMode && ! app.data.sourceIsNotFSAttachments() && ! Helper.browserSupportAttachementUsingFileReader() )
					app.builder.showBrowserWarning();

				// Disable import on FS with attachments
				if (!app.data.sourceIsNotFSAttachments()) {
					$("#importPopupButton").attr("disabled", "disabled");
					$("#importPopupButton").attr("title", i18n.viewer.builderHTML.buttonImportDisabled);
					$("#importPopupButton2").attr("disabled", "disabled");
					$("#importPopupButton2").addClass("disabled");
					$("#importPopupButton2").attr("title", i18n.viewer.builderHTML.buttonImportDisabled);
				}

				// If there is data, the app is displayed after the first point is loaded
				// See forced call to selectedPointChange_after before
				if( ! app.data.getTourPoints().length )
					selectedPointChange_afterStep2();

				if ( has('ie') || has('trident') ) {
					app.desktopCarousel.iefix();
				}

				if ( app.autoplay ) {
					app.header.enableAutoplay();
				}

				if( ! $("body").hasClass("builder-mode") && $("body").hasClass("side-panel") ) {
					if( app.data.hasIntroRecord() ) {
						var img = document.createElement('img');
						var newUrl = app.data.getIntroData().attributes.getURL();
						if( app.data.getIntroData().attributes.isVideo() || ! MapTourHelper.mediaIsSupportedImg(app.data.getIntroData().attributes.getURL() ))
							img.src = MapTourHelper.getNotFoundMedia();
						else {
							img.src = app.data.getIntroData().attributes.getURL();

							if(app.data.getIntroData().attributes.getURL().indexOf("'") > -1) {
								// Check for apostrophe
								var aposIndices = [];
								for(var i = 0; i < app.data.getIntroData().attributes.getURL().length; i++) {
										if (app.data.getIntroData().attributes.getURL()[i] === "'") aposIndices.push(i);
								}
								if(aposIndices.length) {
									$.each(aposIndices, function(i, index) {
										newUrl = [app.data.getIntroData().attributes.getURL().slice(0, index), '\\', app.data.getIntroData().attributes.getURL().slice(index)].join('');
									});
								}
							}
						}
						img.onload = function() {
							$("#splashPanel").css("background-image", "url(" + newUrl + ")");
							if(app.data.getIntroData().attributes.getName()){
								$("#splashTitle").html(app.data.getIntroData().attributes.getName());
								$("#splashText").css("max-height", $(window).height() - 375 - (0.1 * $(window).height()));
								$("#splashPanel").attr("alt", "");
							} else {
								$("#splashText").hide();
							}
							if(app.data.getIntroData().attributes.getDescription()){
								$("#splashSubtitle").html(app.data.getIntroData().attributes.getDescription());
							}

							$("#takeTourText").text(i18n.viewer.desktopHTML.takeTourText);
							$(".cover-start").on("click", function() {
								if(app.isFirstUserAction) {
									topic.subscribe("maptour-point-change-after", function(){
										setTimeout(function(){
											$("#splashPanel").animate({
												bottom: "2000px"
											}, 900);
										}, 150);
									});
									topic.publish("SELECT_BY_SCROLL", 0);
								} else {
									setTimeout(function(){
										$("#splashPanel").animate({
											bottom: "2000px"
										}, 900);
									}, 150);
									topic.publish("SELECT_BY_SCROLL", 0);
								}
							});
							if(app.data.getCurrentIndex() == null) {
								if( ! $("body").hasClass("mobile-layout-scroll") ) {
									$("#splashPanel").show();
									setTimeout(function() {
										var skipZoom = true;
										selectedPointChange_afterStep2(skipZoom);
									}, 50);
								}
							}
						};
						$("#headerDesktop .title").css("cursor", "pointer");
						$("#headerDesktop .title").on("click", function() {
							$("#splashPanel").show();
							$("#splashPanel").animate({
								bottom: app.embedBar && app.embedBar.initiated ? 26 : 0
							}, 700);
						});
					}
					else {
						$("#headerDesktop .title").css("cursor", "pointer");
						$("#headerDesktop .title").on("click", function() {
							topic.publish("SELECT_BY_SCROLL", 0);
						});
					}
				}
			};

			function initUI()
			{
				var appColors  = WebApplicationData.getColors();
				var tourPoints = app.data.getTourPoints();

				// Initialize desktop carousel
				if( ! $("body").hasClass("side-panel") || app.isInBuilderMode ) {
					app.desktopCarousel.init(tourPoints, appColors[2], appColors[1]);
					topic.subscribe("CAROUSEL_CLICK", loadPictureAtIndex);
				}

				// Initialize mobile UI on IE > 8
				if ( has("ie") === undefined || has("ie") > 8) {
					if( !$("body").hasClass("side-panel") ) {
						app.mobileCarousel.init(tourPoints, appColors[2]);
						topic.subscribe("CAROUSEL_SWIPE", loadPictureAtIndex);
					}

					topic.subscribe("SELECT_BY_SCROLL", loadPictureAtIndex);
					var urlParams = Helper.getUrlParams();
					var forceStartIndex = parseInt(urlParams.index, 10);
					app.mobileListView.init(tourPoints, appColors[2], forceStartIndex, APPCFG.FLICKR_API_KEY);
					if( ! $("body").hasClass("side-panel") && ! app.isInBuilderMode ) {
						app.mobileInfoView.init(app.data.getTourPoints(), appColors[2]);
					}
					topic.subscribe("OPEN_MOBILE_INFO", showMobileViewInfo);
					topic.subscribe("MOBILE_INFO_SWIPE", loadPictureAtIndex);
				}

				if ( app.autoplay ) {
					app.autoplay.init({
						color: appColors[2],
						themeMajor: 'white2',
						useBackdrop: false
					});
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
			};

			this.updateUI = function(tourPoints, appColors, editFirstRecord)
			{
				this.updateRenderer(editFirstRecord);

				app.desktopCarousel.update(tourPoints, appColors[2], appColors[1]);
				app.mobileCarousel.update(tourPoints, appColors[2]);
				app.mobileListView.update(tourPoints, appColors[2]);
				app.mobileInfoView.update(tourPoints, appColors[2]);
				app.desktopPicturePanel.update(appColors[1], MapTourHelper.isModernLayout());

				app.mapCommand.enableLocationButton(WebApplicationData.getZoomLocationButton());

				// Set the symbol, update UI component
				selectedPointChange_after(editFirstRecord ? app.data.getIntroData() : null);
			};

			this.resize = function(cfg)
			{
				if(app.embedBar && app.embedBar.initiated){
					cfg.height -= 26;
					$("#introPanel").css('min-height', 0);
					$("#infoPanel .embed-btn-container").css("bottom", "26px");
					$(".tourPoint").height($(".tourPoint").height() - $("#header").height() - $(".embed-bar").height());
				}
				// Feature Service creation
				if (app.initScreenIsOpen) {
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

				app.desktopPicturePanel.resize(cfg.width, cfg.height);
				if ( !MapTourHelper.isPanelsLayout() ) {
					app.desktopCarousel.resize();
				} else {
					$("#leftPanel").width(cfg.width * (1/3));
					$("#mapPanel").width(cfg.width * (1/3));
					$("#placardContainer").width(cfg.width * (1/3));
					$("#picturePanel").width(cfg.width * (2/3));
					$("#picturePanel").css('left', $("#leftPanel").width());

					if($("#leftPanel").width() == 400){
						$("#placard .name").width("235px");
					}

					var currentImgUrl = app.data.hasIntroRecord() && ( app.data.getCurrentIndex() == -1 || app.data.getCurrentIndex() == null ) ? app.data.getIntroData().attributes.getURL() : "";

					if ('objectFit' in document.documentElement.style === true) {
						$(".side-panel .member-image img").css("object-fit", "cover");
					} else {
						$(".side-panel .member-image img").css("opacity", "0");
						$(".side-panel .member-image").css({
							backgroundPositionX: 'center',
							backgroundPositionY: 'center',
							backgroundRepeat: 'no-repeat',
							backgroundSize: 'cover',
							backgroundImage: currentImgUrl ? currentImgUrl : app.data.getCurrentAttributes() && app.data.getCurrentAttributes().getURL() ? 'url(' + app.data.getCurrentAttributes().getURL() + ');' : 'url("");'
						});
						$(".tour-point-content .media img").css("opacity", "0");
						$(".tour-point-content .media").css({
							backgroundPositionX: 'center',
							backgroundPositionY: 'center',
							backgroundRepeat: 'no-repeat',
							backgroundSize: 'cover',
							backgroundImage: currentImgUrl ? currentImgUrl : app.data.getCurrentAttributes() && app.data.getCurrentAttributes().getURL() ? 'url(' + app.data.getCurrentAttributes().getURL() + ');' : 'url("");'
						});
					}
					$(".member-image.current").css('left', 0);
					setTimeout(function() {
						var descriptionHeight = $("#placard-bg").height() - $(".name").height();
						$(".description").height(descriptionHeight - 70);
					}, 0);
					if(!$("body").hasClass("mobile-layout-scroll")) {
						$("#leftPanel").height(cfg.height);
					} else {
						$(".scroll-layout").height(cfg.height);
						$("#leftPanel").height("35%");
					}
					if( app.data.hasIntroRecord() && ! cfg.isMobileView && ! app.isInBuilderMode ) {
						$("#splashPanel").show();
					} else if( app.data.hasIntroRecord() && cfg.isMobileView ) {
						$("#splashPanel").hide();
					}
				}

				if( app.mapTips ) {
					if ( cfg.isMobileView )
						app.mapTips.hide();
					else if( app.isInBuilderMode )
						app.mapTips.show();
					else if ( app.data.getCurrentGraphic().attributes.getName() !== "" )
						app.mapTips.show();
				}

				if (! cfg.isMobileView)
					app.desktopCarousel.checkItemIsVisible(app.data.getCurrentIndex());

				// Autoplay placement
				if ( MapTourHelper.isModernLayout() ) {
					$("#autoplay").css({
						left: "25%",
						bottom: 160
					});
				}

				if ( app.embedBar && app.embedBar.initiated && !$("body").hasClass("mobile-layout-scroll") ) {
					$("#footer").css("bottom", "26px");
				}

				if ( cfg.isMobileView && $("body").hasClass("mobile-layout-scroll") && ! $(".tour-point-content").length && !app.isLoading) {
					app.mobileListView.update(app.data.getTourPoints());
				}

				// Stop autoplay in mobile view
				if ( cfg.isMobileView && app.autoplay ) {
					app.autoplay.stop();
				}
			};

			//
			// Initialization
			//

			this.showInitPopup = function()
			{
				var errMsg = "noLayerMobile";

				_core.cleanLoadingTimeout();
				app.isInitializing = true;
				app.initScreenIsOpen = true;

				// Touch device
				if ( has("touch") && Helper.isMobile() ) {
					// in portrait mode with enough room in landscape for builder
					if ( window.innerHeight > window.innerWidth ) {
						if ( window.innerHeight > 768 ) {
							errMsg = "noLayerMobile2";
						}
					}
					// in landscape mode with enough room to fit builder but prepare in case of orientation change
					else {
						if ( window.innerWidth > 768 ) {
							errMsg = "noLayerMobile2";
						}
					}
				}


				_core.initError(errMsg, null, true);
				_core.handleWindowResize();

				var resultDeferred = app.builder.presentInitPopup(app.portal, app.data.getWebMapItem());
				resultDeferred.then(
					function(albumTitle)
					{
						$('#initPopup').modal("hide");
						app.initScreenIsOpen = false;

						var hasCleanedPreviousLayer = WebApplicationData.cleanWebAppAfterInitialization();
						if( hasCleanedPreviousLayer )
							topic.publish("BUILDER_INCREMENT_COUNTER", 1);

						_core.prepareAppForWebmapReload();
						$("#loadingOverlay").css("height", "100%");

						if (app.isDirectCreation) {
							WebApplicationData.setTitle(albumTitle);
							_core.loadWebMap(app.data.getWebMapItem());
							topic.publish("BUILDER_INCREMENT_COUNTER", 1);
						}
						else if (app.isGalleryCreation) {
							_core.loadWebMap(app.data.getWebMapItem());
							topic.publish("BUILDER_INCREMENT_COUNTER", 1);
						}
						else
							_core.loadWebMap(app.data.getWebMapItem().item.id);
					},
					function()
					{
						_core.replaceInitErrorMessage("noLayerView");
						$("#loadingOverlay").css("top", "0px");
						$("#header").css("display", "inherit");
						$("#fatalError").css("display", "block");

						app.initScreenIsOpen = false;
						_core.handleWindowResize();
					}
				);
			};

			/**
			 * Display the app
			 * Called through selectedPointChange_afterStep2
			 */
			function displayApp()
			{
				// Fix a Chrome freeze when map have a large initial extent (level 16 and up)
				// Set back the zoomDuration to 500ms
				if( has("chrome") ) {
					if ( app.map.getLevel() > 0 ) {
						app.map.setZoom(app.map.getLevel() - 1).then(function(){
							// For the map command +/- buttons to behave well
							esriConfig.defaults.map.zoomDuration = 50;
							app.map.setZoom(app.map.getLevel() + 1).then(function(){
								esriConfig.defaults.map.zoomDuration = 500;
							});
						});
					}
					else {
						esriConfig.defaults.map.zoomDuration = 500;
					}
				}

				// If intro record, display mobile intro view
				if ( app.data.getIntroData() && (app.data.getCurrentIndex() == null || $("body").hasClass("side-panel")) && (! has("ie") || has("ie") > 8) )
					app.mobileIntroView.init(app.data.getIntroData(), WebApplicationData.getColors()[2]);

				_core.displayApp();
				// Need to perform some layout check of the picture panel
				setTimeout(app.desktopPicturePanel.firstDisplayCheck, 50);

				app.isFirstUserAction = true;

				topic.publish("maptour-ready");
			}

			//
			// Map Tour layer events
			//

			function handleMapClick(e)
			{
				// Hide tooltip after click on the map in view mode
				if( ! e.graphic && ! app.isInBuilderMode )
					app.mapTips && app.mapTips.hide();
				if(! e.graphic && ! app.isInBuilderMode && $("body").hasClass("side-panel")) {
					_this.selected.hidden = true;
					app.mapTips && app.mapTips.clean(true);
				}
			}

			function picLayer_onClick(event)
			{
				if( event.graphic != app.data.getCurrentGraphic() || app.data.getCurrentGraphic().hidden) {
					// IE fire an extra event after the renderer is updated that we need to filter
					app.filterMouseHoverEvent = true;


					selectedPointChange_before();
					app.data.setCurrentPointByGraphic(event.graphic);
					selectedPointChange_after();

					// IE
					setTimeout(function(){
						app.filterMouseHoverEvent = false;
					}, 1500);
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
				if ( ! isCurrentGraphic ) {
					updateGraphicIcon(graphic, "hover");
				} else {
					if ( ! $("body").hasClass("side-panel") )
						return;
				}

				if($('body').hasClass('builder-mode') && $('body').hasClass('side-panel')){
					displayHoverTooltip(graphic);
					return;
				}

				// Show the tooltip if it's not current point or if no black popover is displayed in view mode
				if ( ! $("body").hasClass("side-panel") && (! isCurrentGraphic || (! app.isInBuilderMode && ! MapTourHelper.isOnMobileView() && ! $(".multiTip").is(':visible')) ) ) {
					displayHoverTooltip(graphic);
				} else if ( /*! isCurrentGraphic ||*/ (! app.isInBuilderMode && ! MapTourHelper.isOnMobileView() && ! $(".multiTip").is(':visible') ) ) {
					displayHoverMapTip(graphic);
				}
			}

			function picLayer_onMouseOut(event)
			{
				if( app.filterMouseHoverEvent && _this.selected ) {
					return;
				}
				app.map.setMapCursor("default");
				hideHoverTooltip();
				if($('body').hasClass('builder-mode') && $('body').hasClass('side-panel'))
					return;
				if( $("body").hasClass("side-panel") ) {
					hideHoverMapTip();
				}

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

				if( ! graphic.attributes.getName() )
					return;

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

			function displayHoverMapTip(graphic)
			{
				if(app.mapTips && ($('body').hasClass('mobile-view')) ){
					app.mapTips.clean(true);
					return;
				}

				app.mapTips && app.mapTips.clean();
				app.mapTips = new MultiTips({
					map: app.map,
					content: graphic.attributes.getName(),
					selected: null,
					pointArray: [graphic],
					labelDirection: "auto",
					backgroundColor: APPCFG.HOVER_POPUP_BACKGROUND_COLOR,
					borderColor: APPCFG.HOVER_POPUP_BORDER_COLOR,
					pointerColor: APPCFG.HOVER_POPUP_ARROW_COLOR,
					textColor: "#ffffff",
					offsetTop: graphic.symbol.height / 2 + graphic.symbol.yoffset,
					offsetBottom: $("body").hasClass("side-panel") ? 0 : 8,
					topLeftNotAuthorizedArea: has('touch') ? [40, 180] : [30, 150],
					mapAuthorizedWidth: MapTourHelper.isModernLayout() ? domQuery("#picturePanel").position()[0].x : -1,
					mapAuthorizedHeight: MapTourHelper.isModernLayout() ? domQuery("#footerDesktop").position()[0].y - domQuery("#header").position()[0].h : -1,
					visible: ! MapTourHelper.isOnMobileView() && graphic.attributes.getName() !== ""
				});
			}

			function hideHoverMapTip()
			{
				app.mapTips && app.mapTips.clean();
			}

			function checkPopoverState()
			{
				if ( ! app.isInBuilderMode && ! MapTourHelper.isOnMobileView()
						&& ! $(".multiTip").is(':visible') && app.data.getCurrentGraphic().attributes.getName() !== "" ) {
					hideHoverTooltip();
					app.mapTips && app.mapTips.show();
				}
			}

			//
			// Picture change handling
			//

			function selectedPointChange_before()
			{
				// Start the loading indicator
				app.mapCommand.startLoading();

				updateGraphicIcon(app.data.getCurrentGraphic(), "normal");
				if( app.mapTips )
					app.mapTips.hide();

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

				if( $("body").hasClass("mobile-layout-scroll") ) {
					var i;
					for(i=app.data.getCurrentIndex() >= 3 ? -2 : app.data.getCurrentIndex() == 2 ? -2 : 0; i < 4; i++) {
						var thisIndex = app.data.getCurrentIndex() + i;
						if(thisIndex > app.data.getTourPoints().length - 1)
							break;
						var thisAttributes = app.data.getTourPoints()[thisIndex].attributes;
						var thisPointContent = $(".tour-point-content .media").eq(thisIndex);
						if( thisAttributes.isVideo() || !MapTourHelper.mediaIsSupportedImg(thisAttributes.getURL()) ) {
							if( ! thisPointContent.find('iframe').attr("src") )
								thisPointContent.find('iframe').attr("src", thisAttributes.getURL());
						} else {
							if( ! thisPointContent.find('img').attr("src") ) {
								if ('objectFit' in document.documentElement.style === false) {
									thisPointContent.find('img').parent().css({
										backgroundImage: 'url(' + thisAttributes.getURL() + ')'
									});
								} else{
									thisPointContent.find('img').attr("src", thisAttributes.getURL());
								}
							}
						}
					}
				}

				app.data.setIsEditingFirstRecord(!! forcedRecord);

				if( ! attributes ) {
					if( $("body").hasClass("builder-mode") && $("body").hasClass("side-panel") && app.data.hasIntroRecord() && (app.data.getCurrentIndex() == null || app.data.getCurrentIndex() == -1) ) {
						app.data.setCurrentPointByGraphic(app.data.getIntroData());
						topic.publish("CORE_UPDATE_UI", { editFirstRecord: true });
						$("#arrowPrev").addClass("disabled");
						return;
					}
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
					computePicturePanelButtonStatus(),
					MapTourHelper.isModernLayout(),
					WebApplicationData.getPlacardPosition() === "under" || configOptions.placardPosition === "under",
					(! attributes.isVideo()) && MapTourHelper.mediaIsSupportedImg(attributes.getURL())
				);
			}

			function selectedPointChange_afterStep2(skipZoom)
			{
				console.log("selectedPointChange_afterStep2");
				var index = app.data.getCurrentIndex();
				var graphic = app.data.getCurrentGraphic();

				// Clean popover
				hideHoverTooltip();
				app.mapTips && app.mapTips.clean(true);

				if ($("body").hasClass("side-panel") ) {
					if(graphic){
						//app.map.centerAt(graphic.geometry);
						_this.centerMap(graphic.geometry);
					}
				}

				// Apply the selected zoom level on first user action
				if( app.isFirstUserAction && ! skipZoom) {
					app.isFirstUserAction = false;

					var appZoomLevel = parseInt((WebApplicationData.getZoomLevel() !== "" && WebApplicationData.getZoomLevel() !== undefined ? WebApplicationData.getZoomLevel() : configOptions.zoomLevel), 10);

					if ( appZoomLevel !== "" && appZoomLevel != -1 && (""+appZoomLevel != "NaN") && appZoomLevel != app.map.getZoom() ) {
						try {
							if( appZoomLevel > app.map.getMaxZoom() )
								appZoomLevel = app.map.getMaxZoom();

							/*
							// Prevent freeze in Chrome
							if ( has("chrome") ) {
								esriConfig.defaults.map.zoomDuration = 0;
							}
							*/

							_this.centerMap(graphic.geometry, appZoomLevel);

							/*
							setTimeout(function(){
								if ( has("chrome") ) {
									esriConfig.defaults.map.zoomDuration = 500;
								}
							}, 100);
							*/

							on.once(app.map, "extent-change", function() {
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

				if($('.swipeview-active').children()[0] && $('.swipeview-active').children()[0].id){
					if(!/iPhone|iPad|iPod/i.test(navigator.userAgent)){
						$('#'+$('.swipeview-active').children()[0].id).css('height', $('#infoPanel').height() - 40 - (app.embedBar && app.embedBar.initiated ? 26 : 0));
					}

					setTimeout(function(){
						$('#'+$('.swipeview-active').children()[0].id).scrollTop();
					}, 0);
				}

				// Update the map command
				app.mapCommand.stopLoading();

				topic.publish("maptour-point-change-after", index);

				// If it's the first loading, display the app
				if( app.isLoading )
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
				if (index == null) {
					app.mobileIntroView.hide();
					index = -1;
				}

				if ( index == app.data.getNbPoints() - 1 )
					return;

				selectedPointChange_before();
				app.data.setCurrentPointByIndex(index + 1);
				selectedPointChange_after();
			}

			function loadPictureAtIndex(index)
			{
				// Intro record
				if (app.data.getCurrentIndex() == null) {
					app.mobileIntroView.hide();
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
				if( param.name !== undefined || ! param.color )
					return;

				_this.updateRenderer();
				updateGraphicIcon(graphic, "selected");
				moveGraphicToFront(graphic);
			}

			this.updateRenderer = function(noRendererReset)
			{
				var tourPoints = app.data.getTourPoints();
				var currentId = app.data.getCurrentId();
				var newIndex = -1;

				// Update the layer renderer
				var renderer = new UniqueValueRenderer(null, app.data.getFeatureIDField());
				$(tourPoints).each(function(index, graphic) {
					renderer.addValue({
						value: graphic.attributes.getID(),
						symbol: MapTourHelper.getSymbol(graphic.attributes.getColor(), index + 1)
					});

					if( graphic.attributes.getID() == currentId )
						newIndex = index;
					graphic.setSymbol(null);
				});
				$.each(app.data.getTourPoints(true), function(i, point){
					point.setSymbol(null);
				});
				app.data.getTourLayer().setRenderer(renderer);
				app.data.getTourLayer().refresh();

				// Current point has been removed or something
				if( ! noRendererReset && newIndex == -1 && tourPoints.length > 0 )
					newIndex = 0;

				// Set the selected point
				app.data.setCurrentPointByIndex(newIndex);
			};

			function setCurrentGraphicIcon(graphic)
			{
				if( ! app.map || ! graphic )
					return;

				updateGraphicIcon(graphic, "selected");

				if (app.isInBuilderMode && app.data.sourceIsEditable())
					app.builder.updateBuilderMoveable(graphic);
			}

			function updateGraphicIcon(graphic, type)
			{
				if( ! graphic )
					return;

				var symbol = graphic.getLayer().renderer.getSymbol(graphic);
				var tourPoints = app.data.getTourPoints(false);
				var featureIndex = $.map(tourPoints, function(point, index){
					if(point.attributes.getID() == graphic.attributes.getID()){
						return index;
					}
				});
				var color = graphic.attributes.getColor();
				symbol = MapTourHelper.getSymbol(color, featureIndex[0] + 1, type);
				graphic.setSymbol(symbol);

				var iconCfg;
				if($("body").hasClass("side-panel")) {
					iconCfg = APPCFG.ICON_CUSTOM_CFG[type];
				} else {
					iconCfg = APPCFG.ICON_CFG[type];
				}

				if( ! iconCfg )
					return;

				if( type == "selected" )
					setTimeout(function(){ moveGraphicToFront(graphic); }, 0);

				if ( APPCFG.USE_STATIC_ICON && APPCFG.USE_STATIC_ICON.enabled
						&& APPCFG.USE_STATIC_ICON.width && APPCFG.USE_STATIC_ICON.height )
					return;

				symbol.setWidth(iconCfg.width).setHeight(iconCfg.height).setOffset(iconCfg.offsetX, iconCfg.offsetY);

				graphic.draw();
			}

			/**
			 * Put the graphic to front
			 * @param {Object} graphic
			 */
			function moveGraphicToFront(graphic)
			{
				if (! visibleMapContains(graphic.geometry) || $('body').hasClass('mobile-layout-scroll') ) {
					on.once(app.map, "extent-change", function() {
						moveGraphicToFrontStep2(graphic);
					});
					_this.centerMap(graphic.geometry);
				}
				// Do not center the map if the app is loading (i.e. if the point is in the initial extent it doesn't need to be centered)
				else if ( ! app.loadingTimeout && (! app.isInBuilderMode || ! $(".multiTip").length) )
					moveGraphicToFrontStep2(graphic);
			}

			function moveGraphicToFrontStep2(graphic)
			{
				_this.selected = null;
				_this.selected = graphic;
				try {
					graphic.getDojoShape().moveToFront();
				}
				catch (e) { }

				// Create the popover
				if( app.isInBuilderMode ){
					if( app.data.sourceIsEditable() )
						app.builder.createPinPopup(graphic, app.data.getCurrentIndex(), ! MapTourHelper.isOnMobileView());
				}
				else{
					app.mapTips && app.mapTips.clean(true);
					if( $("body").hasClass("side-panel") )
						return;
					app.mapTips = new MultiTips({
						map: app.map,
						content: graphic.attributes.getName(),
						selected: graphic,
						pointArray: [graphic],
						labelDirection: "auto",
						backgroundColor: APPCFG.POPUP_BACKGROUND_COLOR,
						borderColor: APPCFG.POPUP_BORDER_COLOR,
						pointerColor: APPCFG.POPUP_ARROW_COLOR,
						textColor: "#ffffff",
						offsetTop: graphic.symbol.height / 2 + graphic.symbol.yoffset,
						offsetBottom: $("body").hasClass("side-panel") ? 0 : 8,
						topLeftNotAuthorizedArea: has('touch') ? [40, 180] : [30, 150],
						mapAuthorizedWidth: MapTourHelper.isModernLayout() ? domQuery("#picturePanel").position()[0].x : -1,
						mapAuthorizedHeight: MapTourHelper.isModernLayout() ? domQuery("#footerDesktop").position()[0].y - domQuery("#header").position()[0].h : -1,
						visible: ! MapTourHelper.isOnMobileView() && graphic.attributes.getName() !== ""
					});
				}
			}

			//
			// Mobile
			//

			this.prepareMobileViewSwitch = function()
			{
				// Kill any playing video when leaving the page
				if( $("#infoViewLink").hasClass("current") )
					$("#infoCarousel .swipeview-active").find('iframe').attr('src', '');

				$(".mobileView").hide();
				$("#footerMobile").hide();
				$(".navBar span").removeClass("current");
				app.header.hideMobileBanner();
			};

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

				var visibleExtent = new Extent(
					app.map.extent.xmin,
					app.map.extent.ymin + ((10 + domGeom.position(dom.byId("footer")).h) * app.map.getResolution()),
					app.map.extent.xmin + (domGeom.position(dom.byId("picturePanel")).x * app.map.getResolution()),
					app.map.extent.ymax,
					app.map.extent.spatialReference
				);

				/*
				var testLayer = new GraphicsLayer();
				testLayer.add(new Graphic(visibleExtent,new SimpleFillSymbol()))
				app.map.addLayer(testLayer);
				*/

				return visibleExtent.contains(geom);
			}

			this.centerMap = function(geom, zoomLevel)
			{
				var isDesktopModernUI = MapTourHelper.isModernLayout() && ! MapTourHelper.isOnMobileView();
				if( zoomLevel === undefined && (! isDesktopModernUI || ! app.map.__LOD) )
					app.map.centerAt(geom);
				else if( zoomLevel !== undefined && (! isDesktopModernUI || ! app.map.__LOD) )
					app.map.centerAndZoom(geom, zoomLevel);
				else {
					var center = geom;
					var offsetX = 20 + domGeom.position(dom.byId("picturePanel")).x / 2;
					var offsetY = 10 + domGeom.position(dom.byId("footer")).h / 2;

					// Should not happen but it has been seen that point are in different proj that the map
					if( geom.spatialReference.wkid == 4326 && app.map.spatialReference.wkid == 102100 )
						center = webMercatorUtils.geographicToWebMercator(geom);
					else if( geom.spatialReference.wkid == 102100 && app.map.spatialReference.wkid == 4326 )
						center = webMercatorUtils.webMercatorToGeographic(geom);
					// At least don't crash the app
					else if ( geom.spatialReference.wkid != app.map.spatialReference.wkid )
						return;

					if ( ! zoomLevel )
						app.map.centerAt(
							center.offset(
								offsetX * app.map.getResolution(),
								- offsetY * app.map.getResolution()
							)
						);
					else
						app.map.centerAndZoom(
							center.offset(
								offsetX * app.map._params.lods[zoomLevel].resolution,
								- offsetY * app.map._params.lods[zoomLevel].resolution
							),
							zoomLevel
						);
				}
			};

			this.setMapExtent = function(extent)
			{
				if( ! extent || ! extent.spatialReference || ! app.map || ! app.map.extent.spatialReference || ! app.map.spatialReference ) {
					var r = new Deferred();
					r.resolve();
					return r;
				}

				if( app.map.spatialReference.wkid == extent.spatialReference.wkid )
					return setMapExtentStep2(extent);
				else {
					var resultDeferred = new Deferred();
					esriConfig.defaults.geometryService.project([extent], app.map.spatialReference, function(features){
						if( ! features || ! features[0] )
							return;

						setMapExtentStep2(features[0]);
						resultDeferred.resolve();
					});
					return resultDeferred;
				}
			};

			function setMapExtentStep2(extent)
			{
				var isDesktopModernUI = MapTourHelper.isModernLayout() && ! MapTourHelper.isOnMobileView();
				if( ! isDesktopModernUI )
					return app.map.setExtent(extent, true);
				else {
					var offsetX = 10 + domGeom.position(dom.byId("picturePanel")).w;
					var offsetY = 10 + domGeom.position(dom.byId("footer")).h;

					var extentResX = extent.getWidth() / app.map.width;
					var extentResY = extent.getHeight() / app.map.height;

					var newExtent = new Extent({
						xmin: extent.xmin,
						ymin: extent.ymin - extentResY * offsetY,
						xmax: extent.xmax + extentResX * offsetX,
						ymax: extent.ymax,
						spatialReference: extent.spatialReference
					});

					/*
					var testLayer = new GraphicsLayer();
					testLayer.add(new Graphic(extent,new SimpleFillSymbol()))
					testLayer.add(new Graphic(newExtent,new SimpleFillSymbol()))
					app.map.addLayer(testLayer);
					*/

					var lods = app.map._params.lods;
					var level = Helper.getFirstLevelWhereExtentFit(newExtent, app.map);
					if( level != -1 ) {
						var newCenter = new Point(
							extent.getCenter().x + (app.map.width / 2 - (domGeom.position(dom.byId("picturePanel")).x / 2)) * lods[level].resolution,
							extent.getCenter().y - (10 + domGeom.position(dom.byId("footer")).h / 2) * lods[level].resolution,
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
					if ( app.map.spatialReference.wkid != 102100 && app.map.spatialReference.wkid != 4326 ) {
						esriConfig.defaults.geometryService.project([geom], app.map.spatialReference, function(features){
							if( ! features || ! features[0] )
								return;

							if (! visibleMapContains(features[0]))
								_this.centerMap(features[0]);
						});
					}
					else if (! visibleMapContains(geom))
						_this.centerMap(geom);
				}
				else {
					$("#mapPanel .mapLocationMsg").html(i18n.viewer.locator.error);
					$("#mapPanel .mapLocationError").fadeIn();

					setTimeout(function(){
						$("#mapPanel .mapLocationError").fadeOut();
					}, 5000);
				}
			};

			/**
			 * Add two new function to Graphic that control the state of the tour point
			 */
			function addMapTourBusinessToEsriGraphic()
			{
				/**
				 * Return true if the tour point has been updated between the last save
				 * A tour point has been updated if the geometry or name or descriptiona attributes has changed
				 */
				Graphic.prototype.hasBeenUpdated = function()
				{
					var originalGeom = this.attributes.getOriginalGraphic().geometry;
					return this.attributes.hasBeenUpdated()
							|| this.geometry.x != originalGeom.x
							|| this.geometry.y != originalGeom.y
							|| this.commitFailed;
				};

				/**
				 * Get the updated feature for commiting to Feature service
				 * Commit change to the original feature and return the original feature
				 */
				Graphic.prototype.getUpdatedFeature = function()
				{
					this.attributes.commitUpdate();

					var originalGeom = this.attributes.getOriginalGraphic().geometry;
					originalGeom.x = this.geometry.x;
					originalGeom.y = this.geometry.y;

					return this.attributes.getOriginalGraphic();
				};

				/**
				 * Restore the attributes and geometry to the data source.
				 * Discard all changes in the app
				 */
				Graphic.prototype.restoreOriginal = function()
				{
					this.attributes.restoreOriginal();

					var originalGeom = this.attributes.getOriginalGraphic().geometry;
					this.geometry.x = originalGeom.x;
					this.geometry.y = originalGeom.y;
				};

				Graphic.prototype.setUpdateFailed = function()
				{
					this.commitFailed = true;
				};

				Graphic.prototype.cleanUpdateFailed = function()
				{
					if( this.commitFailed )
						delete this.commitFailed;
				};
			}

			this.initLocalization = function()
			{
				app.desktopPicturePanel.initLocalization();
			};
		};
	}
);
