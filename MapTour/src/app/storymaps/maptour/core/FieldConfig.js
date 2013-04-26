define([], function() {
	/**
	 * FieldConfig
	 * @class FieldConfig
	 * 
	 * Stores the relevent attribute field names  
	 */
	return function FieldConfig(cfg)
	{
		var _this = this;
		
		var _fieldID = cfg ? cfg.fieldID : null;
		var _fieldName = cfg ? cfg.fieldName : null;
		var _fieldDescription = cfg ? cfg.fieldDescription : null;
		var _fieldURL = cfg ? cfg.fieldURL : null;
		var _fieldThumb = cfg ? cfg.fieldThumb : null;
		var _fieldIconColor = cfg ? cfg.fieldIconColor : null;
	
		this.setIDField = function(value)
		{
			_fieldID = value;
		}
		
		this.getIDField = function()
		{
			return _fieldID;
		}
	
		this.setNameField = function(value)
		{
			return _fieldName = value;
		}
			
		this.getNameField = function()
		{
			return _fieldName;
		}

		this.setDescriptionField = function(value)
		{
			return _fieldDescription = value;
		}
			
		this.getDescriptionField = function()
		{
			return _fieldDescription;
		}
		
		this.setURLField = function(value)
		{
			return _fieldURL = value;
		}
			
		this.getURLField = function()
		{
			return _fieldURL;
		}

		this.setThumbField = function(value)
		{
			return _fieldThumb = value;
		}
			
		this.getThumbField = function()
		{
			return _fieldThumb;
		}
		
		this.setIconColorField = function(value)
		{
			return _fieldIconColor = value;
		}
			
		this.getIconColorField = function()
		{
			return _fieldIconColor;
		}
		
		this.allFieldsFound = function()
		{
			return _this.getIDField() != ''
				&& _this.getNameField() != ''
				&& _this.getDescriptionField() != ''
				&& _this.getURLField() != ''
				&& _this.getThumbField() != ''
				&& _this.getIconColorField() != '';
		}
		
		this.allCriticalFieldsFound = function()
		{
			return _this.getNameField() != ''
				&& _this.getDescriptionField() != ''
				&& _this.getIconColorField() != '';
		}
		
		this.allWebmapLayerMandatoryFieldsFound = function()
		{
			return _this.getIDField() != ''
				&& _this.getNameField() != ''
				&& _this.getDescriptionField() != ''
				&& _this.getURLField() != ''
				&& _this.getThumbField() != '';
		}
		
		this.serialize = function() 
		{
			return {
				fieldID: _this.getIDField(),
				fieldName: _this.getNameField(),
				fieldDescription: _this.getDescriptionField(),
				fieldURL: _this.getURLField(),
				fieldThumb: _this.getThumbField(),
				fieldIconColor: _this.getIconColorField()				
			}
		}
	}
});