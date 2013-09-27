define(["esri/arcgis/Portal",
		"storymaps/maptour/core/WebApplicationData",
		"storymaps/maptour/builder/FeatureServiceManager",
		"storymaps/builder/BuilderPanel",
		"storymaps/builder/SettingsPopup",
		"storymaps/maptour/core/MapTourHelper",
		"storymaps/utils/Helper",
		"storymaps/utils/WebMapHelper",
		"dojo/_base/lang",
		"dojo/has",
		"esri/arcgis/utils",
		"esri/IdentityManager",
		"esri/request",
		"dojo/topic",
		"dojo/on"],
	function(
		esriPortal, 
		WebApplicationData, 
		FeatureServiceManager, 
		BuilderPanel, 
		SettingsPopup, 
		MyTplHelper, 
		Helper, 
		WebMapHelper, 
		lang, 
		has, 
		arcgisUtils,
		IdentityManager, 
		esriRequest,
		topic,
		on)
	{
		var _core = null;
		var _builderView = null;
		
		var _builderPanel = new BuilderPanel(
			$('#builderPanel'),
			saveApp
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
			
				if( ! Helper.getAppID(_core.isProd()) ) {
					console.error("mytpl.builder.Builder - abort builder initialization, no appid supplied");
					return;
				}
				
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
		// Web mapping application save
		//

		function saveApp()
		{
			var portalUrl = getPortalURL();
			var portal = new esriPortal.Portal(portalUrl);

			on(IdentityManager, "dialog-create", styleIdentityManagerForSave);
			portal.signIn().then(
				function(){
					var uid = IdentityManager.findCredential(portalUrl).userId,
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
						text: JSON.stringify(WebApplicationData.get())
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
					
					saveRq.then(saveWebmap, appSaveFailed);
				},
				function(error) {
					appSaveFailed("APP", error);
				}
			);
		}
		
		//
		// Web Map save
		//
		
		function saveWebmap(response)
		{
			if( ! response || ! response.success )
				appSaveFailed("APP");
			
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
			if( app.data.initialExtentHasBeenEdited || webmapEmbeddedLayerChange ) {
				var portalUrl = getPortalURL(),
					item = app.data.getWebMapItem().item,
					itemData = app.data.getWebMapItem().itemData,
					uid = IdentityManager.findCredential(portalUrl).userId,
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
				
				var rqData = {
					f: 'json',
					item: item.item,
					title: item.title,
					tags: item.tags,
					extent: JSON.stringify(item.extent),
					text: JSON.stringify(itemData),
					type: item.type,
					typeKeywords: item.typeKeywords,
					overwrite: true,
					thumbnailURL: item.thumbnailURL,
					token: token
				};

				var saveRq = esriRequest(
					{
						url: portalUrl + "/sharing/content/users/" + uid + (item.ownerFolder ? ("/" + item.ownerFolder) : "") + "/addItem",
						handleAs: 'json',
						content: rqData
					},
					{
						usePost: true
					}
				);
				
				saveRq.then(
					function(){
						if( app.data.sourceIsFS() ) {
							FeatureServiceManager.saveFS(
								function() {
									appSaveSucceeded({success: true});
								},
								function(error) {
									appSaveFailed("FS", error);
								}
							);
						}
						else
							appSaveSucceeded({success: true});
					},
					appSaveFailed
				);
			}
			else
				if ( app.data.sourceIsFS() ) {
					FeatureServiceManager.saveFS(
						function() {
							appSaveSucceeded({success: true});
						},
						function(error) {
							appSaveFailed("FS", error);
						}
					);
				}
				else
					appSaveSucceeded({success: true});
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

		function appSaveFailed()
		{
			_builderPanel.saveFailed();
		}
		
		//
		// Misc
		//
		
		function getPortalURL()
		{
			return arcgisUtils.arcgisUrl.split('/sharing/')[0];
		}

		function styleIdentityManagerForSave()
		{
			// Hide default message
			$(".esriSignInDialog").find("#dijitDialogPaneContentAreaLoginText").css("display", "none");

			// Setup a more friendly text
			$(".esriSignInDialog").find(".dijitDialogPaneContentArea:first-child").find(":first-child").first().after("<div id='dijitDialogPaneContentAreaAtlasLoginText'>"+i18n.viewer.builderJS.signIn+" <a href='http://" + IdentityManager._arcgisUrl + "' title='" + IdentityManager._arcgisUrl + "' target='_blank'>" + IdentityManager._arcgisUrl + "</a> "+i18n.viewer.builderHTML.signInTwo+"</div>");
			
			on(IdentityManager, "dialog-cancel", function (){ 
				$("#builderPanel .builder-settings").popover('hide');
			});
		}
		
		function cleanApp()
		{
			var portalUrl = getPortalURL();
			var portal = new esriPortal.Portal(portalUrl);

			on(IdentityManager, "dialog-create", styleIdentityManagerForSave);
			portal.signIn().then(
				function(){
					var uid = IdentityManager.findCredential(portalUrl).userId,
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
			appInitComplete: appInitComplete
		};
	}
);