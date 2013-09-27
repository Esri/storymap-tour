define([], 
	function () {
		return function SettingsPopupTabZoom(titleContainer, contentcontainer) 
		{
			var _listZoomLevels = $(contentcontainer).find('#listZoomLevels');
					
			this.init = function(settings) 
			{			
				if (_listZoomLevels.children().length === 0) {
					_listZoomLevels.append('<option value="-1">' + i18n.viewer.builderHTML.settingsZoomFirstValue + '</option>');
					
					$.each(app.map._params.lods, function(i, lvl){
						var scaleK = lvl.scale / 1000;
						var scaleM = scaleK / 1000;
						var lbl = "1:";
						
						if ( scaleK < 1000 )
							lbl += Math.round(scaleK) + 'K';
						else if ( scaleM < 10 )
							lbl += Math.round(scaleM * 10) / 10+ 'M';
						else
							lbl += Math.round(scaleM) + 'M';
							
						lbl += " (level " + lvl.level + ")";
						
						_listZoomLevels.append('<option value="' + lvl.level + '">' + lbl + '</option>');
					});
				}
				
				var option = $.grep($("option", _listZoomLevels),function(n){
					return n.value == settings.zoomLevel;
				});
				
				// If the zoom level hasn't been found it's a higher level, default to the last option
				if( parseInt(settings.zoomLevel, 10) >= 0 && ! option[0] )
					option = _listZoomLevels.find('option').last();
				
				if (option[0]) {
					$(option[0]).attr("selected", "selected");
				}
			};
			
			this.show = function()
			{
				//
			};
			
			this.save = function()
			{		
				return {
					zoomLevel: _listZoomLevels.find(":selected").attr("value")
				};
			};

			this.initLocalization = function()
			{
				$(titleContainer).html(i18n.viewer.builderHTML.settingsTabZoom);
				
				$(contentcontainer).find('.form-horizontal p').eq(0).html(i18n.viewer.builderHTML.settingsZoomExplain);
				$(contentcontainer).find('.control-label').eq(0).html(i18n.viewer.builderHTML.settingsLabelZoom + ':');
			};
		};
	}
);