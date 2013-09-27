define(["dojo/cookie", 
		"dojo/has", 
		"esri/urlUtils",
		"esri/geometry/webMercatorUtils",
		"esri/geometry/Point",
		"esri/geometry/Extent",
		"esri/geometry/Polygon",
		"esri/layers/ArcGISDynamicMapServiceLayer",
		"esri/layers/ArcGISTiledMapServiceLayer",
		"esri/layers/OpenStreetMapLayer"], 
	function(
		cookie, 
		has, 
		urlUtils,
		webMercatorUtils,
		Point,
		Extent,
		Polygon,
		ArcGISDynamicMapServiceLayer,
		ArcGISTiledMapServiceLayer,
		OpenStreetMapLayer)
	{
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
			isArcGISHosted: function()
			{
				return (/(\/apps\/|\/home\/)(MapTour\/)/).test(document.location.pathname);
			},
			getWebmapID: function(isProd)
			{
				var urlParams = urlUtils.urlToObject(document.location.search).query || {};
				
				if( configOptions && configOptions.webmap )
					return configOptions.webmap;
				
				if ( this.isArcGISHosted() || ! isProd )
					return urlParams.webmap;
				
				// Only authorize URL params outside of arcgis.com if a webmap owner is specified
				if( configOptions.authorizedOwners && configOptions.authorizedOwners.length > 0 && configOptions.authorizedOwners[0] )
					return urlParams.webmap;
			},
			getAppID: function(isProd)
			{
				var urlParams = urlUtils.urlToObject(document.location.search).query || {};
				
				if( configOptions && configOptions.appid )
					return configOptions.appid;
				
				if ( this.isArcGISHosted() || ! isProd )
					return urlParams.appid;
				
				// Only authorize URL params outside of arcgis.com if a webmap/app owner is specified
				if( configOptions.authorizedOwners && configOptions.authorizedOwners.length > 0 && configOptions.authorizedOwners[0] )
					return urlParams.appid;
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
							
				var bottomLeft = webMercatorUtils.geographicToWebMercator(
					new Point(
						item.extent[0][0],
						item.extent[0][1]
					)
				);
						
				var topRight = webMercatorUtils.geographicToWebMercator(
					new Point(
						item.extent[1][0],
						item.extent[1][1]
					)
				);
				
				return new Extent({
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
				
				var extentWgs = extent.spatialReference.wkid == 4326 ? extent : webMercatorUtils.webMercatorToGeographic(extent);
				
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
					return new ArcGISTiledMapServiceLayer("http://services.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Light_Gray_Base/MapServer");
				else if(layer instanceof ArcGISTiledMapServiceLayer)
					return new ArcGISTiledMapServiceLayer(layer.url);
				else if (layer instanceof ArcGISDynamicMapServiceLayer)
					return new ArcGISDynamicMapServiceLayer(layer.url);
				else if (layer.id == "OpenStreetMap")
					return new OpenStreetMapLayer();
				
				return new ArcGISTiledMapServiceLayer("http://services.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Light_Gray_Base/MapServer");
			},
			extentToPolygon: function(extent)
			{
				var p = new Polygon(extent.spatialReference);
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
				
				if( ! esriCookie )
					return;
				
				esriCookie = JSON.parse(esriCookie.replace('"ssl":undefined','"ssl":""'));
				
				// If the cookie is not set on the same organization
				if( esriCookie.urlKey 
						&& esriCookie.customBaseUrl 
						&& (esriCookie.urlKey + '.' + esriCookie.customBaseUrl).toLowerCase() != document.location.hostname.toLowerCase())
					return;
				
				return esriCookie ? esriCookie.email : null;
			},
			getPortalRole: function()
			{
				var esriCookie = cookie('esri_auth');
				
				if( ! esriCookie )
					return;
				
				esriCookie = JSON.parse(esriCookie.replace('"ssl":undefined','"ssl":""'));
				
				// If the cookie is not set on the same organization
				if( esriCookie.urlKey 
						&& esriCookie.customBaseUrl 
						&& (esriCookie.urlKey + '.' + esriCookie.customBaseUrl).toLowerCase() != document.location.hostname.toLowerCase())
					return;
				
				return esriCookie ? esriCookie.role : null;
			},
			getWebmapViewerLinkFromSharingURL: function(sharingUrl)
			{
				var portalUrl = sharingUrl.split('/sharing/')[0];
				return portalUrl + '/home/webmap/viewer.html';
			},
			getItemURL: function(sharingUrl, id)
			{
				var portalUrl = sharingUrl.split('/sharing/')[0];
				return portalUrl + '/home/item.html?id=' + id;
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
		};
	}
);