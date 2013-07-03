define(["storymaps/utils/Helper", "esri/toolbars/draw", "esri/toolbars/edit"], 
	function (Helper) {
		return function SettingsPopupTabExtent(titleContainer, contentContainer) 
		{
			var _extentMap = null;
			var extentDrawBtn = $(contentContainer).find("#extentDraw");
			var extentModifyBtn = $(contentContainer).find("#extentModify");
			var extentApplyBtn = $(contentContainer).find("#extentApply");
			var _extentMapDrawToolActive = false;
			var _extentMapDrawToolbar = null;
			var _extentMapEditToolbar = null;
			
			extentDrawBtn.click(function(){
				_extentMapDrawToolbar.activate(esri.toolbars.Draw.EXTENT);
			});
			
			extentModifyBtn.click(function(){
				_extentMapEditToolbar.activate(esri.toolbars.Edit.MOVE | esri.toolbars.Edit.SCALE, getUserExtent());
			});
			
			extentApplyBtn.click(function(){
				var extent = getUserExtent();
				if( extent ) 
					dojo.publish("CORE_UPDATE_EXTENT", extent.geometry.getExtent());
			});
					
			this.init = function(settings) 
			{			
				initExtentmap(settings.extent);
			}
			
			this.show = function()
			{
				if( ! $(titleContainer).hasClass("alreadyOpened") ) {
					_extentMap.resize();
					var handle = dojo.connect(_extentMap, 'onUpdateEnd', function(error, info){
						dojo.disconnect(handle);
						_extentMap.centerAt(_extentMap.getLayer("extentlayer").graphics[0].geometry.getExtent().getCenter());
					});
					$(titleContainer).addClass("alreadyOpened");
				}
			}
			
			this.save = function()
			{		
				return {
					extent: getUserExtent().geometry.getExtent(),
				};
			}
			
			function initExtentmap(extent)
			{
				_extentMap && _extentMap.destroy();
				_extentMap = null;
				$(titleContainer).removeClass("alreadyOpened");
				
				// Default to the U.S.
				if (!extent) 
					extent = new esri.geometry.Extent({
						xmax: -57.98033474158346,
						xmin: -126.91406249996473,
						ymax: 50.25667033538553,
						ymin: 21.9430455334323,
						spatialReference: {
							wkid: 4326
						}
					});
				
				_extentMap = new esri.Map("extentMap", {
					slider: true,
					center: extent.getCenter(),
					extent: extent.expand(2),
					autoResize: false
				});
				
				dojo.connect(_extentMap, "onLoad", function(){
					_extentMapDrawToolbar = new esri.toolbars.Draw(_extentMap);
					_extentMapEditToolbar = new esri.toolbars.Edit(_extentMap);
					
					dojo.connect(_extentMapDrawToolbar, "onActivate", function(){
						extentLayer.clear();
						_extentMapEditToolbar.deactivate();
						_extentMapDrawToolActive = true;
					});
					
					dojo.connect(_extentMapDrawToolbar, "onDrawEnd", function(geometry){
						extentLayer.add(createExtentGraphics(geometry));
						_extentMapDrawToolbar.deactivate();
						_extentMapDrawToolActive = false;
					});
					
					dojo.connect(extentLayer, "onClick", function(evt){
						if (_extentMapDrawToolActive == false) {
							dojo.stopEvent(evt);
							_extentMapEditToolbar.activate(esri.toolbars.Edit.MOVE | esri.toolbars.Edit.SCALE, evt.graphic);
						}
					});
					
					dojo.connect(extentLayer, "onMouseOver", function(){
						_extentMap.setMapCursor("pointer");
					});
					
					dojo.connect(extentLayer, "onMouseOut", function(){
						_extentMap.setMapCursor("default");
					});
					
					dojo.connect(_extentMap, "onClick", function(evt){
						_extentMapEditToolbar.deactivate();
					});
				});
				
				var basemap = app.map.getLayer(app.map.layerIds[0]);
				_extentMap.addLayer(Helper.cloneLayer(basemap));
				
				var extentLayer = new esri.layers.GraphicsLayer({
					id: "extentlayer"
				});
				
				extentLayer.add(createExtentGraphics(extent));
				_extentMap.addLayer(extentLayer);
			}
				
			function createExtentGraphics(extent)
			{
				return new esri.Graphic(
					Helper.extentToPolygon(extent),
					new esri.symbol.SimpleFillSymbol(
						esri.symbol.SimpleFillSymbol.STYLE_SOLID, 
						new esri.symbol.SimpleLineSymbol(
							esri.symbol.SimpleLineSymbol.STYLE_DASHDOT, 
							new dojo.Color([255, 0, 0]),
							2
						), 
						new dojo.Color([255, 255, 0, 0.25])
					)
				);
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
				
				extentDrawBtn.html(i18n.viewer.builderHTML.settingsExtentDrawBtn);
				extentModifyBtn.html(i18n.viewer.builderHTML.settingsExtentModifyBtn);
				extentApplyBtn.html(i18n.viewer.builderHTML.settingsExtentApplyBtn);
			}
		}
	}
);