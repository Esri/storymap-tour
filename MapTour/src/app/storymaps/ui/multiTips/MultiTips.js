define(["dojo/dom-style", 
		"dojo/dom-construct", 
		"dojo/_base/lang",
		"dojo/on",
		"dojo/_base/array",
		"dojo/query",
		"dojo/dom",
		"dojo/has"], 
	function(
		domStyle, 
		domConstruct, 
		lang,
		on,
		array,
		query,
		dom,
		has
	) {
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
			};
			
			function initMultiTips(options)
			{
				settings = lang.mixin({
					'pointArray' : [],
					'map' : null,
					'attributeLabelField' : "",
					'content' : '',
					'zoomToPoints' : false,
					"backgroundColor" : "#000000",
					"borderColor" : "#000000",
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
			}
		
			function buildTips(mapDiv, forceVisible)
			{
				cleanTips();
		
				var event1 = on(settings.map, "zoom-start", function()
				{
					hideAll();
				});
				
				var event2 = on(settings.map, "zoom-end", function(data)
				{
					if( ! forceHidden )
						refreshTips(data.extent, true);
				});
		
				var event3 = on(settings.map, "pan", function(data)
				{
					if( ! data || (! data.delta.x && ! data.delta.y) )
						return;
					
					if( ! forceHidden )
						refreshTips2(data.extent, data.delta);
				});
		
				var event4 = on(settings.map, "extent-change", function(data)
				{
					if( data && data.delta && data.delta.x === 0 && data.delta.y === 0 )
						return;
		
					if( ! forceHidden )
						refreshTips(data.extent, true);
				});
				
				if( forceVisible )
					settings.visible = true;
		
				array.forEach(settings.pointArray, function(pt, i) {
					domConstruct.place("<div id='arrow"+i+"' class='mtArrow'></div><div id='multiTip"+i+"' class='multiTip'></div>", mapDiv, "last");
					query('#multiTip'+i)[0].innerHTML = settings.content;
					
					domStyle.set('multiTip' + i, {
						backgroundColor: settings.backgroundColor,
						borderColor: settings.borderColor,
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
			}
			
			function cleanTips()
			{
				forceHidden = false;
				
				array.forEach(events, function(event){
					event.remove();
				});
				
				query(".multiTip").forEach(domConstruct.destroy);
				query(".mtArrow").forEach(domConstruct.destroy);
			}
			
			function refreshTips(extent, forceVisible)
			{
				array.forEach(settings.pointArray, function(pt, i){
					if (extent.contains(pt.geometry) && (isTipVisible(i) || forceVisible)) 
						displayTip(settings.map.toScreen(pt.geometry), i, settings);
					else 
						hideTip(i);
				});
			}
			
			function refreshTips2(extent, delta)
			{
				array.forEach(settings.pointArray, function(pt, i){
					if( extent.contains(pt.geometry) ) {
						var pointScreen = settings.map.toScreen(pt.geometry);
						pointScreen.x += delta.x;
						pointScreen.y += delta.y;
						displayTip(pointScreen, i, settings);
					}
					else 
						hideTip(i);
				});
			}
		
			function hideAll()
			{
				query(".multiTip, .mtArrow").forEach(function(node){
					node.style.display = "none";
				});
			}
		
			function hideTip(index)
			{
				if( domStyle.get(dom.byId('multiTip' + index), "display") == "none" )
					return;
					
				domStyle.set(dom.byId('multiTip' + index), "display", "none");
				domStyle.set(dom.byId('arrow' + index), "display", "none");
			}
			
			function isTipVisible(index)
			{
				return domStyle.get(dom.byId('multiTip' + index), "display") == "block";
			}
		
			function displayTip(scrPt, i, settings)
			{
				if( scrPt.x > settings.mapAuthorizedWidth || scrPt.y > settings.mapAuthorizedHeight ) {
					hideTip(i);
					return;
				}
					
				var width  = domStyle.get("multiTip" + i, "width");
				var height = domStyle.get("multiTip" + i, "height");
				
				// TODO
				if( has("ie") == 8 ) {
					width -= 7;
					height -= 14;
				}
				
				if( ! width || ! height ) {
					domStyle.set(dom.byId('multiTip' + i), "display", settings.visible ? "block" : "none");
					domStyle.set(dom.byId('arrow' + i), "display", settings.visible ? "block" : "none");
					
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
				
				domStyle.set(dom.byId('multiTip' + i), "display", settings.visible ? "block" : "none");
				domStyle.set(dom.byId('arrow' + i), "display", settings.visible ? "block" : "none");
			}
	
			function labelDown(scrPt, i, settings, width)
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
			}
		
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
			}
		
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
			}
		
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
			}
		};
	}
);