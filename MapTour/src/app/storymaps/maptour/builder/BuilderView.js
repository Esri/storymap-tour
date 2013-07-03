define(["storymaps/maptour/core/WebApplicationData", 
		"storymaps/utils/MovableGraphic",
		"storymaps/builder/SettingsPopup",
		"storymaps/maptour/ui/mobile/AddButton",
		"storymaps/maptour/builder/InitPopup",
		"storymaps/maptour/builder/AddPopup",
		"storymaps/maptour/builder/OrganizePopup",
		"storymaps/maptour/builder/ImportPopup",
		"storymaps/maptour/builder/HelpPopup",
		"storymaps/ui/multiTips/MultiTips",
		"storymaps/maptour/core/MapTourHelper",
		"storymaps/utils/Helper",
		"dojo/has",
		// Settings tab
		"storymaps/maptour/builder/SettingsPopupTabLayout",
		"storymaps/builder/SettingsPopupTabColors",
		"storymaps/builder/SettingsPopupTabHeader",
		"storymaps/maptour/builder/SettingsPopupTabFields",
		"storymaps/builder/SettingsPopupTabExtent",
		"storymaps/maptour/builder/SettingsPopupTabZoom"], 
	function (
		WebApplicationData, 
		MovableGraphic,
		SettingsPopup, 
		AddButton, 
		InitPopup, 
		AddPopup, 
		OrganizePopup, 
		ImportPopup,
		HelpPopup,
		MultiTips, 
		MapTourHelper,
		Helper,
		has,
		// Settings tab
		SettingsPopupTabLayout, 
		SettingsPopupTabColors, 
		SettingsPopupTabHeader, 
		SettingsPopupTabFields,
		SettingsPopupTabExtent, 
		SettingsPopupTabZoom
	){
		return function BuilderView() 
		{
			var NO_LOGO_OPTION = "NO_LOGO";

			var _this = this;			
			var _settingsPopup = null;
			var _initPopup = new InitPopup($('#initPopup'));
			var _addPopup = new AddPopup($('#addPopup'));
			var _organizePopup = new OrganizePopup($('#organizePopup'));
			var _importPopup = new ImportPopup($('#importPopup'));
			var _helpPopup = new HelpPopup($('#helpPopup'));
			
			this.init = function(settingsPopup)
			{
				_settingsPopup = settingsPopup;
				dojo.subscribe("SETTINGS_POPUP_SAVE", settingsPopupSave);
				dojo.subscribe("ORGANIZE_POPUP_SAVE", organizePopupSave);
				dojo.subscribe("PIC_PANEL_EDIT", picturePanelEdited);
				dojo.subscribe("CORE_UPDATE_UI", updateUI);
				
				$("#builderPanel2").css("display", "block");
				$("#addPopupButton").click(addPopupShow);
				$("#organizeSlidesButton").click(organizePopupShow);
				$("#importPopupButton").click(importPopupShow);
				$("#introRecordButton").click(introRecordClick);
				
				initLocalization();
				_initPopup.initLocalization();
				_addPopup.initLocalization();
				_organizePopup.initLocalization();
				_importPopup.initLocalization();
				_helpPopup.initLocalization();
				
				app.builder.updateBuilderMoveable = updateBuilderMoveable;
				
				app.builder.organizePopupSaveConfirmationCallback = organizePopupSaveConfirmationCallback;
				
				app.builder.setDataWarning = setDataWarning;
				app.builder.showBrowserWarning = showBrowserWarning;
				app.builder.presentInitPopup = presentInitPopup;
				app.builder.openFieldsSettingOnStartup = openFieldsSettingOnStartup;
				
				app.builder.createPinPopup = createPinPopup;
				app.builder.movedPin = movedPin;
				app.builder.hidePinPopup = hidePinPopup;
				
				app.builder.openHelpPopup = openHelpPopup;
			}
			
			this.appInitComplete = function(saveApp)
			{
				if( ! app.data.sourceIsNotFSAttachments() && Helper.browserSupportAttachementUsingFileReader() )
					new AddButton().init(saveApp);
			}
			
			function updateBuilderMoveable(graphic)
			{
				app.builderMoveEvents && app.builderMoveEvents.clean();
					if ( ! MapTourHelper.isOnMobileView() ) {
						 app.builderMoveEvents = new MovableGraphic(
						 	app.map, 
							app.data.getTourLayer(), 
							graphic, 
							app.builder.movedPin, 
							app.builder.hidePinPopup
						);
					}
			}
			
			//
			// First record as intro
			//
			
			function updateUI()
			{
				$("#builderPanel3").toggle(app.data.hasIntroRecord());
			}
			
			function introRecordClick()
			{
				app.data.setCurrentPointByGraphic(app.data.getIntroData());
				dojo.publish("CORE_UPDATE_UI", { editFirstRecord: true });
			}
			
			//
			// Settings
			//
			
			this.getSettingsTab = function(_tabsBar, _tabContent, params)
			{
				return [
					new SettingsPopupTabLayout(_tabsBar.eq(0), _tabContent.eq(0)),
					new SettingsPopupTabColors(_tabsBar.eq(1), _tabContent.eq(1), params.colorSchemes),
					new SettingsPopupTabHeader(_tabsBar.eq(2), _tabContent.eq(2), params.defaultLogoURL),
					new SettingsPopupTabFields(_tabsBar.eq(3), _tabContent.eq(3)),
					new SettingsPopupTabExtent(_tabsBar.eq(4), _tabContent.eq(4)),
					new SettingsPopupTabZoom(_tabsBar.eq(5), _tabContent.eq(5))
				];
			}
			
			this.openSettingPopup = function(fieldsError)
			{
				_settingsPopup.present(
					[
						{
							name: WebApplicationData.getLayout()
						},
						{
							colors: WebApplicationData.getColors()
						},
						{
							logoURL: getLogoURL(),
							logoTarget: WebApplicationData.getLogoTarget(),
							linkText: WebApplicationData.getHeaderLinkText() == undefined ? APPCFG.HEADER_LINK_TEXT : WebApplicationData.getHeaderLinkText(),
							linkURL: WebApplicationData.getHeaderLinkURL() == undefined ? APPCFG.HEADER_LINK_URL : WebApplicationData.getHeaderLinkURL(),
							// For the simulator
							colors: WebApplicationData.getColors()
						},
						{
							allFields: app.data.getSourceLayer().fields,
							fieldConfig: app.data.getFieldsConfig()
						},
						{
							extent: Helper.getWebMapExtentFromItem(app.data.getWebMapItem().item)
						},
						{
							zoomLevel: WebApplicationData.getZoomLevel(),
						}
					],
					fieldsError ? 3 : null
				);
			}
			
			function openFieldsSettingOnStartup()
			{
				_this.openSettingPopup(true);
			}
	
			function settingsPopupSave(data)
			{
				// Layout
				WebApplicationData.setLayout(data.settings[0].name);
				
				// Colors
				WebApplicationData.setColors(data.settings[1].colors[0], data.settings[1].colors[1], data.settings[1].colors[2]);
				
				// Header
				WebApplicationData.setHeaderLink(data.settings[2].linkText, data.settings[2].linkURL);
	
				var logoURL = data.settings[2].logoURL;
				if (logoURL) {
					if (logoURL == APPCFG.HEADER_LOGO_URL)
						WebApplicationData.setLogoURL(null);
					else 
						WebApplicationData.setLogoURL(logoURL);
				}
				else {
					WebApplicationData.setLogoURL(NO_LOGO_OPTION);
				}
				WebApplicationData.setLogoTarget(data.settings[2].logoTarget);
				
				// Fields
				WebApplicationData.setFieldsOverride(data.settings[3].fieldConfig);
				
				// Extent
				var extent = Helper.serializeExtentToItem(data.settings[4].extent);
				if( ! Helper.serializedExtentEquals(extent, app.data.getWebMapItem().item.extent) ) {
					app.data.getWebMapItem().item.extent = extent;
					app.data.initialExtentHasBeenEdited = true;
				}
				
				// Zoom level
				if( data.settings[5].zoomLevel != "-1" )
					WebApplicationData.setZoomLevel(data.settings[5].zoomLevel);
				else
					WebApplicationData.setZoomLevel("");
				
				dojo.publish("BUILDER_INCREMENT_COUNTER", 1);
				dojo.publish("CORE_UPDATE_UI");
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
			
			//
			// Help popup
			//
			
			function openHelpPopup()
			{
				_helpPopup.present();
			}
			
			//
			// Init popup
			//
			
			function presentInitPopup(portal, webmap)
			{
				return _initPopup.present({
					home: {
						portal: portal,
						webmap: webmap
					},
					hostedFS: {
						portal: portal,
						webmap: webmap
					},
					CSV: {
						portal: portal,
						webmap: webmap,
						nbPicturesMax: APPCFG.MAX_ALLOWED_POINTS,
						nbPicturesAuthorized: APPCFG.MAX_ALLOWED_POINTS
					},
					Flickr: {
						apiKey: APPCFG.FLICKR_API_KEY,
						nbPicturesMax: APPCFG.MAX_ALLOWED_POINTS,
						nbPicturesAuthorized: APPCFG.MAX_ALLOWED_POINTS
					},
					Facebook: {
						appId: APPCFG.FACEBOOK_APP_ID,
						nbPicturesMax: APPCFG.MAX_ALLOWED_POINTS,
						nbPicturesAuthorized: APPCFG.MAX_ALLOWED_POINTS
					},
					Picasa: {
						nbPicturesMax: APPCFG.MAX_ALLOWED_POINTS,
						nbPicturesAuthorized: APPCFG.MAX_ALLOWED_POINTS
					},
					geotag: {
						portal: portal,
						webmap: webmap
					}
				});
			}
			
			//
			// Organize Popup
			//
	
			function organizePopupShow()
			{
				// Give organize popup all points in the Feature Service
				// The one that have been previously configured and then the one that haven't as hidden
				_organizePopup.present(app.data.getAllFeatures(), app.data.hasIntroRecord());
			}
	
			function organizePopupSaveConfirmationCallback(confirmed)
			{
				_organizePopup.saveConfirmationCallback(confirmed);
			}
	
			function organizePopupSave(param)
			{
				// TODO issue if reorder point and set first record
				app.data.dropTourPoints(param.dropped);
				
				if( ! WebApplicationData.getFirstRecordAsIntro() && param.firstRecordAsIntro ) {
					app.data.setFirstPointAsIntroRecord();
				}
				else if ( WebApplicationData.getFirstRecordAsIntro() && ! param.firstRecordAsIntro ) {
					app.data.restoreIntroRecordAsPoint();
				}
				
				WebApplicationData.setFirstRecordAsIntro(param.firstRecordAsIntro);
				
				app.data.updateTourPointsOrder(param.order);
	
				dojo.publish("BUILDER_INCREMENT_COUNTER", 1);
			}
	
			//
			// Add Popup
			//
	
			function addPopupShow()
			{
				_addPopup.present();
			}
			
			//
			// Import Popup
			//
			
			function getLayerFieldsNameArray(fields)
			{
				var fieldsName = [];
				$.each(fields, function(i, field){
					fieldsName.push(field.name);
				});
				return fieldsName;
			}
			
			function importPopupShow()
			{
				var nbPicturesAuthorized = APPCFG.MAX_ALLOWED_POINTS - app.data.getTourPoints().length;
				
				_importPopup.present({
					CSV: {
						layer: app.data.getTourLayer(),
						layerFields: getLayerFieldsNameArray(app.data.getSourceLayer().fields),
						nbPicturesMax: APPCFG.MAX_ALLOWED_POINTS,
						nbPicturesAuthorized: nbPicturesAuthorized,
						startIndex: app.data.getTourPoints().length + 1
					},
					Flickr: {
						apiKey: APPCFG.FLICKR_API_KEY,
						nbPicturesMax: APPCFG.MAX_ALLOWED_POINTS,
						nbPicturesAuthorized: nbPicturesAuthorized
					},
					Facebook: {
						appId: APPCFG.FACEBOOK_APP_ID,
						nbPicturesMax: APPCFG.MAX_ALLOWED_POINTS,
						nbPicturesAuthorized: nbPicturesAuthorized
					},
					Picasa: {
						nbPicturesMax: APPCFG.MAX_ALLOWED_POINTS,
						nbPicturesAuthorized: nbPicturesAuthorized
					},
					geotag: {
						layer: app.data.getTourLayer(),
						layerFields: getLayerFieldsNameArray(app.data.getSourceLayer().fields),
						startIndex: app.data.getTourPoints().length + 1
					}
				}).then(
					function(newGraphics)
					{
						$('#importPopup').modal("hide");
						app.data.importTourPoints(newGraphics);
					},
					function()
					{
						// 
					}
				);
			}
			
			//
			// Picture panel
			//
			
			function picturePanelEdited(param)
			{
				var nbChange = 0;
				var graphic = app.data.getCurrentGraphic() || app.data.getIntroData();
				
				if( ! graphic )
					return;
				
				if( graphic.attributes.getName() != param.title )
					nbChange++;
					
				if( graphic.attributes.getDescription() != param.description )
					nbChange++;
					
				if (nbChange) {
					dojo.publish("BUILDER_INCREMENT_COUNTER", nbChange);
					if( ! app.data.getCurrentGraphic() )
						app.data.updateIntroRecord(param.title, param.description);
					else
						app.data.updateCurrentTourPoint(param.title, param.description);
				}
			}
			
			//
			// Warning
			//
			
			function setDataWarning(popoverContent, webmapEditUrl)
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
			
			function showBrowserWarning()
			{
				$("#browserPopup .modal-header h3").html(i18n.viewer.errors.oldBrowserTitle);
				$("#browserPopup .browserExplain").html(i18n.viewer.errors.oldBrowserExplain);
				$("#browserPopup .browserExplain2").html(i18n.viewer.errors.oldBrowserExplain2);
				
				if( has("ie") && navigator.userAgent.match('Windows NT 6.1') )
					$("#browserPopup .browserExplain2").append(' <b>' + i18n.viewer.errors.oldBrowserExplain3 + '</b>');
				
				$("#browserPopup .modal-footer .btnClose").html(i18n.viewer.errors.oldBrowserClose);
				$("#browserPopup").modal();
			}
			
			//
			// Map popover 
			//
			
			function createPinPopup(graphic, index, visible)
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
					backgroundColor: APPCFG.POPUP_BACKGROUND_COLOR,
					borderColor: APPCFG.POPUP_BORDER_COLOR,
					pointerColor: APPCFG.POPUP_ARROW_COLOR,
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
			
			function movedPin()
			{
				dojo.publish("BUILDER_INCREMENT_COUNTER", 1);
				app.mapTips.show();
			}
			
			function hidePinPopup(graphic)
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
					dojo.publish("BUILDER_INCREMENT_COUNTER", 1);
					app.data.updateCurrentTourPointColor(color[0]);
				}
			}
			
			this.resize = function()
			{
				// Bottom panel - button size and reposition
				if ($("#organizeSlidesButton").width() > 0) {
					$("#builderPanel2 button").width($("#organizeSlidesButton").width() > $("#addPopupButton").width() ? $("#organizeSlidesButton").width() : $("#addPopupButton").width());
					$("#builderPanel2").css("margin-left", $("body").width() / 2 - $("#builderPanel2").outerWidth() / 2);
				}
			}
	
			this.initLocalization = function()
			{
				dojo.byId('organizeSlidesButton').innerHTML = i18n.viewer.builderHTML.buttonOrganize;
				dojo.byId('addPopupButton').innerHTML = i18n.viewer.builderHTML.buttonAdd;
	
				_initPopup.initLocalization();
				_organizePopup.initLocalization();
				_settingsPopup.initLocalization();
				_addPopup.initLocalization();
			}
			
			this.destroyDataWarning = function()
			{
				$("#builderPanel .builder-settings").popover('destroy');
				createAppSavedConfirmation();
			}
			
			function initLocalization()
			{
				dojo.byId('organizeSlidesButton').innerHTML = i18n.viewer.builderHTML.buttonOrganize;
				dojo.byId('addPopupButton').innerHTML = i18n.viewer.builderHTML.buttonAdd;
				dojo.byId('importPopupButton').innerHTML = i18n.viewer.builderHTML.buttonImport;
				
				dojo.byId('introRecordButton').innerHTML = i18n.viewer.builderHTML.introRecordBtn;
			}
		}
	}
);