define([], 
	function () {
		return function SettingsPopupTabZoom(titleContainer, contentcontainer) 
		{
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
			
			var _listZoomLevels = $(contentcontainer).find('#listZoomLevels');
					
			this.init = function(settings) 
			{			
				if (_listZoomLevels.children().length == 0) {
					$(_agolBMScales).each(function(i, v){
						_listZoomLevels.append('<option value="' + v.lvl + '">' + v.lbl + '</option>');
					});
				}
				
				var option = $.grep($("option", _listZoomLevels),function(n,i){
					return n.value == settings.zoomLevel
				});
				
				if (option[0]) {
					$(option[0]).attr("selected", "selected");
				}
			}
			
			this.show = function()
			{
				//
			}
			
			this.save = function()
			{		
				return {
					zoomLevel: _listZoomLevels.find(":selected").attr("value")
				};
			}

			this.initLocalization = function()
			{
				$(titleContainer).html(i18n.viewer.builderHTML.settingsTabZoom);
				
				$(contentcontainer).find('.form-horizontal p').eq(0).html(i18n.viewer.builderHTML.settingsZoomExplain);
				$(contentcontainer).find('.control-label').eq(0).html(i18n.viewer.builderHTML.settingsLabelZoom + ':');
				_agolBMScales[0].lbl = i18n.viewer.builderHTML.settingsZoomFirstValue;
			}
		}
	}
);