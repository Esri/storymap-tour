define(["storymaps/maptour/core/MapTourHelper", 
		"storymaps/utils/Helper", 
		"storymaps/utils/MovableGraphic",
		"storymaps/maptour/builder/MapTourBuilderHelper",
		"storymaps/utils/WebMapHelper",
		"esri/toolbars/edit"], 
	function (MapTourHelper, Helper, MovableGraphic, MapTourBuilderHelper, WebMapHelper) {
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
			var _geotagMap = null;
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
			}
			
			this.getView = function(params)
			{
				if (params) {
					_data = params.data;
					showView();
				}
				return _container;
			}
			
			this.postDisplayCallback = function()
			{
				mapFirstDisplay();
			}
			
			this.getNextView = function()
			{
				changeFooterState("progress");
				
				if( _layer )
					importLayer();
				else
					saveWebmap();
				
				return;
			}
			
			//
			// View creation
			//
			
			function showView()
			{
				if( _data.length == 0 ) {
					console.error("Error empty dataset")
					return;
				}
				
				var btnNext = _footer.find('.btnNext');
				btnNext.html(i18n.viewer.viewGeoTag.footerImport);
				initMapAndList();
				updateTabName();
				displayTab(0);
			}
			
			function initMapAndList()
			{
				var listGeo = "";
				var listNonGeo = "";
				
				if (_geotagMap) {
					_geotagMap.destroy();
					_geotagMap = null;
				}
				
				_pointsLayer = new esri.layers.GraphicsLayer({
					id: "geotagLayer"
				});
				
				_geoTagIndex = _startIndex;
				
				// Populate the tabs
				$.each(_data, function(i, point){
					if( point.lat && point.lng ) {
						var geom = esri.geometry.geographicToWebMercator(new esri.geometry.Point(point.lng, point.lat));
						_pointsLayer.add(getGraphic(geom, _geoTagIndex, point));
						
						listGeo += generatePictureDiv(point, i, _geoTagIndex);
						_geoTagIndex++;
					}
					else
						listNonGeo += generatePictureDiv(point, i, -1);
				});
				_container.find(".tab-content > div").eq(0).html("<ul>" + listNonGeo + "</ul>");
				_container.find(".tab-content > div").eq(1).html("<ul>" + listGeo + "</ul>");
				
				_container.find('.clickOrTapInfo').removeClass('stickTop');
				
				_geotagMap = new esri.Map(_mapDivId, {
					slider: true,
					autoResize: false,
					extent: Helper.getWebMapExtentFromItem(app.data.getWebMapItem().item)
				});
				
				var handle = dojo.connect(_geotagMap, "onUpdateEnd", function() {
					dojo.disconnect(handle);
					_geotagMap.disableKeyboardNavigation();
					
					// Does not work on Ipad (onpress doesn't get the event.graphic
					//new MovableGraphic(_geotagMap, _pointsLayer, null);
					
					_extentMapEditToolbar = new esri.toolbars.Edit(_geotagMap);
					dojo.connect(_pointsLayer, "onClick", pointLayerClick);
					dojo.connect(_geotagMap, "onClick", mapClick);
				});
				
				// Click event on the to be located list
				createToLocateClickEvent();
				
				var basemap = app.map.getLayer(app.map.layerIds[0]);
				_geotagMap.addLayer(Helper.cloneLayer(basemap));
				_geotagMap.addLayer(_pointsLayer);
				
				changeFooterState(_geoTagIndex == _startIndex ? "nodata" : "data");
			}
			
			function generatePictureDiv(point, index, geoTagIndex)
			{
				return  "<li> \
							<div> \
								<img \
									data-index='" + index + "' data-geotagindex='" + geoTagIndex + "'\
									src='" + point.thumb_url + "' \
									draggable='false' \
								 	/>\
								<div>" + point.name + "</div> \
								<button type='button' class='close' title='" + i18n.viewer.viewGeoTag.clickDrop + "' onClick='app.builder.popupViewGeoTagDeletePic(" + index + ")'>×</button> \
							</div> \
						</li>";
			}
			
			function mapFirstDisplay()
			{
				_geotagMap.resize();
				var handle = dojo.connect(_geotagMap, 'onUpdateEnd', function(error, info){
					dojo.disconnect(handle);
					var initialExtent = Helper.getWebMapExtentFromItem(app.data.getWebMapItem().item);
					
					if (_pointsLayer.graphics.length > 1) {
						try {
							initialExtent = esri.graphicsExtent(_pointsLayer.graphics).expand(2);
						} catch(e){ }
					}
					_geotagMap.setExtent(initialExtent, true);
				});
			}
			
			//
			// UI events
			//
			
			function pointLayerClick(evt)
			{
				dojo.stopEvent(evt);
				_extentMapEditToolbar.activate(esri.toolbars.Edit.MOVE, evt.graphic);
				evt.graphic.setSymbol(MapTourHelper.getSymbol(null, evt.graphic.attributes["__OBJECTID"], "selected"));
				
				if( _selectedGraphic )
					_selectedGraphic.setSymbol(MapTourHelper.getSymbol(null, _selectedGraphic.attributes["__OBJECTID"]));
				
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
						_selectedGraphic.setSymbol(MapTourHelper.getSymbol(null, _selectedGraphic.attributes["__OBJECTID"]));
				}
			}
			
			function createToLocateClickEvent()
			{
				_container.find(".tab-content > div").eq(0).find("li").unbind("click").click(
					function(event){
						var alreadySelected = $(this).hasClass("clicked");
						
						_container.find(".tab-content > div").eq(0).find("li").removeClass("clicked");
						
						if( ! alreadySelected ) {
							$(this).addClass("clicked");
							$(this).css("min-height", $(this).css("height"))
							_container.find('.clickOrTapInfo').css("display", "block").animate({opacity:1}, 150);
							setTimeout(function(){
								setTimeout(function(){
									_container.find('.clickOrTapInfo').animate({opacity:0}, 250);
									_geotagMap.setMapCursor("pointer")
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
							_geotagMap.setMapCursor("default")
						}
					}
				);
				_container.find(".tab-content > div").eq(0).find("li").removeClass("clicked");
			}
			
			//
			// Data model
			//
			
			/**
			 * Create the esri.graphic for the point of index and geom
			 * @param {Object} geom
			 * @param {Object} index
			 * @param {Object} point
			 */
			function getGraphic(geom, index, point)
			{
				var attributes = {};
				var fieldsName = getFieldsName();
				
				attributes['icon_color'] = APPCFG.PIN_DEFAULT_CFG;
				attributes['__OBJECTID'] = index;
				attributes[fieldsName.fieldName] = point.name || '';
				attributes[fieldsName.fieldDescription] = point.description || '';
				attributes[fieldsName.fieldURL] = point.pic_url;
				attributes[fieldsName.fieldThumb] = point.thumb_url;
				
				return new esri.Graphic(
					geom,
					MapTourHelper.getSymbol(null, index),
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
						fieldThumb: 'thumb_url'
					};
			}
			
			function addPoint(pointIndex, event)
			{	
				if (pointIndex != null && event) {
					var point = _data[pointIndex];
					var geom = _geotagMap.toMap(new esri.geometry.Point(event.layerX, event.layerY));
					
					_pointsLayer.add(getGraphic(geom, _startIndex + _pointsLayer.graphics.length, point));
					
					
					var newLocatedImg = _container.find(".tab-content > div").eq(0).find("img[data-index='" + pointIndex + "']");
					var newLocatedContainer = newLocatedImg.parent().parent();
					newLocatedImg.data("geotagindex", _geoTagIndex)
					newLocatedContainer.removeClass("clicked");
					_container.find(".tab-content > div ul").eq(1).append(newLocatedContainer);
					
					_geoTagIndex++;
					
					$("#" + _mapDivId).removeClass('dragover');
					updateTabName();
					changeFooterState(_geoTagIndex == _startIndex ? "nodata" : "data");
					_geotagMap.setMapCursor("default")
				}
			}
			
			function deletePoint(pointIndex)
			{
				var img = _container.find(".tab-content > div").eq(1).find("img[data-index='" + pointIndex + "']");
				var imgContainer = img.parent().parent();
				var geotagIndex = img.data('geotagindex');
				
				img.attr("draggable", "false");
				imgContainer.removeClass("clicked");
				_container.find(".tab-content > div ul").eq(0).append(imgContainer);
				
				$.each(_pointsLayer.graphics, function(i, graphic){
					if( graphic && graphic.attributes.__OBJECTID == geotagIndex )
						_pointsLayer.remove(graphic);
				});
				
				// Renumber Map
				$.each(_pointsLayer.graphics, function(i, graphic){
					// _geoTagIndex is not kept in sync with the numbering, it increment each time
					// a feature is located and is not decremented when deleted
					// Ok as the import doesn't use the objectid, it will renumber them based on layer order
					graphic.setSymbol(MapTourHelper.getSymbol(null, _startIndex + i));
				});
				
				updateTabName();
				changeFooterState(_geoTagIndex == _startIndex ? "nodata" : "data");
				setTimeout(createToLocateClickEvent, 200);
			}
			
			//
			// SAVE/IMPORT
			//
			
			function importLayer()
			{
				changeFooterState("progress");
				
				setTimeout(function(){
					_initCompleteDeferred.resolve(getResultFeatureCollection());
				}, 800);
			}
			
			function saveWebmap()
			{
				_webmap.itemData.operationalLayers.push(MapTourBuilderHelper.getNewLayerJSON(getResultFeatureCollection()));
				
				WebMapHelper.saveWebmap(_webmap, _portal).then(function(){
					changeFooterState("succeed");
					setTimeout(function(){
						_initCompleteDeferred.resolve();
					}, 800);
				});
			}
			
			function getResultFeatureCollection()
			{
				var featureCollection = MapTourBuilderHelper.getFeatureCollectionTemplate(true);
				
				$.each(_pointsLayer.graphics, function(i, graphic){
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
			
			function onTabClick(event) 
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
				if( _container.find('.header').html() != "" )
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
				
				initEvents();
			}
		}
	}
);