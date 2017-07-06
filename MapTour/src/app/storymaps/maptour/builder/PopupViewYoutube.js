define(["storymaps/utils/YoutubeConnector", "storymaps/maptour/core/MapTourHelper", "dojo/Deferred", "dojo/_base/lang"], 
	function (YoutubeConnector, MapTourHelper, Deferred, lang) {
		return function PopupViewYoutube() 
		{
			$('#init-import-views').append($('#popupViewYoutube').clone());
			var _container = $('.popupViewYoutube').last();
			_container.attr("id", '#popupViewYoutube' + $('.popupViewYoutube').length);
			
			var _youtube = null;
			var _footer = null;
			
			var _data = null;
			
			var _nbPicturesMax = -1;
			var _nbPicturesAuthorized = -1;
			
			this.init = function(params, initCompleteDeferred, footer)
			{
				_youtube = new YoutubeConnector();
				_footer = footer;
				
				_nbPicturesMax = params.nbPicturesMax;
				_nbPicturesAuthorized = params.nbPicturesAuthorized;
			};
			
			this.getView = function(params)
			{
				if( params )
					showView(params);
				return _container;
			};
			
			this.getNextView = function()
			{
				var nextViewDeferred = new Deferred();
				
				var data = lang.clone(_data);
				
				nextViewDeferred.resolve({
					name: 'geotag',
					params: {
						data: data
					}
				});
				
				return nextViewDeferred;
			};
			
			this.getTitle = function()
			{
				return i18n.viewer.viewYoutube.title;
			};
			
			function showView(params)
			{	
				if( _data )
					enableNextBtn();
				else
					disableNextBtn();
					
				if( params.isReturning )
					_footer.find('.btnNext').html(i18n.viewer.onlinePhotoSharingCommon.footerImport);
				
				_container.find(".commonHeader").html(i18n.viewer.onlinePhotoSharingCommon.header2.replace('%NB1%', _nbPicturesAuthorized).replace('%NB1%', _nbPicturesAuthorized).replace('%MEDIA%', i18n.viewer.onlinePhotoSharingCommon.videos).replace('%NB2%', _nbPicturesMax));
			}
			
			function lookupUser()
			{
				var userName = _container.find(".selectUserName").val(); 
				_container.find(".lookingUpMsg").removeClass('error').html(i18n.viewer.onlinePhotoSharingCommon.userLookingup + ' <img src="resources/icons/loader-upload.gif" />');
				disableNextBtn();
				
				_youtube.getUserVideos(userName, _nbPicturesAuthorized).then(
					function(data){
						_data = data;
						
						if( ! data || ! data.length ) {
							disableNextBtn();
							_container.find(".lookingUpMsg").addClass('error').html(i18n.viewer.viewYoutube.noData);
							return;
						}
						
						// Edit video URLs
						$.each(_data, function(i, video) {
							// Add wmode if needed
							video.pic_url = MapTourHelper.checkVideoURL(video.pic_url);
							// Add #isVideo if the layer don't have the is_video attribute
							if ( ! app.data.layerHasVideoField() && ! app.isDirectCreationFirstSave && ! app.isGalleryCreation )
								video.pic_url = MapTourHelper.addIsVideoToURL(video.pic_url);
						});
						
						_container.find(".lookingUpMsg").html(
							i18n.viewer.viewYoutube.found 
							+ ' ' + data.length 
							+ ' ' + i18n.viewer.onlinePhotoSharingCommon.videos);
							
						enableNextBtn();
					},
					function(){
						disableNextBtn();
						_container.find(".lookingUpMsg").addClass('error').html(i18n.viewer.viewYoutube.lookupMsgError);
					}
				);
			}
			
			function initEvents()
			{
				_container.find('.btn-userLookup').click(lookupUser);
				_container.find(".selectUserName").keyup(function(){
					_container.find(".lookingUpMsg").html('');
					disableNextBtn();
					
					if( $(this).val() )
						_container.find('.btn-userLookup').removeAttr("disabled");
					else
						_container.find('.btn-userLookup').attr("disabled", "disabled");
				});
				
				// iPad keyboard workaround
				_container.find('.selectUserName').blur(function(){ $(window).scrollTop(0); });
			}
			
			function disableNextBtn()
			{
				var btnNext = _footer.find('.btnNext');
				btnNext.html(i18n.viewer.onlinePhotoSharingCommon.footerImport);
				btnNext.attr("disabled", "disabled");
			}
			
			function enableNextBtn()
			{
				var btnNext = _footer.find('.btnNext');
				btnNext.removeAttr("disabled");
			}
			
			this.initLocalization = function()
			{
				_container.find('.header').append(i18n.viewer.viewYoutube.header);
				_container.find('.selectUserName').attr("placeholder", i18n.viewer.viewYoutube.pageInputLbl);
				
				_container.find('.howToFind a').html(i18n.viewer.viewYoutube.howToFind);
				_container.find('.howToFind a').popover({
					trigger: 'hover',
					placement: 'top',
					html: true,
					content: '<script>'
								+ ' $(".howToFind a").next(".popover").addClass("howToFind-popover");'
								+ '</script>'
								+ '<div style="font-weight: bold">' 
								+   i18n.viewer.viewYoutube.howToFind2
								+   '<img style="margin-top: 6px" src="resources/icons/builder-import-tooltip-youtube.png" width="291px" height="61px"/>'
								+ '</div>' 
				});
				
				initEvents();
			};
		};
	}
);