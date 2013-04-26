define(["dojo/cookie", "dojo/has"], function(cookie, has){
	/**
	 * Helper
	 * @class Helper
	 * 
	 * Collection of helper functions
	 */
	return {
		isMobile: function()
		{
			return navigator.userAgent.match(/iPhone|iPad|iPod/i)
					|| navigator.userAgent.match(/Android/i) 
					|| navigator.userAgent.match(/BlackBerry/i)
					|| navigator.userAgent.match(/IEMobile/i);
		},
		isArcGISHosted: function(isProd)
		{
			return document.location.hostname.match(/.arcgis.com$/) 
				|| (! isProd && document.location.hostname.match(/.esri.com$/));
		},
		getWebmapID: function(isProd)
		{
			var urlParams = esri.urlToObject(document.location.search).query || {};
			
			if( configOptions && configOptions.webmap )
				return configOptions.webmap;
			
			if ( this.isArcGISHosted(isProd) )
				return urlParams.webmap;
			
			// Only authorize URL params outside of arcgis.com if a webmap owner is specified
			if( configOptions.authorizedOwners && configOptions.authorizedOwners.length > 0 && configOptions.authorizedOwners[0] )
				return urlParams.webmap;
		},
		getAppID: function(isProd)
		{
			var urlParams = esri.urlToObject(document.location.search).query || {};
			
			/*
			if( configOptions && configOptions.appid )
				return configOptions.appid;
			
			// If a webmap is specified disable reading from URL
			if( configOptions && configOptions.webmap )
				return null;
			*/
			
			// App id is only valid on arcgis.com
			return this.isArcGISHosted(isProd) ? urlParams.appid : null;
			//return urlParams.appid;
		},
		getGraphicsLayerByName: function(map, name)
		{
			var layer;
			for (var i = 0; i < map.graphicsLayerIds.length; i++) {
				layer = map.getLayer(map.graphicsLayerIds[i]);
				if (layer.name == name)
					return layer;
			}
			return null;
		},
		getWebMapExtentFromItem: function(item)
		{
			if( ! item.extent || item.extent.length != 2 )
				return null;
						
			var bottomLeft = esri.geometry.geographicToWebMercator(
				new esri.geometry.Point(
					item.extent[0][0],
					item.extent[0][1]
				)
			);
					
			var topRight = esri.geometry.geographicToWebMercator(
				new esri.geometry.Point(
					item.extent[1][0],
					item.extent[1][1]
				)
			);
			
			return new esri.geometry.Extent({
				xmax: topRight.x,
				xmin: bottomLeft.x,
				ymax: topRight.y,
				ymin: bottomLeft.y,
				spatialReference: {
					wkid: 102100
				}
			});
		},
		serializeExtentToItem: function(extent)
		{
			if( ! extent || ! extent.spatialReference )
				return null;
			
			var extentWgs = extent.spatialReference.wkid == 4326 ? extent : esri.geometry.webMercatorToGeographic(extent);
			
			return [
				[Math.round(extentWgs.xmin*10000)/10000, Math.round(extentWgs.ymin*10000)/10000],
				[Math.round(extentWgs.xmax*10000)/10000, Math.round(extentWgs.ymax*10000)/10000]
			];
		},
		serializedExtentEquals: function(extent1, extent2)
		{
			return extent1 
					&& extent2
					&& extent1.length == extent2.length
					&& extent1.length == 2
					&& extent1[0][0] == extent2[0][0]
					&& extent1[0][1] == extent2[0][1]
					&& extent1[1][0] == extent2[1][0]
					&& extent1[1][1] == extent2[1][1];
		},
		/*
		 * Clone Bing/OSM/Tile/Dynamic Map layer
		 * Default to light grey canvas if bing or not tile/dynamic
		 */
		cloneLayer: function(layer)
		{
			if( layer.url && layer.url.match(/virtualearth\./) )
				return new esri.layers.ArcGISTiledMapServiceLayer("http://services.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Light_Gray_Base/MapServer");
			else if(layer instanceof esri.layers.ArcGISTiledMapServiceLayer)
				return new esri.layers.ArcGISTiledMapServiceLayer(layer.url);
			else if (layer instanceof esri.layers.ArcGISDynamicMapServiceLayer)
				return new esri.layers.ArcGISDynamicMapServiceLayer(layer.url);
			else if (layer.id == "OpenStreetMap")
				return esri.layers.OpenStreetMapLayer();
			
			return new esri.layers.ArcGISTiledMapServiceLayer("http://services.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Light_Gray_Base/MapServer");
		},
		extentToPolygon: function(extent)
		{
			var p = new esri.geometry.Polygon(extent.spatialReference);
			p.addRing(
				[
					[extent.xmin, extent.ymin], 
					[extent.xmin, extent.ymax], 
					[extent.xmax, extent.ymax], 
					[extent.xmax, extent.ymin], 
					[extent.xmin, extent.ymin]
				]
			);
			return p;
		},
		getFirstLevelWhereExtentFit: function(extent, map)
		{
			var mapWidth = map.width;
			var mapHeight = map.height;
			var lods = map._params.lods;
			
			for (var l = lods.length - 1; l >= 0; l--) {
				if( mapWidth * map._params.lods[l].resolution > extent.getWidth() && mapHeight * map._params.lods[l].resolution > extent.getHeight() )
					return l;
			}
			
			return -1;
		},
		getPortalUser: function()
		{
			var esriCookie = cookie('esri_auth');
			return esriCookie ? JSON.parse(esriCookie.replace('"ssl":undefined','"ssl":""')).email : null;
		},
		getPortalRole: function()
		{
			var esriCookie = cookie('esri_auth');
			return esriCookie ? JSON.parse(esriCookie.replace('"ssl":undefined','"ssl":""')).role : null;
		},
		/**
		 * Clean the web map item to allow to clone the item
		 * @param {Object} item
		 */
		prepareWebmapItemForCloning: function(itemData)
		{
			dojo.forEach(itemData.baseMap.baseMapLayers, function(layer){
				delete layer.errors;
				delete layer.layerObject;
				delete layer.resourceInfo;
			});
			
			dojo.forEach(itemData.operationalLayers, function(layer){
				delete layer.errors;
				delete layer.layerObject;
				delete layer.resourceInfo;
				
				if( layer.featureCollection && layer.featureCollection.layers ) {
					dojo.forEach(layer.featureCollection.layers, function(fc){
						delete fc.layerObject;
					});
				}
			});
		},
		getWebmapViewerLinkFromSharingURL: function(sharingUrl)
		{
			var portalUrl = configOptions.sharingurl.split('/').slice(0,3).join('/');
			return portalUrl + '/home/webmap/viewer.html'
		},
		browserSupportAttachementUsingFileReader: function()
		{
			return !! window.FileReader 
					&& !! window.FormData 
					&& !! this.browserSupportCanvas() 
					&& !! window.Blob
					/*&& has("ie") != 10*/; // IE10 unexpectedly fail to do the addAttachment request (with CORS or proxy)
		},
		browserSupportCanvas: function()
		{
			var elem = document.createElement('canvas');
			return !!(elem.getContext && elem.getContext('2d'));
		},
		browserSupportFileReaderBinaryString: function()
		{
			if( ! window.FileReader )
				return false;
			
			var f = new window.FileReader();
			return !! ('readAsArrayBuffer' in f);
		},
		getBinaryStringFromArrayBuffer: function(file)
		{
			var arr = new Uint8Array(file);
			var str = '';
			for (var i = 0; i < arr.length; i++)
				str += String.fromCharCode(arr[i]);
			return str;
		},
		addCSSRule: function(style)
		{
			if( has("ie") <= 8 )
				return;
			
			$("<style>")
		    	.prop("type", "text/css")
		    	.html(style)
		    	.appendTo("head");
		},
		hex2rgba: function(x, a)
		{
			var r = x.replace('#','').match(/../g),g=[],i;
			for(i in r){
				g.push(parseInt(r[i],16));
			}
			g.push(a);
			return 'rgba('+g.join()+')';
		}
	}
});