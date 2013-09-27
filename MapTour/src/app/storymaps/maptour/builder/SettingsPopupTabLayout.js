define([], 
	function () {
		return function SettingsPopupTabLayout(titleContainer, contentcontainer) 
		{
			$(contentcontainer).find('.layout-box button').fastClick(onLayoutChange);
					
			this.init = function(settings) 
			{			
				selectLayout(
					settings.name == "integrated" ? 1 : 0/*, 
					settings.placardUnder*/
				);
				//$(contentcontainer).find('.layout1opt').prop('checked', settings.placardUnder);
				
				/* Index.html code 
				 * // Select the placard position (point title and caption) between "under" and "hover" 
				 * // That option is only valid when using "three-panel" layout
				 * placardPosition: "hover", 
				 */
			};
			
			this.show = function()
			{
				//
			};
			
			this.save = function()
			{		
				return {
					name: getSelectedlayout()/*,
					placardUnder: getLayoutOption()*/
				};
			};

			function getSelectedlayout()
			{
				return $(contentcontainer).find('.layout-box.selected').index() == 2 ? "integrated" : "three-panel";
			}
			
			/*
			function getLayoutOption()
			{
				return $(contentcontainer).find('.layout1opt').is(":checked");
			}
			*/
			
			/*
			function onLayout1OptionChange()
			{
				selectLayout(0, getLayoutOption());
			}
			*/
			
			function onLayoutChange(event)
			{
				var index = $(event.target).parent().parent().index() == 2 ? 1 : 0;
				selectLayout(index/*, getLayoutOption()*/);
			}
			
			function selectLayout(index/*, option*/)
			{
				$(contentcontainer).find('.layout-box').removeClass("selected");
				$(contentcontainer).find('.layout-box').eq(index ? 1 : 0).addClass("selected");

				/*				
				if (index === 0) {
					$(contentcontainer).find('.layout-box:nth-child(2) img').eq(0).attr("src", option ? "resources/icons/builder-professional-layout-under.png" : "resources/icons/builder-professional-layout.png");
					$(contentcontainer).find('.layout1opt').removeAttr("disabled");
					$(contentcontainer).find('.layoutOption').css("opacity", 1.0);
				}
				else {
					$(contentcontainer).find('.layout1opt').attr("disabled", "disabled");
					$(contentcontainer).find('.layoutOption').css("opacity", 0.5);
				}
				*/
			}
	
			this.initLocalization = function()
			{
				$(titleContainer).html(i18n.viewer.builderHTML.settingsTabLayout);
				
				$(contentcontainer).find('p').html(i18n.viewer.builderHTML.settingsLayoutExplain);
				$(contentcontainer).find('.layout-box:nth-child(2) div').eq(0).html(i18n.viewer.builderHTML.settingsLayoutProfessional);
				// Todo hard coded string in here
				//$(contentcontainer).find('.layout-box:nth-child(2) div').eq(1).html('<input type="checkbox" class="layout1opt"/> ' + 'Place the placard under the media <a class="layoutOptionTooltip"><img src="resources/icons/builder-help.png" style="vertical-align: -4px;"/></a>');
				$(contentcontainer).find('.layout-box:nth-child(2) img').eq(0).attr("src", "resources/icons/builder-professional-layout.png");
				$(contentcontainer).find('.layout-box:nth-child(3) div').eq(0).html(i18n.viewer.builderHTML.settingsLayoutModern);
				$(contentcontainer).find('.layout-box:nth-child(3) img').attr("src", "resources/icons/builder-modern-layout.png");
				$(contentcontainer).find('.layout-box .selectedLayout').html(i18n.viewer.builderHTML.settingsLayoutSelected);
				$(contentcontainer).find('.layout-box button').html(i18n.viewer.builderHTML.settingsLayoutSelect);
				
				//$(contentcontainer).find('.layout1opt').change(onLayout1OptionChange);
				/*
				$(contentcontainer).find('.layoutOptionTooltip').popover({
					trigger: 'hover',
					placement: 'right',
					html: true,
					content: i18n.viewer.builderHTML.settingsLayoutNote 
				});
				*/
			};
		};
	}
);