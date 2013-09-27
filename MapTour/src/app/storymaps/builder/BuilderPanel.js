define(["storymaps/maptour/core/WebApplicationData", "storymaps/utils/Helper", "dojo/topic"], 
	function (WebApplicationData, Helper, topic) {
		return function BuilderPanel(container, builderSave) 
		{
			var _this = this;
			var _displayBuilderSaveIntro = true;
			var _builderView = null;

			this.init = function(builderView) 
			{	
				_builderView = builderView;
				initLocalization();
				
				container.show();
				setUpGeneralPanelButtonAction();
				setUpPopover();
				createAppSavedConfirmation();
				
				// Map popover callback to app.builder
				app.builder.closeBuilderSaveIntro = closeBuilderSaveIntro;
				app.builder.switchToView = switchToView;
				app.builder.discard = discard;
				app.builder.hideSaveConfirmation = hideSaveConfirmation;
				
				// TODO: use fastClick (make the modal flash - see after bootstrap upgrade)
				container.find('.builder-save').click(save);
				container.find('.builder-settings').click(showSettingsPopup);
				container.find('.builder-item').click(openItem);
				container.find('.builder-help').click(showHelpPopup);
			};
			
			//
			// Panel buttons
			//
			
			function save()
			{
				console.log("maptour.builder.Builder - save");
				
				changeBuilderPanelButtonState(false);
				closeBuilderSaveIntro();
				container.find(".builder-settings").popover('show');
				
				// Save the app 
				// If OK and needed call save webmap 
				// If OK call appSaveSucceeded
				builderSave();
			}
	
			function discard(confirmed)
			{
				if( confirmed ){
					changeBuilderPanelButtonState(false);
					WebApplicationData.restoreOriginalData();
					app.data.discardChanges();
					resetSaveCounter();
					topic.publish("CORE_UPDATE_UI");
					changeBuilderPanelButtonState(true);
				}
	
				container.find(".builder-discard").popover('hide');
			}
			
			function showSettingsPopup()
			{
				closePopover();
				_builderView.openSettingPopup(false);
			}
	
			function switchToView(confirmed)
			{
				if( confirmed )
					document.location = '?' + document.location.search.split('edit')[0].slice(1, -1);
				else
					container.find(".builder-view").popover('hide');
			}
			
			function openItem()
			{
				window.open(
					Helper.getItemURL(configOptions.sharingurl, app.data.getAppItem().id),
					'_blank'
				);
			}
			
			function showHelpPopup()
			{
				app.builder.openHelpPopup();
			}
			
			//
			// Save callbacks
			//
			
			this.saveSucceeded = function()
			{
				container.find(".builder-settings").next(".popover").find(".stepSave").css("display", "none");
				container.find(".builder-settings").next(".popover").find(".stepSaved").css("display", "block");
				setTimeout(function(){
					container.find(".builder-settings").popover('hide');
				}, 3500);

				closePopover();
				resetSaveCounter();
				changeBuilderPanelButtonState(true);
			};
			
			this.saveFailed = function()
			{
				container.find(".builder-settings").next(".popover").find(".stepSave").css("display", "none");
				container.find(".builder-settings").next(".popover").find(".stepFailed").css("display", "block");
				changeBuilderPanelButtonState(true);
			};
			
			//
			// Counter
			//
			
			this.hasPendingChange = function()
			{
				return container.find("#save-counter").html() && container.find("#save-counter").html() != i18n.viewer.builderJS.noPendingChange;
			};
	
			this.incrementSaveCounter = function(nb)
			{
				var value = container.find("#save-counter").html();
				if (! _this.hasPendingChange()) {
					value = 0;
					if( _displayBuilderSaveIntro )
						// Timer cause the header can be hidden
						setTimeout(function(){ container.find(".builder-save").popover('show'); }, 250);	
				}
	
				if( value === 0 ) {
					if ( nb == 1 || isNaN(parseInt(nb, 10)) )
						value = i18n.viewer.builderJS.unSavedChangeSingular;
					else
						value = nb + " " + i18n.viewer.builderJS.unSavedChangePlural;
				}
				else
					value = (parseInt(value, 10) + (nb ? nb : 1)) + " " + i18n.viewer.builderJS.unSavedChangePlural;

				container.find("#save-counter").html(value);
				container.find("#save-counter").css("color", "#FFF");
			};
	
			function resetSaveCounter()
			{
				container.find("#save-counter").html(i18n.viewer.builderJS.noPendingChange);
				container.find("#save-counter").css("color", "#999");
				setUpGeneralPanelButtonAction();
			}
			
			//
			// Popover
			//
	
			function closePopover()
			{
				if( container.find(".discard-popover").length > 0 )
					container.find(".builder-discard").popover('hide');
				if( container.find(".view-popover").length > 0 )
					container.find(".builder-view").popover('hide');
			}
	
			function setUpPopover()
			{
				var containerId = "#" + container.attr("id");
				
				// Discard button
				container.find(".builder-discard").popover({
					trigger: 'manual',
					placement: 'bottom',
					html: true,
					// Inject the CSS properties
					content: '<script>'
								+ ' $("' + containerId + ' .builder-discard").next(".popover").addClass("discard-popover");'
								+ ' $("' + containerId + ' .builder-view").popover("hide");'
								+ ' $("' + containerId + ' .builder-save").popover("hide");'
								+ '</script>'
								+ i18n.viewer.builderJS.popoverDiscard +' '
								+ '<button type="button" class="btn btn-danger btn-small" onclick="app.builder.discard(true)">'+i18n.viewer.builderJS.yes+'</button> '
								+ '<button type="button" class="btn btn-small" onClick="app.builder.discard(false)">'+i18n.viewer.builderJS.no+'</button>'
				});
	
				// Switch to view button
				container.find(".builder-view").popover({
					trigger: 'manual',
					html: true,
					content: '<script>'
								+ ' $("' + containerId + ' .builder-view").next(".popover").addClass("view-popover");'
								+ ' $("' + containerId + ' .builder-discard").popover("hide");'
								+ ' $("' + containerId + ' .builder-save").popover("hide");'
								+ '</script>'
								+ i18n.viewer.builderJS.popoverLoseSave + ' '
								+ '<button type="button" class="btn btn-danger btn-small" onclick="app.builder.switchToView(true)">'+i18n.viewer.builderJS.ok+'</button> '
								+ '<button type="button" class="btn btn-small" onClick="app.builder.switchToView(false)">'+i18n.viewer.builderHTML.modalCancel+'</button>'
				});
	
				// Confirmation that user need to use the save button
				container.find(".builder-save").popover({
					trigger: 'manual',
					html: true,
					content: '<script>setTimeout(function(){$("' + containerId + ' .builder-save").next(".popover").css("margin-left", $("' + containerId + ' > div").width() + 30).addClass("builderPanelPopover");}, 0);'
								+ '</script>'
								+ i18n.viewer.builderJS.popoverSaveWhenDone
								+ ' <button type="button" class="btn btn-success btn-small" onclick="app.builder.closeBuilderSaveIntro()">'+i18n.viewer.builderJS.gotIt+'</button> '
				});
				
				container.find('.builder-view').attr('title', i18n.viewer.builderHTML.buttonView);
				container.find('.builder-help').attr('title', i18n.viewer.builderHTML.buttonHelp);
			}
			
			function createAppSavedConfirmation()
			{
				var containerId = "#" + container.attr("id");

				// App saved confirmation
				container.find(".builder-settings").popover({
					containerId: containerId,
					html: true,
					trigger: 'manual',
					placement: 'bottom',
					content: '<script>'
								+ '$("' + containerId + ' .builder-settings").next(".popover").css("margin-left", "0px").addClass("settings-popover");'
								+ 'setTimeout(function(){$("' + containerId + ' .builder-settings").next(".popover").css("margin-left", - ($(".builder-save").outerWidth()/2 + $(".builder-discard").outerWidth() + $(".builder-settings").outerWidth()/2+8));}, 0);'
								+ '$("' + containerId + ' .builder-settings").next(".popover").find(".stepSave").css("display", "block");'
								+ '$("' + containerId + ' .builder-settings").next(".popover").find(".stepSaved").css("display", "none");'
								+ '$("' + containerId + ' .builder-settings").next(".popover").find(".stepFailed").css("display", "none");'
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
				
				//container.find('.builder-settings').attr('title', i18n.viewer.builderHTML.buttonSettings);
			}
	
			function closeBuilderSaveIntro()
			{
				container.find(".builder-save").popover('destroy');
				_displayBuilderSaveIntro = false;
			}
			
			//
			// UI
			//
	
			function setUpGeneralPanelButtonAction()
			{
				container.find(".builder-view").click(clickView);
				container.find(".builder-discard").click(clickDiscard);
			}
	
			function clickDiscard()
			{
				if( _this.hasPendingChange() )
					container.find(".builder-discard").popover('show');
			}
	
			function clickView()
			{
				if( _this.hasPendingChange() )
					container.find(".builder-view").popover('show');
				else
					switchToView(true);
			}
	
			function hideSaveConfirmation()
			{
				container.find(".builder-settings").popover('hide');
			}
			
			function changeBuilderPanelButtonState(activate)
			{
				container.find(".builder-cmd").attr("disabled", ! activate);
			}
			
			this.resize = function()
			{
				// Make all buttons the same size
				/*
				var buttonWidth = Math.max(container.find("div > button").eq(0).width(), container.find("div > button").eq(1).width(), container.find("div > button").eq(2).width());
				container.find("div > button").eq(0).width(buttonWidth);
				container.find("div > button").eq(1).width(buttonWidth);
				container.find("div > button").eq(2).width(buttonWidth);
				*/		
				// Reposition
				container.css("margin-left", $("body").width() / 2 - container.outerWidth() / 2);
			};
			
			function initLocalization()
			{
				container.find('h4').html(i18n.viewer.builderHTML.panelHeader);
				container.find('button').eq(0).html(i18n.viewer.builderHTML.buttonSave);
				container.find('button').eq(1).html(i18n.viewer.builderHTML.buttonDiscard);
				//container.find('button').eq(2).html('<img src="resources/icons/builder-setings.png" style="vertical-align: -6px;" alt="' + i18n.viewer.builderHTML.buttonSettings + '" />');
				container.find('button').eq(2).html(i18n.viewer.builderHTML.buttonSettings.toUpperCase());
				container.find('button').eq(3).html('<img src="resources/icons/builder-view.png" style="vertical-align: -6px;" alt="' + i18n.viewer.builderHTML.buttonView + '" />');
				container.find('button').eq(4).html('<i class="icon-file"></i>').attr("title", i18n.viewer.builderHTML.buttonItem);
				container.find('button').eq(5).html('<img src="resources/icons/builder-help.png" style="vertical-align: -6px;" alt="' + i18n.viewer.builderHTML.buttonHelp + '" />');
				container.find('#save-counter').html(i18n.viewer.builderJS.noPendingChange);
			}
		};
	}
);