define(["storymaps/maptour/core/MapTourHelper"], function(MapTourHelper){
	/**
	 * InfoView
	 * @class InfoView
	 * 
	 * Mobile info view
	 */
	return function InfoView(selector)
	{
		var _carousel = null;
		
		this.init = function(slides, bgColor)
		{
			setColor(bgColor);
			render(slides);
			initEvents(slides);
			
			dojo.subscribe("CORE_SELECTED_TOURPOINT_UPDATE", updateSlide);
		}
		
		this.update = function(slides, bgColor)
		{
			setColor(bgColor);
			
			// Completly destroy the previous carousel
			_carousel.destroy();
			$(selector).empty();
			
			render(slides);
			initEvents(slides);
		}
		
		this.show = function()
		{
			$("#infoPanel").show();
			
			_carousel.refreshSize();
			_carousel.goToPage(app.data.getCurrentIndex());
		}
		
		this.getCurrentPoint = function()
		{
			return _carousel.pageIndex;
		}
		
		function render(slides)
		{
			_carousel = new SwipeView(selector, {
				numberOfPages: slides.length
			});

			// Load initial data
			var nbSlides = Math.min(3, Math.max(3, slides.length));
			for (var i=0; i<nbSlides; i++) {
				var index = slides.length == 1 ? 0 : (i == 0) ? slides.length - 1 : i - 1;
				var slide = slides[index];
				
				if( ! slide )
					continue;
				
				var attr  = slides[index].attributes;

				var mainEl = document.createElement('div');
				mainEl.className = "tourPoint";
				mainEl.id = "tourPoint" + index;

				var imgPaneEl = document.createElement('div');
				imgPaneEl.className = "iconHolder";
				mainEl.appendChild(imgPaneEl);

				var iconEl = document.createElement('img');
				iconEl.className = "tourPointIcon";
				iconEl.src = MapTourHelper.getSymbolUrl(attr.getColor(), index + 1);
				imgPaneEl.appendChild(iconEl);

				var nameEl = document.createElement('h2');
				nameEl.className = "tourPointName";
				nameEl.innerHTML = attr.getName();
				mainEl.appendChild(nameEl);

				var descriptionEl = document.createElement('p');
				descriptionEl.className = "tourPointDescription";
				descriptionEl.innerHTML = attr.getDescription();
				mainEl.appendChild(descriptionEl);

				var imgEl = document.createElement('img');
				imgEl.className = "tourPointImg";
				imgEl.src = attr.getURL();
				mainEl.appendChild(imgEl);

				_carousel.masterPages[i].appendChild(mainEl);
			}
		}
		
		function initEvents(slides)
		{
			_carousel.onTouchStart(function(e) {
				app.header.hideMobileBanner();
			});

			_carousel.onFlip(function () {
				// Reset content
				var nbSlides = Math.min(3, slides.length);
				for (var i=0; i<nbSlides; i++) {
					var page = _carousel.masterPages[i];
					var upcoming = page.dataset.upcomingPageIndex;
					
					if( ! slides[upcoming] )
						continue;
					
					var attr = slides[upcoming].attributes;
					
					if (upcoming != page.dataset.pageIndex) {
						var iconEl = page.querySelector('.tourPointIcon');
						iconEl.src = MapTourHelper.getSymbolUrl(attr.getColor(), parseInt(upcoming) + 1);;
						
						var imgEl = page.querySelector('.tourPointImg');
						imgEl.src = attr.getURL();
						
						var nameEl = page.querySelector('.tourPointName');
						nameEl.innerHTML = attr.getName();
						
						var descriptionEl = page.querySelector('.tourPointDescription');
						descriptionEl.innerHTML = attr.getDescription();
					}
				}

				$("body").scrollTop(0);
				downloadCurrentImage();
				dojo.publish("MOBILE_INFO_SWIPE", _carousel.pageIndex);
			});

			_carousel.onMoveOut(function () {
				clearTimeout(_carousel.delayedFlipEvent);
				app.header.hideMobileBanner();
			});
			
			downloadCurrentImage();
		}
		
		
		function downloadCurrentImage()
		{
			var img = _carousel.masterPages[_carousel.currentMasterPage].querySelector('.tourPointImg');
			if (img){
				var imgCheck = new Image();
				imgCheck.onload = function(){
					$("#infoCarousel").height(_carousel.masterPages[_carousel.currentMasterPage].childNodes[0].clientHeight + 15);
				}
				imgCheck.src = img.src;
			}
		}
		
		
		function updateSlide(param)
		{
			var node = $(selector + ' .swipeview-active');
			node.find('.tourPointName').html(param.name);
			node.find('.tourPointDescription').html(param.description);
			node.find('.tourPointIcon').attr("src", MapTourHelper.getSymbolUrl(param.color, param.index + 1));
		}
		
		function setColor(bgColor)
		{
			$("#infoPanel").css("background-color", bgColor);
		}
	}
});