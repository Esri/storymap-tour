define(["dojo/dom-style", "dojo/dom-construct"], function(domStyle, domConstruct) {
	/**
	 * Multi tips
	 * @class MultiTips
	 * 
	 * Nice looking tootlip
	 */
	return function MultiTips(options)
	{
		var settings = null;
		var forceHidden = false;
		var events = [];
	
		initMultiTips(options);
		
		this.current = function()
		{
			return settings.pointArray;
		};
		
		this.clean = function()
		{
			settings = null;
			cleanTips();
		};
		
		this.hide = function()
		{
			forceHidden = true;
			hideAll();
		};
		
		this.show = function()
		{
			if( ! settings )
				return;
				
			forceHidden = false;
			settings.visible = true;
			refreshTips(settings.map.extent, true);
		}
		
		function initMultiTips(options)
		{
			settings = dojo.mixin({
				'pointArray' : [],
				'map' : null,
				'attributeLabelField' : "",
				'content' : '',
				'zoomToPoints' : false,
				"backgroundColor" : "#000000",
				"pointerColor" : "#000000",
				"textColor" : "#ffffff",
				"minWidth" : "",
				"labelDirection" : "auto",
				"offsetTop": 8,
				"offsetSide": 3,
				"offsetBottom": 8,
				"mapAuthorizedWidth": -1,
				"mapAuthorizedHeight": -1,
				"visible": true
			}, options);

			if( options.mapAuthorizedWidth == -1 )
				settings.mapAuthorizedWidth = settings.map.width;
			if( options.mapAuthorizedHeight == -1 )
				settings.mapAuthorizedHeight = settings.map.height;
	
			buildTips(options.map.container);
		};
	
		function buildTips(mapDiv, forceVisible)
		{
			cleanTips();
	
			var event1 = dojo.connect(settings.map, "onZoomStart", function()
			{
				hideAll();
			});
			
			var event2 = dojo.connect(settings.map, "onZoomEnd", function(extent)
			{
				refreshTips(extent, true);
			});
	
			var event3 = dojo.connect(settings.map, "onPan", function(extent, delta)
			{
				if( ! delta.x && ! delta.y )
					return;
				
				if( ! forceHidden )
					refreshTips2(extent, delta);
			});
	
			var event4 = dojo.connect(settings.map, "onExtentChange", function(extent, delta)
			{
				if( delta && delta.x == 0 && delta.y == 0 )
					return;
	
				if( ! forceHidden )
					refreshTips(extent, true);
			});
			
			if( forceVisible )
				settings.visible = true;
	
			dojo.forEach(settings.pointArray, function(pt, i) {
				domConstruct.place("<div id='arrow"+i+"' class='mtArrow'></div><div id='multiTip"+i+"' class='multiTip'></div>", mapDiv, "last");
				dojo.query('#multiTip'+i)[0].innerHTML = settings.content;
				
				domStyle.set('multiTip' + i, {
					backgroundColor: settings.backgroundColor,
					color: settings.textColor,
					padding: "5px",
					position: "absolute"
				});
				
				if( settings.minWidth )
					 domStyle.set('multiTip' + i, "minWidth", settings.minWidth + 'px');
					
				domStyle.set('arrow' + i, {
					position: "absolute",
					width: "0px",
					height: "0px"
				});
				
				if (settings.map.extent.contains(pt.geometry)) {
					var scrPt = settings.map.toScreen(pt.geometry);
					displayTip(scrPt, i, settings);
				}
			});
	
			events = [event1, event2, event3, event4];
		};
		
		function cleanTips()
		{
			forceHidden = false;
			
			dojo.forEach(events, function(event){
				dojo.disconnect(event);
			});
			
			dojo.query(".multiTip").forEach(dojo.destroy);
			dojo.query(".mtArrow").forEach(dojo.destroy);
		};
		
		function refreshTips(extent, forceVisible)
		{
			dojo.forEach(settings.pointArray, function(pt, i){
				if( extent.contains(pt.geometry) && (isTipVisible(i) || forceVisible) )
					displayTip(settings.map.toScreen(pt.geometry), i, settings);
				else 
					hideTip(i);
			});
		};
		
		function refreshTips2(extent, delta)
		{
			dojo.forEach(settings.pointArray, function(pt, i){
				if( extent.contains(pt.geometry) ) {
					var pointScreen = settings.map.toScreen(pt.geometry);
					pointScreen.x += delta.x;
					pointScreen.y += delta.y;
					displayTip(pointScreen, i, settings);
				}
				else 
					hideTip(i);
			});
		};
	
		function hideAll()
		{
			dojo.query(".multiTip, .mtArrow").forEach(function(node){
				node.style.display = "none";
			});
		};
	
		function hideTip(index)
		{
			if( dojo.style(dojo.byId('multiTip' + index), "display") == "none" )
				return;
				
			dojo.style(dojo.byId('multiTip' + index), "display", "none");
			dojo.style(dojo.byId('arrow' + index), "display", "none");
		};
		
		function isTipVisible(index)
		{
			return dojo.style(dojo.byId('multiTip' + index), "display") == "block";
		};
	
		function displayTip(scrPt, i, settings)
		{
			if( scrPt.x > settings.mapAuthorizedWidth || scrPt.y > settings.mapAuthorizedHeight ) {
				hideTip(i);
				return;
			}
				
			var width  = domStyle.get("multiTip" + i, "width");
			var height = domStyle.get("multiTip" + i, "height");
			
			if( ! width || ! height ) {
				dojo.style(dojo.byId('multiTip' + i), "display", settings.visible ? "block" : "none");
				dojo.style(dojo.byId('arrow' + i), "display", settings.visible ? "block" : "none");
				
				width  = domStyle.get("multiTip" + i, "width");
				height = domStyle.get("multiTip" + i, "height");
			}
			
			if( settings.minWidth && width < settings.minWidth )
				width = settings.minWidth;
				
			if (settings.labelDirection != "auto"){
				if (settings.labelDirection == "left")
					labelLeft(scrPt, i, settings, width, height);
				else if (settings.labelDirection == "right")
					labelRight(scrPt, i, settings, width, height);
				else if (settings.labelDirection == "down")
					labelDown(scrPt, i, settings, width, height);
				else
					labelUp(scrPt, i, settings, width, height);
			}
			else {
				// Manage top left not authorized space for the zoom control
				if(scrPt.x < ((width / 2) + 25 + settings.offsetSide + settings.topLeftNotAuthorizedArea[0]) && scrPt.y < settings.topLeftNotAuthorizedArea[1] + height ) {
					if(scrPt.y  < height - 15 || (scrPt.x < 25 + 10 + settings.topLeftNotAuthorizedArea[0]  && scrPt.y < settings.topLeftNotAuthorizedArea[1]) ) {
						hideTip(i);
						return;
					}
					else 
						labelRight(scrPt, i, settings, width, height);
				}
				
				else if (scrPt.x < ((width / 2) + 25 + settings.offsetSide)) {
					if(scrPt.y  < height - 15 || scrPt.y > settings.mapAuthorizedHeight - (height/2) - 10) {
						hideTip(i);
						return;
					}
					labelRight(scrPt, i, settings, width, height);
				}
				else if (scrPt.x > (settings.mapAuthorizedWidth - (width /2) - 10)){
					if(scrPt.y  < height - 15 || scrPt.y > settings.mapAuthorizedHeight - (height/2) - 10) {
						hideTip(i);
						return;
					}
					else
						labelLeft(scrPt, i, settings, width, height);
				}
				else if (scrPt.y > (height + 25 + settings.offsetTop)) 
					labelUp(scrPt, i, settings, width, height);
				else 
					labelDown(scrPt, i, settings, width, height);
			}
			
			dojo.style(dojo.byId('multiTip' + i), "display", settings.visible ? "block" : "none");
			dojo.style(dojo.byId('arrow' + i), "display", settings.visible ? "block" : "none");
		};

		function labelDown(scrPt, i, settings, width, height)
		{
			domStyle.set('multiTip' + i, {
				top: (scrPt.y + 10 + settings.offsetBottom) + 'px',
				left: (scrPt.x - (width/2) - 5) + 'px'
			});
			
			domStyle.set('arrow' + i, {
				left: (scrPt.x - 10) + 'px',
				top: (scrPt.y + settings.offsetBottom) + 'px',
				borderLeft: "10px solid transparent",
				borderRight: "10px solid transparent",
				borderBottom: "10px solid",
				borderBottomColor: settings.pointerColor,
				borderTop: "none"
			});
		};
	
		function labelUp(scrPt, i, settings, width, height)
		{
			domStyle.set('multiTip' + i, {
				top: (scrPt.y - height - 24 - settings.offsetTop) + 'px',
				left: (scrPt.x - (width/2) - 5) + 'px'
			});
			
			domStyle.set('arrow' + i, {
				left: (scrPt.x - 10) + 'px',
				top: (scrPt.y - 10 - settings.offsetTop) + 'px',
				borderLeft: "10px solid transparent",
				borderRight: "10px solid transparent",
				borderTop: "10px solid",
				borderTopColor: settings.pointerColor,
				borderBottom: "none"
			});
		};
	
		function labelRight(scrPt, i, settings, width, height)
		{
			domStyle.set('multiTip' + i, {
				top: (scrPt.y - 12 - ((height-10) / 2)) + 'px',
				left: (scrPt.x + 10 + settings.offsetSide) + 'px'
			});
			
			domStyle.set('arrow' + i, {
				left: (scrPt.x + settings.offsetSide) + 'px',
				top: (scrPt.y - 10) + 'px',
				borderTop: "10px solid transparent",
				borderBottom: "10px solid transparent",
				borderRight: "10px solid",
				borderRightColor: settings.pointerColor,
				borderLeft: "none"
			});
		};
	
		function labelLeft(scrPt, i, settings, width, height)
		{
			domStyle.set('multiTip' + i, {
				top: (scrPt.y - 12 - ((height-10) / 2)) + 'px',
				left: (scrPt.x - 24 - width - settings.offsetSide) + 'px'
			});
			
			domStyle.set('arrow' + i, {
				left: (scrPt.x - 10 - settings.offsetSide) + 'px',
				top: (scrPt.y - 10) + 'px',
				borderTop: "10px solid transparent",
				borderBottom: "10px solid transparent",
				borderLeft: "10px solid",
				borderLeftColor: settings.pointerColor,
				borderRight: "none"
			});
		};
	}
});