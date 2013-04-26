define(["dojo/has", "dojo/touch", "dojo/on"], function(has, touch, on)
{
	/**
	 * Make the graphic movable on desktop and touch devices
	 * clean() has to be called to restore the graphic behavior when done
	 * dojo/touch is used to abstract touch and desktop events
	 * @param {Object} map
	 * @param {Object} layer
	 * @param {Object} graphic
	 */
	return function MovableGraphic(map, layer, graphic, onMoveEndCallback, onMoveStartCallback)
	{
		var _editPointLayer = false;
		var _events = [];

		init();

		/**
		 * Restore original graphic behavior
		 * @param {Object} events
		 */
		this.clean = function()
		{
			dojo.forEach(_events, function(event){
				dojo.disconnect(event);
			});
		}

		function init()
		{
			var event1 = dojo.connect(layer, "onMouseOver", function(event){
				if(event.graphic == graphic)
					map.setMapCursor("move");
			});

			var event2 = dojo.connect(layer, "onMouseOut", function(event){
				if(event.graphic == graphic)
					map.setMapCursor("default");
			});

			var event3 = on(layer._div.rawNode, touch.press, function(event) {
				// Prevent using another point as a start location on desktop - does not work on touch
				if (event.graphic == graphic || has("touch") || has("ie") == 10 ) {
					map.disablePan();
					
					_editPointLayer = true;
					graphic.hasBeenMoved = false;
				}
			});

			var event4 = touch.release(layer._div.rawNode, function(event){
				map.enablePan();
				_editPointLayer = false;
				if( onMoveEndCallback && graphic.hasBeenMoved )
					onMoveEndCallback(graphic);
			});

			var event5 = has("touch") || has("ie") == 10 ? 
					// Using the layer decrease too much the performance ...
					touch.move(map.__container, moveGraphic) 
					: dojo.connect(map, "onMouseDrag", moveGraphic);

			_events = [event1, event2, event3, event4, event5];
		}
		
		function moveGraphic(event)
		{
			if (_editPointLayer && event.mapPoint) {
				graphic.setGeometry(event.mapPoint);
				
				if( onMoveStartCallback && ! graphic.hasBeenMoved )
					onMoveStartCallback(graphic);
					
				graphic.hasBeenMoved = true;
			}
		}
	}
});