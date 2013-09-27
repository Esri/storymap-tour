define(["storymaps/maptour/core/MapTourHelper", "dojo/topic"], 
	function(MapTourHelper, topic){
		/**
		 * Carousel
		 * @class Carousel
		 * 
		 * Mobile carousel under the map
		 */
		return function Carousel(selector, isInBuilderMode)
		{
			var _carousel = null;
			var _preventNextRefresh = false;
			var _mouseDownPosition = [0,0];
			
			this.init = function(slides, bgColor)
			{
				if( isInBuilderMode )
					$(selector + ' .builderMobileContainer').css("display", "block");
					
				setColor(bgColor);
				
				render(slides);
				initEvents(slides);
				
				topic.subscribe("CORE_SELECTED_TOURPOINT_UPDATE", updateSlide);
			};
			
			this.update = function(slides, bgColor)
			{
				setColor(bgColor);
				
				// Completely destroy the previous carousel
				_carousel.destroy();
				$(selector + ' .carousel').empty();
				
				render(slides);
				initEvents(slides);
			};
			
			this.setSelectedPoint = function(tourPointIndex)
			{
				if( ! _carousel )
					return;
				
				// If the even originate from here, refreshing cause blinking
				if( ! _preventNextRefresh ) {
					_carousel.refreshSize();
					_carousel.goToPage(tourPointIndex);
				}
				else
					_preventNextRefresh = false;
			};
			
			function render(slides)
			{
				_carousel = new SwipeView(selector + ' .carousel', {
					numberOfPages: slides.length
				});
	
				// Load initial data
				var nbSlides = Math.min(3, Math.max(3, slides.length));
				for (var i=0; i<nbSlides; i++) {
					var index = slides.length == 1 ? 0 : (i === 0) ? slides.length - 1 : i - 1;
					var slide = slides[index];
					
					if( ! slide )
						continue;
									
					var attr = slide.attributes;
					
					var mainEl = document.createElement('div');
					mainEl.className = "tpPreview";
	
					var imgPane = document.createElement('div');
					imgPane.className = "tpImgPane";
					mainEl.appendChild(imgPane);
	
					var imgContainer = document.createElement('div');
					imgContainer.className = "tpImgContainer";
					imgPane.appendChild(imgContainer);
	
					var imgEl = document.createElement('img');
					imgEl.src = attr.getThumbURL();
					imgContainer.appendChild(imgEl);
					
					var iconEl = document.createElement('img');
					iconEl.className = "tpIcon";
					iconEl.src = MapTourHelper.getSymbolUrl(attr.getColor(), index + 1);
					mainEl.appendChild(iconEl);
	
					var textPane = document.createElement('div');
					textPane.className = "tpTextPane";
					mainEl.appendChild(textPane);
	
					var nameEl = document.createElement('h4');
					nameEl.className = "tpName";
					nameEl.innerHTML = attr.getName();
					textPane.appendChild(nameEl);
	
					var descriptionEl = document.createElement('p');
					descriptionEl.className = "tpDescription previewDescription";
					descriptionEl.innerHTML = attr.getDescription();
					textPane.appendChild(descriptionEl);
	
					_carousel.masterPages[i].appendChild(mainEl);
				}
			}
			
			function initEvents(slides)
			{
				$(".tpPreview").click(function(e){
					if( Math.abs(e.clientX - _mouseDownPosition[0]) < 10 && Math.abs(e.clientY - _mouseDownPosition[1]) < 10 )
						topic.publish("OPEN_MOBILE_INFO", null);
				});
				
				// Save mouse position for later comparison to differenciate click and flip (or aborted flip) events
				$(selector + ' .carousel').mousedown(function(e){
					_mouseDownPosition = [e.clientX, e.clientY];
				});
	
				_carousel.onFlip(function(){
					// Reset content
					var nbSlides = Math.min(3, slides.length);
					for (var i=0; i<nbSlides; i++) {
						var page = _carousel.masterPages[i];
						var upcoming = page.dataset.upcomingPageIndex;
											
						if( ! slides[upcoming] )
							return;
						
						var attr = slides[upcoming].attributes;
		
						if ( upcoming != page.dataset.pageIndex ) {
							var imgEl = page.querySelector('.tpImgPane img');
							imgEl.src = attr.getThumbURL();
		
							var iconEl = page.querySelector('.tpIcon');
							iconEl.src = MapTourHelper.getSymbolUrl(attr.getColor(), parseInt(upcoming, 10) + 1);
		
							var nameEl = page.querySelector('.tpName');
							nameEl.innerHTML = attr.getName();
							
							var descriptionEl = page.querySelector('.tpDescription');
							descriptionEl.innerHTML = attr.getDescription();
						}
					}
					
					if (app.data.getCurrentIndex() != -1 && app.data.getCurrentIndex() != _carousel.pageIndex) {
						_preventNextRefresh = true;
						topic.publish("CAROUSEL_SWIPE", _carousel.pageIndex);
					}
				});
			}
			
			function updateSlide(param)
			{
				var node = $(selector + ' .carousel .swipeview-active');
				node.find('.tpName').html(param.name);
				node.find('.tpDescription').html(param.description);
				node.find('.tpIcon').attr("src", MapTourHelper.getSymbolUrl(param.color, param.index + 1));
			}
			
			function setColor(bgColor)
			{
				$(selector + ' .carousel').css("background-color", bgColor);
				$(selector + ' .builderMobile').css("background-color", bgColor);
			}
		};
	}
);