define(["dojo/has", "esri/geometry/Point", "dojo/on"], 
	function(has, Point, on)
	{
		/**
		 * MapCommand
		 * @class MapCommand
		 * 
		 * UI component that control the map display with +/home/- buttons and optional location button
		 * On touch device button are bigger
		 */
		return function MapCommand(map, homeClickCallback, locationButtonCallback)
		{
			//
			// Home/wait button
			//
			var tsUpdateStart = 0;
			var homeButton = $('<div class="esriSimpleSliderIncrementButton"><div class="mapCommandHomeBtn"></div></div>');
			
			homeButton.fastClick(function(){
				// Prevent using the home button while it's spinning
				if( tsUpdateStart !== 0 && $("body").hasClass("mobile-view") )
					return;
				
				if( homeClickCallback && typeof homeClickCallback == 'function' )
					homeClickCallback(map._params.extent);
				else
					map.setExtent(map._params.extent);
			});
			
			$(map.container).find('.esriSimpleSlider div:nth-child(1)').after(homeButton);
			
			on(map, "update-start", function(){
				if (tsUpdateStart === 0)
					toggleLoadingStatus(true);
			});
			
			on(map, "update-end", function(){
				toggleLoadingStatus(false);
			});
			
			//
			// Geolocate button
			//
			
			// Display location button if location api and a callback is provided
			if( navigator && navigator.geolocation && locationButtonCallback && typeof locationButtonCallback == 'function' ) {
				$(".esriSimpleSlider", map.container).after('<div id="mainMap_zoom_location" class="esriSimpleSlider esriSimpleSliderVertical mapCommandLocation"><div><img src="resources/icons/mapcommand-location.png"></div></div>');
				$("#mainMap_zoom_location div", map.container).fastClick(getDeviceLocation);
			}
			
			this.setMobile = function(isMobile)
			{
				$(".esriSimpleSlider, .mapCommandHomeBtn", map.container).toggleClass("touch", isMobile);
			};
			
			this.destroy = function()
			{
				$(map.container).find('.esriSimpleSliderIncrementButton').remove();
				$(map.container).find('#mainMap_zoom_location').remove();
			};
			
			this.startLoading = function()
			{
				toggleLoadingStatus(true);
			};
			
			this.stopLoading = function()
			{
				toggleLoadingStatus(false);
			};
			
			function toggleLoadingStatus(start)
			{
				if( start ) {
					$(map.container).find('.mapCommandHomeBtn').addClass('loading');
					tsUpdateStart = Date.now();
				}
				else {
					var elapsed = Date.now() - tsUpdateStart;
					var delay = 0;
					
					if( elapsed < 450 )
						delay = 450 - elapsed;
	
					setTimeout(function(){
						$(map.container).find('.mapCommandHomeBtn').removeClass('loading');
						tsUpdateStart = 0;
					}, delay);
				}
			}
			
			function getDeviceLocation()
			{
				navigator.geolocation.getCurrentPosition(
					function(e) {
						locationButtonCallback(true, new Point(e.coords.longitude, e.coords.latitude), e);
					},
					getDeviceLocationError,
					{ timeout: 2000 }
				);
			}
			
			function getDeviceLocationError(error)
			{
				locationButtonCallback(false, error);
			}
			
			// Use bigger icon on touch devices
			if ( has('touch') )
				this.setMobile(true);
		};
	}
);