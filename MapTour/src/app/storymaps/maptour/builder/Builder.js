define(["storymaps/maptour/core/WebApplicationData",
		"storymaps/utils/ResamplePicture",
		"storymaps/maptour/builder/DataPopup",
		"storymaps/maptour/builder/AddPopup",
		"storymaps/maptour/builder/SettingsPopup",
		"storymaps/maptour/builder/OrganizePopup",
		"storymaps/ui/multiTips/MultiTips",
		"storymaps/maptour/core/MapTourHelper",
		"storymaps/utils/Helper",
		"dojo/_base/lang",
		"dojo/has",
		"esri/IdentityManager"],
	function(WebApplicationData, ResamplePicture, DataPopup, AddPopup, SettingsPopup, OrganizePopup, MultiTips, MapTourHelper, Helper, lang, has)
	{
		var NO_LOGO_OPTION = "NO_LOGO";

		var _this = this;
		var _core = null;
		var _dataPopup = new DataPopup($('#dataPopup'));
		var _addPopup = new AddPopup($('#addPopup'));
		var _organizePopup = new OrganizePopup($('#organizePopup'));
		var _settingsPopup = new SettingsPopup(
				$('#settingsPopup'), 
				APPCFG.COLOR_SCHEMES, 
				APPCFG.HEADER_LOGO_URL
		);
		var _displayBuilderSaveIntro = true;
		
		// Mobile view add a new point
		var _addMobileMainCanvas = null;
		var _addMobileThumbnailCanvas = null;
		var _addMobileThumbnailImg = null;
		var _addMobileThumbnailImg2 = null;

		this.init = function(core)
		{
			_core = core;
			
			$(document).ready(dojo.hitch(this, function(){
				console.log("maptour.builder.Builder - init");
			
				if( ! Helper.getAppID(_core.isProd()) ) {
					console.error("maptour.builder.Builder - abort builder initialization, no appid supplied");
					return;
				}
	
				$("body").addClass("builder-mode");
				
				this.initLocalization();
	
				// Top and bottom buttons panel
				$("#builderPanel").css("display", "block");
				$("#builderPanel2").css("display", "block");
				setUpGeneralPanelButtonAction();
				setUpPopover();

				if( Helper.browserSupportAttachementUsingFileReader() )
					setUpMobileAdd();
				else
					$('.builderMobile').css('display', 'none');
				
				createAppSavedConfirmation();
				
				// Settings
				dojo.subscribe("SETTINGS_POPUP_SAVE", settingsPopupSave);
	
				// Organize
				dojo.subscribe("ORGANIZE_POPUP_SAVE", organizePopupSave);
				
				// Header
				dojo.subscribe("HEADER_EDITED", headerEdited);
				
				// Picture panel
				dojo.subscribe("PIC_PANEL_EDIT", picturePanelEdited);
				
				// Reload / close confirmation if there is unsaved change
				window.onbeforeunload = function (e) {
					e = e || window.event;
					
					if( ! hasPendingChange() )
						return;
					
			        if (e)
			            e.returnValue = i18n.viewer.builderJS.closeWithPendingChange;
			
			        // Safari
			        return i18n.viewer.builderJS.closeWithPendingChange;
			    };
			}));
		}
		
		//
		// General configuration panel
		//

		this.save = function()
		{
			console.log("maptour.builder.Builder - save");
			
			changeBuilderPanelButtonState(false);
			closeBuilderSaveIntro();
			destroyDataWarning();
			$("#builderPanel .builder-settings").popover('show');
			
			// Save the app 
			// If OK call saveFS 
			// If OK and needed call save webmap 
			// If OK call appSaveSucceeded
			saveApp();
		}

		this.discard = function(confirmed)
		{
			if( confirmed ){
				changeBuilderPanelButtonState(false);
				WebApplicationData.restoreOriginalData();
				restoreFS();
				app.data.discardChanges();
				resetSaveCounter();
				dojo.publish("CORE_UPDATE_UI");
				changeBuilderPanelButtonState(true);
			}

			$("#builderPanel .builder-discard").popover('hide');
		}

		this.switchToView = function(confirmed) {
			if( confirmed )
				document.location = '?' + document.location.search.split('edit')[0].slice(1, -1);
			else
				$("#builderPanel .builder-view").popover('hide');
		}
		
		function changeBuilderPanelButtonState(activate)
		{
			$("#builderPanel > div > button").attr("disabled", ! activate);
		}
		
		function hasPendingChange()
		{
			return $("#save-counter").html() && $("#save-counter").html() != i18n.viewer.builderJS.noPendingChange;
		}

		this.incrementSaveCounter = function(nb)
		{
			var value = $("#save-counter").html();
			if (!hasPendingChange()) {
				value = 0;
				if( _displayBuilderSaveIntro )
					// Timer cause the header can be hidden
					setTimeout(function(){ $("#builderPanel .builder-save").popover('show'); }, 250);	
			}

			value = value ? (parseInt(value) + (nb ? nb : 1)) + " " + i18n.viewer.builderJS.unSavedChangePlural : i18n.viewer.builderJS.unSavedChangeSingular;
			$("#save-counter").html(value);
			$("#save-counter").css("color", "#FFF");
		}

		function resetSaveCounter()
		{
			$("#save-counter").html(i18n.viewer.builderJS.noPendingChange);
			$("#save-counter").css("color", "#999");
			setUpGeneralPanelButtonAction();
		}

		function closePopover()
		{
			if( $("#builderPanel .discard-popover").length > 0 )
				$("#builderPanel .builder-discard").popover('hide');
			if( $("#builderPanel .view-popover").length > 0 )
				$("#builderPanel .builder-view").popover('hide');
		}

		function setUpPopover()
		{
			// Discard button
			$("#builderPanel .builder-discard").popover({
				trigger: 'manual',
				placement: 'bottom',
				html: true,
				// Inject the CSS properties
				content: '<script>'
							+ ' $("#builderPanel .builder-discard").next(".popover").addClass("discard-popover");'
							+ ' $("#builderPanel .builder-view").popover("hide");'
							+ ' $("#builderPanel .builder-save").popover("hide");'
							+ '</script>'
							+ i18n.viewer.builderJS.popoverDiscard +' '
							+ '<button type="button" class="btn btn-danger btn-small" onclick="app.builder.discard(true)">'+i18n.viewer.builderJS.yes+'</button> '
							+ '<button type="button" class="btn btn-small" onClick="app.builder.discard(false)">'+i18n.viewer.builderJS.no+'</button>'
			});

			// Switch to view button
			$("#builderPanel .builder-view").popover({
				trigger: 'manual',
				html: true,
				content: '<script>'
							+ ' $("#builderPanel .builder-view").next(".popover").addClass("view-popover");'
							+ ' $("#builderPanel .builder-discard").popover("hide");'
							+ ' $("#builderPanel .builder-save").popover("hide");'
							+ '</script>'
							+ i18n.viewer.builderJS.popoverLoseSave + ' '
							+ '<button type="button" class="btn btn-danger btn-small" onclick="app.builder.switchToView(true)">'+i18n.viewer.builderJS.ok+'</button> '
							+ '<button type="button" class="btn btn-small" onClick="app.builder.switchToView(false)">'+i18n.viewer.builderHTML.modalCancel+'</button>'
			});

			// Confirmation that user need to use the save button
			$("#builderPanel .builder-save").popover({
				trigger: 'manual',
				html: true,
				content: '<script>setTimeout(function(){$("#builderPanel .builder-save").next(".popover").css("margin-left", $("#builderPanel > div").width() + 30).addClass("builderPanelPopover");}, 0);</script>'
							+ i18n.viewer.builderJS.popoverSaveWhenDone
							+ ' <button type="button" class="btn btn-success btn-small" onclick="app.builder.closeBuilderSaveIntro()">'+i18n.viewer.builderJS.gotIt+'</button> '
			});
			
			dojo.query('#builderPanel .builder-settings').attr('title', i18n.viewer.builderHTML.buttonSettings);
			dojo.query('#builderPanel .builder-view').attr('title', i18n.viewer.builderHTML.buttonView);
		}
		
		function createAppSavedConfirmation()
		{
			// App saved confirmation
			$("#builderPanel .builder-settings").popover({
				html: true,
				trigger: 'manual',
				placement: 'bottom',
				content: '<script>'
							+ '$("#builderPanel .builder-settings").next(".popover").addClass("settings-popover");'
							+ '$("#builderPanel .builder-settings").next(".popover").css("margin-left", - $("#builderPanel button").eq(0).width() - $("#builderPanel button").eq(0).width() / 2 + 5 + "px");'
							+ '$("#builderPanel .builder-settings").next(".popover").find(".stepSave").css("display", "block");'
							+ '$("#builderPanel .builder-settings").next(".popover").find(".stepSaved").css("display", "none");'
							+ '$("#builderPanel .builder-settings").next(".popover").find(".stepFailed").css("display", "none");'
							+ '</script>'
							+ '<div class="stepSave" style="margin-top: 3px">'
							+  i18n.viewer.builderJS.savingApplication + '... <img src="resources/icons/loader-upload.gif" class="addSpinner" alt="Uploading">'
							+ '</div>'
							+ '<div class="stepSaved">'
							+  i18n.viewer.builderJS.saveSuccess + ' '
							+ '<button type="button" class="btn btn-success btn-small" onclick="app.builder.hideSaveConfirmation()" style="vertical-align: 1px;">'+i18n.viewer.builderJS.gotIt+'</button> '
							+ '</div>'
							+ '<div class="stepFailed" style="color: red;">'
							+  i18n.viewer.builderJS.saveError + ' '
							+ '<button type="button" class="btn btn-danger btn-small" onclick="app.builder.hideSaveConfirmation()" style="vertical-align: 1px;">'+i18n.viewer.builderJS.gotIt+'</button> '
							+ '</div>'
			});
			
			dojo.query('#builderPanel .builder-settings').attr('title', i18n.viewer.builderHTML.buttonSettings);
		}

		this.closeBuilderSaveIntro = function()
		{
			$("#builderPanel .builder-save").popover('destroy');
			_displayBuilderSaveIntro = false;
		}

		function setUpGeneralPanelButtonAction()
		{
			$("#builderPanel .builder-view").click(clickView);
			$("#builderPanel .builder-discard").click(clickDiscard);
		}

		function clickDiscard()
		{
			if( hasPendingChange() )
				$("#builderPanel .builder-discard").popover('show');
		}

		function clickView()
		{
			if( hasPendingChange() )
				$("#builderPanel .builder-view").popover('show');
			else
				_this.switchToView(true);
		}

		this.hideSaveConfirmation = function()
		{
			$("#builderPanel .builder-settings").popover('hide');
		}
		
		this.setDataWarning = function(popoverContent, webmapEditUrl)
		{
			var content = popoverContent;
			content += ' <button type="button" class="btn btn-small" onclick="window.open(\'' + webmapEditUrl + '\', \'_blank\');">'+i18n.viewer.builderJS.dataWarningEdit+'</button>';
			content += ' <button type="button" class="btn btn-small" onclick="app.builder.destroyDataWarning()">'+i18n.viewer.builderJS.dataWarningClose+'</button>';
			
			$("#builderPanel .builder-settings").popover('destroy');
			$("#builderPanel .builder-settings").popover({
				html: true,
				trigger: 'manual',
				content: '<script>$("#builderPanel .builder-settings").next(".popover").addClass("datawarning-popover").css("margin-left", $("#builderPanel > div").eq(0).width() + 30 + "px");</script>' + content
			});
			
			$("#builderPanel .builder-settings").popover('show');
		}
		
		this.destroyDataWarning = function()
		{
			$("#builderPanel .builder-settings").popover('destroy');
			createAppSavedConfirmation();
		}
		
		//
		// Mobile view Add
		//
		
		function setUpMobileAdd()
		{
			$('.builderMobile a').html($('.builderMobile a').html().replace('Browse', '+'));
			$('.builderMobile input').change(function(){
				_addMobileMainCanvas = $('<canvas>');
				_addMobileThumbnailCanvas = $('<canvas>');
				_addMobileThumbnailImg = $('<img/>');
				_addMobileThumbnailImg2 = $('<img/>');
				
				var file = this.files[0];
				setTimeout(function(){
					mobileAddPoint(file);
				}, 0);
			});
		}
		
		function mobileAddPoint(file)
		{
			if(! file || file.type != "image/jpeg")
				return;
			
			// If on application loading or right now, the dataset contained more than APPCFG.MAX_ALLOWED_POINTS features
			// Add is disabled permanently (dropping point has no effect)
			if( app.data.getMaxAllowedFeatureReached() || app.data.getTourPoints().length >= APPCFG.MAX_ALLOWED_POINTS ) {
				alert(i18n.viewer.builderHTML.addMaxPointReachedMobile);
				return;
			}
			
			var pointName = prompt(i18n.viewer.builderHTML.addMobileName + ':');
			if( pointName ) {
				loadingIndicator.start();
				loadingIndicator.setMessage(i18n.viewer.builderHTML.addMobileUploading);
				
				// Resample main picture using an IMG tag to avoid bug in iOS 
				// http://stackoverflow.com/questions/12554947/mobile-safari-renders-img-src-dataimage-jpegbase64-scaled-on-canvas 
				var mpImg = new MegaPixImage(file);
				mpImg.render(
					_addMobileThumbnailImg.get(0), 
					{
						maxWidth: app.config.picRecommendedWidth, 
						maxHeight: app.config.picRecommendedHeight
					}
				);
				
				_addMobileThumbnailImg.load(function(e){
					// Resample main picture
					ResamplePicture.resample(
						_addMobileMainCanvas.get(0),
						_addMobileThumbnailImg,
						e.currentTarget.naturalWidth,
						e.currentTarget.naturalHeight,
						app.config.picRecommendedWidth,
						app.config.picRecommendedHeight,
						window.orientation
					);
					
					// Resample thumbnail
					ResamplePicture.resample(
						_addMobileThumbnailCanvas.get(0),
						_addMobileThumbnailImg,
						e.currentTarget.naturalWidth,
						e.currentTarget.naturalHeight,
						app.config.thumbnailMaxWidth,
						app.config.thumbnailMaxHeight,
						window.orientation
					);
					
					app.data.addTourPointUsingData(
						app.map.extent.getCenter(),
						pointName,
						'',
						APPCFG.PIN_DEFAULT_CFG,
						_addMobileMainCanvas.get(0).toDataURL("image/jpeg"),
						_addMobileThumbnailCanvas.get(0).toDataURL("image/jpeg"),
						function(){
							save();
							$('.builderMobile form').get(0).reset();
							loadingIndicator.stop();
						},
						function() {
							$('.builderMobile form').get(0).reset();
							loadingIndicator.stop();
							loadingIndicator.setMessage(i18n.viewer.builderHTML.addMobileError);
							setTimeout(function(){
								loadingIndicator.stop();
							}, 2500);
						}
					);
				});
			}
			else
				alert(i18n.viewer.builderHTML.addMobileNameMandatory);
		}
		
		//
		// Data popup
		//
		
		this.presentDataPopup = function(portal, webmap)
		{
			return _dataPopup.present(portal, webmap);
		}

		//
		// Organize Popup
		//

		this.organizePopupShow = function()
		{
			// Give organize popup all points in the Feature Service
			// The one that have been previously configured and then the one that haven't as hidden
			_organizePopup.present(app.data.getAllFeatures());
		}

		this.organizePopupSaveConfirmationCallback = function(confirmed)
		{
			_organizePopup.saveConfirmationCallback(confirmed);
		}

		function organizePopupSave(param)
		{
			app.data.dropTourPoints(param.dropped);
			app.data.updateTourPointsOrder(param.order);

			_this.incrementSaveCounter();
		}

		//
		// Add Popup
		//

		this.addPopupShow = function()
		{
			_addPopup.present();
		}

		//
		// Settings Popup
		//
		
		this.openFieldsSettingOnStartup = function()
		{
			openSettingPopup(true);
		}

		this.settingsPopupShow	= function()
		{
			closePopover();
			openSettingPopup(false);
		}
		
		function openSettingPopup(fieldsError)
		{
			_settingsPopup.present({
				layout: WebApplicationData.getLayout(),
				fieldsError: fieldsError,
				allFields: app.data.getSourceLayer().fields,
				logoURL: getLogoURL(),
				logoTarget: WebApplicationData.getLogoTarget(),
				headerLinkText: WebApplicationData.getHeaderLinkText() == undefined ? APPCFG.HEADER_LINK_TEXT : WebApplicationData.getHeaderLinkText(),
				headerLinkURL: WebApplicationData.getHeaderLinkURL() == undefined ? APPCFG.HEADER_LINK_URL : WebApplicationData.getHeaderLinkURL(),
				fieldConfig: app.data.getFieldsConfig(),
				currentColors: WebApplicationData.getColors(),
				zoomLevel: WebApplicationData.getZoomLevel(),
				extent: Helper.getWebMapExtentFromItem(app.data.getWebMapItem().item)
			});
		}
		
		function getLogoURL()
		{
			var logoURL = WebApplicationData.getLogoURL();
			
			if ( ! logoURL )
				logoURL = APPCFG.HEADER_LOGO_URL;
			else if ( logoURL == NO_LOGO_OPTION )
				logoURL = null;
			
			return logoURL;
		}

		function settingsPopupSave(settings)
		{
			if( settings.layout )
				WebApplicationData.setLayout(settings.layout);
				
			// Colors
			if (settings.colors)
				WebApplicationData.setColors(settings.colors[0], settings.colors[1], settings.colors[2]);

			// Fields
			WebApplicationData.setFieldsOverride(settings.fieldConfig);

			// Logo
			var logoURL = settings.logoURL;
			if (logoURL) {
				if (logoURL == APPCFG.HEADER_LOGO_URL)
					WebApplicationData.setLogoURL(null);
				else 
					WebApplicationData.setLogoURL(logoURL);
			}
			else {
				WebApplicationData.setLogoURL(NO_LOGO_OPTION);
			}
			WebApplicationData.setLogoTarget(settings.logoTarget);
			
			// Header link
			WebApplicationData.setHeaderLink(settings.headerLinkText, settings.headerLinkURL);

			// Zoom level
			if( settings.zoomLevel != "-1" )
				WebApplicationData.setZoomLevel(settings.zoomLevel);
			else
				WebApplicationData.setZoomLevel("");

			var extent = Helper.serializeExtentToItem(settings.extent);
			if( ! Helper.serializedExtentEquals(extent,app.data.getWebMapItem().item.extent) ) {
				app.data.getWebMapItem().item.extent = extent;
				app.data.initialExtentHasBeenEdited = true;
			}

			_this.incrementSaveCounter();
			dojo.publish("CORE_UPDATE_UI");
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
						_this.incrementSaveCounter();
					}
				}
				else
					WebApplicationData.setTitle("");
			}
			else if ( param.src == "subtitle" ) {
				if( param.value != app.data.getWebMapItem().item.snippet && param.value != i18n.viewer.headerJS.editMe ) {
					if( param.value != WebApplicationData.getSubtitle() ) {
						WebApplicationData.setSubtitle(param.value);
						_this.incrementSaveCounter();
					}
				}
				else
					WebApplicationData.setSubtitle("");
			}
			
			$('#headerMobile .banner .' + param.src).html(param.value);
		}
		
		//
		// Picture panel
		//
		
		function picturePanelEdited(param)
		{
			var nbChange = 0;
			
			if( ! app.data.getCurrentGraphic() )
				return;
			
			if( app.data.getCurrentGraphic().attributes.getName() != param.title )
				nbChange++;
				
			if( app.data.getCurrentGraphic().attributes.getDescription() != param.description )
				nbChange++;
				
			if (nbChange) {
				_this.incrementSaveCounter(nbChange);
				app.data.updateCurrentTourPoint(param.title, param.description);
			}
		}
		
		//
		// Web Map handling
		//
		function saveWebmap()
		{
			if( app.data.initialExtentHasBeenEdited ) {
				var portalUrl = getPortalURL(),
					item = app.data.getWebMapItem().item,
					itemData = app.data.getWebMapItem().itemData,
					uid = esri.id.findCredential(portalUrl).userId,
					token  = esri.id.findCredential(portalUrl).token;
				
				// Cleanup item data
				Helper.prepareWebmapItemForCloning(itemData);

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

				saveRq.then(saveFS, appSaveFailed);
			}
			else
				saveFS();
		}
		

		//
		// Feature Service handling
		//

		function restoreFS()
		{
			$.each(app.data.getTourPoints(true), function(i, tourPoint){
				if( tourPoint.hasBeenUpdated() && ! app.data.hasBeenAdded(tourPoint) )
					tourPoint.restoreOriginal();
			});
		}

		function saveFS()
		{
			var updatedFeatures = [];
			var droppedFeatures = app.data.getDroppedPoints();
			$.each(app.data.getTourPoints(true), function(i, tourPoint){
				if( tourPoint.hasBeenUpdated() )
					updatedFeatures.push( tourPoint.getUpdatedFeature() );
			});
			
			if ( updatedFeatures.length > 0 || droppedFeatures.length > 0 ) {
				fsApplyEdits(
					app.data.getSourceLayer(),
					[],
					updatedFeatures,
					droppedFeatures,
					appSaveSucceeded,
					function(error){
						appSaveFailed("FS", error);
					}
				);
			}
			else
				appSaveSucceeded({success: true});
		}
		
		function setHostedFeatureServiceEditable(url, enable)
		{
			var baseurl = url.match(/.*\/arcgis\/rest\//)[0];
			var serviceName = url.match(/.*\/arcgis\/rest\/services\/(.*)\/FeatureServer\//);
			if( ! baseurl || ! serviceName || ! serviceName[1] )
				return;
			
			var updateRq = esri.request(
				{
					url: baseurl.substr(0,baseurl.length - 5) + 'admin/services/' + serviceName[1] + '.FeatureServer/updateDefinition',
					handleAs: 'json',
					content: {
						// We should be able to get the editorTrackingInfo through another request...
						updateDefinition: JSON.stringify(enable ? 
							{
								"hasStaticData":false,
								"capabilities":"Query,Editing,Create,Update,Delete",
								"allowGeometryUpdates":true,
								"editorTrackingInfo":{
									"enableEditorTracking":false,
									"enableOwnershipAccessControl":false,
									"allowOthersToUpdate":true,
									"allowOthersToDelete":true
								}
							} 
							:
							{
								capabilities:"Query"
							}
						),
						f: 'json',
						token: esri.id.findCredential(getPortalURL()).token
					}
				},
				{
					usePost: true
				}
			);
			
			return updateRq;
		}
		
		this.updateFSTourPoint = function(graphic, successCallback, errorCallback)
		{
			fsApplyEdits(app.data.getSourceLayer(), [], [graphic], [], successCallback, errorCallback);
		}
		
		//
		// Feature Service core function that handle hosted FS security
		//
		
		function fsApplyEdits(layer, adds, updates, deletes, successCallback, errorCallback)
		{
			// If it's a non editable activate edit, make update and disable edit
			if( isNonEditableHostedFS(layer) ) {
				setHostedFeatureServiceEditable(layer.url, true).then(
					function(){
						var fsRequest = layer.applyEdits(adds, updates, deletes);
						fsRequest.then(
							function(result){
								setHostedFeatureServiceEditable(layer.url, false).then(
									function(){
										successCallback(result);
									},
									errorCallback
								);
							},
							errorCallback
						);
					},
					errorCallback
				);
			}
			else {
				var fsRequest = layer.applyEdits(adds, updates, deletes);
				fsRequest.then(successCallback, errorCallback);
			}
		}
		
		function fsAddAttachment(layer, objectId, formId, successCallback, errorCallback)
		{
			if (isNonEditableHostedFS(layer))
				setHostedFeatureServiceEditable(layer.url, true).then(
					function(){
						layer.addAttachment(
							objectId, 
							document.getElementById(formId), 
							function(result){
								setHostedFeatureServiceEditable(layer.url, false).then(
									function(){
										successCallback(result);
									},
									errorCallback
								);
							},
							errorCallback
						);
					},
					errorCallback
				);
			else
				layer.addAttachment(objectId, document.getElementById(formId), successCallback, errorCallback);
		}
		
		function manageFSSecurity(layer, enable)
		{
			var resultDeferred = new dojo.Deferred();
			
			if( isNonEditableHostedFS(layer) )
				setHostedFeatureServiceEditable(layer.url, enable).then(function(){
					resultDeferred.resolve();
				});
			else
				resultDeferred.resolve();
			
			return resultDeferred;
		}
		
		function checkFsSecurity(layer, _function)
		{
			if (isNonEditableHostedFS(layer)) {
				var resultDeferred = new dojo.Deferred();
				setHostedFeatureServiceEditable(layer.url, true).then(function(){
					_function().then(function(result){
						setHostedFeatureServiceEditable(layer.url, false).then(function(){
							resultDeferred.resolve(result);
						});
					});
				});
				return resultDeferred;
			}
			else 
				return _function()
		}
		
		function isNonEditableHostedFS(layer)
		{
			return false;
			//return ! layer.isEditable() && layer.url.match(/\/\/services[a-zA-Z0-9]*.arcgis.com\//);
		}
		

		/**
		 * Save the new tour point in a Feature Service.
		 * Sequential operations :
		 *  - create a feature based on tourPoint
		 *  - upload the picture based on pictureData
		 *  - upload the thumbnail based on thumbnailData
		 *  - call the callback
		 * @param {Object} tourPoint
		 * @param {Object} pictureData
		 * @param {Object} thumbnailData
		 * @param {Object} callback
		 */
		this.addFSNewTourPointUsingData = function(tourPoint, pictureData, thumbnailData, callback)
		{
			fsApplyEdits(
				app.data.getSourceLayer(), 
				[tourPoint], 
				null, 
				null,
				function(result) {
					if (!result || !result[0] || !result[0].success)
						callback(false);
					else
						uploadPictureAndThumbnailUsingData(result[0].objectId, pictureData, thumbnailData, callback);
				},
				function(error){
					callback(false);
				}
			);
		}

		this.addTemporaryTourPointUsingForm = function(tourPoint, pictureFormId, callback)
		{
			fsApplyEdits(
				app.data.getSourceLayer(),
				[tourPoint],
				null,
				null,
				function(result) {
					if (!result || !result[0] || !result[0].success)
						callback(false);
					else
						uploadPictureUsingForm(result[0].objectId, pictureFormId, callback);
				},
				function(error){
					callback(false);
				}
			);
		}

		this.saveTemporaryTourPointUsingForm = function(objectId, tourPoint, thumbnailFormId, callback)
		{
			fsApplyEdits(
				app.data.getSourceLayer(),
				null,
				[tourPoint],
				null,
				function(result){
					// TODO why result is empty ?
					//if (!result || !result[0] || !result[0].success)
					//	callback(false);
					//else
						uploadPictureUsingForm(objectId, thumbnailFormId, callback);
				},
				function(error){
					callback(false);
				}
			);
		}

		/**
		 * Change the picture and thumbnail of the feature objectId
		 *  - Query feature attachments
		 *  - Drop all attachments
		 *  - Add new attachments
		 * @param {Object} objectId
		 * @param {Object} pictureData
		 * @param {Object} thumbnailData
		 * @param {Object} callback
		 */
		this.changePicAndThumbUsingData = function(objectId, pictureData, thumbnailData, callback)
		{
			deleteAllAttachments(objectId, function(isSuccess){
				if( isSuccess )
					uploadPictureAndThumbnailUsingData(objectId, pictureData, thumbnailData, callback);
				else
					callback(false);
			});
		}

		this.changeThumbnailUsingData = function(objectId, thumbnailData, callback)
		{
			deleteThumbnailAttachment(objectId, function(isSuccess){
				if( isSuccess )
					uploadThumbnailUsingData(objectId, thumbnailData, callback);
				else
					callback(false);
			});
		}

		this.changePicAndThumbUsingForm = function(objectId, pictureFormId, thumbnailFormId, callback)
		{
			deleteAllAttachments(objectId, function(isSuccess){
				if( isSuccess )
					uploadPictureAndThumbnailUsingForm(objectId, pictureFormId, thumbnailFormId, callback);
				else
					callback(false);
			});
		}

		//
		// Map popover 
		//
		
		this.createPinPopup = function(graphic, index, visible)
		{			
			var tipHtml = "<p style='text-align:center'>" + i18n.viewer.builderJS.dragColorPicker + "</p>";
			
			var pointColor = graphic.attributes.getColor();
			if( ! MapTourHelper.colorExists(pointColor) )
				pointColor = MapTourHelper.getDefaultColor();
			
			var width = MapTourHelper.getSymbolConfig('normal').width;
			var height = MapTourHelper.getSymbolConfig('normal').height;
			
			$.each(MapTourHelper.getSymbolColors(), function(i, color){
				var selectedClass = (""+pointColor).toLowerCase() == color.toLowerCase() ? "selectedColor" : "";
				tipHtml += '<img class="colorSelectorPin ' + selectedClass + '" src="' +  MapTourHelper.getSymbolUrl(color, index + 1) + '" alt="" style="width:' + width + 'px; height: ' + height + 'px;"/>';
			});

			app.mapTips = new MultiTips({
				map: app.map,
				content: tipHtml,
				pointArray:[graphic],
				labelDirection: "auto",
				backgroundColor: "#444444",
				pointerColor: "#444444",
				textColor: "#ffffff",
				minWidth: (width+15) * MapTourHelper.getSymbolColors().length,
				offsetTop: 32,
				topLeftNotAuthorizedArea: has('touch') ? [40, 173] : [30,143],
				mapAuthorizedWidth: MapTourHelper.isModernLayout() ? dojo.query("#picturePanel").position()[0].x : -1,
				mapAuthorizedHeight: MapTourHelper.isModernLayout() ? dojo.query("#footerDesktop").position()[0].y - dojo.query("#header").position()[0].h : -1,
				visible : visible
			});
			
			$(".colorSelectorPin").click(selectedColorChange);
		}
		
		this.movedPin = function()
		{
			_this.incrementSaveCounter();
			app.mapTips.show();
		}
		
		this.hidePinPopup = function(graphic)
		{
			app.mapTips.hide();
		}
		
		function selectedColorChange()
		{
			var selectedColorIndex = $(".colorSelectorPin.selectedColor").index() - 1;
			var newColorIndex = $(this).index() - 1;
			
			if (selectedColorIndex != newColorIndex) {
				$(".colorSelectorPin").removeClass("selectedColor");
				$(this).addClass("selectedColor");
				
				var color = $.grep(MapTourHelper.getSymbolColors(), function(color, index){
					return index == newColorIndex;
				});
				_this.incrementSaveCounter();
				app.data.updateCurrentTourPointColor(color[0]);
			}
		}
		
		//
		// Feature service technical function
		//

		function deleteAllAttachments(objectId, callback)
		{
			app.data.getSourceLayer().queryAttachmentInfos(
				objectId,
				function(attachmentInfos) {
					// bad stuff to be changed when using attachment update !
					manageFSSecurity(app.data.getSourceLayer(), true).then(
						function(){
							// TODO Seems that bulk delete is not working in ArcGIS for Orga => Test more and report
	
							//var attachmentIds = [];
							var errorDuringDelete = false;
							$.each(attachmentInfos, function(i, attachment){
								//attachmentIds.push(attachment.id);
								if( errorDuringDelete )
									return;
		
								app.data.getSourceLayer().deleteAttachments(
									objectId,
									[attachment.id],
									function() { },
									function() {
										errorDuringDelete = true;
										callback(false);
									}
								);
							});
		
							manageFSSecurity(app.data.getSourceLayer(), false).then(
								function(){
									if( ! errorDuringDelete )
										callback(true);
									else
										callback(false);
								},
								function(){
									callback(false);
								}
							);
		
							/*
							app.data.getSourceLayer().deleteAttachments(
								objectId,
								attachmentIds,
								function() {
									uploadPictureAndThumbnailUsingData(objectId, pictureData, thumbnailData, callback);
								},
								function() {
									callback(false);
								}
							);
							*/
						},
						function(error){
							manageFSSecurity(app.data.getSourceLayer(), false).then(function(){
								callback(false);
							})
						}
					);
				},
				function(error){
					callback(false);
				}
			);
		}

		function deleteThumbnailAttachment(objectId, callback)
		{
			app.data.getSourceLayer().queryAttachmentInfos(
				objectId,
				function(attachmentInfos) {
					manageFSSecurity(app.data.getSourceLayer(), true).then(
						function() {
							// Sort attachment by ID and remove the first attachement
							var attachmentIds = [];
							$.each(attachmentInfos, function(i, attachment){
								attachmentIds.push(attachment.id);
							});
							attachmentIds = attachmentIds.sort().slice(1);
							
							// Delete all but first attachments
							var errorDuringDelete = false;
							$.each(attachmentIds, function(i, id){
								if( errorDuringDelete )
									return;
								
								app.data.getSourceLayer().deleteAttachments(
									objectId,
									[id],
									function() { },
									function() {
										errorDuringDelete = true;
									}
								);
							});
		
							manageFSSecurity(app.data.getSourceLayer(), false).then(
								function(){
									if( ! errorDuringDelete )
										callback(true);
									else
										callback(false);
								},
								function(){
									callback(false);
								}
							);
						},
						function(error){
							manageFSSecurity(app.data.getSourceLayer(), false).then(function(){
								callback(false);
							});							
						}
					);
				},
				function(error){
					callback(false);
				}
			);
		}

		function uploadPictureAndThumbnailUsingData(objectId, pictureData, thumbnailData, callback)
		{
			var picRq = uploadFeatureAttachmentFromData(app.data.getSourceLayer().url, objectId, pictureData, "picture.jpg");
			var errorHandler = function(){ callback(false); };

			picRq.then(function(result)
				{
					var picID = result.addAttachmentResult.objectId;
					var thumbRq = uploadFeatureAttachmentFromData(app.data.getSourceLayer().url, objectId, thumbnailData, "thumbnail.jpg");
					thumbRq.then(function(result)
						{
							var thumbID = result.addAttachmentResult.objectId;
							callback(true, objectId, picID, thumbID);
						},
						errorHandler
					);
	
				},
				errorHandler
			);
		}

		function uploadThumbnailUsingData(objectId, thumbnailData, callback)
		{
			var thumbRq = uploadFeatureAttachmentFromData(app.data.getSourceLayer().url, objectId, thumbnailData, "thumbnail.jpg");
			var errorHandler = function(){ callback(false); };

			thumbRq.then(function(result)
				{
					var thumbID = result.addAttachmentResult.objectId;
					callback(true, objectId,  thumbID);
				},
				errorHandler
			);
		}

		function uploadPictureAndThumbnailUsingForm(objectId, pictureFormId, thumbnailFormId, callback)
		{
			uploadPictureUsingForm(objectId, pictureFormId, function(success, id, imgID){
				if( success )
					uploadPictureUsingForm(objectId, thumbnailFormId, function(success2, id2, thumbID){
						if (success2) {
							callback(true, id, imgID, thumbID);
						}
						else 
							callback(false);
					});
				else
					callback(false);
			});
		}

		function uploadFeatureAttachmentFromData(fsURL, objectID, data, name)
		{
			var formdata = new FormData();
			formdata.append("attachment", dataURItoBlob(data), name);
			formdata.append("f", "json");

			return checkFsSecurity(
				app.data.getSourceLayer(), 
				function() {
					return esri.request(
						{
							url: fsURL + '/' + objectID + '/addAttachment',
							form: formdata
						},
						{
							usePost: true
						}
					)
				}
			);
		}

		function dataURItoBlob(dataURI)
		{
			var binary = atob(dataURI.split(',')[1]);
			var ab = new ArrayBuffer(binary.length);
			var ia = new Uint8Array(ab);
			for (var i = 0; i < binary.length; i++) {
			    ia[i] = binary.charCodeAt(i);
			}
			
			try {
				// Should be [ia] but fail on iOS
				// The loop that popuplate ia that isn't use is also needed for iOS
				return new Blob([ab], { type: "image/jpeg" });
			}
			catch(e) {
				window.BlobBuilder = window.BlobBuilder ||
					window.WebKitBlobBuilder ||
					window.MozBlobBuilder ||
					window.MSBlobBuilder;
			
				var bb = new BlobBuilder();
				bb.append(ab);
				return bb.getBlob({ type: "image/jpeg" });
			}
		}

		function uploadPictureUsingForm(objectId, formId, callback)
		{
			fsAddAttachment(
				app.data.getSourceLayer(),
				objectId,
				formId,
				function(result) {
					if( ! result.success || result.attachmentId == null )
						callback(false);
					else
						callback(true, objectId, result.attachmentId);
				},
				function() {
					callback(false);
				}
			);
		}

		//
		// Web map application handling
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

		function appSaveSucceeded(response)
		{
			// TODO : why the first condition is sometimes needed on first save ?
			if (response.length == 0 || response && response.success) {
				$("#builderPanel .builder-settings").next(".popover").find(".stepSave").css("display", "none");
				$("#builderPanel .builder-settings").next(".popover").find(".stepSaved").css("display", "block");
				setTimeout(function(){
					$("#builderPanel .builder-settings").popover('hide');
				}, 3500);

				closePopover();
				resetSaveCounter();
				app.data.updateAfterSave();
				changeBuilderPanelButtonState(true);
			}
			else
				appSaveFailed();
		}

		function appSaveFailed(source, error)
		{
			$("#builderPanel .builder-settings").next(".popover").find(".stepSave").css("display", "none");
			$("#builderPanel .builder-settings").next(".popover").find(".stepFailed").css("display", "block");
			changeBuilderPanelButtonState(true);
		}
		
		//
		// Misc
		//
		
		function getPortalURL()
		{
			return configOptions.sharingurl.split('/').slice(0,3).join('/');
		}

		function styleIdentityManagerForSave()
		{
			// Hide default message
			$(".esriSignInDialog").find("#dijitDialogPaneContentAreaLoginText").css("display", "none");

			// Setup a more friendly text
			$(".esriSignInDialog").find(".dijitDialogPaneContentArea:first-child").find(":first-child").first().after("<div id='dijitDialogPaneContentAreaAtlasLoginText'>"+i18n.viewer.builderJS.signIn+" <a href='http://" + esri.id._arcgisUrl + "' title='" + esri.id._arcgisUrl + "' target='_blank'>" + esri.id._arcgisUrl + "</a> "+i18n.viewer.builderJS.signInTwo+"</div>");
			
			dojo.connect(esri.id, "onDialogCancel", function (info){ 
				$("#builderPanel .builder-settings").popover('hide');
			});
		}
		
		this.showBrowserWarning = function()
		{
			$("#browserPopup .modal-header h3").html(i18n.viewer.errors.oldBrowserTitle);
			$("#browserPopup .browserExplain").html(i18n.viewer.errors.oldBrowserExplain);
			$("#browserPopup .browserExplain2").html(i18n.viewer.errors.oldBrowserExplain2);
			$("#browserPopup .modal-footer .btnClose").html(i18n.viewer.errors.oldBrowserClose);
			$("#browserPopup").modal();
		}

		this.initLocalization = function()
		{
			dojo.query('#builderPanel h4')[0].innerHTML = i18n.viewer.builderHTML.panelHeader;
			dojo.query('#builderPanel button')[0].innerHTML = i18n.viewer.builderHTML.buttonSave;
			dojo.query('#builderPanel button')[1].innerHTML = i18n.viewer.builderHTML.buttonDiscard;
			dojo.query('#builderPanel button')[2].innerHTML = '<img src="resources/icons/builder-settings.png" style="vertical-align: -6px;" alt="' + i18n.viewer.builderHTML.buttonSettings + '" />';
			dojo.query('#builderPanel button')[3].innerHTML = '<img src="resources/icons/builder-view.png" style="vertical-align: -6px;" alt="' + i18n.viewer.builderHTML.buttonView + '" />';
			dojo.query('#save-counter')[0].innerHTML = i18n.viewer.builderJS.noPendingChange;

			dojo.byId('organizeSlidesButton').innerHTML = i18n.viewer.builderHTML.buttonOrganize;
			dojo.byId('addPopupButton').innerHTML = i18n.viewer.builderHTML.buttonAdd;

			_dataPopup.initLocalization();
			_organizePopup.initLocalization();
			_settingsPopup.initLocalization();
			_addPopup.initLocalization();
		}

		resetWebAppData = function()
		{
			var portalUrl = getPortalURL();
			var portal = new esri.arcgis.Portal(portalUrl);
			portal.signIn().then(
				function(){
					var itemId = Helper.getAppID(_core.isProd()),
						uid = esri.id.findCredential(portalUrl).userId,
						token  = esri.id.findCredential(portalUrl).token,
						appItem = lang.clone(app.data.getAppItem());

					// Remove properties that don't have to be committed back
					delete appItem.avgRating;
					delete appItem.modified;
					delete appItem.numComments;
					delete appItem.numRatings;
					delete appItem.numViews;
					delete appItem.size;
					delete appItem.uploaded;

					var appData = WebApplicationData.get();
					var webmap = appData.values.webmap;
					appData.values = {webmap: webmap};

					appItem = lang.mixin(appItem, {
						f: "json",
						token: token,
						overwrite: true,
						text: JSON.stringify(appData)
					});

					var saveRq = esri.request(
						{
							url: portalUrl + "/sharing/content/users/" + uid + "/addItem",
							handleAs: 'json',
							content: appItem
						},
						{
							usePost: true
						}
					);
				},
				function(error){
					console.error(i18n.viewer.errors.mapSave);
				}
			);
		}

		return this;
	}
);
