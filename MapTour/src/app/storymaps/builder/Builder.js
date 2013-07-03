define(["storymaps/maptour/core/WebApplicationData",
		"storymaps/maptour/builder/FeatureServiceManager",
		"storymaps/builder/BuilderPanel",
		"storymaps/builder/SettingsPopup",
		"storymaps/maptour/core/MapTourHelper",
		"storymaps/utils/Helper",
		"storymaps/utils/WebMapHelper",
		"dojo/_base/lang",
		"dojo/has",
		"esri/IdentityManager"],
	function(WebApplicationData, FeatureServiceManager, BuilderPanel, SettingsPopup, MyTplHelper, Helper, WebMapHelper, lang, has)
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
			
			$(document).ready(dojo.hitch(this, function(){
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
				
				dojo.subscribe("BUILDER_INCREMENT_COUNTER", _builderPanel.incrementSaveCounter);	
				dojo.subscribe("HEADER_EDITED", headerEdited);
				
				// Reload / close confirmation if there is unsaved change
				window.onbeforeunload = function (e) {
					e = e || window.event;
					
					if( ! _builderPanel.hasPendingChange() )
						return;
					
			        if (e)
			            e.returnValue = i18n.builder.builder.closeWithPendingChange;
			
			        // Safari
			        return i18n.builder.builder.closeWithPendingChange;
			    };
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

			if (app.data.getCurrentGraphic()) {
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
			var portal = new esri.arcgis.Portal(portalUrl);

			dojo.connect(esri.id, "onDialogCreate", styleIdentityManagerForSave);
			portal.signIn().then(
				function(){
					var itemId = Helper.getAppID(_core.isProd()),
						uid = esri.id.findCredential(portalUrl).userId,
						token  = esri.id.findCredential(portalUrl).token,
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

					var saveRq = esri.request(
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
				
				if( app.data.getDroppedPoints() || app.data.pointsAdded() )
					webmapEmbeddedLayerChange = true;
			}
			
			// If the extent or data has changed
			if( app.data.initialExtentHasBeenEdited || webmapEmbeddedLayerChange ) {
				var portalUrl = getPortalURL(),
					item = app.data.getWebMapItem().item,
					itemData = app.data.getWebMapItem().itemData,
					uid = esri.id.findCredential(portalUrl).userId,
					token  = esri.id.findCredential(portalUrl).token;
				
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
						itemData.operationalLayers[layerIndex].featureCollection = serializeMapTourGraphicsLayerToFeatureCollection(app.data.getTourLayer(), app.data.getSourceLayer());	
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

				var saveRq = esri.request(
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
						FeatureServiceManager.saveFS(
							function() {
								appSaveSucceeded({success: true});
							},
							function() {
								appSaveFailed("FS", error);
							}
						)	
					},
					appSaveFailed
				);
			}
			else
				FeatureServiceManager.saveFS(
					function() {
						appSaveSucceeded({success: true});
					},
					function() {
						appSaveFailed("FS", error);
					}
				);
		}
		
		function serializeMapTourGraphicsLayerToFeatureCollection(tourLayer, sourceLayer)
		{
			var graphics = [];
			var droppedPoints = app.data.getDroppedPoints();
			
			$.each(tourLayer.graphics, function(i, graphic){
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

		function appSaveFailed(source, error)
		{
			_builderPanel.saveFailed();
			changeBuilderPanelButtonState(true);
		}
		
		//
		// Misc
		//
		
		function getPortalURL()
		{
			return configOptions.sharingurl.split('/sharing/')[0];
		}

		function styleIdentityManagerForSave()
		{
			// Hide default message
			$(".esriSignInDialog").find("#dijitDialogPaneContentAreaLoginText").css("display", "none");

			// Setup a more friendly text
			$(".esriSignInDialog").find(".dijitDialogPaneContentArea:first-child").find(":first-child").first().after("<div id='dijitDialogPaneContentAreaAtlasLoginText'>"+i18n.viewer.builderJS.signIn+" <a href='http://" + esri.id._arcgisUrl + "' title='" + esri.id._arcgisUrl + "' target='_blank'>" + esri.id._arcgisUrl + "</a> "+i18n.viewer.builderHTML.signInTwo+"</div>");
			
			dojo.connect(esri.id, "onDialogCancel", function (info){ 
				$("#builderPanel .builder-settings").popover('hide');
			});
		}
		
		return {
			init: init,
			resize: resize,
			appInitComplete: appInitComplete
		};
	}
);