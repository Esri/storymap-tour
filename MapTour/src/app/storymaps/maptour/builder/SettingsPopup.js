define(["dijit/ColorPalette",
		"dijit/Dialog",
		"storymaps/maptour/core/FieldConfig", 
		"storymaps/maptour/core/MapTourHelper",
		"storymaps/utils/Helper",
		"esri/toolbars/Draw",
		"esri/toolbars/Edit"
		], 
		function (ColorPalette, Dialog, FieldConfig, MapTourHelper, Helper) {
	return function SettingsPopup(container, colorSchemes, defaultLogoURL) 
	{
		var DEFAULT_GRAY = "#C0C0C0";
		
		var _agolBMScales = [
			{lbl:"-", scale:0, lvl: -1},
			{lbl:"1:591M (level 0)", scale:591657527.591555, lvl: 0},
			{lbl:"1:295M (level 1)", scale:295828763.795777, lvl: 1},
			{lbl:"1:147M (level 2)", scale:147914381.897889, lvl: 2},
			{lbl:"1:74M (level 3)", scale:73957190.948944, lvl: 3},
			{lbl:"1:37M (level 4)", scale:36978595.474472, lvl: 4},
			{lbl:"1:18M (level 5)", scale:18489297.737236, lvl: 5},
			{lbl:"1:9.2M (level 6)", scale:9244648.868618, lvl: 6},
			{lbl:"1:4.6M (level 7)", scale:4622324.434309, lvl: 7},
			{lbl:"1:2.3M (level 8)", scale:2311162.217155, lvl: 8},
			{lbl:"1:1.1M (level 9)", scale:1155581.108577, lvl: 9},
			{lbl:"1:580K (level 10)", scale:577790.554289, lvl: 10},
			{lbl:"1:290K (level 11)", scale:288895.277144, lvl: 11},
			{lbl:"1:145K (level 12)", scale:144447.638572, lvl: 12},
			{lbl:"1:72K (level 13)", scale:72223.819286, lvl: 13},
			{lbl:"1:36K (level 14)", scale:36111.909643, lvl: 14},
			{lbl:"1:18K (level 15)", scale:18055.954822, lvl: 15},
			{lbl:"1:9K (level 16)", scale:9027.977411, lvl: 16},
			{lbl:"1:4.5K (level 17)", scale:4513.988705, lvl: 17},
			{lbl:"1:2K (level 18)", scale:2256.994353, lvl: 18},
			{lbl:"1:1K (level 19)", scale:1128.497176, lvl: 19}
		];
		
		// Add the default Map Story theme
		colorSchemes.splice(0, 0, {name: "Gray", headerColor: APPCFG.COLORS[0], middleColor: APPCFG.COLORS[1], footerColor: APPCFG.COLORS[2]});
		
		var _this = this;
		var _container = container;	
		var _tabs = $(_container).find(".tab");
		var _tabContent = $(_container).find(".tab-content");
		
		var _tableColor;
		var _inputHeaderColor;
		var _inputMiddleColor;
		var _inputFooterColor;
		
		var _logoInput = $(_container).find("#logoInput");
		var _logoTargetInput = $(_container).find("#logoTargetInput");
		
		var _defaultLogoURL = defaultLogoURL;
		var _badLogo = false;
		
		var _fieldConfig;
		var _selectName = $(_container).find("#selectName");
		var _selectDescription = $(_container).find("#selectDescription");
		var _selectColor = $(_container).find("#selectColor");
		
		// Extent
		var _extentMap = null;
		var extentDrawBtn = $(_container).find("#extentDraw");
		var extentModifyBtn = $(_container).find("#extentModify");
		var extentApplyBtn = $(_container).find("#extentApply");
		var _extentMapDrawToolActive = false;
		var _extentMapDrawToolbar = null;
		var _extentMapEditToolbar = null;
		
		var _listZoomLevels = $('#listZoomLevels',_container);

		var _btnSave = $(_container).find(".btnSave");
		var _btnClose = $(_container).find(".btnClose");
		
		// Layout
		$('#settingsPopup #layout .layout-box button').fastClick(onLayoutChange)
		
		// create color scheme table & initialize the color pickers
		_tableColor = buildColorTable();
		$("#appearance #colorScheme .controls",_container).append(_tableColor);
		
		_inputHeaderColor = $("#inputCustomHeaderColor", _tableColor);
		_inputMiddleColor = $("#inputCustomMiddleColor", _tableColor);
		_inputFooterColor = $("#inputCustomFooterColor", _tableColor);

		createColorPalette(_inputHeaderColor);
		createColorPalette(_inputMiddleColor);
		createColorPalette(_inputFooterColor);
		
		// initialize the color pickers to gray so they won't have
		// a blank value.  for some reason, constructor color argument
		// doesn't properly set the input value. 
		$(_inputHeaderColor).spectrum("set", DEFAULT_GRAY);	
		$(_inputMiddleColor).spectrum("set", DEFAULT_GRAY);	
		$(_inputFooterColor).spectrum("set", DEFAULT_GRAY);				
		
		// assign event handlers
		
		_btnSave.click(save);
		_tabs.click(onTabClick);
		$(_logoInput).keydown(onLogoInputEnter);
		$(_logoInput).blur(loadCustomLogo);
		$(_logoTargetInput).keydown(onTargetInputEnter);

		// radio buttons in color table (generated above)
		$("input[name=groupColorSchemes]",$(_tableColor)).click(onColorSchemeRadioClick);
		// header color picker
		$(_inputHeaderColor).bind("change",function(color){
			$("#headerSimulator", _container).css("background-color", $(this).val());			
		});
		// logo radio buttons
		$("input[type=radio]","#logo").click(onLogoRadioClick);
		$("#imgLogo",_container).error(onLogoLoadError);
		$("#imgLogo",_container).load(onLogoLoadComplete);
		
		// Extent
		extentDrawBtn.click(function(){
			_extentMapDrawToolbar.activate(esri.toolbars.Draw.EXTENT);
		});
		extentModifyBtn.click(function(){
			_extentMapEditToolbar.activate(esri.toolbars.Edit.MOVE | esri.toolbars.Edit.SCALE, getUserExtent());
		});
		extentApplyBtn.click(function(){
			var extent = getUserExtent();
			if( extent ) 
				dojo.publish("CORE_UPDATE_EXTENT", extent.geometry.getExtent());
		});
				
		this.present = function(currentSettings) 
		{			
			//
			// Clean up
			//
			_tabs.removeClass("active disabled");
			_tabs.eq(0).addClass("active");
			_tabContent.hide();
			_tabContent.eq(0).show();
			_btnClose.removeAttr("disabled");
			$(".error-msg" ,_container).hide();
			$(".modal-header .close" ,_container).attr("data-dismiss", "modal");
			$(".modal-footer .error", _container).hide();
			$("#fields .error-msg2", _container).hide();
			
			//
			// Layout
			//
			selectLayout(currentSettings.layout == "integrated" ? 1 : 0);
			
			//
			// Color
			//
			
			selectCurrentColorScheme(currentSettings.currentColors);
			// if the last radio button is selected, that means it is the custom
			// color palette, so we need to initialize the pickers.
			var numRadios = $("input[name=groupColorSchemes]",_container).length;
			if ($("input[name=groupColorSchemes]",_container).eq(numRadios - 1).attr('checked') == "checked") {
				$(_inputHeaderColor).spectrum("set", currentSettings.currentColors[0]);	
				$(_inputMiddleColor).spectrum("set", currentSettings.currentColors[1]);	
				$(_inputFooterColor).spectrum("set", currentSettings.currentColors[2]);				
			}
			
			//
			// Data fields
			//
			
			$(_selectName).empty();
			$(_selectDescription).empty();
			$(_selectColor).empty();
			
			_fieldConfig = currentSettings.fieldConfig;
			var foundName = foundDescription = foundColor = false;
			$.each(currentSettings.allFields, function(i, field){
				var selectedName = selectedDesc = selectedColor = "";
				
				if( field.name == _fieldConfig.getNameField() ) {
					selectedName = 'selected="selected"';
					foundName = true;
				}
				
				if( field.name == _fieldConfig.getDescriptionField() ) {
					selectedDesc = 'selected="selected"';
					foundDescription = true;
				}
				
				if( field.name == _fieldConfig.getIconColorField() ) {
					selectedColor = 'selected="selected"';
					foundColor = true;
				}
					
				$(_selectName).append('<option value="' + field.name + '" ' + selectedName + '>' + field.alias + '</option>');
				$(_selectDescription).append('<option value="' + field.name + '" ' + selectedDesc + '>' + field.alias + '</option>');
				$(_selectColor).append('<option value="' + field.name + '" ' + selectedColor + '>' + field.alias + '</option>');
			});
			
			if( ! foundName )
				$(_selectName).prepend('<option value="-1" selected="selected">---</option>');
				
			if( ! foundDescription )
				$(selectedDesc).prepend('<option value="-1" selected="selected">---</option>');
				
			if( ! foundColor )
				$(_selectColor).prepend('<option value="-1" selected="selected">---</option>');
			
			//
			// Header
			//
			
			var logoURL = currentSettings.logoURL;
			
			_logoInput.attr("disabled", "true");
			_logoTargetInput.attr("disabled", "true");
			
			$("input[name='optionsLogo']",$(_container)).change(function () {
				var logoOption = $("input[name='optionsLogo']:checked",$(_container)).val();
				if (logoOption == "none" || logoOption == "esri" ) {
					_logoInput.attr("disabled", "true");
					_logoTargetInput.attr("disabled", "true");
				}
				else {
					_logoInput.removeAttr("disabled");
					_logoTargetInput.removeAttr("disabled");
				}
		    });
			
			$("#headerSimulator", _container).css("background-color", currentSettings.currentColors[0]);
			if (logoURL == null) {
				$('input[name=optionsLogo]:eq(1)',_container).attr('checked', 'checked');
				_logoInput.val("");
				_logoTargetInput.val("");
			}
			else if (logoURL == _defaultLogoURL) {
				$('input[name=optionsLogo]:eq(0)',_container).attr('checked', 'checked');
				$("#imgLogo",_container).show();
				_logoInput.val("");
				_logoTargetInput.val("");
			}
			else {
				$('input[name=optionsLogo]:eq(2)',_container).attr('checked', 'checked');
				$("#imgLogo",_container).attr("src",logoURL);
				$("#imgLogo",_container).show();
				$("#logoInput",_container).val(logoURL);
				_logoTargetInput.val(currentSettings.logoTarget);
				_logoInput.removeAttr("disabled");
				_logoTargetInput.removeAttr("disabled");
			}
			
			$("#selectSocialText",_container).val(currentSettings.headerLinkText);
			$("#selectSocialLink",_container).val(currentSettings.headerLinkURL);
			
			updateForm();
			
			//
			// Extent
			//
			initExtentmap(currentSettings.extent);
			
			//
			// Zoom level
			//
			
			if ($('#listZoomLevels').children().length == 0) {
				$(_agolBMScales).each(function(i, v){
					_listZoomLevels.append('<option value="' + v.lvl + '">' + v.lbl + '</option>');
				});
			}
			var option = $.grep($("option",_listZoomLevels),function(n,i){
				return n.value == currentSettings.zoomLevel
			});
			if (option[0]) {
				$(option[0]).attr("selected","selected");
			}
			
			if( currentSettings.fieldsError ) {
				_tabs.removeClass("active");
				_tabs.addClass("disabled");
				_tabs.eq(3).removeClass("disabled");
				_tabContent.hide();
				
				$(".error-msg" ,_container).show();
				_tabs.eq(3).addClass("active");
				_tabContent.eq(3).show();
				
				_btnClose.attr("disabled", "disabled");
				$(".modal-header .close" ,_container).attr("data-dismiss", "none");
			}
			
			// now bring up the popup!
			$(_container).modal({keyboard: !currentSettings.fieldsError });	
		}
		
		//
		// Extent
		//
		
		function initExtentmap(extent)
		{
			_extentMap && _extentMap.destroy();
			_extentMap = null;
			_tabs.removeClass("alreadyOpened");
			
			// Default to the U.S.
			if (!extent) 
				extent = new esri.geometry.Extent({
					xmax: -57.98033474158346,
					xmin: -126.91406249996473,
					ymax: 50.25667033538553,
					ymin: 21.9430455334323,
					spatialReference: {
						wkid: 4326
					}
				});
			
			_extentMap = new esri.Map("extentMap", {
				slider: true,
				center: extent.getCenter(),
				extent: extent.expand(2),
				autoResize: false
			});
			
			var basemap = app.map.getLayer(app.map.layerIds[0]);
			_extentMap.addLayer(Helper.cloneLayer(basemap));
			
			var dataLayer = new esri.layers.GraphicsLayer();
			$.each(app.data.getTourPoints(), function(i, point){
				dataLayer.add(new esri.Graphic(point.geometry, MapTourHelper.getSymbol(point.attributes.getColor(), i + 1)));
			});
			_extentMap.addLayer(dataLayer);
			
			var extentLayer = new esri.layers.GraphicsLayer({
				id: "extentlayer"
			});
			extentLayer.add(createExtentGraphics(extent));
			_extentMap.addLayer(extentLayer);
			
			dojo.connect(_extentMap, "onLoad", function(){
				_extentMapDrawToolbar = new esri.toolbars.Draw(_extentMap);
				_extentMapEditToolbar = new esri.toolbars.Edit(_extentMap);
				
				dojo.connect(_extentMapDrawToolbar, "onActivate", function(){
					extentLayer.clear();
					_extentMapEditToolbar.deactivate();
					_extentMapDrawToolActive = true;
				});
				
				dojo.connect(_extentMapDrawToolbar, "onDrawEnd", function(geometry){
					extentLayer.add(createExtentGraphics(geometry));
					_extentMapDrawToolbar.deactivate();
					_extentMapDrawToolActive = false;
				});
				
				dojo.connect(extentLayer, "onClick", function(evt){
					if (_extentMapDrawToolActive == false) {
						dojo.stopEvent(evt);
						_extentMapEditToolbar.activate(esri.toolbars.Edit.MOVE | esri.toolbars.Edit.SCALE, evt.graphic);
					}
				});
				
				dojo.connect(extentLayer, "onMouseOver", function(){
					_extentMap.setMapCursor("pointer");
				});
				
				dojo.connect(extentLayer, "onMouseOut", function(){
					_extentMap.setMapCursor("default");
				});
				
				dojo.connect(_extentMap, "onClick", function(evt){
					_extentMapEditToolbar.deactivate();
				});
			});
		}
			
		function createExtentGraphics(extent)
		{
			return new esri.Graphic(
				Helper.extentToPolygon(extent),
				new esri.symbol.SimpleFillSymbol(
					esri.symbol.SimpleFillSymbol.STYLE_SOLID, 
					new esri.symbol.SimpleLineSymbol(
						esri.symbol.SimpleLineSymbol.STYLE_DASHDOT, 
						new dojo.Color([255, 0, 0]),
						2
					), 
					new dojo.Color([255, 255, 0, 0.25])
				)
			);
		}
		
		function getUserExtent()
		{
			return  _extentMap.getLayer("extentlayer") 
					&& _extentMap.getLayer("extentlayer").graphics
					&& _extentMap.getLayer("extentlayer").graphics.length > 0
					? _extentMap.getLayer("extentlayer").graphics[0] : null;
		}
		
		// Layout
		
		function getSelectedlayout()
		{
			return $('#settingsPopup #layout .layout-box.selected').index() == 2 ? "integrated" : "three-panel";
		}
		
		function onLayoutChange(event)
		{
			selectLayout($(event.target).parent().index() == 2 ? 1 : 0)
		}
		
		function selectLayout(index)
		{
			$('#settingsPopup #layout .layout-box').removeClass("selected");
			$('#settingsPopup #layout .layout-box').eq(index ? 1 : 0).addClass("selected");
		}
		
		function onColorSchemeRadioClick(event)
		{
			updatePickers();
			if (getSelectedSchemeIndex() == colorSchemes.length) {
				$("#headerSimulator", _container).css("background-color", $(_inputHeaderColor).val());			
			} else
			{
				var scheme = $.grep(colorSchemes,function(n,i){
					return n.name == getCurrentScheme();
				})[0]; 
				$("#headerSimulator", _container).css("background-color", scheme.headerColor);
			}
		}
		
		function onLogoRadioClick(event)
		{
			updateForm();
		}
		
		function onLogoLoadComplete(event)
		{
		}
		
		function onLogoLoadError(event) 
		{
			_badLogo = true;			
			$("#imgLogo",_container).hide();
		}
		
		function onTabClick(event) 
		{
			if ( $(this).hasClass("disabled") )
				return;
			
			_tabs.removeClass("active");
			$(this).addClass("active");
			_tabContent.hide();
			_tabContent.eq($(this).index()).show();
			
			// As the map is not visible when created, center the map on first opening
			if ($(event.target).index() == 4 && ! $(event.target).hasClass("alreadyOpened")) {
				_extentMap.resize();
				var handle = dojo.connect(_extentMap, 'onUpdateEnd', function(error, info){
					dojo.disconnect(handle);
					_extentMap.centerAt(_extentMap.getLayer("extentlayer").graphics[0].geometry.getExtent().getCenter());
				});
				$(event.target).addClass("alreadyOpened");
			}
		}
		
		function onLogoInputEnter(event)
		{
			if (event.keyCode == 13) {
				_badLogo = false;
				loadCustomLogo();
				return false;
			}
			// Fix for webkit browser - if the text exceeded the input size, after hitting backspace the modal shifted
			// Focusing the field after backspace the field is the only fix found
			else if (event.keyCode == 8 ) {
				$("#logoTargetInput").focus();
				$("#logoInput").focus();
			}
		}
		
		function loadCustomLogo()
		{
			var logoUrl = $.trim($("#logoInput",_container).val());
			if ( logoUrl ) {
				$("#imgLogo",_container).attr("src", logoUrl);
				$("#imgLogo",_container).show();
			}
		}
		
		function onTargetInputEnter(event)
		{
			// Fix for webkit browser - if the text exceeded the input size, after hitting backspace the modal shifted
			// Focusing the field after backspace the field is the only fix found
			if (event.keyCode == 8 ) {
				$("#logoInput").focus();
				$("#logoTargetInput").focus();
			}
		}		
		
		function save()
		{
			//
			// Field
			//
			var fieldName  = $(_selectName).find(":selected").val();
			var fieldDesc  = $(_selectDescription).find(":selected").val();
			var fieldColor = $(_selectColor).find(":selected").val();
			
			if( ! fieldName || fieldName == "-1" || ! fieldDesc || fieldDesc == "-1" || ! fieldColor || fieldColor == "-1" ) {
				//$(".modal-footer .error", _container).show();
				$("#fields .error-msg2", _container).show();
				_tabs.removeClass("active disabled");
				_tabs.eq(3).addClass("active");
				_tabContent.hide();
				_tabContent.eq(3).show();
				return false;
			}
			
			var fieldConfigNew = {
				fieldID: _fieldConfig.getIDField(),
				fieldName: fieldName,
				fieldDescription: fieldDesc,
				fieldURL: _fieldConfig.getURLField(),
				fieldThumb: _fieldConfig.getThumbField(),
				fieldIconColor: fieldColor
			};
			
			//
			// Color
			//

			var schemeName = getCurrentScheme();
			var colors;			
			if (schemeName == "schemeCustom") {
				colors = [
					$(_inputHeaderColor).val(),
					$(_inputMiddleColor).val(),
					$(_inputFooterColor).val()
				]
			}
			else {
				var scheme = $.grep(colorSchemes,function(n,i){return n.name == schemeName})[0];
				colors = [
					scheme.headerColor,
					scheme.middleColor,
					scheme.footerColor
				]
			}
			
			//
			// Header
			//
			
			var logoOption = $("input[name=optionsLogo]:checked",$(_container)).val();
			var logoURL;
			var logoTarget;
			
			if (logoOption == "none") {
				logoURL = null;
				logoTarget = "";
			}
			else if (logoOption == "esri") {
				logoURL = _defaultLogoURL;
				logoTarget = "";
			}
			else {
				logoURL = _badLogo ? _defaultLogoURL : $("#imgLogo",_container).attr("src");
				logoTarget = _logoTargetInput.val();
			}
			
			dojo.publish("SETTINGS_POPUP_SAVE", {
				layout: getSelectedlayout(),
				colors: colors,
				fieldConfig: fieldConfigNew,
				logoURL: logoURL,
				logoTarget: logoTarget,
				headerLinkText: $("#selectSocialText",_container).val(),
				headerLinkURL: $("#selectSocialLink",_container).val(),
				extent: getUserExtent().geometry.getExtent(),
				zoomLevel: $("#listZoomLevels").find(":selected").attr("value")
			});
		}


		// 
		// PRIVATE FUNCTIONS
		//
		
		function getCurrentScheme() 
		{
			return $("input[name=groupColorSchemes]:checked",$(_container)).val();
		}
		
		function selectCurrentColorScheme(currentColors) 
		{
			if ( ! currentColors || ! currentColors[0] || ! currentColors[1] || ! currentColors[2] ) {
				setSelectedScheme(1);
			}
			else {
				var colorFound = false;
				$.each(colorSchemes, function(index, value){
					var isCurrentColors = 
						currentColors[0] == value.headerColor 
						&& currentColors[1] == value.middleColor 
						&& currentColors[2] == value.footerColor;
						
					 if (isCurrentColors) {
					 	colorFound = true;
					 	setSelectedScheme(index + 1);
					 }
				});
				
				if( ! colorFound )
					setSelectedScheme(colorSchemes.length + 1);
			}
			
			updatePickers();	
		}
		
		function updateForm()
		{	
			var logoOption = $("input[name=optionsLogo]:checked",$(_container)).val();

			$("#imgLogo",_container).hide();

			if (logoOption == "custom") {
				loadCustomLogo();
			}
			else if (logoOption == "esri") {
				$("#imgLogo", _container).attr("src", _defaultLogoURL);
				$("#imgLogo", _container).show();
			}
		}
		
		function updatePickers()
		{
			if( getSelectedSchemeIndex() == colorSchemes.length ) {
				$(_inputHeaderColor).spectrum("enable");	
				$(_inputMiddleColor).spectrum("enable");	
				$(_inputFooterColor).spectrum("enable");
			} 
			else {
				$(_inputHeaderColor).spectrum("disable");	
				$(_inputMiddleColor).spectrum("disable");	
				$(_inputFooterColor).spectrum("disable");
			}
		}
		
		function getSelectedSchemeIndex()
		{
			var index = -1;
			$("#settingsPopup #appearance .controls tr td:nth-child(1) input").each(function(i, input){ 
				if( $(input).is(":checked")) 
					index = i;
			});
			return index;
		}
		
		function setSelectedScheme(index)
		{
			$("#settingsPopup #appearance .controls tr:nth-child(" + index + ") td:nth-child(1) input").attr("checked", "true");
		}
		
		function createColorPalette(input) 
		{
			$(input).spectrum({
				showButtons:false,
				color: DEFAULT_GRAY,
				showPalette:false,
				showSelectionPalette:false,
				showPaletteOnly:false,
				showInput: true
			});
		}
		
		function buildColorTable() 
		{
			if( ! colorSchemes )
				return;
			
			var table = $("<table></table>");
			var row;
			
			$.each(colorSchemes, function(index, value){
				if( ! value.name || ! value.headerColor || ! value.middleColor || ! value.footerColor )
					return;
				
				row = $("<tr></tr>");
				
				var input = $("<input type='radio' class='radio' name='groupColorSchemes'/>");
				$(input).attr("value",value.name);
				
				var td = $("<td></td>");
				$(td).append(input);
				$(row).append(td);
				$(row).append("<td><div class='swatch' style='background-color:"+value.headerColor+"'></div></td>");
				$(row).append("<td><div class='swatch' style='background-color:"+value.middleColor+"'></div></td>");
				$(row).append("<td><div class='swatch' style='background-color:"+value.footerColor+"'></div></td>");
				//$(row).append("<td class='caption'>"+value.name+"</td>");
				
				$(table).append(row);
			});
	
			row = $("<tr></tr>");
			$(row).append("<td><input type='radio' class='radio' name='groupColorSchemes' value='schemeCustom'/></td>");
			$(row).append("<td><input id='inputCustomHeaderColor' class='colorInput' type='custom'/></td>");
			$(row).append("<td><input id='inputCustomMiddleColor' class='colorInput' type='custom'/></td>");
			$(row).append("<td><input id='inputCustomFooterColor' class='colorInput' type='custom'/></td>");
			//$(row).append("<td class='caption'>Custom</td>");
			
			$(table).append(row);
			return table;			
		}
		
		this.initLocalization = function()
		{
			// Tab
			dojo.query('#settingsPopup h3')[0].innerHTML = i18n.viewer.builderHTML.settingsHeader;
			dojo.query('#settingsPopup .tab')[0].innerHTML = i18n.viewer.builderHTML.settingsTabLayout;
			dojo.query('#settingsPopup .tab')[1].innerHTML = i18n.viewer.builderHTML.settingsTabColor;
			dojo.query('#settingsPopup .tab')[2].innerHTML = i18n.viewer.builderHTML.settingsTabLogo;
			dojo.query('#settingsPopup .tab')[3].innerHTML = i18n.viewer.builderHTML.settingsTabFields;
			dojo.query('#settingsPopup .tab')[4].innerHTML = i18n.viewer.builderHTML.settingsTabExtent;
			dojo.query('#settingsPopup .tab')[5].innerHTML = i18n.viewer.builderHTML.settingsTabZoom;
			
			// Layout
			dojo.query('#settingsPopup #layout p')[0].innerHTML = i18n.viewer.builderHTML.settingsLayoutExplain;
			dojo.query('#settingsPopup #layout .layout-box:nth-child(2) div')[0].innerHTML = i18n.viewer.builderHTML.settingsLayoutProfessional;
			dojo.query('#settingsPopup #layout .layout-box:nth-child(2) img')[0].src = "resources/icons/builder-professional-layout.png";
			dojo.query('#settingsPopup #layout .layout-box:nth-child(3) div')[0].innerHTML = i18n.viewer.builderHTML.settingsLayoutModern;
			dojo.query('#settingsPopup #layout .layout-box:nth-child(3) img')[0].src = "resources/icons/builder-modern-layout.png";
			$('#settingsPopup #layout .layout-box .selectedLayout').html(i18n.viewer.builderHTML.settingsLayoutSelected);
			$('#settingsPopup #layout .layout-box button').html(i18n.viewer.builderHTML.settingsLayoutSelect);
			
			// Colors
			dojo.query('#settingsPopup #appearance p')[0].innerHTML = i18n.viewer.builderHTML.settingsColorExplain;
			dojo.query('#settingsPopup .control-label')[0].innerHTML = i18n.viewer.builderHTML.settingsLabelColor+":";
			
			// Logo
			dojo.query('#settingsPopup #logo p')[0].innerHTML = i18n.viewer.builderHTML.settingsLogoExplain;
			dojo.query('#settingsPopup .logoText')[0].innerHTML = i18n.viewer.builderHTML.settingsLogoEsri;
			dojo.query('#settingsPopup .logoText')[1].innerHTML = i18n.viewer.builderHTML.settingsLogoNone;
			dojo.query('#settingsPopup .logoText')[2].innerHTML = i18n.viewer.builderHTML.settingsLogoCustom;
			dojo.attr(dojo.byId('logoInput'),"placeholder",i18n.viewer.builderHTML.settingsLogoCustomPlaceholder);
			dojo.attr(dojo.byId('logoTargetInput'),"placeholder",i18n.viewer.builderHTML.settingsLogoCustomTargetPlaceholder);
			dojo.query('#settingsPopup #logo p')[1].innerHTML = i18n.viewer.builderHTML.settingsLogoSocialExplain;
			dojo.query('#settingsPopup .control-label[for=selectSocialText]')[0].innerHTML = i18n.viewer.builderHTML.settingsLogoSocialText + ":";
			dojo.query('#settingsPopup .control-label[for=selectSocialLink]')[0].innerHTML = i18n.viewer.builderHTML.settingsLogoSocialLink + ":";
			
			// Fields
			dojo.query('#settingsPopup #fields .error-msg')[0].innerHTML = i18n.viewer.builderHTML.settingsDataFieldsError;
			dojo.query('#settingsPopup #fields .error-msg2')[0].innerHTML = i18n.viewer.builderHTML.settingsFieldError;
			dojo.query('#settingsPopup #fields p')[0].innerHTML = i18n.viewer.builderHTML.settingsDataFieldsExplain;
			dojo.query('#settingsPopup #fields .control-label')[0].innerHTML = i18n.viewer.builderHTML.settingsFieldsLabelName+":";
			dojo.query('#settingsPopup #fields .control-label')[1].innerHTML = i18n.viewer.builderHTML.settingsFieldsLabelDescription+":";
			dojo.query('#settingsPopup #fields .control-label')[2].innerHTML = i18n.viewer.builderHTML.settingsFieldsLabelColor+":";
			
			// Extent
			dojo.query('#settingsPopup #extent p')[0].innerHTML = i18n.viewer.builderHTML.settingsExtentExplain;
			dojo.query('#settingsPopup #extent .explain2')[0].innerHTML = i18n.viewer.builderHTML.settingsExtentExplainBottom;
			extentDrawBtn.html(i18n.viewer.builderHTML.settingsExtentDrawBtn);
			extentModifyBtn.html(i18n.viewer.builderHTML.settingsExtentModifyBtn);
			extentApplyBtn.html(i18n.viewer.builderHTML.settingsExtentApplyBtn);
			
			// Zoom
			dojo.query('#settingsPopup #zoom .form-horizontal p')[0].innerHTML = i18n.viewer.builderHTML.settingsZoomExplain;
			dojo.query('#settingsPopup #zoom .control-label')[0].innerHTML = i18n.viewer.builderHTML.settingsLabelZoom+":";
			_agolBMScales[0].lbl = i18n.viewer.builderHTML.settingsZoomFirstValue;
			
			// Footer
			dojo.query('#settingsPopup .btnClose')[0].innerHTML = i18n.viewer.builderHTML.modalCancel;
			dojo.query('#settingsPopup .btnSave')[0].innerHTML = i18n.viewer.builderHTML.modalApply;
			dojo.query('#settingsPopup .error')[0].innerHTML = i18n.viewer.builderHTML.tabError;
		}
	}
});