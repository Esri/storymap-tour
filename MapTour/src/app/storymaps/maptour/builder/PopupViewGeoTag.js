define(["storymaps/maptour/core/MapTourHelper",
		"storymaps/utils/Helper",
		"storymaps/utils/MovableGraphic",
		"storymaps/maptour/builder/MapTourBuilderHelper",
		"storymaps/utils/WebMapHelper",
		"esri/toolbars/edit",
		"esri/map",
		"esri/layers/GraphicsLayer",
		"esri/geometry/webMercatorUtils",
		"esri/graphicsUtils",
		"esri/graphic",
		"esri/geometry/Point",
		"esri/config",
		"dojo/on",
		"dojo/_base/event"],
	function (
		MapTourHelper,
		Helper,
		MovableGraphic,
		MapTourBuilderHelper,
		WebMapHelper,
		Edit,
		Map,
		GraphicsLayer,
		webMercatorUtils,
		graphicsUtils,
		Graphic,
		Point,
		esriConfig,
		on,
		event)
	{
		return function PopupViewGeoTag(parentContainer)
		{
			// Clone the #popupViewCSV template into a new DIV
			$('#init-import-views').append($('#popupViewGeoTag').clone());
			// The container is the newly cloned
			var _container = $('.popupViewGeoTag').last();

			// Assign an unique id to the webmap container
			var _mapDivId = "popupViewGeoTag_" + parentContainer.attr("id");
			_container.find(".geotagMap").attr("id", _mapDivId);

			var _initCompleteDeferred = null;
			var _webmap = null;
			var _portal = null;
			var _layer = null;
			var _layerFields = null;
			var _startIndex = null;
			var _footer = null;

			var _data = null;
			var _albumTitle = null;

			var _geotagMap = null;
			var _mapIsReady = false;
			var _postDisplayCalled = false;
			var _pointsLayer = null;
			var _extentMapEditToolbar;
			var _selectedGraphic = null;
			var _geoTagIndex = null;

			this.init = function(params, initCompleteDeferred, footer)
			{
				_webmap = params.webmap;
				_portal = params.portal;
				_layer = params.layer;
				_layerFields = params.layerFields;

				_startIndex = params.startIndex || 1;
				_initCompleteDeferred = initCompleteDeferred;
				_footer = footer;

				app.builder.popupViewGeoTagDeletePic = deletePoint;
			};

			this.getView = function(params)
			{
				if (params) {
					_data = params.data;
					_albumTitle = params.title;
					showView();
				}
				return _container;
			};

			this.postDisplayCallback = function()
			{
				mapFirstDisplay();
			};

			this.getNextView = function()
			{
				changeFooterState("progress");

				if( _layer )
					importLayer();
				else
					saveWebmap();

				return;
			};

			this.getTitle = function()
			{
				return i18n.viewer.viewGeoTag.title;
			};

			//
			// View creation
			//

			function showView()
			{
				if( _data.length === 0 ) {
					console.error("Error empty dataset");
					return;
				}

				var btnNext = _footer.find('.btnNext');
				btnNext.html(i18n.viewer.viewGeoTag.footerImport);

				_container.find('.wait').removeClass('error').html(i18n.viewer.viewGeoTag.loading + '<img src="resources/icons/loader-upload.gif" class="waitSpinner"/>');
				_container.find('.waitContainer').show();

				initMapAndList();
				updateTabName();
				displayTab(0);
			}

			function initMapAndList()
			{
				_mapIsReady = false;
				_postDisplayCalled = false;

				// If the webmap isn't in mercator or WGS we need to reproject already geolocated points
				if (app.map.spatialReference.wkid != 102100 && app.map.spatialReference.wkid != 4326){
					var geoReferencedIdx = [];
					var geoReferencedGeom = [];
					$.each(_data, function(i, point){
						if( point.lat && point.lng ) {
							geoReferencedIdx.push(i);
							geoReferencedGeom.push(new Point(point.lng, point.lat));
						}
					});

					if( geoReferencedIdx.length > 0 ) {
						esriConfig.defaults.geometryService.project(geoReferencedGeom, app.map.spatialReference, function(features){
							if (!features || ! features.length) {
								_container.find('.wait').addClass('error').html(i18n.viewer.viewGeoTag.error);
								initMapAndListStep2(true);
								return;
							}

							$.each(features, function(i, point){
								_data[geoReferencedIdx[i]].lng = point.x;
								_data[geoReferencedIdx[i]].lat = point.y;
							});

							initMapAndListStep2();
						});
					}
					else
						initMapAndListStep2();
				}
				else
					initMapAndListStep2();
			}

			function initMapAndListStep2(errorDuringDataProjection)
			{
				if( errorDuringDataProjection )
					setTimeout(function(){
						_container.find('.waitContainer').hide();
					}, 5000);
				else
					_container.find('.waitContainer').hide();

				var listGeo = "";
				var listNonGeo = "";

				if (_geotagMap) {
					_geotagMap.destroy();
					_geotagMap = null;
				}

				_pointsLayer = new GraphicsLayer({
					id: "geotagLayer"
				});

				_geoTagIndex = _startIndex;

				// Populate the tabs
				$.each(_data, function(i, point){
					if( ! errorDuringDataProjection && point.lat && point.lng ) {
						var geom = new Point(point.lng, point.lat);

						if (app.map.spatialReference.wkid == 102100)
							geom = webMercatorUtils.geographicToWebMercator(geom);

						var graphic = getGraphic(geom, _geoTagIndex, i, point);
						graphic.geoTagIndex = _geoTagIndex;
						_pointsLayer.add(graphic);

						listGeo += generatePictureDiv(point, i, _geoTagIndex);
						_geoTagIndex++;
					}
					else
						listNonGeo += generatePictureDiv(point, i, -1);
				});
				_container.find(".tab-content > div").eq(0).html("<ul>" + listNonGeo + "</ul>");
				_container.find(".tab-content > div").eq(1).html(
					"<div style='margin-top: 4px;'><a class='btn btn-small clearLocation'>" + i18n.viewer.viewGeoTag.clearLoc + "</button></a>"
					+ "<ul>" + listGeo + "</ul>"
				);

				_container.find('.clearLocation').click(clearLocation);
				_container.find('.clickOrTapInfo').removeClass('stickTop');

				_geotagMap = new Map(_mapDivId, {
					slider: true,
					autoResize: false,
					extent: Helper.getWebMapExtentFromItem(app.data.getWebMapItem().item),
					smartNavigation: false
				});

				on.once(_geotagMap, "load", function() {
					_geotagMap.disableKeyboardNavigation();

					// Does not work on Ipad (onpress doesn't get the event.graphic
					//new MovableGraphic(_geotagMap, _pointsLayer, null);

					_extentMapEditToolbar = new Edit(_geotagMap);
					on(_pointsLayer, "click", pointLayerClick);
					on(_geotagMap, "click", mapClick);

					// That logic can probably get better
					_mapIsReady = true;
					// If post display have been called before we get ready ...
					if ( _postDisplayCalled ) {
						_geotagMap.resize(true);
						centerMap();
					}
				});

				// Click event on the to be located list
				createToLocateClickEvent();
				if(app.data.getWebMapItem() && app.data.getWebMapItem().itemData.baseMap){
					$.each(app.data.getWebMapItem().itemData.baseMap.baseMapLayers, function(i, bmLayer){
						$.each(app.map.layerIds, function(i, layerId){
							var basemap;
							if(app.map.getLayer(layerId).url && bmLayer.url){
								_geotagMap.addLayer(Helper.cloneLayer(app.map.getLayer(layerId)));
								if(!basemap)
									basemap = app.map.getLayer(layerId);
							} else if(app.map.getLayer(layerId).url == bmLayer.styleUrl){
								var parser1 = document.createElement('a');
								parser1.href = app.map.getLayer(layerId).url;
								var parser2 = document.createElement('a');
								parser2.href = bmLayer.styleUrl;
								if(parser1.hostname + parser1.pathname == parser2.hostname + parser2.pathname){
									_geotagMap.addLayer(Helper.cloneLayer(app.map.getLayer(layerId), bmLayer));
									if(!basemap)
										basemap = app.map.getLayer(layerId);
								}
							}
						});
					});
				}
				_geotagMap.addLayer(_pointsLayer);

				changeFooterState(_geoTagIndex == _startIndex ? "nodata" : "data");
				updateClearLocationState();
			}

			function generatePictureDiv(point, index, geoTagIndex)
			{
				var str = "<li> \
							<div> \
								<img \
									data-index='" + index + "' \
									data-geotagindex='" + geoTagIndex + "' \
									src='" + point.thumb_url + "' \
									draggable='false' \
									/>\
								<div class='geotagPicName'>" + point.name + "</div> \
								<button type='button' class='close' title='" + i18n.viewer.viewGeoTag.clickDrop + "' onClick='app.builder.popupViewGeoTagDeletePic(this)'>×</button> \
							</div> \
						</li>";
				return str;
			}

			function mapFirstDisplay()
			{
				if (_mapIsReady)
					centerMap();
				_postDisplayCalled = true;
			}

			function centerMap()
			{
				var initialExtent = Helper.getWebMapExtentFromItem(app.data.getWebMapItem().item);

				if (_pointsLayer.graphics.length > 1) {
					try {
						initialExtent = graphicsUtils.graphicsExtent(_pointsLayer.graphics).expand(2);
					} catch(e){ }
				}

				if (_geotagMap.spatialReference.wkid != initialExtent.spatialReference.wkid) {
					esriConfig.defaults.geometryService.project([initialExtent], _geotagMap.spatialReference, function(features){
						if (!features || !features[0])
							return;

						_geotagMap.setExtent(features[0], true);
					});
				}
				else
					_geotagMap.setExtent(initialExtent, true);
			}

			//
			// UI events
			//

			function pointLayerClick(evt)
			{
				event.stop(evt);

				_extentMapEditToolbar.activate(Edit.MOVE, evt.graphic);
				evt.graphic.setSymbol(MapTourHelper.getSymbol(null, evt.graphic.geoTagIndex, "selected"));

				if( _selectedGraphic )
					_selectedGraphic.setSymbol(MapTourHelper.getSymbol(null, _selectedGraphic.geoTagIndex));

				_selectedGraphic = evt.graphic;
			}

			function mapClick(evt)
			{
				var selectedPoint = _container.find(".tab-content > div").eq(0).find("li.clicked");
				if (selectedPoint.length)
					addPoint(selectedPoint.find("img").data("index"), evt);
				else {
					_extentMapEditToolbar.deactivate();
					if (_selectedGraphic)
						_selectedGraphic.setSymbol(MapTourHelper.getSymbol(null, _selectedGraphic.geoTagIndex));
				}
			}

			function createToLocateClickEvent()
			{
				_container.find(".tab-content > div").eq(0).find("li").unbind("click").click(
					function(){
						var alreadySelected = $(this).hasClass("clicked");

						_container.find(".tab-content > div").eq(0).find("li").removeClass("clicked");

						if( ! alreadySelected ) {
							$(this).addClass("clicked");
							$(this).css("min-height", $(this).css("height"));
							_container.find('.clickOrTapInfo').css("display", "block").animate({opacity:1}, 150);
							setTimeout(function(){
								setTimeout(function(){
									_container.find('.clickOrTapInfo').animate({opacity:0}, 250);
									_geotagMap.setMapCursor("pointer");
									setTimeout(function(){
										_container.find('.clickOrTapInfo').css("display", "none");
										_container.find('.clickOrTapInfo').addClass('stickTop');
									}, 260);
								}, 1000);
							});
						}
						else {
							_container.find('.clickOrTapInfo').animate({opacity:0}, 250);
							setTimeout(function(){
								_container.find('.clickOrTapInfo').css("display", "none");
							}, 260);
							_geotagMap.setMapCursor("default");
						}
					}
				);
				_container.find(".tab-content > div").eq(0).find("li").removeClass("clicked");
			}

			function clearLocation()
			{
				var imgContainers = _container.find(".tab-content > div").eq(1).find("li");
				imgContainers.find("img").attr("draggable", "false");
				_container.find(".tab-content > div ul").eq(0).append(imgContainers);

				_pointsLayer.clear();
				_geoTagIndex = _startIndex;

				updateTabName();
				changeFooterState("nodata");
				updateClearLocationState();
				setTimeout(createToLocateClickEvent, 200);
			}

			//
			// Data model
			//

			/**
			 * Create the Graphic for the point of index and geom
			 * @param {Object} geom
			 * @param {Object} index
			 * @param {Object} point
			 */
			function getGraphic(geom, geoTagIndex, index, point)
			{
				var attributes = {};
				var fieldsName = getFieldsName();

				attributes.icon_color = APPCFG.PIN_DEFAULT_CFG;
				attributes.__OBJECTID = index;
				attributes[fieldsName.fieldName] = point.name || '';
				attributes[fieldsName.fieldDescription] = point.description || '';
				attributes[fieldsName.fieldURL] = point.pic_url;
				attributes[fieldsName.fieldThumb] = point.thumb_url;

				if ( app.data.layerHasVideoField() || app.isDirectCreationFirstSave || app.isGalleryCreation )
					attributes[fieldsName.fieldVideo] = point.is_video;

				return new Graphic(
					geom,
					MapTourHelper.getSymbol(APPCFG.PIN_DEFAULT_CFG, geoTagIndex),
					attributes
				);
			}

			/**
			 * Get fieldName to be use from creating graphing
			 *  - the fields from the layer
			 *  - the default from all pictures sharing first import
			 */
			function getFieldsName()
			{
				if( _layerFields )
					return app.data.lookForMatchingFields(_layerFields).fields;
				else
					return {
						fieldName: 'name',
						fieldDescription: 'description',
						fieldURL: 'pic_url',
						fieldThumb: 'thumb_url',
						fieldVideo: 'is_video'
					};
			}

			function addPoint(pointIndex, event)
			{
				if (pointIndex != null && event) {
					var point = _data[pointIndex];
					var geom = _geotagMap.toMap(event.screenPoint ? event.screenPoint : new Point(event.layerX, event.layerY));
					var graphic = getGraphic(geom, _startIndex + _pointsLayer.graphics.length, pointIndex, point);

					graphic.geoTagIndex = _startIndex + _pointsLayer.graphics.length;
					_pointsLayer.add(graphic);

					var newLocatedImg = _container.find(".tab-content > div").eq(0).find("img[data-index='" + pointIndex + "']");
					var newLocatedContainer = newLocatedImg.parent().parent();
					newLocatedImg.data("geotagindex", _geoTagIndex);
					newLocatedContainer.removeClass("clicked");
					_container.find(".tab-content > div ul").eq(1).append(newLocatedContainer);

					_geoTagIndex++;

					$("#" + _mapDivId).removeClass('dragover');
					updateTabName();
					changeFooterState(_geoTagIndex == _startIndex ? "nodata" : "data");
					updateClearLocationState();
					_geotagMap.setMapCursor("default");
				}
			}

			function deletePoint(e)
			{
				var imgContainer = $(e).parent().parent();
				var img = _container.find(".tab-content > div").eq(1).find("li").eq(imgContainer.index()).find('img');
				var index = img.data('index');

				img.attr("draggable", "false");
				imgContainer.removeClass("clicked");
				_container.find(".tab-content > div ul").eq(0).append(imgContainer);

				$.each(_pointsLayer.graphics, function(i, graphic){
					if( graphic && graphic.attributes.__OBJECTID == index )
						_pointsLayer.remove(graphic);
				});

				// Renumber Map
				$.each(_pointsLayer.graphics, function(i, graphic){
					// _geoTagIndex is not kept in sync with the numbering, it increment each time
					// a feature is located and is not decremented when deleted
					// Ok as the import doesn't use the objectid, it will renumber them based on layer order
					graphic.setSymbol(MapTourHelper.getSymbol(null, _startIndex + i, _selectedGraphic == graphic ? "selected" : ""));
					graphic.geoTagIndex = _startIndex + i;
				});

				updateTabName();
				changeFooterState(_geoTagIndex == _startIndex ? "nodata" : "data");
				updateClearLocationState();
				setTimeout(createToLocateClickEvent, 200);
			}

			//
			// SAVE/IMPORT
			//

			function importLayer()
			{
				changeFooterState("progress");

				// Does layer has a is_video field
				var isVideoField = app.data.electFieldsFromFieldsList(app.data.getSourceLayer().fields).getIsVideoField();

				setTimeout(function(){
					_initCompleteDeferred.resolve(getResultFeatureCollection(isVideoField));
				}, 800);
			}

			function saveWebmap()
			{
				// Add the new layer
				_webmap.itemData.operationalLayers.push(MapTourBuilderHelper.getNewLayerJSON(getResultFeatureCollection("is_video")));
				// Set the extent to the dataset
				app.data.getWebMapItem().item.extent = Helper.serializeExtentToItem(_geotagMap.extent);

				var saveSucceed = function() {
					changeFooterState("succeed");
					setTimeout(function(){
						_initCompleteDeferred.resolve(_albumTitle);
					}, 800);
				};

				if( app.isDirectCreationFirstSave || app.isGalleryCreation )
					saveSucceed();
				else
					WebMapHelper.saveWebmap(_webmap, _portal).then(saveSucceed);
			}

			function getResultFeatureCollection(isVideoField)
			{
				var featureCollection = MapTourBuilderHelper.getFeatureCollectionTemplate(true);

				$.each(_pointsLayer.graphics, function(i, graphic){
					// Add video field if needed
					// It is ignored if the layer don't have the field
					if( isVideoField )
						graphic.attributes[isVideoField] = graphic.attributes[isVideoField] ? "true" : "false";

					featureCollection.featureSet.features.push({
						"geometry": graphic.geometry.toJson(),
						"attributes": graphic.attributes
					});
				});

				return featureCollection;
			}

			//
			// UI
			//

			function initEvents()
			{
				_container.find(".nav-tabs > li").click(onTabClick);
			}

			function onTabClick()
			{
				var tabIndex = $(this).index();
				displayTab(tabIndex);
			}

			function displayTab(tabIndex)
			{
				var tabsBar = _container.find(".nav-tabs > li");
				var tabsContent = _container.find(".tab-content > div");

				tabsBar.removeClass("active");
				tabsContent.hide();

				tabsBar.eq(tabIndex).addClass("active");
				tabsContent.eq(tabIndex).show();
			}

			function updateTabName()
			{
				_container.find('.nav-tabs a').eq(0).html(
					i18n.viewer.viewGeoTag.leftPanelTab1
					+ ' (' + _container.find(".tab-content > div").eq(0).find("img").length + ')'
				);
				_container.find('.nav-tabs a').eq(1).html(
					i18n.viewer.viewGeoTag.leftPanelTab2
					+ ' (' + _container.find(".tab-content > div").eq(1).find("img").length + ')'
				);
			}

			function updateClearLocationState()
			{
				if ( _container.find(".tab-content > div").eq(1).find("li").length )
					_container.find('.clearLocation').removeAttr("disabled");
				else
					_container.find('.clearLocation').attr("disabled", "disabled");
			}

			function changeFooterState(state)
			{
				var btnPrev = _footer.find('.btnPrev');
				var btnNext = _footer.find('.btnNext');
				var footerText = _footer.find('.dataFooterText');

				if( state == "progress" ) {
					btnNext.attr("disabled", "true");
					btnPrev.attr("disabled", "true");
					footerText.html(i18n.viewer.viewGeoTag.footerProgress + ' <img src="resources/icons/loader-upload.gif" />');
					footerText.show();
				}
				else if( state == "succeed" ) {
					btnNext.attr("disabled", "true");
					btnPrev.attr("disabled", "true");
					footerText.html(i18n.viewer.viewGeoTag.footerSucceed);
					footerText.show();
				}
				else if ( state == "nodata" ) {
					btnNext.attr("disabled", "true");
				}
				else if ( state == "data" ) {
					btnNext.removeAttr("disabled");
				}
			}

			this.initLocalization = function()
			{
				// Prevent multiple initialization from different components
				if( _container.find('.header').html() !== "" )
					return;

				_container.find('.header').append(i18n.viewer.viewGeoTag.header + ' <a>' + i18n.viewer.viewGeoTag.headerMore + '<a>');
				_container.find('.header a').popover({
					trigger: 'hover',
					placement: 'bottom',
					html: true,
					content: '<script>$(".header a").next(".popover").css("min-width", "490px").css("max-width", "490px");</script>'
								+  i18n.viewer.viewGeoTag.headerExplain
				});

				_container.find('.clickOrTapInfo').append(i18n.viewer.viewGeoTag.clickOrTap);
				_container.find('.wait').html(i18n.viewer.viewGeoTag.loading);

				initEvents();
			};
		};
	}
);
