define([
	"storymaps/utils/Helper", 
	"storymaps/utils/WebMapHelper", 
	"esri/geometry/Extent",
	"dojo/_base/lang",
	"dojo/Deferred",
	"dojo/json"], 
	function (
		Helper, 
		WebMapHelper, 
		Extent,
		lang,
		Deferred,
		JSON
	) {
		var mapTourFSJson = {
			"service": {
				"currentVersion": 10.1,
				"serviceDescription": "",
				"hasVersionedData": false,
				"supportsDisconnectedEditing": true,
				"supportedQueryFormats": "JSON, AMF",
				"maxRecordCount": 1000,
				"capabilities": "Query",
				"editorTrackingInfo":{
					"enableEditorTracking":false,
					"enableOwnershipAccessControl":false,
					"allowOthersToUpdate":true,
					"allowOthersToDelete":false
				},
				"description": "",
				"copyrightText": "",
				"spatialReference": {
					"wkid": 102100
				},
				"initialExtent": {
					"xmin": -20085668.703089,
					"ymin": -20085668.703089,
					"xmax": 20085668.703089,
					"ymax": 20085668.703089,
					"spatialReference": {
						"wkid": 102100
					}
				},
				"fullExtent": {
					"xmin": -20085668.703089,
					"ymin": -20085668.703089,
					"xmax": 20085668.703089,
					"ymax": 20085668.703089,
					"spatialReference": {
						"wkid": 102100
					}
				},
				"allowGeometryUpdates": true,
				"units": "esriMeters",
				"documentInfo": {
					"Title": "",
					"Author": "",
					"Comments": "",
					"Subject": "",
					"Category": "",
					"Keywords": ""
				},
				"tables": [],
				"enableZDefaults": false
			},
			"layers": [{
				"currentVersion": 10.1,
				"id": 0,
				"name": "arcgis.arcgis.MAP_TOUR",
				"type": "Feature Layer",
				"description": "",
				"copyrightText": "",
				"defaultVisibility": true,
				"editFieldsInfo": null,
				"ownershipBasedAccessControlForFeatures": null,
				"syncCanReturnChanges": false,
				"relationships": [],
				"isDataVersioned": false,
				"supportsRollbackOnFailureParameter": false,
				"supportsStatistics": true,
				"supportsAdvancedQueries": true,
				"geometryType": "esriGeometryPoint",
				"minScale": 0,
				"maxScale": 0,
				"extent": {
					"xmin": -20085668.703089,
					"ymin": -20085668.703089,
					"xmax": 20085668.703089,
					"ymax": 20085668.703089,
					"spatialReference": {
						"wkid": 102100
					}
				},
				"drawingInfo": {
					"renderer": {
						"type": "simple",
						"symbol": {
						"type": "esriSMS",
						"style": "esriSMSCircle",
						"color": [133, 0, 11, 255],
						"size": 4,
						"angle": 0,
						"xoffset": 0,
						"yoffset": 0,
						"outline": {
							"color": [0, 0, 0, 255],
							"width": 1
						}
						},
						"label": "",
						"description": ""
					},
					"transparency": 0,
					"labelingInfo": null
				},
				"hasM": false,
				"hasZ": false,
				"allowGeometryUpdates": true,
				"hasAttachments": true,
				"htmlPopupType": "esriServerHTMLPopupTypeAsHTMLText",
				"objectIdField": "objectid",
				"globalIdField": "",
				"displayField": "name",
				"typeIdField": "",
				"fields": [{
					"name": "objectid",
					"type": "esriFieldTypeOID",
					"alias": "ObjectID",
					"domain": null,
					"editable": false,
					"nullable": false
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
				} ],
				"types": [],
				"templates": [{
					"name": "arcgis.arcgis.MAP_TOUR",
					"description": "",
					"prototype": {
						"attributes": {
							"name": null,
							"description": null,
							"icon_color": null,
							"pic_url": null,
							"thumb_url": null
						}
					},
					"drawingTool": "esriFeatureEditToolPoint"
				}],
				"maxRecordCount": 1000,
				"supportedQueryFormats": "JSON, AMF",
				"capabilities": "Create,Delete,Query,Update,Uploads,Editing",
				"adminLayerInfo": {
					"geometryField": {
						"name": "Shape",
						"srid": 102100
					}
				}
			}]
		};
		
		var mapTourWebmapLayerJson = {
			"visibility": true,
			"opacity": 1,
			"mode": 0,
			"popupInfo": {
				"title": "arcgis.arcgis.MAP_TOUR: {name}",
				"fieldInfos": [{
					"fieldName": "objectid",
					"label": "ObjectID",
					"isEditable": false,
					"tooltip": "",
					"visible": false,
					"format": null,
					"stringFieldOption": "textbox"
				}, {
					"fieldName": "name",
					"label": "Name",
					"isEditable": true,
					"tooltip": "",
					"visible": true,
					"format": null,
					"stringFieldOption": "textbox"
				}, {
					"fieldName": "description",
					"label": "Description",
					"isEditable": true,
					"tooltip": "",
					"visible": true,
					"format": null,
					"stringFieldOption": "textbox"
				}, {
					"fieldName": "icon_color",
					"label": "Icon color",
					"isEditable": true,
					"tooltip": "",
					"visible": true,
					"format": null,
					"stringFieldOption": "textbox"
				}, {
					"fieldName": "pic_url",
					"label": "Picture URL",
					"isEditable": true,
					"tooltip": "",
					"visible": true,
					"format": null,
					"stringFieldOption": "textbox"
				}, {
					"fieldName": "thumb_url",
					"label": "Thumbnail URL",
					"isEditable": true,
					"tooltip": "",
					"visible": true,
					"format": null,
					"stringFieldOption": "textbox"
				}],
				"description": null,
				"showAttachments": true,
				"mediaInfos": []
			}
		};
		
		return function InitPopupViewHostedFSCreation(container)
		{
			var _container = container;
			
			var _portal = null;
			var _initCompleteDeferred = null;
			var _webmap = null;
			
			var _nameField  = $('#dataNameInput', _container);
			var _folderList = $('#dataFolderListInput', _container);
			var _errorList  = $('.dataError', _container);
			var _btnPrev = null;
			var _btnNext = null;
			var _footerText = null;
	
			this.init = function(params, initCompleteDeferred, footer)
			{
				_portal = params.portal;
				_webmap = params.webmap;
				_initCompleteDeferred = initCompleteDeferred;
				_btnPrev = footer.find('.btnPrev');
				_btnNext = footer.find('.btnNext');
				_footerText = footer.find('.dataFooterText');
				
				if( ! _portal || ! _webmap )
					return;
				
				// Init UI
				initEmptyFolderList();
				cleanUI();
				_portal.getPortalUser().getFolders().then(buildFolderList);
			};
			
			this.getView = function()
			{
				_btnNext.html(i18n.viewer.builderHTML.dataBtnSave);
				_btnNext.unbind('click');
				_btnNext.click(createService);
				
				return _container;
			};
			
			this.getTitle = function()
			{
				return i18n.viewer.builderHTML.dataTitle;
			};
			
			//
			// Events
			//
			
			function createService()
			{
				cleanErrors();
				var errorList = verifyForm();
				if ( errorList.length ) {
					showErrors(errorList);
					return false;
				}
				
				changeFooterState("progress");
						
				var name = _nameField.val().replace(/ /g, '_');
				var folder = getSelectedFolderId();
				
				isNameAvailable(name).then(function()
					{
						createFS(mapTourFSJson, name, folder, _portal.getPortalUser())
						.then(shareItem, createServiceFail)
						.then(addFSToWebmap, createServiceFail)
						.then(createServiceSuccess, createServiceFail);
					},
					createServiceFail
				);
				
				return false;
			}
			
			function createServiceSuccess()
			{
				// If it fail with a timeout, success is call
				if( _footerText.html() == i18n.viewer.builderHTML.dataFooterError )
					return; 
					
				// Set the extent to the portal default
				if ( app.portal && app.portal.defaultExtent )
					app.data.getWebMapItem().item.extent = Helper.serializeExtentToItem(new Extent(app.portal.defaultExtent));
				
				changeFooterState("succeed");
				
				setTimeout(function(){
					_initCompleteDeferred.resolve();
				}, 800);
			}
			
			function createServiceFail(error)
			{
				if( error == "NAME_NOT_AVAILABLE" ) {
					changeFooterState("original");
					showErrors([i18n.viewer.builderHTML.dataSrvAlreadyExistsError]);
				}
				else {
					changeFooterState("error");
				}
			}
			
			//
			// FS creation
			//
			
			function createFS(_serviceJSON, name, folder, user)
			{
				var serviceJSON = lang.clone(_serviceJSON);
				var resultDeferred = new Deferred();
				
				/*
				// Alternative code to use the base map extent for the FS extent
				// The JSON use the StreetMap basemap extent 
				var baseMapExtent = app.data.getWebMapItem().itemData
									&& app.data.getWebMapItem().itemData.baseMap
									&& app.data.getWebMapItem().itemData.baseMap.baseMapLayers
									&& app.data.getWebMapItem().itemData.baseMap.baseMapLayers.length > 0
									&& app.data.getWebMapItem().itemData.baseMap.baseMapLayers[0]
									&& app.data.getWebMapItem().itemData.baseMap.baseMapLayers[0].layerObject
									? lang.clone(app.data.getWebMapItem().itemData.baseMap.baseMapLayers[0].layerObject.fullExtent)
									: null;
				
				if( baseMapExtent ) {
					delete baseMapExtent.type;
					serviceJSON.service.initialExtent = baseMapExtent;
					serviceJSON.service.fullExtent = baseMapExtent;
					serviceJSON.layers[0].extent = baseMapExtent;
				}
				*/
				
				// Add the service name
				lang.mixin(serviceJSON.service, {'name': name});
	
				// Service creation request
				var serviceRqUrl = WebMapHelper.getSharingURL(_portal) 
						+ "content/users/" + user.credential.userId 
						+ "/" + (folder ? folder + '/' : '') 
						+ "createService";
				
				var serviceRqData = {
					createParameters: JSON.stringify(serviceJSON.service),
					targetType: "featureService"
				};
				
				WebMapHelper.request(serviceRqUrl, serviceRqData, true).then(
					function(serviceRqResponse) {
						var layersRqUrl = getAdminUrl(serviceRqResponse.serviceurl) + "/AddToDefinition";
						var layersRqData = { addToDefinition: JSON.stringify({layers: serviceJSON.layers}) };
						// Force reuse of the portal token as
						// ArcGIS For Orga hosted FS are on on a different domain than the portal api
						var token = user.credential.token;
						WebMapHelper.request(layersRqUrl, layersRqData, true, token).then(
							function() {
								resultDeferred.resolve(serviceRqResponse);
							},
							function(){
								resultDeferred.reject();
							}
						);
					},
					function(){
						resultDeferred.reject();
					}
				);
					
				return resultDeferred;
			}
			
			function shareItem(item)
			{
				var resultDeferred = new Deferred();
				var user = _portal.getPortalUser(); 
				var rqUrl = WebMapHelper.getSharingURL(_portal) + "content/users/" + user.credential.userId + "/shareItems";
				var rqData = lang.mixin(item, {
					f: "json",
					everyone: false,
					items: item.itemId
				});
				
				WebMapHelper.request(rqUrl, rqData, true).then(
					function(){
						resultDeferred.resolve(item);
					},
					function(){
						resultDeferred.reject();
					}
				);
				
				return resultDeferred;
			}
			
			function getAdminUrl(url)
			{
				return url.replace("http://", window.location.protocol + "//")
						.replace("rest/services","admin/services")
						.replace("/FeatureServer",".FeatureServer");
			}
			
			//
			// Webmap edit
			//
			
			function addFSToWebmap(fsItem)
			{
				// Add the FS layer
				var layer = lang.mixin(
					{
						id: "maptour-layer" + new Date().getTime(),
						title: "Map Tour layer",
						url: fsItem.serviceurl + '/0',
						itemId: fsItem.itemId
					},
					lang.clone(mapTourWebmapLayerJson)
				);
				
				_webmap.itemData.operationalLayers.push(layer);
				
				if( app.isDirectCreationFirstSave || app.isGalleryCreation ) 
					return new Deferred().resolve();
				else
					return WebMapHelper.saveWebmap(_webmap, _portal);
			}
			
			//
			// Utils
			//
			
			function isNameAvailable(name)
			{
				var resultDeferred = new Deferred();
				
				var rqUrl = WebMapHelper.getSharingURL(_portal) + "portals/" + _portal.id + "/isServiceNameAvailable";
				var rqData = {
					f: "json",
					type: "Feature Service",
					name: name
				};
				
				WebMapHelper.request(rqUrl, rqData, true).then(
					function(result){
						if(result && result.available)
							resultDeferred.resolve();
						else
							resultDeferred.reject("NAME_NOT_AVAILABLE");
					},
					function(){
						resultDeferred.reject();
					}
				);
				
				return resultDeferred;
			}
			
			//
			// UI
			//
			
			function initEmptyFolderList()
			{
				_folderList.append('<option data-id="-1">' + i18n.viewer.builderHTML.dataFolderListFetching + '</option>');
			}
			
			function buildFolderList(folders)
			{
				_folderList.empty();
				_folderList.append('<option data-id="">' + i18n.viewer.builderHTML.dataRootFolder + '</option>');
				$.each(folders, function(i, folder){
					_folderList.append('<option data-id="' + folder.id + '">' + folder.title + '</option>');
				});
			}
			
			function getSelectedFolderId()
			{
				return _folderList.find('option:selected').data('id');
			}
			
			function verifyForm()
			{
				var errors = [];
				if( ! _nameField.val() )
					errors.push(i18n.viewer.builderHTML.dataNameError);
					
				else if( _nameField.val().match(/[-<>#%:"?&+\/\\]/) )
					errors.push(i18n.viewer.builderHTML.dataSrcContainsInvalidChar);
				
				var folderId = getSelectedFolderId();
				if( folderId == "-1" || (folderId.length !== 32 && folderId.length !== 0) )
					errors.push(i18n.viewer.builderHTML.dataFolderError);
				
				return errors;
			}
			
			function changeFooterState(state)
			{
				if( state == "progress" ) {
					_btnNext.attr("disabled", "true");
					_btnPrev.attr("disabled", "true");
					_footerText.html(i18n.viewer.builderHTML.dataFooterProgress + ' <img src="resources/icons/loader-upload.gif" />');
					_footerText.show();
				}
				else if( state == "succeed" ) {
					_btnNext.attr("disabled", "true");
					_btnPrev.attr("disabled", "true");
					_footerText.html(i18n.viewer.builderHTML.dataFooterSucceed);
					_footerText.show();
				}
				else if ( state == "original" ) {
					_btnNext.removeAttr("disabled");
					_btnPrev.removeAttr("disabled");
					_footerText.html("");
					_footerText.hide();
				}
				else if ( state == "error" ) {
					_btnNext.removeAttr("disabled");
					_btnPrev.removeAttr("disabled");
					_footerText.html(i18n.viewer.builderHTML.dataFooterError);
					_footerText.addClass("error");
				}
			}
			
			function showErrors(errors)
			{
				cleanErrors();
				$.each(errors, function(i, error){
					_errorList.append("<li>" + error + "</li>");
				});
			}
			
			function cleanUI()
			{
				_nameField.val("");
				cleanErrors();
				changeFooterState("orginal");
			}
			
			function cleanErrors()
			{
				_errorList.empty();
				_footerText.removeClass("error");
			}
	
			this.initLocalization = function()
			{
				$('.dataExplain', container).html(i18n.viewer.builderHTML.dataExplain);
				$('.dataNameLbl', container).html(i18n.viewer.builderHTML.dataNameLbl + ':');
				$('.dataFolderListLbl', container).html(i18n.viewer.builderHTML.dataFolderListLbl + ':');
			};
		};
	}
);