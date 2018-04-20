define(["./SaveErrorPopupSocial", "storymaps/maptour/core/WebApplicationData"],
	function (SaveErrorPopupSocial, WebApplicationData) {
		return function BuilderPanel(container, builderSave, builderDirectCreationFirstSave, builderGalleryCreationFirstSave)
		{
			var _this = this;
			var _displayBuilderSaveIntro = true;
			var _builderView = null;
			var _saveErrorPopupSocial = null;

			this.init = function(builderView)
			{
				_builderView = builderView;
				initLocalization();

				container.show();
				//createInitialSavePopover();

				app.builder.hideSaveConfirmation = hideSaveConfirmation;

				// TODO: slow but using fastClick (make the modal flash - see after bootstrap upgrade)
				container.find('.builder-save').click(save);
				container.find(".builder-share").click(function(){
					app.builder.openSharePopup(false);
				});
				container.find('.builder-settings').click(showSettingsPopup);
				container.find('.builder-help').click(showHelpPopup);

				$("#side-panel-builder").find('.builder-save').click(save);
				$("#side-panel-builder").find(".builder-share").click(function(){
					app.builder.openSharePopup(false);
				});
				$("#side-panel-builder").find('.builder-settings').click(showSettingsPopup);
				$("#side-panel-builder").find('.builder-help').click(showHelpPopup);

				_saveErrorPopupSocial = new SaveErrorPopupSocial($("#saveErrorPopupSocial"));

				$(window).bind('keydown', function(event) {
					if (event.ctrlKey || event.metaKey) {
						// CTRL+S
						if (String.fromCharCode(event.which).toLowerCase() == 's') {
							if (!container.find('.builder-save').attr("disabled") && ! app.initScreenIsOpen) {
								event.preventDefault();
								save();
							}
						}
					}
				});
			};

			//
			// Panel buttons
			//

			function save()
			{
				console.log("maptour.builder.Builder - save");

				if ( _displayBuilderSaveIntro ) {
					_displayBuilderSaveIntro = false;
					app.isInitializing = false;
					if( ! $("body").hasClass("side-panel") ) {
						$("#builderPanel .builder-save").popover('destroy');
					} else {
						$("#panels-builder-save").popover('destroy');
					}
				}

				createSavePopover();

				if( ! $("body").hasClass("side-panel") ) {
					setTimeout(function() {
						$("#builderPanel .builder-save").popover('show');
					}, 0);
				} else {
					setTimeout(function() {
						$("#panels-builder-save").popover('show');
					}, 0);
				}
				changeBuilderPanelButtonState(false);

				if (app.isDirectCreationFirstSave) {
					var appTitle = $('#headerDesktop .title .text_edit_label').text();
					var appSubTitle = $('#headerDesktop .subtitle .text_edit_label').text();
					if ( appSubTitle == i18n.viewer.headerJS.editMe )
						appSubTitle = "";

					if ( ! appTitle || appTitle == i18n.viewer.headerJS.editMe ) {
						setTimeout(function(){
							_this.saveFailed("NONAME");
						}, 150);
						return;
					}

					// Save the webmap
					// If ok get the new id
					// Call saveApp
					// If ok call appSaveSucceeded
					builderDirectCreationFirstSave(appTitle, appSubTitle);
				}
				else if (app.isGalleryCreation) {
					builderGalleryCreationFirstSave();
				}
				else {
					// Save of an existing app

					var storyTitle = "",
						itemTitle = "";

					if ( WebApplicationData.getTitle() ) {
						storyTitle = WebApplicationData.getTitle().trim();
					}

					if ( app.data.getAppItem() && app.data.getAppItem().title ) {
						itemTitle = app.data.getAppItem().title.trim();
					}

					// if item and story title don't match
					//  and user hasn't chose to not be warned about it
					//  and story is public
					if ( ! app.builder.titleMatchOnLoad
							&& ! WebApplicationData.getDoNotWarnTitle()
							&& app.data.getAppItem().access == "public"
							// Extra check that title actually differs - don't show the dialog it title where not matching but user fixed it
							&& storyTitle != itemTitle
					) {
						// If the warning dialog has already been displayed in the session, skip it and reuse the choice
						if ( app.builder.titleMatchDialogDisplayed ) {
							builderSave(app.builder.titleFromItem);
						}
						// Show the warning dialog
						else {
							app.builder.titleMatchDialogDisplayed = true;

							_saveErrorPopupSocial.present().then(
								function(p) {
									app.builder.titleFromItem = p && p.choice == 'item';
									builderSave(app.builder.titleFromItem);
								}
							);
						}
					}
					else {
						// Save the app
						// If OK and needed call save webmap
						// If OK call appSaveSucceeded
						var keepItemTitle = WebApplicationData.getDoNotWarnTitle()
							|| (app.data.getAppItem().access != "public" && ! app.builder.titleMatchOnLoad);
						builderSave(keepItemTitle);
					}
				}
			}

			function showSettingsPopup()
			{
				closePopover();
				_builderView.openSettingPopup(false);
			}

			function showHelpPopup()
			{
				closePopover();
				app.builder.openHelpPopup();
			}

			//
			// Save callbacks
			//

			this.saveSucceeded = function()
			{
				if( !$("body").hasClass("side-panel") ) {
					container.find(".builder-save").next(".popover").find(".stepSave").css("display", "none");
					container.find(".builder-save").popover('hide');
				} else {
					$("#panels-builder-save").next(".popover").find(".stepSave").css("display", "none");
					$("#panels-builder-save").popover('hide');
				}

				if( app.isDirectCreationFirstSave || app.isGalleryCreation )
					app.builder.openSharePopup(true);

				closePopover();
				resetSaveCounter();
				changeBuilderPanelButtonState(true);
			};

			this.saveFailed = function(source, error)
			{
				if( !$("body").hasClass("side-panel") ) {
					container.find(".builder-save").next(".popover").find(".stepSave").css("display", "none");
				} else {
					$("#panels-builder-save").next(".popover").find(".stepSave").css("display", "none");
				}

				if( source == "FS" && error && error.code == 400 && error.details && error.details[0] && error.details[0].split('html content').length >= 2 ) {
					if( !$("body").hasClass("side-panel") ) {
						container.find(".builder-save").next(".popover").find(".stepFailed2").css("display", "block");
					} else {
						$("#panels-builder-save").next(".popover").find(".stepFailed2").css("display", "block");
					}
				}
				else if (source == "NONAME") {
					if( !$("body").hasClass("side-panel") ) {
						container.find(".builder-save").next(".popover").find(".stepFailed3").css("display", "block");
					} else {
						$("#panels-builder-save").next(".popover").find(".stepFailed3").css("display", "block");
					}

					$("#headerDesktop .title").addClass("titleEmpty");

					container.find(".builder-save").attr("disabled", false);
					container.find(".builder-settings").attr("disabled", false);
					container.find(".builder-help").attr("disabled", false);
					$("#panels-builder-save").attr("disabled", false);
					$("#panels-builder-settings").attr("disabled", false);
					$("#panels-builder-help").attr("disabled", false);

					return;
				}
				else {
					if( !$("body").hasClass("side-panel") ) {
						container.find(".builder-save").next(".popover").find(".stepFailed").css("display", "block");
					} else {
						$("#panels-builder-save").next(".popover").find(".stepFailed").css("display", "block");
					}
				}

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
					if (_displayBuilderSaveIntro) {
						// Timer cause the header can be hidden
						setTimeout(function(){
							if( $("body").hasClass("side-panel") ) {
								$("#panels-builder-save").popover('show');
							} else {
								$("#builderPanel .builder-save").popover('show');
							}
						}, app.isInitializing ? 3500 : 500);
						setTimeout(function(){
							if( _displayBuilderSaveIntro ){
								$("#builderPanel .builder-save").popover('destroy');
								$("#panels-builder-save").popover('destroy');
							}
						}, app.isDirectCreationFirstSave || app.isGalleryCreation || app.isInitializing ? 10000 : 3500);
					}
				}

				if( value === 0 ) {
					$("#panels-builder-save").addClass("unsaved");
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
				$("#panels-builder-save").removeClass("unsaved");
			}

			//
			// Popover
			//

			function closePopover()
			{
				if( !$("body").hasClass("side-panel") ) {
					container.find(".builder-save").popover('hide');
				} else {
					$("#panels-builder-save").popover('hide');
				}
			}

			/*function createInitialSavePopover()
			{
				var containerId = "#builderPanel";

				// Confirmation that user need to use the save button
				container.find(".builder-save").popover({
					trigger: 'manual',
					placement: 'left',
					html: true,
					content: '<script>$("' + containerId + ' .builder-save").next(".popover").addClass("save-popover");</script>'
								+ i18n.viewer.builderJS.popoverSaveWhenDone
				});

				$("#panels-builder-save").popover({
					trigger: 'manual',
					placement: 'right',
					html: true,
					content: '<script>$("#panels-builder-save").next(".popover").addClass("save-popover2");</script>'
								+ i18n.viewer.builderJS.popoverSaveWhenDone
				});
			}*/

			function createSavePopover()
			{
				var container = $("#builderPanel");
				var containerId = "#builderPanel";

				$("#builderPanel .builder-save").popover('destroy');
				$("#panels-builder-save").popover('destroy');

				// App saved confirmation
				container.find(".builder-save").popover({
					containerId: containerId,
					html: true,
					trigger: 'manual',
					placement: 'bottom',
					content: '<script>'
								+ '$("' + containerId + ' .builder-save").next(".popover").addClass("save-popover-2");'
								+ '$("' + containerId + ' .builder-save").next(".popover").find(".stepSave").css("display", "block");'
								+ '$("' + containerId + ' .builder-save").next(".popover").find(".stepHidden").css("display", "none");'
								+ '</script>'
								+ '<div class="stepSave" style="margin-top: 3px">'
								+  i18n.viewer.builderJS.savingApplication + '... <img src="resources/icons/loader-upload.gif" class="addSpinner" alt="Uploading">'
								+ '</div>'
								+ '<div class="stepHidden stepFailed" style="color: red;">'
								+  i18n.viewer.builderJS.saveError + ' '
								+ '<button type="button" class="btn btn-danger btn-small" onclick="app.builder.hideSaveConfirmation()" style="vertical-align: 1px;">'+i18n.viewer.builderJS.gotIt+'</button> '
								+ '</div>'
								+ '<div class="stepHidden stepFailed2" style="color: red;">'
								+  i18n.viewer.builderJS.saveError2 + ' '
								+ '<button type="button" class="btn btn-danger btn-small" onclick="app.builder.hideSaveConfirmation()" style="vertical-align: 1px;">'+i18n.viewer.builderJS.gotIt+'</button> '
								+ '</div>'
								+ '<div class="stepHidden stepFailed3" style="color: red;">'
								+  i18n.viewer.builderJS.saveError3 + ' '
								+ '<button type="button" class="btn btn-danger btn-small" onclick="app.builder.hideSaveConfirmation()" style="vertical-align: 1px;">'+i18n.viewer.builderJS.gotIt+'</button> '
								+ '</div>'
				});
				containerId = "#side-panel-builder";
				// App saved confirmation
				$("#panels-builder-save").popover({
					containerId: containerId,
					html: true,
					trigger: 'manual',
					placement: 'right',
					content: '<script>'
								+ '$("#panels-builder-save").next(".popover").addClass("save-popover-2");'
								+ '$("#panels-builder-save").next(".popover").find(".stepSave").css("display", "block");'
								+ '$("#panels-builder-save").next(".popover").find(".stepHidden").css("display", "none");'
								+ '</script>'
								+ '<div class="stepSave" style="margin-top: 3px">'
								+  i18n.viewer.builderJS.savingApplication + '... <img src="resources/icons/loader-upload.gif" class="addSpinner" alt="Uploading">'
								+ '</div>'
								+ '<div class="stepHidden stepFailed" style="color: red;">'
								+  i18n.viewer.builderJS.saveError + ' '
								+ '<button type="button" class="btn btn-danger btn-small" onclick="app.builder.hideSaveConfirmation()" style="vertical-align: 1px;">'+i18n.viewer.builderJS.gotIt+'</button> '
								+ '</div>'
								+ '<div class="stepHidden stepFailed2" style="color: red;">'
								+  i18n.viewer.builderJS.saveError2 + ' '
								+ '<button type="button" class="btn btn-danger btn-small" onclick="app.builder.hideSaveConfirmation()" style="vertical-align: 1px;">'+i18n.viewer.builderJS.gotIt+'</button> '
								+ '</div>'
								+ '<div class="stepHidden stepFailed3" style="color: red;">'
								+  i18n.viewer.builderJS.saveError3 + ' '
								+ '<button type="button" class="btn btn-danger btn-small" onclick="app.builder.hideSaveConfirmation()" style="vertical-align: 1px;">'+i18n.viewer.builderJS.gotIt+'</button> '
								+ '</div>'
								+ '</div>'
				});
			}

			//
			// UI
			//

			function hideSaveConfirmation()
			{
				if( !$("body").hasClass("side-panel") ) {
					container.find(".builder-save").popover('hide');
				} else {
					$("#panels-builder-save").popover('hide');
				}
				$("#headerDesktop .title").removeClass("titleEmpty");
			}

			function changeBuilderPanelButtonState(activate)
			{
				container.find(".builder-cmd").attr("disabled", ! activate);
				$("#panels-builder-share").attr("disabled", ! activate);
				if(activate) {
					$("#panels-builder-share").removeClass("disabled");
				} else {
					$("#panels-builder-share").addClass("disabled");
				}
			}

			this.updateSharingStatus = function()
			{
				var appAccess = app.data.getAppItem().access;

				if( app.isDirectCreationFirstSave || app.isGalleryCreation ) {
					$("#sharing-status").html("<span style='color: #FFF'>; " + i18n.viewer.builderJS.shareStatus1 + "</span>");
					container.find('.builder-share').attr("disabled", "disabled");
					$("#panels-builder-share").attr("disabled", "disabled");
					$("#panels-builder-share").addClass("disabled");
				}
				else if ( appAccess == "public" ){
					$("#sharing-status").html("; " + i18n.viewer.builderJS.shareStatus2);
					$("#panels-builder-share").attr("title", i18n.viewer.builderJS.shareStatus2);
				} else if ( appAccess == "account" || appAccess == "org" ) {
					$("#sharing-status").html("; " + i18n.viewer.builderJS.shareStatus3);
					$("#panels-builder-share").attr("title", i18n.viewer.builderJS.shareStatus3);
				} else {
					$("#sharing-status").html("; " + i18n.viewer.builderJS.shareStatus4);
					$("#panels-builder-share").attr("title", i18n.viewer.builderJS.shareStatus4);
				}
			};

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
				container.find('button').eq(1).html(i18n.viewer.builderHTML.buttonShare.toUpperCase());
				container.find('button').eq(2).html(i18n.viewer.builderHTML.buttonSettings.toUpperCase());
				container.find('button').eq(3).html(i18n.viewer.builderHTML.buttonHelp.toUpperCase());
				container.find('#save-counter').html(i18n.viewer.builderJS.noPendingChange);
			}
		};
	}
);
