define(["esri/arcgis/Portal",
		"storymaps/maptour/core/WebApplicationData",
		"storymaps/maptour/builder/FeatureServiceManager",
		"storymaps/builder/BuilderPanel",
		"storymaps/builder/SettingsPopup",
		"storymaps/maptour/core/MapTourHelper",
		"storymaps/maptour/builder/MapTourBuilderHelper",
		"storymaps/utils/Helper",
		"storymaps/utils/WebMapHelper",
		"dojo/_base/lang",
		"dojo/_base/array",
		"dojo/has",
		"esri/arcgis/utils",
		"esri/IdentityManager",
		"esri/request",
		"dojo/topic"],
	function(
		esriPortal, 
		WebApplicationData, 
		FeatureServiceManager, 
		BuilderPanel, 
		SettingsPopup, 
		MapTourHelper,
		MapTourBuilderHelper, 
		Helper, 
		WebMapHelper, 
		lang, 
		array,
		has, 
		arcgisUtils,
		IdentityManager, 
		esriRequest,
		topic)
	{
		var _core = null;
		var _builderView = null;
		
		var _builderPanel = new BuilderPanel(
			$('#builderPanel'),
			saveAppThenWebmap,
			builderDirectCreationFirstSave,
			builderGalleryCreationFirstSave
		);
		var _settingsPopup = new SettingsPopup(
				$('#settingsPopup'), 
				APPCFG.COLOR_SCHEMES, 
				APPCFG.HEADER_LOGO_URL
		);

		function init(core, builderView)
		{
			_core = core;
			_builderView = builderView;
			
			$(document).ready(lang.hitch(this, function(){
				console.log("maptour.builder.Builder - init");
			
				if( ! Helper.getAppID(_core.isProd()) && ! app.isDirectCreation ) {
					console.error("maptour.builder.Builder - abort builder initialization, no appid supplied");
					return;
				}
				else if ( app.isDirectCreation )
					console.log("maptour.builder.Builder - Builder start in direct creation mode");
				else if ( app.isGalleryCreation )
					console.log("maptour.builder.Builder - Builder start in gallery creation mode");
				
				$("body").addClass("builder-mode");
				
				_builderView.init(_settingsPopup);
				_builderPanel.init(_builderView);
				
				_settingsPopup.init(_builderView);
				_settingsPopup.initLocalization();
				
				topic.subscribe("BUILDER_INCREMENT_COUNTER", _builderPanel.incrementSaveCounter);	
				topic.subscribe("HEADER_EDITED", headerEdited);
				
				// Reload / close confirmation if there is unsaved change
				window.onbeforeunload = function (e) {
					e = e || window.event;
					
					if( ! _builderPanel.hasPendingChange() )
						return;
					
					if (e)
						e.returnValue = i18n.viewer.builderJS.closeWithPendingChange;
			
					// Safari
					return i18n.viewer.builderJS.closeWithPendingChange;
				};
				
				app.cleanApp = cleanApp;
			}));
		}
		
		function appInitComplete()
		{
			_builderPanel.updateSharingStatus();
			_builderView.appInitComplete(saveApp);
		}
		
		function resize(cfg)
		{
			_builderPanel.resize();
			_builderView.resize();

			if (app.data.getCurrentGraphic() && app.data.sourceIsEditable()) {
				app.builder.updateBuilderMoveable(app.data.getCurrentGraphic());
				
				if (cfg.isMobileView)
					app.mapTips && app.builder.hidePinPopup();
				else 
					app.mapTips && app.mapTips.show();
			}
		}
		
		//
		// Header
		//
		
		function headerEdited(param)
		{
			// Title and subtile initially comes from the web map
			// They are saved in web app data only if they are edited
			// So if they are never edited in the app, web map edition are reflected in the app			
			if( param.src == "title" ) {
				if( param.value != app.data.getWebMapItem().item.title ) {
					if( param.value != WebApplicationData.getTitle() ) {
						WebApplicationData.setTitle(param.value);
						_builderPanel.incrementSaveCounter();
					}
				}
				else
					WebApplicationData.setTitle("");
			}
			else if ( param.src == "subtitle" ) {
				if( param.value != app.data.getWebMapItem().item.snippet && param.value != i18n.viewer.headerJS.editMe ) {
					if( param.value != WebApplicationData.getSubtitle() ) {
						WebApplicationData.setSubtitle(param.value);
						_builderPanel.incrementSaveCounter();
					}
				}
				else
					WebApplicationData.setSubtitle("");
			}
		}
		
		//
		// Save
		//
		
		function saveAppThenWebmap()
		{			
			if ( ! app.portal ) {
				console.error("Fatal error - not signed in");
				appSaveFailed("APP");
				return;
			}
			
			app.portal.signIn().then(
				function(){ 
					saveApp(function(response){
						if (!response || !response.success) {
							appSaveFailed("APP");
							return;
						}
						
						saveWebmap(function(response2){
							if (!response2 || !response2.success) {
								appSaveFailed("WEBMAP");
								return;
							}
							
							appSaveSucceeded({ success: true });
						});
					});
				},
				function(error) {
					appSaveFailed("APP", error);
				}
			);
		}
		
		function builderDirectCreationFirstSave(title, subtitle)
		{
			if ( ! app.portal ) {
				console.error("Fatal error - not signed in");
				appSaveFailed("APP");
				return;
			}
			
			var uid = IdentityManager.findCredential(getPortalURL()).userId;
			
			// Create the app item
			app.data.setAppItem(
				lang.mixin(
					MapTourBuilderHelper.getBlankAppJSON(),
					{
						title: title,
						snippet: subtitle,
						uploaded: Date.now(),
						modified: Date.now(),
						owner: uid,
						access: 'private'
					}
				)
			);
			
			// Update the webmap item
			var webMapItem = app.data.getWebMapItem();
			lang.mixin(
				webMapItem.item, 
				{
					title: title,
					snippet: subtitle,
					uploaded: Date.now(),
					modified: Date.now(),
					owner: uid,
					access: 'private'
				}
			);
			
			// Not sure why but the JS API add those unnecessary properties that WPF runtime doesn't like at all 
			try {
				delete webMapItem.itemData.operationalLayers[0].featureCollection.layers[0].id;
				delete webMapItem.itemData.operationalLayers[0].featureCollection.layers[0].opacity;
				delete webMapItem.itemData.operationalLayers[0].featureCollection.layers[0].visibility;
				delete webMapItem.itemData.operationalLayers[0].featureCollection.layers[0].layerObject;
			} catch(e){ }

			app.portal.signIn().then(
				function(){ 
					saveWebmap(function(response){
						if( ! response || ! response.success ) {
							appSaveFailed("WEBMAP");
							return;
						}
						
						// Save the webmp id in the app definition
						WebApplicationData.setWebmap(response.id);
						
						// Update the webmap item
						var webMapItem = app.data.getWebMapItem();
						lang.mixin(
							webMapItem.item, 
							{
								id: response.id,
								item: response.item
							}
						);
						
						// Save the app
						saveApp(function(response2){
							if (!response2 || !response2.success) {
								appSaveFailed("APP");
								return;
							}
							
							// Update the app item
							app.data.setAppItem(
								lang.mixin(
									app.data.getAppItem(),
									{
										id: response2.id,
										item: response2.item,
										url: document.location.protocol + '//' + document.location.host + document.location.pathname + '?appid=' + response2.id
									}
								)
							);
														
							// Save the app a second time
							saveApp(function(response3){
								if (!response3 || !response3.success) {
									appSaveFailed("APP");
									return;
								} 
								
								console.log('maptour.builder.Builder - firstSaveForDirectCreation - appid:', response3.id, ' webmap:', response.id);
							
								appSaveSucceeded({ success: true });
								app.isDirectCreationFirstSave = false;
								_builderPanel.updateSharingStatus();
							
								History.replaceState({}, "", "?appid=" + response3.id + "&edit");
							});
						});
					});
				},
				function(error) {
					appSaveFailed("APP", error);
				}
			);
		}
		
		function builderGalleryCreationFirstSave()
		{
			if ( ! app.portal ) {
				console.error("Fatal error - not signed in");
				appSaveFailed("APP");
				return;
			}
			
			var uid = IdentityManager.findCredential(getPortalURL()).userId;
			
			// Update the webmap item
			var webMapItem = app.data.getWebMapItem();
			lang.mixin(
				webMapItem.item, 
				{
					title: app.data.getAppItem().title,
					uploaded: Date.now(),
					modified: Date.now(),
					owner: uid
				}
			);
			
			// Save the webmap in the same folder than the app
			if( app.data.getAppItem().ownerFolder )
				webMapItem.item.ownerFolder = app.data.getAppItem().ownerFolder;
				
			// Not sure why but the JS API add those unnecessary properties that WPF runtime doesn't like at all 
			try {
				delete webMapItem.itemData.operationalLayers[0].featureCollection.layers[0].id;
				delete webMapItem.itemData.operationalLayers[0].featureCollection.layers[0].opacity;
				delete webMapItem.itemData.operationalLayers[0].featureCollection.layers[0].visibility;
				delete webMapItem.itemData.operationalLayers[0].featureCollection.layers[0].layerObject;
			} catch(e){ }

			app.portal.signIn().then(
				function(){ 
					saveWebmap(function(response){
						if( ! response || ! response.success || ! response.id ) {
							appSaveFailed("WEBMAP");
							return;
						}
						
						// Save the webmp id in the app definition
						WebApplicationData.setWebmap(response.id);
						
						// Update the webmap item
						var webMapItem = app.data.getWebMapItem();
						lang.mixin(
							webMapItem.item, 
							{
								id: response.id,
								item: response.item
							}
						);
						
						// Save the app
						saveApp(function(response2){
							if (!response2 || !response2.success) {
								appSaveFailed("APP");
								return;
							}
							
							var successCallback = function() {
								console.log('maptour.builder.Builder - builderGalleryCreationFirstSave - appid:', response2.id, ' webmap:', response.id);
						
								appSaveSucceeded({ success: true });
								app.isGalleryCreation = false;
								_builderPanel.updateSharingStatus();
						
								History.replaceState({}, "", "?appid=" + response2.id + "&edit");
							};
							
							// Share the webmap and eventual FS if the app isn't private
							var sharingMode = app.data.getAppItem().access;
							if( sharingMode != 'private' ) {
								var targetItems = [app.data.getWebMapItem().item.id];
								if ( app.data.sourceIsFS() && app.data.getFSSourceLayerItemId() ) 
									targetItems.push(app.data.getFSSourceLayerItemId());
								
								shareItems(targetItems.join(','), sharingMode).then(function(response){
									var success = response 
										&& response.results 
										&& response.results.length == targetItems.length;
									
									if (success) {
										$.each(response.results, function(i, result){
											if( ! result.success )
												success = false;
										});
										
										if ( success )
											successCallback();
										else
											appSaveFailed("WEBMAP");
									}
									else
										appSaveFailed("WEBMAP");
								});
							}
							else
								successCallback();
						});
					});
				},
				function(error) {
					appSaveFailed("APP", error);
				}
			);
		}
		
		//
		// Web mapping application save
		//

		function saveApp(nextFunction)
		{
			var portalUrl = getPortalURL(),
				appItem = lang.clone(app.data.getAppItem()),	
				uid = appItem.owner || IdentityManager.findCredential(portalUrl).userId,
				token  = IdentityManager.findCredential(portalUrl).token;

			// Remove properties that don't have to be committed
			delete appItem.avgRating;
			delete appItem.modified;
			delete appItem.numComments;
			delete appItem.numRatings;
			delete appItem.numViews;
			delete appItem.size;
			
			//
			// Add/edit the typeKeyword property to be able to identify the app and the layout
			//
			
			if ( ! appItem.typeKeywords )
				appItem.typeKeywords = [];
			
			// App not created through the builder fromScratch mode don't get those keywords
			appItem.typeKeywords = appItem.typeKeywords.concat(APPCFG.WEBAPP_KEYWORD_APP);
			
			// Those should only be necessary to be able to convert an appid that wasn't already selfConfigured
			appItem.typeKeywords = appItem.typeKeywords.concat(APPCFG.WEBAPP_KEYWORD_GENERIC);
			
			// Layout
			var layouts = $.map(['integrated', 'three-panel'], function(layout){ return "layout-" + layout; });
			// Filter previous layout keyword
			appItem.typeKeywords = $.grep(appItem.typeKeywords, function(keyword) {
				return $.inArray(keyword, layouts) == -1; 
			});
			// Add actual layout keyword
			appItem.typeKeywords.push("layout-" + (app.data.getWebAppData().values.layout || "three-panel"));
			
			// Make the typeKeywords array unique
			appItem.typeKeywords = $.grep(appItem.typeKeywords, function(keyword, index) {
				return index == $.inArray(keyword, appItem.typeKeywords);
			});
			
			// Transform arrays
			appItem.tags = appItem.tags ? appItem.tags.join(',') : '';
			appItem.typeKeywords = appItem.typeKeywords.join(',');
			
			// App proxies
			appItem.serviceProxyParams = JSON.stringify(appItem.serviceProxyParams);

			appItem = lang.mixin(appItem, {
				f: "json",
				token: token,
				overwrite: true,
				text: JSON.stringify(WebApplicationData.get())
			});
			
			var url = portalUrl + "/sharing/content/users/" + uid + (appItem.ownerFolder ? ("/" + appItem.ownerFolder) : ""); 
			
			// Updating
			if ( appItem.id )
				url += "/items/" + appItem.id + "/update";
			// creating
			else
				url += "/addItem";
			
			var saveRq = esriRequest(
				{
					url: url,
					handleAs: 'json',
					content: appItem
				},
				{
					usePost: true
				}
			);
			
			saveRq.then(nextFunction, appSaveFailed);
		}
		
		//
		// Web Map save
		//
		
		function saveWebmap(nextFunction)
		{
			//
			// TODO: should be replaced by the improved WebMapHelper.saveWebmap
			//
			
			// Look for modified or new points if the tour use an embedded layer
			var webmapEmbeddedLayerChange = false;
			if( app.data.sourceIsWebmap() ) {
				$.each(app.data.getTourPoints(true), function(i, tourPoint) {
					if( tourPoint.hasBeenUpdated() )
						webmapEmbeddedLayerChange = true;
				});
				
				if( app.data.getDroppedPoints().length  || app.data.pointsAdded() )
					webmapEmbeddedLayerChange = true;
			}
			
			// If the extent or data has changed 
			// or it's a direct creation initial save
			// or the basemap has changed
			if( app.data.initialExtentHasBeenEdited 
					|| webmapEmbeddedLayerChange 
					|| app.isDirectCreationFirstSave 
					|| app.isGalleryCreation 
					|| app.basemapChanged
			) {
				var portalUrl = getPortalURL(),
					item = lang.clone(app.data.getWebMapItem().item),
					itemData = app.data.getWebMapItem().itemData,
					uid = item.owner || IdentityManager.findCredential(portalUrl).userId,
					token  = IdentityManager.findCredential(portalUrl).token;
				
				// Data change
				if( webmapEmbeddedLayerChange ) {
					// Find the index of the layer in the webmap definition
					var layerIndex = -1;
					$.each(itemData.operationalLayers, function(i, layer){
						if( layer.id == app.data.getSourceLayer().id.split('_').slice(0,-1).join('_') )
							layerIndex = i;
					});
					
					// Serialize the layer to the webmap definition
					if( layerIndex != -1 )
						itemData.operationalLayers[layerIndex].featureCollection = serializeMapTourGraphicsLayerToFeatureCollection(app.data.getTourLayer(), app.data.getAllFeatures(), app.data.getSourceLayer());	
				}
				
				// Cleanup item data
				WebMapHelper.prepareWebmapItemForCloning({ itemData: itemData });
				
				// Transform arrays
				item.tags = item.tags ? item.tags.join(',') : '';
				item.typeKeywords = item.typeKeywords ? item.typeKeywords.join(',') : '';
				
				// Check layers for app proxies URL
				var layersToCheck = itemData.baseMap.baseMapLayers.concat(itemData.operationalLayers);
				$.each(layersToCheck, function(i, layer){
					if ( layer.url ) {
						var matchingAppProxiesLayer = $.grep(app.data.getAppProxies() || [], function(l){ 
							return l && l.mixin && l.mixin.url == layer.url; 
						});
						
						if ( matchingAppProxiesLayer.length )
							layer.url = matchingAppProxiesLayer[0].url;
					}
				});
				
				var rqData = {
					f: 'json',
					item: item.item,
					title: item.title,
					snippet: item.snippet,
					tags: item.tags,
					extent: JSON.stringify(item.extent),
					text: JSON.stringify(itemData),
					type: item.type,
					typeKeywords: item.typeKeywords,
					overwrite: true,
					thumbnailURL: item.thumbnailURL,
					token: token
				};
				
				var url = portalUrl + "/sharing/content/users/" + uid + (item.ownerFolder ? ("/" + item.ownerFolder) : ""); 
				
				// Updating
				if ( item.id )
					url += "/items/" + item.id + "/update";
				// creating
				else
					url += "/addItem";
				
				var saveRq = esriRequest(
					{
						url: url,
						handleAs: 'json',
						content: rqData
					},
					{
						usePost: true
					}
				);
				
				saveRq.then(
					function(response){
						app.basemapChanged = false;
						if( app.data.sourceIsFS() ) {
							FeatureServiceManager.saveFS(
								function() {
									nextFunction(response);
								},
								function(error) {
									appSaveFailed("FS", error);
								}
							);
						}
						else
							nextFunction(response);
					},
					appSaveFailed
				);
			}
			else if ( app.data.sourceIsFS() ) {
				FeatureServiceManager.saveFS(
					function() {
						nextFunction({success: true});
					},
					function(error) {
						appSaveFailed("FS", error);
					}
				);
			}
			else
				nextFunction({success: true});
		}
		
		function serializeMapTourGraphicsLayerToFeatureCollection(tourLayer, tourGraphics, sourceLayer)
		{
			var graphics = [];
			var droppedPoints = app.data.getDroppedPoints();
			
			$.each(tourGraphics, function(i, graphic){
				// Do not save the graphic if it's in dropped points
				if( $.inArray(graphic, droppedPoints) == -1 )
					graphics.push(graphic.getUpdatedFeature());
			});
			
			return WebMapHelper._serializeGraphicsLayerToFeatureCollection(sourceLayer, tourLayer.visible, graphics);
		}
		
		//
		// Sharing
		//
		
		function shareAppAndWebmap(sharingMode, callback)
		{
			// Can only be used to add more privilege
			// Looks like sharing to private imply a unshareItems request first 
			// => don't use it that code to share private without more test
			if ( sharingMode != "public" && sharingMode != "account" )
				sharingMode = "public";
			
			// Find items to share - only if they aren't already shared to the proper level 
			var targetItems = [];
			if( sharingMode == "account" ) {
				if( app.data.getWebMapItem().item.access == "private" && app.data.getWebMapItem().item.owner == app.portal.getPortalUser().username )
					targetItems.push(app.data.getWebMapItem().item.id);
				if ( app.data.getAppItem().access == "private" )
					targetItems.push(app.data.getAppItem().id);
			}
			else {
				if( app.data.getWebMapItem().item.access != "public" && app.data.getWebMapItem().item.owner == app.portal.getPortalUser().username )
					targetItems.push(app.data.getWebMapItem().item.id);
				if ( app.data.getAppItem().access != "public" )
					targetItems.push(app.data.getAppItem().id);
			}
			
			// Also update eventual FS if needed
			// TODO: no check if user is the owner or not
			if ( app.data.sourceIsFS() && app.data.getFSSourceLayerItemId() ) 
				targetItems.push(app.data.getFSSourceLayerItemId());
			
			shareItems(targetItems.join(','), sharingMode).then(function(response){
				var success = response 
					&& response.results 
					&& response.results.length == targetItems.length;
				
				if (success) {
					$.each(response.results, function(i, result){
						if( ! result.success )
							success = false;
					});
					
					app.data.getWebMapItem().item.access = sharingMode;
					app.data.getAppItem().access = sharingMode;
					_builderPanel.updateSharingStatus();
				}
				
				callback(success);
			});	
		}
		
		function shareItems(items, sharing)
		{
			var portalUrl = getPortalURL(),
				uid = IdentityManager.findCredential(portalUrl).userId,
				token  = IdentityManager.findCredential(portalUrl).token;

			var params = {
				f: "json",
				token: token,
				items: items,
				groups: '',
				everyone: '',
				account: ''
			};
			
			if ( sharing == "public" )
				params.everyone = true;
			if ( sharing == "account" )
				params.account = true;

			return esriRequest(
				{
					url: portalUrl + "/sharing/content/users/" + uid + "/shareItems",
					handleAs: 'json',
					content: params
				},
				{
					usePost: true
				}
			);
		}

		//
		// Save callbacks
		//

		function appSaveSucceeded(response)
		{
			if (response && response.success) {
				_builderPanel.saveSucceeded();
				app.data.updateAfterSave();
			}
			else
				appSaveFailed();
		}

		function appSaveFailed(source, error)
		{
			_builderPanel.saveFailed(source, error);
		}
		
		//
		// Misc
		//
		
		function getPortalURL()
		{
			return arcgisUtils.arcgisUrl.split('/sharing/')[0];
		}
		
		function cleanApp()
		{
			if ( ! app.portal ) {
				console.error("Fatal error - not signed in");
				return;
			}
			
			app.portal.signIn().then(
				function(){
					var portalUrl = getPortalURL(),
						uid = IdentityManager.findCredential(portalUrl).userId,
						token  = IdentityManager.findCredential(portalUrl).token,
						appItem = lang.clone(app.data.getAppItem());

					// Remove properties that don't have to be committed
					delete appItem.avgRating;
					delete appItem.modified;
					delete appItem.numComments;
					delete appItem.numRatings;
					delete appItem.numViews;
					delete appItem.size;

					appItem = lang.mixin(appItem, {
						f: "json",
						token: token,
						overwrite: true,
						text: JSON.stringify(WebApplicationData.getBlank())
					});

					var saveRq = esriRequest(
						{
							url: portalUrl + "/sharing/content/users/" + uid + (appItem.ownerFolder ? ("/" + appItem.ownerFolder) : "") + "/addItem",
							handleAs: 'json',
							content: appItem
						},
						{
							usePost: true
						}
					);
					
					saveRq.then(
						function(){
							console.log("Web Application data cleaned successfully");
						}, function(){
							console.log("Web Application data cleaning has failed");
						}
					);
				},
				function(error) {
					console.error("Web Application data cleaning has failed", error);
				}
			);
			
			return "Cleaning ...";
		}
		
		return {
			init: init,
			resize: resize,
			appInitComplete: appInitComplete,
			shareAppAndWebmap: shareAppAndWebmap
		};
	}
);