define([],
	function() {
		var config = {
			bingMapsKey:"",   
			helperServices: {
				geometry:{
					url: location.protocol + "//utility.arcgisonline.com/ArcGIS/rest/services/Geometry/GeometryServer"
				},
				geocode: [{
					url: location.protocol + "//geocode.arcgis.com/arcgis/rest/services/World/GeocodeServer"
				}]
			}
		};
		commonConfig = config;
		return config;  
	}
);