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
		"esri/geometry/Multipoint",
		"dojo/topic",
		"storymaps/ui/bannerNotification/BannerNotification"
	],
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
		Multipoint,
		topic,
		BannerNotification
	) {
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
			// Show https-transition notification when app loads
			if (!app.isPortal) {
				topic.subscribe('maptour-ready', function() {
					var stringsSurvey = i18n.viewer.june2018SurveyMessage;
					var stringsHttps = i18n.viewer.httpsTransitionNotification;
					new BannerNotification({
						id: "storymapsSurvey",
						bannerMsg: stringsSurvey.bannerMsg,
						primaryColor: '#1e8a87',
						mainMsgHtml: '\
						<h2>' + stringsSurvey.s1h1 + '</h2>\
						<p>' + stringsSurvey.s1p1 + '</p>\
						<p>' + stringsSurvey.s2p1 + '</p>\
						',
						actions: [
							{
								string: stringsSurvey.action1,
								closeOnAction: true
							},
							{
								primary: true,
								string: stringsSurvey.action2,
								closeOnAction: true,
								action: function() {
									window.open('https://links.esri.com/storymaps/june2018-survey');
								}
							}
						],
						cookie: {
							domain: 'arcgis.com',
							path: '/',
							maxAge: 60 * 60 * 24 * 365
						},
						autohideAfter: new Date() > new Date(/*'July 31 2018'*/) ? 0 : 2
					});
					new BannerNotification({
						id: "httpsTransitionMessage",
						bannerMsg: stringsHttps.bannerMsg,
						mainMsgHtml: '\
						<h2>' + stringsHttps.s1h1 + '</h2>\
						<p>' + stringsHttps.s1p1 + '</p>\
						<p>' + stringsHttps.s1p2 + '</p>\
						<h2>' + stringsHttps.s2h1 + '</h2>\
						<p>' + stringsHttps.s2p1 + '</p>\
						',
						actions: [
							{
								primary: true,
								string: stringsHttps.action1,
								closeOnAction: true
							},
							{
								string: stringsHttps.action2,
								action: function() {
									window.open('https://storymaps.arcgis.com/en/my-stories/');
								}
							},
							{
								string: stringsHttps.action3,
								action: function() {
									window.open('https://links.esri.com/storymaps/web_security_faq');
								}
							}
						],
						cookie: {
							domain: 'arcgis.com',
							path: '/',
							maxAge: 60 * 60 * 24 * 365
						},
						blockingNotifications: 'storymapsSurvey'
					});
				});
			}
			var storyTitle = "",
				itemTitle = "";

			if ( WebApplicationData.getTitle() ) {
				storyTitle = WebApplicationData.getTitle().trim();
			}

			if ( app.data.getAppItem() && app.data.getAppItem().title ) {
				itemTitle = app.data.getAppItem().title.trim();
			}

			// The title may be inherited from the app or web map
			if ( ! storyTitle ) {
				storyTitle = itemTitle;

				if ( ! storyTitle ) {
					if ( app.data.getWebMapItem() && app.data.getWebMapItem().item && app.data.getWebMapItem().item.title ) {
						storyTitle = app.data.getWebMapItem().item.title.trim();
					}
				}
			}

			app.builder.titleMatchOnLoad = itemTitle == storyTitle;

			// Handle reusing image/webmap title in fromScratch
			if ( app.isDirectCreation || app.isGalleryCreation ) {
				app.builder.titleMatchOnLoad = true;
			}

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

		function saveAppThenWebmap(doNotOverwriteTitle)
		{
			if ( ! app.portal ) {
				console.error("Fatal error - not signed in");
				appSaveFailed("APP");
				return;
			}

			app.portal.signIn().then(
				function(){
					saveApp(doNotOverwriteTitle, function(response){
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
						saveApp(true, function(response2){
							if (!response2 || !response2.success) {
								appSaveFailed("APP");
								return;
							}

							var baseUrl = document.location.protocol + '//' + document.location.host + document.location.pathname;
							if ( ! baseUrl.match(/index\.html$/) )
								baseUrl += "index.html";

							// Update the app item
							app.data.setAppItem(
								lang.mixin(
									app.data.getAppItem(),
									{
										id: response2.id,
										item: response2.item,
										url: baseUrl + '?appid=' + response2.id
									}
								)
							);

							// Save the app a second time
							saveApp(false, function(response3){
								if (!response3 || !response3.success) {
									appSaveFailed("APP");
									return;
								}

								console.log('maptour.builder.Builder - firstSaveForDirectCreation - appid:', response3.id, ' webmap:', response.id);

								appSaveSucceeded({ success: true });
								app.isDirectCreationFirstSave = false;
								_builderPanel.updateSharingStatus();

								History.replaceState({}, "", "index.html?appid=" + response3.id + "&edit");
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
						saveApp(false, function(response2){
							if (!response2 || !response2.success) {
								appSaveFailed("APP");
								return;
							}

							var successCallback = function() {
								console.log('maptour.builder.Builder - builderGalleryCreationFirstSave - appid:', response2.id, ' webmap:', response.id);

								appSaveSucceeded({ success: true });
								app.isGalleryCreation = false;
								_builderPanel.updateSharingStatus();

								History.replaceState({}, "", "index.html?appid=" + response2.id + "&edit");
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

		function saveApp(doNotOverwriteTitle, nextFunction)
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
			var layouts = $.map(['side-panel', 'integrated', 'three-panel'], function(layout){ return "layout-" + layout; });
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

			// Story extent
			if ( app.data.getTourLayer() && app.data.getTourLayer().graphics && app.data.getTourLayer().graphics.length ) {
				try {
					var sr = app.data.getTourLayer().graphics[0].geometry.spatialReference;

					if ( sr && (sr.wkid == 102100 || sr.wkid == 4326) ) {
						var mp = new Multipoint(sr);

						$.each(app.data.getTourLayer().graphics, function(i, g){
							mp.addPoint(g.geometry);
						});

						// TODO: serializeExtentToItem only support WGS and Mercator
						appItem.extent = JSON.stringify(Helper.serializeExtentToItem(mp.getExtent()));
					}

				} catch( e ) { }
			}

			// Title
			if ( ! doNotOverwriteTitle ) {
				appItem.title = WebApplicationData.getTitle();
			}

			if ( appItem.properties ) {
				appItem.properties = JSON.stringify(appItem.properties);
			}

			// Edit URL of hosted apps to always include index.html
			if ( appItem.url && appItem.url.match(/apps\/[a-zA-Z]+\/\?appid=/) ) {
				appItem.url = appItem.url.replace('/?appid=', '/index.html?appid=');
			}

			appItem = lang.mixin(appItem, {
				f: "json",
				token: token,
				overwrite: true,
				text: JSON.stringify(WebApplicationData.get())
			});

			var url = portalUrl + "/sharing/rest/content/users/" + uid + (appItem.ownerFolder ? ("/" + appItem.ownerFolder) : "");

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

			// Store data when the map tour data layer is a feature collection saved as an item
			var fcItem = null;

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

					var layer = itemData.operationalLayers[layerIndex],
						data = serializeMapTourGraphicsLayerToFeatureCollection(
								app.data.getTourLayer(), app.data.getAllFeatures(),
								app.data.getSourceLayer()
						);

					// If the map tour data layer is a feature collection saved as an item
					if ( layer.itemId ){
						fcItem = {
							id: layer.itemId,
							data: data
						};

						if ( layer.featureCollection ) {
							delete layer.featureCollection;
						}
					}
					else {
						// Serialize the layer to the webmap definition
						if( layerIndex != -1 )
							layer.featureCollection = data;
					}
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

				var url = portalUrl + "/sharing/rest/content/users/" + uid + (item.ownerFolder ? ("/" + item.ownerFolder) : "");

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
						else {
							// If the map tour data layer is a feature collection saved as an item
							if ( fcItem ) {
								// Need an extra request to get the item to know if the item is in a folder
								arcgisUtils.getItem(fcItem.id).then(
									function(responseItem)
									{
										if ( ! responseItem || ! responseItem.item ) {
											appSaveFailed();
											return;
										}

										var ownerFolder = responseItem.item.ownerFolder;

										var rqData = {
											f: 'json',
											text: JSON.stringify(fcItem.data),
											overwrite: true,
											token: token
										};

										var url = portalUrl + "/sharing/rest/content/users/" + uid + (ownerFolder ? ("/" + ownerFolder) : "") + "/items/" + fcItem.id + "/update";
										// Need to know the folder because for some reason, the following request don't works
										//var url = portalUrl + "/sharing/rest/content/items/" + fcItem.id + "/update";
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
											function(){
												nextFunction(response);
											},
											appSaveFailed
										);
									},
									appSaveFailed
								);
							}
							else {
								nextFunction(response);
							}
						}
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
			if ( sharingMode != "public" && sharingMode != "account" && sharingMode != "org")
				sharingMode = "public";

			// Find items to share - only if they aren't already shared to the proper level
			var targetItems = [];
			if( sharingMode == "account" || sharingMode == "org") {
				if( (app.data.getWebMapItem().item.access == "private"||app.data.getWebMapItem().item.access == "shared"||!app.data.getWebMapItem().item.access) && app.data.getWebMapItem().item.owner == app.portal.getPortalUser().username )
					targetItems.push(app.data.getWebMapItem().item.id);
				if ( app.data.getAppItem().access == "private" || app.data.getAppItem().access == "shared" )
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
				org: ''
			};

			if ( sharing == "public" )
				params.everyone = true;
			if ( sharing == "account" || sharing == "org" )
				params.org = true;

			return esriRequest(
				{
					url: portalUrl + "/sharing/rest/content/users/" + uid + "/shareItems",
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
							url: portalUrl + "/sharing/rest/content/users/" + uid + (appItem.ownerFolder ? ("/" + appItem.ownerFolder) : "") + "/addItem",
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
