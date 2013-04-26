define(["storymaps/maptour/core/MapTourHelper"], function(MapTourHelper){
	/**
	 * MobileListView
	 * @class MobileListView
	 * 
	 * Mobile list view
	 */
	return function MobileListView(selector)
	{
		// The color need to be applied on each item during rendering
		var _bgColor = "";
		
		this.init = function(slides, bgColor)
		{
			setColor(bgColor);
			render(slides);
			initEvents();
		}
		
		this.update = function(slides, bgColor)
		{
			setColor(bgColor);
			render(slides);
		}
		
		this.show = function()
		{			
			$(selector).show();
			
			setTimeout(function(){
				if( app.data.getCurrentIndex() == 0 )
					$('body').animate({scrollTop:'0px'}, 0);
				else {
					var maxHeight = $("#listPanel .listItem").length * $("#listPanel .listItem").outerHeight();
					var itemTopOffset =  $(' .listItem:nth-child(' + (app.data.getCurrentIndex()+1) + ')').offset().top - $('.listItem:nth-child(1)').offset().top;
					if( itemTopOffset > maxHeight )
						itemTopOffset = maxHeight;
				}
					$('body').animate({scrollTop:itemTopOffset}, 0);
			}, 0);
		}
		
		function render(slides)
		{
			var fragment = document.createDocumentFragment();
			
			$.each(slides, function(i, tp) {
				var attributes = tp.attributes;
				
				var mainEl = document.createElement('div');
				mainEl.className = "listItem";
				mainEl.style.backgroundColor = _bgColor;
				
				var imgPane = document.createElement('div');
				imgPane.className = "tpImgPane";
				mainEl.appendChild(imgPane);

				var imgEl = document.createElement('img');
				imgEl.src = attributes.getThumbURL();
				imgPane.appendChild(imgEl);

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
			
			$(selector).empty();
			document.getElementById("listPanel").appendChild(fragment);	
		}
		
		function initEvents()
		{
			$(selector).fastClick(function(e){
				dojo.publish("OPEN_MOBILE_INFO", $(e.target).closest(".listItem").index());
			});
			dojo.subscribe("CORE_SELECTED_TOURPOINT_UPDATE", updateItem);
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
	}
});