define(["storymaps/maptour/builder/InitPopupViewHome",
		"storymaps/maptour/builder/InitPopupViewHostedFSCreation",
		"storymaps/maptour/builder/InitPopupViewAdvanced",
		"storymaps/maptour/builder/PopupViewCSV",
		"storymaps/maptour/builder/PopupViewFlickr",
		"storymaps/maptour/builder/PopupViewFacebook",
		"storymaps/maptour/builder/PopupViewPicasa",
		"storymaps/maptour/builder/PopupViewYoutube",
		"storymaps/maptour/builder/PopupViewGeoTag",
		"dojo/Deferred"], 
	function (
			InitPopupViewHome, 
			InitPopupViewHostedFSCreation, 
			InitPopupViewAdvanced,
			PopupViewCSV,
			PopupViewFlickr,
			PopupViewFacebook,
			PopupViewPicasa,
			PopupViewYoutube,
			PopupViewGeoTag,
			Deferred)
	{
		return function InitPopup(container) 
		{
			var _views = {
				home: new InitPopupViewHome(),
				hostedFS: new InitPopupViewHostedFSCreation($('#initPopupViewHostedFSCreation')),
				advanced: new InitPopupViewAdvanced(),
				Flickr: new PopupViewFlickr(),
				Facebook: new PopupViewFacebook(),
				Picasa: new PopupViewPicasa(),
				CSV: new PopupViewCSV(container),
				Youtube: new PopupViewYoutube(container),
				geotag: new PopupViewGeoTag(container)
			};

			var _currentViewName = null;
			var _viewsNameStack = [];
				
			var _viewContainer = container.find(".modal-body");
			var _btnPrev = container.find(".btnPrev");
			var _btnNext = container.find(".btnNext");
			var _footerText = container.find('.dataFooterText');
			
			this.init = function()
			{
				//
			};
			
			this.present = function(params) 
			{			
				var initCompleteDeferred = new Deferred();
				var footer = container.find('.modal-footer');
				
				_views.home.init(params.home, initCompleteDeferred, footer);
				_views.hostedFS.init(params.hostedFS, initCompleteDeferred, footer);
				_views.advanced.init(params.advanced, initCompleteDeferred, footer);
				_views.CSV.init(params.CSV, initCompleteDeferred, footer);
				_views.Flickr.init(params.Flickr, null, footer);
				_views.Facebook.init(params.Facebook, null, footer);
				_views.Picasa.init(params.Picasa, null, footer);
				_views.Youtube.init(params.Youtube, null, footer);
				_views.geotag.init(params.geotag, initCompleteDeferred, footer);
				
				displayView('home');
				container.modal({keyboard: false});
				
				return initCompleteDeferred;
			};
			
			function displayView(name, params)
			{
				if( ! _views[name] )
					return;
				
				if( _currentViewName != null )
					$('#init-import-views').append(_views[_currentViewName].getView());
				
				_currentViewName = name;
				
				initFooter();
				
				if( _currentViewName != 'home' )
					_btnPrev.show();
				else
					_btnPrev.hide();
				
				container.find('h3').html(_views[_currentViewName].getTitle());
				_viewContainer.html(_views[_currentViewName].getView(params || {}));
				
				if( _currentViewName == "home" ) {
					container.find('.initHeaderTooltip').popover({
						trigger: 'hover',
						placement: 'bottom',
						html: true,
						content: i18n.viewer.initPopupHome.header2
					});
				}
				
				if( _views[_currentViewName].postDisplayCallback )
					_views[_currentViewName].postDisplayCallback();
			}
			
			function initFooter()
			{
				_btnPrev.unbind('click');
				_btnPrev.removeAttr("disabled");
				_btnPrev.html(i18n.viewer.initPopup.prevBtn).show();
				_btnPrev.click(showPrevView);
				
				_btnNext.unbind('click');
				_btnNext.removeAttr("disabled");
				_btnNext.html(i18n.viewer.initPopup.nextBtn).show();
				_btnNext.click(showNextView);
				
				_footerText.removeClass("error");
				_footerText.html("").hide();
			}
			
			function showPrevView()
			{
				displayView(_viewsNameStack.pop(), { isReturning: true});
			}
			
			function showNextView()
			{
				var nextView = _views[_currentViewName].getNextView();
				if (nextView instanceof Deferred) {
					nextView.then(function(view){
						_viewsNameStack.push(_currentViewName);
						displayView(view.name, view.params);
					});
				}
				else {
					_viewsNameStack.push(_currentViewName);
					displayView(nextView);
				}
			}
	
			this.initLocalization = function()
			{
				$.each(_views, function(i, view){
					view.initLocalization();
				});
			};
		};
	}
);