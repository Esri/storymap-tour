define(["storymaps/maptour/core/FieldConfig", "dojo/_base/lang"], function(FieldConfig, lang){
	/**
	 * WebApplicationData
	 * @class WebApplicationData
	 * 
	 * Store the Web mapping Application /data request
	 */
	
	var _originalData = {};
	var _data = { 
		values: {}
	};
	
	return {
		set: function(data)
		{
			_originalData = lang.clone(data);
			
			if( ! data || ! data.values )
				return;
			
			if( data.values.fieldsOverride )
				data.values.fieldsOverride = new FieldConfig(data.values.fieldsOverride);
			
			_data = data; 
		},
		get: function()
		{
			var data = lang.clone(_data);
			if( data.values.fieldsOverride )
				data.values.fieldsOverride = data.values.fieldsOverride.serialize();
			
			data.values.template = "Map Tour";
			data.values.templateVersion = version;
			
			return data;
		},
		restoreOriginalData: function()
		{
			this.set(_originalData);
		},
		getWebmap: function()
		{
			return _data.values.webmap;
		},
		getTitle: function()
		{
			return _data.values.title;
		},
		setTitle: function(title)
		{
			_data.values.title = title;
		},
		getSubtitle: function()
		{
			return _data.values.subtitle;
		},
		setSubtitle: function(subtitle)
		{
			_data.values.subtitle = subtitle;
		},
		setFieldsOverride: function(fieldConfig)
		{
			_data.values.fieldsOverride = new FieldConfig(fieldConfig);
		},
		getFieldsOverride: function()
		{
			return _data.values.fieldsOverride;
		},
		getTourPointOrder: function()
		{
			return _data.values.order;
		},
		setTourPointOrder: function(order)
		{
			_data.values.order = [];
			for(var i=0; i < order.length; i++) {
				_data.values.order.push({
					id: order[i].id,
					visible: order[i].visible
				});
			}
		},
		setColors: function(color1, color2, color3) 
		{
			_data.values.colors = color1 + ';' + color2 + ';' + color3;
		},
		getColors: function()
		{
			return _data.values.colors ? _data.values.colors.split(';') : APPCFG.COLORS;
		},
		setLogoURL: function(url)
		{
			_data.values.logoURL = url;
		},
		getLogoURL: function()
		{
			return _data.values.logoURL;
		},
		setLogoTarget: function(url)
		{
			_data.values.logoTarget = url;
		},
		getLogoTarget: function()
		{
			return _data.values.logoTarget;
		},
		setZoomLevel: function(level)
		{
			_data.values.zoomLevel = level;
		},
		getZoomLevel: function() 
		{
			return _data.values.zoomLevel;
		},
		getLayout: function()
		{
			return _data.values.layout;
		},
		setLayout: function(layout)
		{
			_data.values.layout = layout;
		},
		getHeaderLinkText: function()
		{
			return _data.values.headerLinkText;
		},
		getHeaderLinkURL: function()
		{
			return _data.values.headerLinkURL;
		},
		setHeaderLink: function(linkText, linkURL)
		{
			_data.values.headerLinkText = linkText;
			_data.values.headerLinkURL = linkURL;
		},
		getFirstRecordAsIntro: function()
		{
			return _data.values.firstRecordAsIntro;
		},
		setFirstRecordAsIntro: function(firstRecordAsIntro)
		{
			_data.values.firstRecordAsIntro = firstRecordAsIntro;
		}
	}
});