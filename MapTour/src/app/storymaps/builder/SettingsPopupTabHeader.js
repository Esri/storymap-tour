define([], 
	function () {
		return function SettingsPopupTabHeader(titleContainer, contentContainer, defaultLogoURL) 
		{
			var _logoInput = $(contentContainer).find("#logoInput");
			var _logoTargetInput = $(contentContainer).find("#logoTargetInput");
	
			var _badLogo = false;
	
			$(_logoInput).keydown(onLogoInputEnter);
			$(_logoInput).blur(loadCustomLogo);
			$(_logoTargetInput).keydown(onTargetInputEnter);
	
			$("input[type=radio]", contentContainer).click(onLogoRadioClick);
			$("#imgLogo", contentContainer).error(onLogoLoadError);
			$("#imgLogo", contentContainer).load(onLogoLoadComplete);
			
			this.init = function(settings) 
			{			
				var logoURL = settings.logoURL;
				
				_logoInput.attr("disabled", "true");
				_logoTargetInput.attr("disabled", "true");
				
				$("input[name='optionsLogo']", $(contentContainer)).change(function () {
					var logoOption = $("input[name='optionsLogo']:checked", $(contentContainer)).val();
					if (logoOption == "none" || logoOption == "esri" ) {
						_logoInput.attr("disabled", "true");
						_logoTargetInput.attr("disabled", "true");
					}
					else {
						_logoInput.removeAttr("disabled");
						_logoTargetInput.removeAttr("disabled");
					}
			    });
				
				$("#headerSimulator", contentContainer).css("background-color", settings.colors[0]);
				if (logoURL == null) {
					$('input[name=optionsLogo]:eq(1)', contentContainer).attr('checked', 'checked');
					_logoInput.val("");
					_logoTargetInput.val("");
				}
				else if (logoURL == defaultLogoURL) {
					$('input[name=optionsLogo]:eq(0)', contentContainer).attr('checked', 'checked');
					$("#imgLogo", contentContainer).show();
					_logoInput.val("");
					_logoTargetInput.val("");
				}
				else {
					$('input[name=optionsLogo]:eq(2)', contentContainer).attr('checked', 'checked');
					$("#imgLogo", contentContainer).attr("src", logoURL);
					$("#imgLogo", contentContainer).show();
					$("#logoInput", contentContainer).val(logoURL);
					_logoTargetInput.val(settings.logoTarget);
					_logoInput.removeAttr("disabled");
					_logoTargetInput.removeAttr("disabled");
				}
				
				$("#selectSocialText", contentContainer).val(settings.linkText);
				$("#selectSocialLink", contentContainer).val(settings.linkURL);
				
				updateForm();
			}
			
			this.show = function()
			{
				//
			}
			
			this.save = function()
			{		
				var logoOption = $("input[name=optionsLogo]:checked", contentContainer).val();
				var logoURL;
				var logoTarget;
				
				if (logoOption == "none") {
					logoURL = null;
					logoTarget = "";
				}
				else if (logoOption == "esri") {
					logoURL = defaultLogoURL;
					logoTarget = "";
				}
				else {
					logoURL = _badLogo ? defaultLogoURL : $("#imgLogo",contentContainer).attr("src");
					logoTarget = _logoTargetInput.val();
				}
				
				return {
					logoURL: logoURL,
					logoTarget: logoTarget,
					linkText: $("#selectSocialText", contentContainer).val(),
					linkURL: $("#selectSocialLink", contentContainer).val(),
				};
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
				$("#imgLogo", contentContainer).hide();
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
				var logoUrl = $.trim($("#logoInput", contentContainer).val());
				if ( logoUrl ) {
					$("#imgLogo", contentContainer).attr("src", logoUrl);
					$("#imgLogo", contentContainer).show();
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
			
			function updateForm()
			{	
				var logoOption = $("input[name=optionsLogo]:checked", contentContainer).val();
	
				$("#imgLogo", contentContainer).hide();
	
				if (logoOption == "custom") {
					loadCustomLogo();
				}
				else if (logoOption == "esri") {
					$("#imgLogo", contentContainer).attr("src", defaultLogoURL);
					$("#imgLogo", contentContainer).show();
				}
			}
			
			this.initLocalization = function()
			{
				$(titleContainer).html(i18n.viewer.builderHTML.settingsTabLogo);
				
				$(contentContainer).find('p').eq(0).html(i18n.viewer.builderHTML.settingsLogoExplain);
				$(contentContainer).find('.logoText').eq(0).html(i18n.viewer.builderHTML.settingsLogoEsri);
				$(contentContainer).find('.logoText').eq(1).html(i18n.viewer.builderHTML.settingsLogoNone);
				$(contentContainer).find('.logoText').eq(2).html(i18n.viewer.builderHTML.settingsLogoCustom);
				$(contentContainer).find('#logoInput').attr("placeholder", i18n.viewer.builderHTML.settingsLogoCustomPlaceholder);
				$(contentContainer).find('#logoTargetInput').attr("placeholder", i18n.viewer.builderHTML.settingsLogoCustomTargetPlaceholder);
				$(contentContainer).find('p').eq(1).html(i18n.viewer.builderHTML.settingsLogoSocialExplain);
				$(contentContainer).find('.control-label[for=selectSocialText]').html(i18n.viewer.builderHTML.settingsLogoSocialText + ":");
				$(contentContainer).find('.control-label[for=selectSocialLink]').html(i18n.viewer.builderHTML.settingsLogoSocialLink + ":");
			}
		}
	}
);