define([], 
	function () {
		return function SettingsPopupTabLayout(titleContainer, contentcontainer) 
		{
			$(contentcontainer).find('.layout-box button').fastClick(onLayoutChange);
					
			this.init = function(settings) 
			{			
				selectLayout(settings.name == "integrated" ? 1 : 0);
			}
			
			this.show = function()
			{
				//
			}
			
			this.save = function()
			{		
				return {
					name: getSelectedlayout()
				};
			}

			function getSelectedlayout()
			{
				return $(contentcontainer).find('.layout-box.selected').index() == 2 ? "integrated" : "three-panel";
			}
			
			function onLayoutChange(event)
			{
				selectLayout($(event.target).parent().index() == 2 ? 1 : 0)
			}
			
			function selectLayout(index)
			{
				$(contentcontainer).find('.layout-box').removeClass("selected");
				$(contentcontainer).find('.layout-box').eq(index ? 1 : 0).addClass("selected");
			}
	
			this.initLocalization = function()
			{
				$(titleContainer).html(i18n.viewer.builderHTML.settingsTabLayout);
				
				$(contentcontainer).find('p').html(i18n.viewer.builderHTML.settingsLayoutExplain);
				$(contentcontainer).find('.layout-box:nth-child(2) div').html(i18n.viewer.builderHTML.settingsLayoutProfessional);
				$(contentcontainer).find('.layout-box:nth-child(2) img').attr("src", "resources/icons/builder-professional-layout.png");
				$(contentcontainer).find('.layout-box:nth-child(3) div').html(i18n.viewer.builderHTML.settingsLayoutModern);
				$(contentcontainer).find('.layout-box:nth-child(3) img').attr("src", "resources/icons/builder-modern-layout.png");
				$(contentcontainer).find('.layout-box .selectedLayout').html(i18n.viewer.builderHTML.settingsLayoutSelected);
				$(contentcontainer).find('.layout-box button').html(i18n.viewer.builderHTML.settingsLayoutSelect);
			}
		}
	}
);