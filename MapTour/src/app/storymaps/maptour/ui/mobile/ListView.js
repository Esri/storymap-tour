define(["storymaps/maptour/core/MapTourHelper", "dojo/topic", "dojo/has"], 
	function(MapTourHelper, topic, has)
	{
		/**
		 * MobileListView
		 * @class MobileListView
		 * 
		 * Mobile list view
		 */
		return function MobileListView(selector)
		{
			var ITEM_HEIGHT = 101;
			
			// The color need to be applied on each item during rendering
			var _bgColor = "";
			var _firstDisplaySinceRendered = true;
			
			// Reference to the iScroll div
			var iscroll = null;
			
			// Does the last click/move/touch event was catched as a move event by iScroll
			var isMoveEvent = false;
			var mousePos = {
				onMove: [-1,-1],
				onScroll: [-1,-1]
			};
			
			this.init = function(slides, bgColor)
			{
				$(selector + ' .listWrapper').mousemove(function(e){
					mousePos.onMove[0] = e.screenX;
					mousePos.onMove[1] = e.screenY;
				}); 
				
				setColor(bgColor);
				render(slides);
				initEvents();
			};
			
			this.update = function(slides, bgColor)
			{
				setColor(bgColor);
				iscroll.destroy();
				render(slides);
			};
			
			this.show = function()
			{			
				$(selector).show();
				
				if( _firstDisplaySinceRendered ) {
					$(selector).find(".tpImgPane img").each(function(i, img){ 
						$(img).attr("src", $(img).data("src"));
					});
					_firstDisplaySinceRendered = false;
				}
				
				if( iscroll.maxScrollY == 1 )
					iscroll.refresh();
				
				if (iscroll.maxScrollY < 0) {
					var newY = Math.min(app.data.getCurrentIndex() * ITEM_HEIGHT, - iscroll.maxScrollY);
					iscroll.scrollTo(0, -newY);
					iscroll.refresh();
				}
			};
			
			function render(slides)
			{
				iscroll = new iScroll($(selector + ' .listWrapper')[0], {
					onBeforeScrollMove: function(e)
					{
						if( Math.abs(mousePos.onScroll[0] - e.screenX) > 5 || Math.abs(mousePos.onScroll[1] - e.screenY) > 5 )
							isMoveEvent = true;
							
						if( iscroll.y == iscroll.maxScrollY || iscroll.y === 0 )
							isMoveEvent = false;
					},
					onScrollStart: function()
					{
						mousePos.onScroll = [mousePos.onMove[0], mousePos.onMove[1]]; 
					},
					onBeforeScrollEnd: function()
					{
						if( has("touch") )
							isMoveEvent = false;
					},
					// To detect scroll that end with the bounce effect
					onScrollEnd: function()
					{
						if( iscroll.y == iscroll.maxScrollY || iscroll.y === 0 )
							isMoveEvent = false;
					}
				});
				
				$(selector + ' .listScroller').css('height', (slides.length * ITEM_HEIGHT) + 'px');
				
				var fragment = document.createDocumentFragment();
				
				_firstDisplaySinceRendered = true;
				
				$.each(slides, function(i, tp) {
					var attributes = tp.attributes;
					
					var mainEl = document.createElement('div');
					mainEl.className = "listItem";
					mainEl.style.backgroundColor = _bgColor;
					
					var imgPane = document.createElement('div');
					imgPane.className = "tpImgPane";
					mainEl.appendChild(imgPane);
					
					var imgContainer = document.createElement('div');
					imgContainer.className = "tpImgContainer";
					imgPane.appendChild(imgContainer);
	
					var imgEl = document.createElement('img');
					imgEl.setAttribute(location.hash == "#list" ? 'src' : 'data-src', attributes.getThumbURL());
					imgContainer.appendChild(imgEl);
	
					var iconEl = document.createElement('img');
					iconEl.className = "tpIcon";
					iconEl.src = MapTourHelper.getSymbolUrl(attributes.getColor(), i + 1);
					mainEl.appendChild(iconEl);
	
					var textPane = document.createElement('div');
					textPane.className = "tpTextPane";
					mainEl.appendChild(textPane);
	
					var nameEl = document.createElement('h4');
					nameEl.className = "tpName";
					nameEl.innerHTML = attributes.getName();
					textPane.appendChild(nameEl);
	
					var descriptionEl = document.createElement('p');
					descriptionEl.className = "tpDescription";
					descriptionEl.innerHTML = attributes.getDescription();
					textPane.appendChild(descriptionEl);
					
					fragment.appendChild(mainEl);
				});
				
				$(selector + ' #listPanelScroller').empty();
				document.getElementById("listPanelScroller").appendChild(fragment);	
			}
			
			function initEvents()
			{
				$(selector).click(onUserClick);
				topic.subscribe("CORE_SELECTED_TOURPOINT_UPDATE", updateItem);
			}
			
			function onUserClick(e)
			{
				if( ! e || ! e.target )
					return;
				
				// Process the event with a delay to be sure that isMoveEvent has been correctly set
				setTimeout(function(){ onUserClickTimed(e); } , 50);
			}
			
			function onUserClickTimed(e)
			{
				var index = $(e.target).closest(".listItem").index();
				
				if( ! isMoveEvent && index != -1 )
					topic.publish("OPEN_MOBILE_INFO", index);
				
				isMoveEvent = false;
			}
			
			function updateItem(param)
			{
				var node = $(selector + ' .listItem:nth-child(' + (param.index+1) + ')');
				node.find('.tpName').html(param.name);
				node.find('.tpDescription').html(param.description);
				node.find('.tpIcon').attr("src", MapTourHelper.getSymbolUrl(param.color, param.index + 1));
			}
			
			function setColor(bgColor)
			{
				$(selector).css("background-color", bgColor);
				$(selector + ' .listItem').css("background-color", bgColor);
				_bgColor = bgColor;
			}
		};
	}
);