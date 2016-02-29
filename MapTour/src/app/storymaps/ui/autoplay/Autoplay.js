define([
		"dojo/topic",
		"dojo/has",
		"storymaps/utils/Helper", 
		"storymaps/maptour/core/MapTourHelper"
    ], 
	function (
		topic,
		has,
		Helper,
		MapTourHelper
	) {
		
	var FADE_DELAY = 6000,
		DEFAULT_VALUE = 10;
		
		return function Autoplay(container, loadNext)
		{
			var _isPlaying = false,
				_timeout = null,
				_nextIndex = null,
				// UI
				_mouseMoveTime = null,
				_isHoverWidget = false;
			
			if ( ! container 
					|| ! loadNext || typeof loadNext !== 'function') {
				console.log("Autoplay: failed to initialize");
			}
			
			container.show();
			
			initEvents();
			
			//
			// Public methods
			//
			
			this.init = function(params)
			{
				if ( ! params ) {
					return;
				}
				
				if ( params.color ) {
					if ( params.useBackdrop ) {
						container.find('.backdrop').css({
							backgroundColor: params.color,
							display: 'block'
						});
						
						// Cancel default color
						container.find('.autoplay-container').css({
							backgroundColor: 'inherit'
						});
					}
					else {
						// Hack for MT, for some reason can't use the backdrop
						container.find('.autoplay-container').css({
							backgroundColor: Helper.hex2rgba(params.color, MapTourHelper.isModernLayout() ? 0.85 : 1)
						});
					}
				}
				
				if ( params.themeMajor ) {
					container.addClass('theme-' + params.themeMajor);
				}
			};
			
			this.start = function()
			{
				startAutoplay(false);
				updatePlayPauseButton(true);
			};
			
			this.stop = function()
			{
				pause();
				updatePlayPauseButton(false);
			};
			
			// On user navigation: allow autoplay to Listen for app navigation even and stop autoplay if not in sync
			this.onNavigationEvent = function(index)
			{
				if ( isPlaying() && index != _nextIndex ) {
					onPlayPauseClick();
				}
			};
			
			//
			// Autoplay start & stop
			//
			
			function start(delay, immediate)
			{
				console.log("Autoplay: start, delay:", delay, "immediate:", immediate);
				
				_isPlaying = true;
				
				// Clean up
				if ( _timeout ) {
					clearTimeout(_timeout);
				}
				
				if (immediate) {
					loadNextWrapper(delay);
				}
				else {
					_timeout = setTimeout(function() {
						loadNextWrapper(delay);
					}, delay);
				}
			}
			
			function pause()
			{
				if ( ! _isPlaying ) {
					return;
				}
				
				console.log("Autoplay: pause");
				
				_isPlaying = false;
				
				if ( _timeout ) {
					clearTimeout(_timeout);
				}
			}
			
			function loadNextWrapper(delay)
			{
				_nextIndex = loadNext();
				
				_timeout = setTimeout(function() {
					loadNextWrapper(delay);
				}, delay);
			}
			
			
			///////////////////
			//  UI
			///////////////////
			
			//
			// Play/pause button
			//
			
			function isPlaying()
			{
				return container.find(".btn-play-container").hasClass("status-play");
			}
			
			function updatePlayPauseButton(isPlaying)
			{
				container.find(".btn-play-container").removeClass("status-play status-pause");
				container.find(".btn-play").removeClass("autoplay-icon-play autoplay-icon-pause");
				
				container.find(".btn-play-container").addClass(isPlaying ? "status-play" : "status-pause");
				container.find(".btn-play").addClass(isPlaying ? "autoplay-icon-pause" : "autoplay-icon-play");
			}
			
			function onPlayPauseClick()
			{
				var newStatus = ! isPlaying();
				
				if (newStatus){
					startAutoplay(true);
				}
				else {
					pause();
				}
				
				updatePlayPauseButton(newStatus);
			}
			
			function startAutoplay(immediate)
			{
				var delay = container.find('.slider input').slider("getValue").val() || DEFAULT_VALUE;
				start(
					delay * 1000, 
					immediate
				);
			}
			
			//
			// Container display on Desktop
			//
			
			function activateContainer()
			{
				var now = Date.now();
				
				// Debounce container show
				if ( _mouseMoveTime > Date.now() - 150 ) {
					container.removeClass('fade');
				}
				
				_mouseMoveTime = now;
			}
			
			function desactivateContainer()
			{
				if ( ! _isHoverWidget && Date.now() > _mouseMoveTime + FADE_DELAY ) {
					container.addClass('fade');
				}
			}
			
			//
			// Init
			//
			
			function initEvents()
			{
				container.find(".btn-play-container").click(onPlayPauseClick);
				
				// Slider
				container.find('.slider-container input').slider({
					min: 5,
					max: 60,
					value: DEFAULT_VALUE,
					formater: function(value) {
						return value + 's';
					}
				});
				
				// Slider change
				container.find('.slider-container input').on('slideStop', function() {
					if ( isPlaying() ) {
						startAutoplay(false);
					}
				});
				
				//
				// Container fade
				//
				
				if ( ! has("touch") ) {
					_mouseMoveTime = Date.now();
					
					container.hover(
						function() {
							_isHoverWidget = true;
						},
						function() {
							_isHoverWidget = false;
							desactivateContainer();
						}
					);
					
					$(window).mousemove(activateContainer);
					setInterval(desactivateContainer, 1000);
				}
			}
		};
	}
);