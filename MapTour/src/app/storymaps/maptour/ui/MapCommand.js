define(["dojo/has"], function(has){
	/**
	 * MapCommand
	 * @class MapCommand
	 * 
	 * UI component that control the map display with +/home/- buttons and optional location button
	 * On touch device button are bigger
	 */
	return function MapCommand(map, homeClickCallback, locationButtonCallback)
	{
		var homeButton = $('<div class="esriSimpleSliderIncrementButton"><img style="vertical-align: -2px;" src="resources/icons/mapcommand-home.png"></div>');
		
		homeButton.fastClick(function(){
			if( homeClickCallback && typeof homeClickCallback == 'function' )
				homeClickCallback(map._params.extent);
			else
				map.setExtent(map._params.extent);
		});
		
		$(map.container).find('.esriSimpleSlider div:nth-child(1)').after(homeButton);
		
		// Display location button if location api and a callback is provided
		if( navigator && navigator.geolocation && locationButtonCallback && typeof locationButtonCallback == 'function' ) {
			$(".esriSimpleSlider", map.container).after('<div id="mainMap_zoom_location" class="esriSimpleSlider esriSimpleSliderVertical mapCommandLocation"><div><img src="resources/icons/mapcommand-location.png"></div></div>');
			$("#mainMap_zoom_location div", map.container).fastClick(getDeviceLocation);
		}
		
		// Add a touch css class to the slider if we are on a touch device
		// Bigger icon will be used in that case
		if ( has('touch') )
			$(".esriSimpleSlider", map.container).addClass('touch');
		
		this.setMobile = function(isMobile)
		{
			$(".esriSimpleSlider", map.container).toggleClass("touch", isMobile);
		}
		
		function getDeviceLocation()
		{
			navigator.geolocation.getCurrentPosition(
				function(e) {
					locationButtonCallback(true, new esri.geometry.Point(e.coords.longitude, e.coords.latitude), e);
				},
				getDeviceLocationError
			);
		}
		
		function getDeviceLocationError(error)
		{
			locationButtonCallback(false, error);
		}
	}
});