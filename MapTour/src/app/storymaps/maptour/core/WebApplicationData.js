define(["storymaps/maptour/core/FieldConfig", "dojo/_base/lang"], 
	function(FieldConfig, lang)
	{
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
				
				data.values.sourceLayer = app.data.getSourceLayer().id;
				
				if( ! data.values.template )
					data.values.template = "Map Tour";
				if( ! data.values.templateCreation )
					data.values.templateCreation = version;
				
				//delete data.values.templateCreation;
				//delete data.values.disableVideo;
				
				//data.values.templateCreation = "2.1";
				//data.values.disableVideo = "true";
				
				data.values.templateVersion = version;
				
				return data;
			},
			getBlank: function()
			{
				return {
					values: {
						webmap: _originalData.values.webmap
					}
				};
			},
			cleanWebAppAfterInitialization: function()
			{
				var hasDoneCleaning = false;
				var datas = [_originalData, _data];
				for(var i=0; i < datas.length; i++) {
					var data = datas[i];
					if (data && data.values) {
						if (data.values.order) {
							delete data.values.order;
							hasDoneCleaning = true;
						}
						if (data.values.firstRecordAsIntro) {
							delete data.values.firstRecordAsIntro;
							hasDoneCleaning = true;
						}
							
						if (data.values.fieldsOverride){
							delete data.values.fieldsOverride;
							hasDoneCleaning = true;
						} 
							
						if (data.values.sourceLayer){
							delete data.values.sourceLayer;
							hasDoneCleaning = true;
						} 
					}
				}
				return hasDoneCleaning;
			},
			restoreOriginalData: function()
			{
				this.set(_originalData);
			},
			updateAfterSave: function()
			{
				_originalData = lang.clone(_data);
			},
			getWebmap: function()
			{
				return _data.values.webmap;
			},
			getSourceLayer: function()
			{
				return _data.values.sourceLayer;
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
			setFieldsOverride: function(isUserConfig, fieldConfig)
			{
				if( isUserConfig )
					_data.values.fieldsOverride = new FieldConfig(fieldConfig);
				else if ( _data.values.fieldsOverride )
					delete _data.values.fieldsOverride;
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
			setLayout: function(layout, placardPosition)
			{
				_data.values.layout = layout;
				_data.values.placardPosition = placardPosition;
			},
			getPlacardPosition: function()
			{
				return _data.values.placardPosition;
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
			},
			getLayerId: function()
			{
				return _data.values.layerId;
			},
			setLayerId: function(layerId)
			{
				_data.values.layerId = layerId;
			},
			getSocial: function()
			{
				return _data.values.social;
			},
			setSocial: function(social)
			{
				_data.values.social = social;
			},
			// Last template version the tour has been edited with 
			getTemplateVersion: function()
			{
				return _data.values.templateVersion;
			},
			// Template version the app has been created with - introduced in 2.1
			getTemplateCreation: function()
			{
				return _data.values.templateCreation;
			},
			setTemplateCreation: function()
			{
				_data.values.templateCreation = version;
			},
			setDisableVideo: function(disableVideo)
			{
				_data.values.disableVideo = disableVideo;
			},
			getDisableVideo: function()
			{
				return _data.values.disableVideo;
			},
			getZoomLocationButton: function()
			{
				return _data.values.locationButton;
			},
			setZoomLocationButton: function(locationButton)
			{
				_data.values.locationButton = locationButton;
			},
			setWebmap: function(webmap)
			{
				_data.values.webmap = webmap;
			}
		};
	}
);