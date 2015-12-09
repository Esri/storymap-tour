define(["storymaps/maptour/core/MapTourHelper", "dojo/topic"], 
	function(MapTourHelper, topic)
	{
		/**
		 * InfoView
		 * @class InfoView
		 * 
		 * Mobile info view
		 */
		return function InfoView(selector)
		{
			var _carousel = null;
			var _firstDisplaySinceRendered = true;
			
			this.init = function(slides, bgColor)
			{
				setColor(bgColor);
				render(slides);
				initEvents(slides);
				
				topic.subscribe("CORE_SELECTED_TOURPOINT_UPDATE", updateSlide);
				
				if ( ! $("body").hasClass("hasTouch") )
					$(selector).parent().addClass("hasDesktopBtn");
			};
			
			this.update = function(slides, bgColor)
			{
				setColor(bgColor);
				
				// Completly destroy the previous carousel
				_carousel.destroy();
				$(selector).empty();
				
				render(slides);
				initEvents(slides);
			};
			
			this.show = function()
			{
				$("#infoPanel").show();
				
				if( _firstDisplaySinceRendered ) {
					$(selector).find(".tourPoint img").each(function(i, img){ 
						$(img).attr("src", $(img).data("src"));
					});
					_firstDisplaySinceRendered = false;
				}
				
				_carousel.refreshSize();
				_carousel.goToPage(app.data.getCurrentIndex());
			};
			
			this.getCurrentPoint = function()
			{
				return _carousel.pageIndex;
			};
			
			function render(slides)
			{
				_firstDisplaySinceRendered = true;
				
				_carousel = new SwipeView(selector, {
					numberOfPages: slides.length
				});
	
				// Load initial data
				var nbSlides = Math.min(3, Math.max(3, slides.length));
				for (var i=0; i<nbSlides; i++) {
					var index = slides.length == 1 ? 0 : (i === 0) ? slides.length - 1 : i - 1;
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
					
					var iframeEl = document.createElement('iframe');
					iframeEl.className = "tourPointIframe";
	
					if (! attr.isVideo() && MapTourHelper.mediaIsSupportedImg(attr.getURL())) {
						imgEl.setAttribute(location.hash == "#info" ? 'src' : 'data-src', attr.getURL());
						iframeEl.setAttribute('style', 'display:none');
					}
					else {
						iframeEl.setAttribute('src', MapTourHelper.checkVideoURL(attr.getURL()));
						imgEl.setAttribute('style', 'display:none');
					}
					mainEl.appendChild(imgEl);
					mainEl.appendChild(iframeEl);
	
					_carousel.masterPages[i].appendChild(mainEl);
				}
			}
			
			function initEvents(slides)
			{
				_carousel.onTouchStart(function() {
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
						
						// If video: remove and restore the src attribute to stop the video
						if( _carousel.pageIndex != page.dataset.pageIndex && upcoming == page.dataset.pageIndex) {
							var frame = page.querySelector('.tourPointIframe');
							if( frame && frame.src )
								$(frame).attr('src', frame.src);
						}
						
						if (upcoming != page.dataset.pageIndex) {
							var iconEl = page.querySelector('.tourPointIcon');
							iconEl.src = MapTourHelper.getSymbolUrl(attr.getColor(), parseInt(upcoming, 10) + 1);

							var imgEl = page.querySelector('.tourPointImg');
							var iframeEl = page.querySelector('.tourPointIframe');
							var isImg = ! attr.isVideo() && MapTourHelper.mediaIsSupportedImg(attr.getURL());

							if ( isImg )
								imgEl.src = attr.getURL();
							else if( iframeEl.src != attr.getURL() ) 
								iframeEl.src = MapTourHelper.checkVideoURL(attr.getURL());
							
							$(imgEl).toggle(isImg);
							$(iframeEl).toggle(! isImg);
							
							var nameEl = page.querySelector('.tourPointName');
							nameEl.innerHTML = attr.getName();
							
							var descriptionEl = page.querySelector('.tourPointDescription');
							descriptionEl.innerHTML = attr.getDescription();
						}
					}
	
					$("body").scrollTop(0);
					checkViewSize();
					topic.publish("MOBILE_INFO_SWIPE", _carousel.pageIndex);
					
					$(selector).parent().find(".embed-btn-left").toggleClass(
						"disabled", 
						! _carousel.pageIndex
					);
					
					$(selector).parent().find(".embed-btn-right").toggleClass(
						"disabled", 
						_carousel.pageIndex === slides.length - 1
					);
				});
	
				_carousel.onMoveOut(function () {
					clearTimeout(_carousel.delayedFlipEvent);
					app.header.hideMobileBanner();
				});
				
				$(selector).parent().find(".embed-btn").off('click').click(function(){
					var btnContainer = $(this).parent();
					if ( ! btnContainer.hasClass("disabled") ) {
						if ( btnContainer.hasClass("embed-btn-left") )
							topic.publish("PIC_PANEL_PREV", null);
						else
							topic.publish("PIC_PANEL_NEXT", null);
						
						_carousel.refreshSize();
						_carousel.goToPage(btnContainer.hasClass("embed-btn-left") ? _carousel.pageIndex - 1 : _carousel.pageIndex + 1);
					}
				});
				
				checkViewSize();
			}
			
			function checkViewSize()
			{
				var img = _carousel.masterPages[_carousel.currentMasterPage].querySelector('.tourPointImg');
				if (img){
					var imgCheck = new Image();
					imgCheck.onload = function(){
						$("#infoCarousel").height(_carousel.masterPages[_carousel.currentMasterPage].childNodes[0].clientHeight + 15);
					};
					imgCheck.src = img.src || img.getAttribute("data-src");
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
		};
	}
);