define(["dojo/_base/lang"],
	function(lang){
		/**
		 * MapTourBuilderHelper
		 * @class MapTourBuilderHelper
		 *
		 * Collection of helper functions specific the Builder UI of Map Tour
		 */
		return {
			getNewLayerJSON: function(featureCollection)
			{
				return {
					id: "maptour-layer" + new Date().getTime(),
					title: "Map Tour layer",
					visibility: true,
					opacity: 1,
					layerType: "ArcGISFeatureLayer",
					featureCollection: {
						layers: [
							featureCollection
						],
						showLegend: true
					}
				};
			},
			getFeatureCollectionTemplate: function(withDefaultFields)
			{
				var featureCollection = {
					"layerDefinition": null,
					"featureSet": {
						"features": [],
						"geometryType": "esriGeometryPoint"
					}
				};

				featureCollection.layerDefinition = {
					"geometryType": "esriGeometryPoint",
					"objectIdField": "__OBJECTID",
					"name": "Map-Tour-layer",
					"type": "Feature Layer",
					"typeIdField": "",
					"drawingInfo": {
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
					"fields": [{
						"name": "__OBJECTID",
						"alias": "__OBJECTID",
						"type": "esriFieldTypeOID",
						"editable": false,
						"domain": null
					}],
					"types": [],
					"capabilities": "Query"
				};

				if( withDefaultFields ) {
					featureCollection.layerDefinition.fields = [
						{
							"name": "__OBJECTID",
							"alias": "__OBJECTID",
							"type": "esriFieldTypeOID",
							"editable": false,
							"domain": null
						}, {
							"name": "name",
							"type": "esriFieldTypeString",
							"alias": "Name",
							"domain": null,
							"editable": true,
							"nullable": true,
							"length": 254
						}, {
							"name": "description",
							"type": "esriFieldTypeString",
							"alias": "Description",
							"domain": null,
							"editable": true,
							"nullable": true,
							"length": 1000
						}, {
							"name": "icon_color",
							"type": "esriFieldTypeString",
							"alias": "Icon color",
							"domain": null,
							"editable": true,
							"nullable": true,
							"length": 254
						}, {
							"name": "pic_url",
							"type": "esriFieldTypeString",
							"alias": "Picture URL",
							"domain": null,
							"editable": true,
							"nullable": true,
							"length": 254
						}, {
							"name": "thumb_url",
							"type": "esriFieldTypeString",
							"alias": "Thumbnail URL",
							"domain": null,
							"editable": true,
							"nullable": true,
							"length": 254
						}, {
							"name": "is_video",
							"type": "esriFieldTypeString",
							"alias": "Is Video",
							"domain": null,
							"editable": true,
							"nullable": true,
							"length": 5
						}
					];
				}
				else {
					featureCollection.layerDefinition.fields = [
						{
							"name": "__OBJECTID",
							"alias": "__OBJECTID",
							"type": "esriFieldTypeOID",
							"editable": false,
							"domain": null
						}
					];
				}

				return featureCollection;
			},
			getBlankAppJSON: function()
			{
				return {
					"itemType": "text",
					"guid": null,
					"name": null,
					"type": "Web Mapping Application",
					"typeKeywords": ["JavaScript", "Map", "Mapping Site", "Online Map", "Ready To Use", "selfConfigured", "Web Map", "Story Maps", "Map Tour", "MapTour"],
					"description": null,
					"tags": ["Story Map", "Map Tour"],
					"snippet": null,
					"thumbnail": "thumbnail/ago_downloaded.png",
					"documentation": null,
					"extent": [],
					"lastModified": -1,
					"spatialReference": null,
					"accessInformation": null,
					"licenseInfo": null,
					"culture": "en-us",
					"properties": null,
					/*"url": "http://story.maps.arcgis.com/apps/MapTour/index.html?appid=353325e3cd4d4059b3e1972d00c210e0&webmap=2972b44e39314972807f683215cf0652",*/
					"size": 116,
					"appCategories": [],
					"industries": [],
					"languages": [],
					"largeThumbnail": null,
					"banner": null,
					"screenshots": [],
					"listed": false,
					"ownerFolder": null,
					"commentsEnabled": true,
					"numComments": 0,
					"numRatings": 0,
					"avgRating": 0.0,
					"numViews": 1
				};
			},
			getBlankWebmapJSON: function()
			{
				var spatialReference = {
					"latestWkid": 3857,
					"wkid": 102100
				};

				if (app.map && app.map.spatialReference) {
					spatialReference = app.map.spatialReference;
				}

				return {
					item: {
						"id": "",
						"guid": null,
						"name": null,
						"type": "Web Map",
						"typeKeywords": ["ArcGIS Online", "Explorer Web Map", "Map", "Online Map", "Web Map", "Story Maps", "Map Tour"],
						"description": null,
						"tags": ["map"],
						"snippet": null,
						"thumbnail": "thumbnail/ago_downloaded.png",
						"documentation": null,
						"extent": [
							[-180.0, -90],
							[180.0, 90]
						],
						"spatialReference": null,
						"accessInformation": null,
						"licenseInfo": null,
						"culture": "en-us",
						"properties": null,
						"url": null,
						"size": 233,
						"appCategories": [],
						"industries": [],
						"languages": [],
						"largeThumbnail": null,
						"banner": null,
						"screenshots": [],
						"listed": false,
						"ownerFolder": null,
						"commentsEnabled": true,
						"numComments": 0,
						"numRatings": 0,
						"avgRating": 0.0,
						"numViews": 1
					},
					itemData: {
						"operationalLayers": [],
						"baseMap": lang.clone(app.defaultBasemap),
						"spatialReference": spatialReference,
						"version": "2.9"
					}
				};
			}
		};
	}
);
