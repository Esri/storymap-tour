define(["storymaps/maptour/core/MapTourHelper", "dojo/topic", "dojo/has", "dojo/debounce"],
	function(MapTourHelper, topic, has, debounce)
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

			// Sroll Layout
			var scrollEventTracking = {
				previousScrollTop: 0,
				scrollDelta: 0,
				controlsVisible: true,
				rateLimit: true
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
				iscroll && iscroll.destroy();
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

				if( iscroll && iscroll.maxScrollY == 1 )
					iscroll.refresh();

				if ( iscroll && iscroll.maxScrollY < 0) {
					var newY = Math.min(app.data.getCurrentIndex() * ITEM_HEIGHT, - iscroll.maxScrollY);
					iscroll.scrollTo(0, -newY);
					iscroll.refresh();
				}
			};

			function render(slides)
			{
        // Mobile Layout Scroll
        var createMobileScrollList = function () {

					if (app.data.webAppData && app.data.webAppData.getFirstRecordAsIntro && !app.data.webAppData.getFirstRecordAsIntro()) {
						$('#mobile-scroll-story-content').append(
							'<div class="title-content text-wrapper">'
							+ '<h1 class="tour-title">' + app.data.webAppData.getTitle() + '</h1>'
							// + (app.data.webAppData.getSubtitle()
							// ? '<h2 class="tour-subtitle">' + app.data.webAppData.getSubtitle() + '</h2>' : '')
							+ '</div>'
						);
					}

					var getColorClass = function(color) {
						if(typeof color != "string")
							color = "r";
						var colorString = color.toLowerCase();
						switch (colorString) {
							case 'b':
								return 'blue';
							case 'g':
								return 'green';
							case 'p':
								return 'purple';
							default:
								return 'red';
						}
					};

					if( $("body").hasClass("mobile-layout-scroll") ) {
						for (var i = 0; i < slides.length; i++) {
							var feature = slides[i];
							var videoSrc = (i === 0 || i == 1) ? feature.attributes.getURL() : "";
							var tpEl = $('<div class="tour-point-content">'
									+'<div class="media">'
										+ (! feature.attributes.isVideo() && MapTourHelper.mediaIsSupportedImg(feature.attributes.getURL())
										? '<img src="' + feature.attributes.getURL() + '" />'
										: '<iframe class="mobile-layout-scroll-video" src="' + videoSrc + '"></iframe>')
									+ '</div>'
									+ '<div class="text-wrapper">'
										+ '<table>'
											+ '<tr>'
												+ '<td><p class="tpNumberScroll ' + getColorClass(feature.attributes.getColor()) + '">' + (i + 1) +'</p></td>'
												+ '<td><h2 class="tpNameScroll">' + feature.attributes.getName() +'</h2></td>'
											+ '</tr>'
										+ '</table>'
										+ '<p class="tpDescriptionScroll">' + feature.attributes.getDescription() +'</p>'
									+ '</div>'
								+ '</div>');

							$('#mobile-scroll-story-content').append(tpEl);

							$('.mobile-layout-scroll-video').css({
								height: $('.mobile-layout-scroll-video').outerWidth() * (1/(16/9))
							});
						}
					}

					$('body').append('<button type="button" id="mobile-scroll-top-btn" class="reset-btn icon-up-open-big back-to-top hidden"></button>');
				};


        // Classic List
        var createClassicList = function() {
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
				};

				if( $("body").hasClass("side-panel") ) {
					createMobileScrollList();
				} else {
					createClassicList();
				}
			}

			function selectFromScrollPositionPhase1()
			{
				var tpElements = document.querySelectorAll('#mobile-scroll-story-content .tour-point-content');
				var selectedIndex = app.data.getCurrentIndex();

				if (scrollEventTracking.previousScrollTop <= tpElements[0].offsetTop) {
					selectedIndex = 0;
				} else {
					for (var i = 0; i < tpElements.length; i++) {
						if (selectFromScrollPositionPhase2(tpElements[i])) {
							selectedIndex = i;
						}
					}
				}

				scrollEventTracking.selectedIndex = selectedIndex;
				topic.publish("SELECT_BY_SCROLL", selectedIndex);
			}

			function selectFromScrollPositionPhase2(el)
			{
				var threshold = 20;

				if (
					el.offsetTop - scrollEventTracking.previousScrollTop <= threshold
				) {
					return true;
				} else if (
					el.offsetTop > scrollEventTracking.previousScrollTop + threshold
					&& (scrollEventTracking.previousScrollTop + scrollEventTracking.containerHeight + threshold)
					>= (el.offsetTop + el.offsetHeight)
				) {
					return true;
				} else {
					return false;
				}
			}

			function goToTop()
			{
				scrollEventTracking.controlsVisible = true;
				$('#headerMobile').removeClass('hidden');
				$('#mobile-scroll-top-btn').addClass('hidden');
				scrollEventTracking.goToTop = true;
				topic.publish("SELECT_BY_SCROLL", 0);

				if (app.data.getIntroData()) {
					// Show introPanel
					$("#introPanel").show();
					$("#introPanel").addClass('showing-intro');
					setTimeout(function() {
						$("#introPanel").removeClass('showing-intro');
					}, 600);
				}
			}

			function initEvents()
			{
        // Scroll Layout
				$(window).on('resize', function() {
					$('.mobile-layout-scroll-video').css({
						height: $('.mobile-layout-scroll-video').outerWidth() * (1/(16/9))
					});

					scrollEventTracking.containerHeight = $('#mobile-scroll-story-content').outerHeight();
				});

				scrollEventTracking.containerHeight = $('#mobile-scroll-story-content').outerHeight();
				topic.subscribe("maptour-point-change-before", function(oldIndex, newIndex){
					if ($('body').hasClass('mobile-layout-scroll') && scrollEventTracking.selectedIndex !== newIndex) {
						scrollEventTracking.selectedIndex = newIndex;
						$("#mobile-scroll-story-content").animate({
							scrollTop: scrollEventTracking.goToTop ? 0 : document.querySelectorAll('#mobile-scroll-story-content .tour-point-content')[newIndex].offsetTop
						});
						scrollEventTracking.goToTop = false;
					}
				});

				$('#mobile-scroll-top-btn').on('click', goToTop);

				var dbSelectFromScrollPositionPhase1 = debounce(selectFromScrollPositionPhase1,100);
				document.querySelector('#mobile-scroll-story-content').addEventListener('scroll', function() {
					toggleMobileHeaderAndControls();
					dbSelectFromScrollPositionPhase1();
				});

        // Classic
				$(selector).click(onUserClick);
				topic.subscribe("CORE_SELECTED_TOURPOINT_UPDATE", updateItem);
			}

			function toggleMobileHeaderAndControls()
			{
				var scrollDeltaThreshold = 20;
				var currentScrollTop = document.querySelector('#mobile-scroll-story-content').scrollTop;
				scrollEventTracking.direction = (currentScrollTop > scrollEventTracking.previousScrollTop) ? 'down' : 'up';
				scrollEventTracking.previousScrollTop = currentScrollTop;

				if (currentScrollTop === 0) {
					scrollEventTracking.controlsVisible = true;
					$('#headerMobile').removeClass('hidden');
					$('#mobile-scroll-top-btn').addClass('hidden');
				} else if (scrollEventTracking.direction === 'down'
					&& scrollEventTracking.controlsVisible === true
					&& scrollEventTracking.scrollDelta > scrollDeltaThreshold) {
					scrollEventTracking.controlsVisible = false;
					$('#headerMobile').addClass('hidden');
					$('#mobile-scroll-top-btn').addClass('hidden');
				} else if  (scrollEventTracking.direction === 'up'
					&& scrollEventTracking.controlsVisible === false
					&& scrollEventTracking.scrollDelta < -scrollDeltaThreshold) {
					scrollEventTracking.controlsVisible = true;
					$('#headerMobile').removeClass('hidden');
					$('#mobile-scroll-top-btn').removeClass('hidden');
				} else if (scrollEventTracking.direction === 'down') {
					if (scrollEventTracking.scrollDelta < 0) {
						scrollEventTracking.scrollDelta = 0;
					}
					++scrollEventTracking.scrollDelta;
				} else {
					if (scrollEventTracking.scrollDelta > 0) {
						scrollEventTracking.scrollDelta = 0;
					}
					--scrollEventTracking.scrollDelta;
				}
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
