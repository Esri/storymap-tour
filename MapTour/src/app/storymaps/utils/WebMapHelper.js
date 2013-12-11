define(["esri/request",
		"esri/renderers/jsonUtils", 
		"dojo/Deferred",
		"dojo/_base/lang",
		"dojo/_base/array"], 
	function(
		esriRequest, 
		jsonUtils,
		Deferred,
		lang,
		array)
	{
		return {
			findLayerTypeById: function(webmapData, id)
			{
				var type = "";
				
				array.forEach(webmapData.operationalLayers, function(layer){
					if( layer.id == id )
						type = layer.type;
				});
				
				return type;
			},
			saveWebmap: function(webmap, portal)
			{
				var resultDeferred = new Deferred();
				
				this.prepareWebmapItemForCloning(webmap);
				
				var item = lang.clone(webmap.item);
				var data = lang.clone(webmap.itemData);
				
				// Transform arrays
				item.tags = item.tags ? item.tags.join(',') : '';
				item.typeKeywords = item.typeKeywords ? item.typeKeywords.join(',') : '';
				
				var user = portal.getPortalUser();
				var rqUrl = this.getSharingURL(portal) 
								+ "content/users/" + user.credential.userId 
								+ (item.ownerFolder ? ("/" + item.ownerFolder) : "") 
								+ "/addItem";
				
				var rqData = {
					item: item.item,
					title: item.title,
					tags: item.tags,
					extent: JSON.stringify(item.extent),
					text: JSON.stringify(data),
					type: item.type,
					typeKeywords: item.typeKeywords,
					overwrite: true,
					thumbnailURL: item.thumbnailURL
				};
				
				this.request(rqUrl, rqData, true).then(
					function(){
						resultDeferred.resolve();
					},
					function(){
						resultDeferred.reject();
					}
				);
				
				return resultDeferred;
			},
			serializeGraphicsLayerToFeatureCollection: function(layer)
			{
				return this._serializeGraphicsLayerToFeatureCollection(layer, layer.visible, layer.graphics);
			},		
			_serializeGraphicsLayerToFeatureCollection: function(layer, visibility, graphics)
			{
				var featureCollection = {
					layers: [{
						featureSet: {
							features: [],
							geometryType: layer.geometryType
						},
						id: layer.id,
						layerDefinition: {
							geometryType: layer.geometryType,
							objectIdField: layer.objectIdField,
							name: layer.name,
							type: layer.type,
							typeIdField: layer.typeIdField,
							drawingInfo: {
								"renderer": {
									"type": "simple",
									"symbol": {
										"type": "esriPMS",
										"url": "http://static.arcgis.com/images/Symbols/Basic/RedSphere.png",
										"imageData": "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",
										"contentType": "image/png",
										"width": 15,
										"height": 15
									}
								}
							},
							fields: [],
							types: [],
							capabilities: layer.capabilities
						},
						layerObject: null,
						opacity: layer.opacity,
						visibility: visibility
					}],
					showLegend: true
				};
				
				$.each(layer.fields, function(i, field){
					featureCollection.layers[0].layerDefinition.fields.push({
						name: field.name,
						alias: field.alias,
						type: field.type,
						editable: field.editable,
						domain: null
					});
				});
				
				$.each(graphics, function(i, graphic){
					featureCollection.layers[0].featureSet.features.push({
						attributes: graphic.attributes,
						geometry: graphic.geometry
					});
				});
				
				return featureCollection;
			},
			request: function(url, content, post, token)
			{
				var usePost = post || false;
				content = content || {};
				token = token || '';
				
				return esriRequest(
					{
						url: url,
						content: lang.mixin(content, {f: 'json', token: token}),
						callbackParamName: 'callback',
						handleAs: 'json'
					},
					{
						usePost: usePost
					}
				);
			},
			/**
			 * Clean the web map item to allow to clone the item
			 * @param {Object} item
			 */
			prepareWebmapItemForCloning: function(webmap)
			{
				array.forEach(webmap.itemData.baseMap.baseMapLayers, function(layer){
					delete layer.errors;
					delete layer.layerObject;
					delete layer.resourceInfo;
				});
				
				array.forEach(webmap.itemData.operationalLayers, function(layer){
					delete layer.errors;
					delete layer.layerObject;
					delete layer.resourceInfo;
					
					// Graphics layer
					if( layer.featureCollection && layer.featureCollection.layers ) {
						array.forEach(layer.featureCollection.layers, function(fc){
							delete fc.layerObject;
						});
					}
					
					// Graphics layer
					if( layer.featureCollection && layer.featureCollection.featureSet && layer.featureCollection.featureSet.features ) {
						array.forEach(layer.featureCollection.featureSet.features, function(f){
							delete f._shape;
							delete f._graphicsLayer;
						});
					}
					
					// Dynamic CSV
					if( layer.type == "CSV" && layer.featureCollection )
						delete layer.featureCollection;
					
					// Map Service
					array.forEach(layer.layers, function(subLayer){
						delete subLayer.drawingInfo;
						
						if( subLayer.layerDefinition && subLayer.layerDefinition.drawingInfo && subLayer.layerDefinition.drawingInfo.renderer )
							subLayer.layerDefinition.drawingInfo.renderer = jsonUtils.fromJson(subLayer.layerDefinition.drawingInfo.renderer).toJson();
					});
					
					// Feature Servuce
					if( layer.layerDefinition && layer.layerDefinition.drawingInfo && layer.layerDefinition.drawingInfo.renderer )
						layer.layerDefinition.drawingInfo.renderer = jsonUtils.fromJson(layer.layerDefinition.drawingInfo.renderer).toJson();
				});
			},
			getSharingURL: function(portal)
			{
				var sharingUrl = portal.portalUrl;
				
				if( sharingUrl.match('/sharing/rest/$') )
					sharingUrl = sharingUrl.split('/').slice(0,-2).join('/') + '/';
				else if ( sharingUrl.match('/sharing/rest$') )
					sharingUrl = sharingUrl.split('/').slice(0,-1).join('/') + '/';
				else if ( sharingUrl.match('/sharing$') )
					sharingUrl = sharingUrl + '/';
				
				return sharingUrl;
			}
		};
	}
);			