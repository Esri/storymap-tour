define(["dojo/topic"], 
	function (topic) {
		return function SettingsPopup(container, colorSchemes, defaultLogoURL) 
		{
			var _tabs = [];
			
			var _tabsBar = $(container).find(".tab");
			var _tabContent = $(container).find(".tab-content");

			var _btnSave = $(container).find(".btnSave");
			var _btnClose = $(container).find(".btnClose");

			_tabsBar.click(onTabClick);
			_btnSave.click(save);
			
			this.init = function(builderView)
			{
				_tabs = builderView.getSettingsTab(_tabsBar, _tabContent, {
					colorSchemes: colorSchemes,
					defaultLogoURL: defaultLogoURL
				});
			};
			
			this.present = function(settings, lockOnTabIndex) 
			{			
				_tabsBar.removeClass("disabled");
				_btnClose.removeAttr("disabled");
				$(".error-msg" ,container).hide();
				$(".modal-header .close" ,container).attr("data-dismiss", "modal");
				$(".modal-footer .error", container).hide();
				
				$.each(_tabs, function(i, tab){
					tab.init(settings[i], i == lockOnTabIndex);
				});
				
				displayTab(lockOnTabIndex ? lockOnTabIndex : 0);
				
				if( lockOnTabIndex ) {
					_tabsBar.addClass("disabled");
					_tabsBar.eq(lockOnTabIndex).removeClass("disabled");
					
					_btnClose.attr("disabled", "disabled");
					$(".modal-header .close", container).attr("data-dismiss", "none");
				}
				else
					displayTab(0);

				$(container).modal({keyboard: ! lockOnTabIndex});	
			};
			
			function onTabClick() 
			{
				if ( $(this).hasClass("disabled") )
					return;
				
				displayTab($(this).index());
			}
			
			function save()
			{		
				var settings = [];
				var tabError = -1;
				
				$.each(_tabs, function(i, tab){
					var result = tab.save();
					
					if( result === false )
						tabError = i;
					
					settings.push(result);
				});
				
				if (tabError == -1) 
					topic.publish("SETTINGS_POPUP_SAVE", { settings: settings });
				else {
					displayTab(tabError);
					return false;
				}
			}
			
			function displayTab(index)
			{
				_tabsBar.removeClass("active disabled");
				_tabContent.hide();
				
				_tabsBar.eq(index).addClass("active");
				_tabs[index].show();
				_tabContent.eq(index).show();
			}
	
			this.initLocalization = function()
			{
				$(container).find('h3').html(i18n.viewer.builderHTML.settingsHeader);
				
				$.each(_tabs, function(i, tab){
					tab && tab.initLocalization();
				});
				
				$(container).find('.btnClose').html(i18n.viewer.builderHTML.modalCancel);
				$(container).find('.btnSave').html(i18n.viewer.builderHTML.modalApply);
				$(container).find('.error').html(i18n.viewer.builderHTML.tabError);
			};
		};
	}
);