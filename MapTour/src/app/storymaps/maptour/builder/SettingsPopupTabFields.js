define([], 
	function () {
		return function SettingsPopupTabFields(titleContainer, contentcontainer) 
		{
			var _fieldConfig,
				_defaultConfig;

			var _selectName = $(contentcontainer).find("#selectName");
			var _selectDescription = $(contentcontainer).find("#selectDescription");
			var _selectColor = $(contentcontainer).find("#selectColor");
			
			$(contentcontainer).find(".fieldReset").fastClick(reset);
				
			this.init = function(settings, openOnError) 
			{		
				_selectName.empty();
				_selectDescription.empty();
				_selectColor.empty();
				
				_fieldConfig = settings.fieldConfig;
				_defaultConfig = settings.defaultConfig;
				
				var foundName = false;
                var foundDescription = false;
                var foundColor = false;
				
				$.each(settings.allFields, function(i, field){
					var selectedName = "";
                    var selectedDesc = "";
                    var selectedColor = "";
					
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
					$(_selectDescription).prepend('<option value="-1" selected="selected">---</option>');
					
				if( ! foundColor )
					$(_selectColor).prepend('<option value="-1" selected="selected">---</option>');	
					
				$(".error-msg", contentcontainer).toggle(openOnError);
			};
			
			this.show = function()
			{
				$(contentcontainer).find(".error-msg2").hide();
			};
			
			this.save = function()
			{		
				var isUserConfig = false;
				var fieldName  = _selectName.find(":selected").val();
				var fieldDesc  = _selectDescription.find(":selected").val();
				var fieldColor = _selectColor.find(":selected").val();
				
				if( ! fieldName || fieldName == "-1" || ! fieldDesc || fieldDesc == "-1" || ! fieldColor || fieldColor == "-1" ) {
					$(contentcontainer).find(".error-msg2").show();
					return false;
				}
				
				if( fieldName != _defaultConfig.getNameField() 
						|| fieldDesc != _defaultConfig.getDescriptionField() 
						|| fieldColor != _defaultConfig.getIconColorField() )
					isUserConfig = true;
				
				return {
					isUserConfig: isUserConfig,
					fieldConfig: {
						fieldName: fieldName,
						fieldDescription: fieldDesc,
						fieldIconColor: fieldColor,
						fieldID: _fieldConfig.getIDField(),
						fieldURL: _fieldConfig.getURLField(),
						fieldThumb: _fieldConfig.getThumbField()
					}
				};
			};
			
			function reset()
			{
				$(_selectName).val(_defaultConfig.getNameField());
				$(_selectDescription).val(_defaultConfig.getDescriptionField());
				$(_selectColor).val(_defaultConfig.getIconColorField());
			}

			this.initLocalization = function()
			{
				$(titleContainer).html(i18n.viewer.builderHTML.settingsTabFields);
				
				$(contentcontainer).find('.error-msg').html(i18n.viewer.builderHTML.settingsDataFieldsError);
				$(contentcontainer).find('.error-msg2').html(i18n.viewer.builderHTML.settingsFieldError);
				$(contentcontainer).find('p').eq(0).html(i18n.viewer.builderHTML.settingsDataFieldsExplain);
				$(contentcontainer).find('.control-label').eq(0).html(i18n.viewer.builderHTML.settingsFieldsLabelName + ':');
				$(contentcontainer).find('.control-label').eq(1).html(i18n.viewer.builderHTML.settingsFieldsLabelDescription + ':');
				$(contentcontainer).find('.control-label').eq(2).html(i18n.viewer.builderHTML.settingsFieldsLabelColor + ':');
				$(contentcontainer).find('.fieldReset').html(i18n.viewer.builderHTML.settingsFieldsReset);
			};
		};
	}
);