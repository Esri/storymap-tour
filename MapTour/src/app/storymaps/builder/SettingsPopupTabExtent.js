define(["storymaps/utils/Helper", 
		"esri/map",
		"esri/toolbars/draw", 
		"esri/toolbars/edit",
		"esri/layers/GraphicsLayer",
		"esri/geometry/Extent",
		"esri/graphic",
		"esri/symbols/SimpleFillSymbol",
		"esri/symbols/SimpleLineSymbol",
		"esri/geometry/webMercatorUtils",
		"esri/SpatialReference",
		"dojo/Deferred",
		"esri/config",
		"dojo/_base/Color",
		"dojo/topic",
		"dojo/on",
		"dojo/_base/connect",
		"dojo/_base/event"], 
	function (
		Helper, 
		Map, 
		Draw, 
		Edit, 
		GraphicsLayer, 
		Extent, 
		Graphic, 
		SimpleFillSymbol, 
		SimpleLineSymbol,
		webMercatorUtils,
		SpatialReference,
		Deferred,
		esriConfig,
		Color,
		topic,
		on,
		connect,
		event)
	{
		return function SettingsPopupTabExtent(titleContainer, contentContainer) 
		{
			var _extentMap = null;
			var extentDrawBtn = $(contentContainer).find("#extentDraw");
			var extentModifyBtn = $(contentContainer).find("#extentModify");
			var extentUseMainMap = $(contentContainer).find("#extentUseMainMap");
			var extentApplyBtn = $(contentContainer).find("#extentApply");
			var _extentMapDrawToolActive = false;
			var _extentMapDrawToolbar = null;
			var _extentMapEditToolbar = null;
			var _projectedExtent = null;
			// This is the defined extent in 4326
			var _userExtent = null;
			
			extentDrawBtn.click(function(){
				_extentMapDrawToolbar.activate(Draw.EXTENT);
			});
			
			extentModifyBtn.click(function(){
				var extent = getUserExtent();
				if( extent )
					_extentMapEditToolbar.activate(Edit.MOVE | Edit.SCALE, extent);
			});
			
			extentUseMainMap.click(function(){
				_extentMapDrawToolbar.deactivate();
				_extentMapDrawToolActive = false;
				
				var layer = _extentMap.getLayer("extentlayer");
				layer.clear();
				layer.add(createExtentGraphics(app.map.extent));
				_extentMap.setExtent(app.map.extent.expand(2));
				_userExtent = app.map.extent;
			});
			
			extentApplyBtn.click(function(){
				var extent = getUserExtent();
				if( extent ) 
					topic.publish("CORE_UPDATE_EXTENT", extent.geometry.getExtent());
			});
					
			this.init = function(settings) 
			{			
				initExtentmap(settings.extent);
			};
			
			this.show = function()
			{
				if( ! $(titleContainer).hasClass("alreadyOpened") ) {
					_extentMap.resize();
					on.once(_extentMap, 'update-end', function(){
						if( _projectedExtent )
							_extentMap.setExtent(_projectedExtent.expand(2));
						else
							_extentMap.centerAt(_extentMap.getLayer("extentlayer").graphics[0].geometry.getExtent().getCenter());
					});
					$(titleContainer).addClass("alreadyOpened");
				}
			};
			
			this.save = function()
			{		
				// To not have to deal with a deferred here
				if( $(contentContainer).find('.dateLineError').css('display') == 'block' )
					return false;
				
				return {
					extent: _userExtent.getExtent()
				};
			};
			
			function initExtentmap(extent)
			{
				_extentMap && _extentMap.destroy();
				_extentMap = null;
				$(titleContainer).removeClass("alreadyOpened");
				
				// Default to the U.S.
				if (!extent) 
					extent = new Extent({
						xmax: -57.98033474158346,
						xmin: -126.91406249996473,
						ymax: 50.25667033538553,
						ymin: 21.9430455334323,
						spatialReference: {
							wkid: 4326
						}
					});
				
				_extentMap = new Map("extentMap", {
					slider: true,
					center: extent.getCenter(),
					extent: extent.expand(2),
					autoResize: false
				});
				
				var extentLayer = new GraphicsLayer({
					id: "extentlayer"
				});
				
				on(_extentMap, "load", function(){
					_extentMapDrawToolbar = new Draw(_extentMap);
					_extentMapEditToolbar = new Edit(_extentMap);
					
					connect.connect(_extentMapDrawToolbar, "onActivate", function(){
						extentLayer.clear();
						_extentMapEditToolbar.deactivate();
						_extentMapDrawToolActive = true;
					});
					
					connect.connect(_extentMapDrawToolbar, "onDrawEnd", function(geometry){
						extentCrossDateline(geometry).then(
							function(crossDl){
								toggleCrossingLineError(crossDl);
								
								extentLayer.add(createExtentGraphics(geometry));
								_extentMapDrawToolbar.deactivate();
								_extentMapDrawToolActive = false;
							},
							function(){
								toggleCrossingLineError(true, true);
							}
						);
					});
					
					on(_extentMapEditToolbar, "graphic-move-stop", function(params){
						extentCrossDateline(params.graphic.geometry).then(
							function(crossDl){
								toggleCrossingLineError(crossDl);
							},
							function(){
								toggleCrossingLineError(true, true);
							}
						);
					});
					
					on(_extentMapEditToolbar, "scale-stop", function(params){
						extentCrossDateline(params.graphic.geometry).then(
							function(crossDl){
								toggleCrossingLineError(crossDl);
							},
							function(){
								toggleCrossingLineError(true, true);
							}
						);
					});
					
					on(extentLayer, "click", function(evt){
						if (!_extentMapDrawToolActive) {
							event.stop(evt);
							_extentMapEditToolbar.activate(Edit.MOVE | Edit.SCALE, evt.graphic);
						}
					});
					
					connect.connect(extentLayer, "onMouseOver", function(){
						_extentMap.setMapCursor("pointer");
					});
					
					connect.connect(extentLayer, "onMouseOut", function(){
						_extentMap.setMapCursor("default");
					});
					
					on(_extentMap, "click", function(){
						_extentMapEditToolbar.deactivate();
					});
				});
				
				var basemap = app.map.getLayer(app.map.layerIds[0]);
				_extentMap.addLayer(Helper.cloneLayer(basemap));
				
				if (extent.spatialReference.wkid != basemap.spatialReference.wkid) {
					esriConfig.defaults.geometryService.project([extent], basemap.spatialReference).then(function(features){
						if (features && features[0]) {
							_projectedExtent = features[0];
							extentLayer.add(createExtentGraphics(features[0]));
							_extentMap.addLayer(extentLayer);
						}
					});
				}
				else {
					extentLayer.add(createExtentGraphics(extent));
					_extentMap.addLayer(extentLayer);
				}
				
				_userExtent = Helper.extentToPolygon(extent);
			}
				
			function createExtentGraphics(extent)
			{
				return new Graphic(
					Helper.extentToPolygon(extent),
					new SimpleFillSymbol(
						SimpleFillSymbol.STYLE_SOLID, 
						new SimpleLineSymbol(
							SimpleLineSymbol.STYLE_DASHDOT, 
							new Color([255, 0, 0]),
							2
						), 
						new Color([255, 255, 0, 0.25])
					)
				);
			}
			
			function extentCrossDateline(geom)
			{
				var resultDeferred = new Deferred();
				
				var callbackFct = function(extent)
				{
					resultDeferred.resolve(
						(extent.xmin > 0 && extent.xmax < 0)
						|| (extent.xmin > extent.xmax)
					);
					_userExtent = extent;
				};

				if( ! geom )
					resultDeferred.reject();
					
				if( geom.type == "polygon" )
					geom = geom.getExtent();
				
				if( geom.spatialReference.wkid == 102100 )
					geom = webMercatorUtils.webMercatorToGeographic(geom);
				
				if( geom.spatialReference.wkid != 4326 ) {
					esriConfig.defaults.geometryService.project([geom], new SpatialReference(4326)).then(function(features){
						if( ! features || ! features[0] )
							resultDeferred.reject();
						else
							callbackFct(features[0]);
					});
				}
				else
					callbackFct(geom);
					
				return resultDeferred;
			}
			
			function toggleCrossingLineError(display, fatal)
			{
				$(contentContainer)
					.find('.dateLineError')
					.toggle(display)
					.html(fatal ? i18n.viewer.builderHTML.settingsExtentDateLineError2 : i18n.viewer.builderHTML.settingsExtentDateLineError);
			}
			
			function getUserExtent()
			{
				return  _extentMap.getLayer("extentlayer") 
						&& _extentMap.getLayer("extentlayer").graphics
						&& _extentMap.getLayer("extentlayer").graphics.length > 0
						? _extentMap.getLayer("extentlayer").graphics[0] : null;
			}
			
			this.initLocalization = function()
			{
				$(titleContainer).html(i18n.viewer.builderHTML.settingsTabExtent);
				
				$(contentContainer).find('p').html(i18n.viewer.builderHTML.settingsExtentExplain);
				$(contentContainer).find('.explain2').html(i18n.viewer.builderHTML.settingsExtentExplainBottom);
				$(contentContainer).find('.dateLineError').html(i18n.viewer.builderHTML.settingsExtentDateLineError);
				
				extentDrawBtn.html(i18n.viewer.builderHTML.settingsExtentDrawBtn);
				extentModifyBtn.html(i18n.viewer.builderHTML.settingsExtentModifyBtn);
				extentUseMainMap.html(i18n.viewer.builderHTML.settingsExtentUseMainMap);
				extentApplyBtn.html(i18n.viewer.builderHTML.settingsExtentApplyBtn);
			};
		};
	}
);