define(["storymaps/maptour/builder/ImportPopupViewHome",
		"storymaps/maptour/builder/PopupViewFlickr",
		"storymaps/maptour/builder/PopupViewFacebook",
		"storymaps/maptour/builder/PopupViewPicasa",
		"storymaps/maptour/builder/PopupViewYoutube",
		"storymaps/maptour/builder/PopupViewCSV",
		"storymaps/maptour/builder/PopupViewGeoTag",
		"dojo/Deferred"], 
	function (
		ImportPopupViewHome, 
		PopupViewFlickr, 
		PopupViewFacebook, 
		PopupViewPicasa, 
		PopupViewYoutube,
		PopupViewCSV, 
		PopupViewGeoTag,
		Deferred
	){
		return function ImportPopup(container) 
		{
			var _views = {
				home: new ImportPopupViewHome(),
				Flickr: new PopupViewFlickr(),
				Facebook: new PopupViewFacebook(),
				Picasa: new PopupViewPicasa(),
				Youtube: new PopupViewYoutube(),
				CSV: new PopupViewCSV(container),
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
				var footer = container.find('.modal-footer');
				var importCompleteDeferred = new Deferred();
				
				$(".modal-header .close", container).attr("data-dismiss", "modal");

				_views.home.init(footer);
				_views.CSV.init(params.CSV, importCompleteDeferred, footer);
				_views.Flickr.init(params.Flickr, importCompleteDeferred, footer);
				_views.Facebook.init(params.Facebook, importCompleteDeferred, footer);
				_views.Picasa.init(params.Picasa, importCompleteDeferred, footer);
				_views.Youtube.init(params.Youtube, importCompleteDeferred, footer);
				_views.geotag.init(params.geotag, importCompleteDeferred, footer);
				
				displayView('home');
				container.modal({keyboard: true});
				
				return importCompleteDeferred;
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
				displayView(_viewsNameStack.pop(), {isReturning: true});
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