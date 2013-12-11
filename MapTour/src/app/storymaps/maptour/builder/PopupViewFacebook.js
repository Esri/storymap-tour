define(["storymaps/utils/FacebookConnector", "dojo/Deferred"], 
	function (FacebookConnector, Deferred) {
		return function PopupViewFacebook() 
		{
			$('#init-import-views').append($('#popupViewFacebook').clone());
			var _container = $('.popupViewFacebook').last();
			_container.attr("id", '#popupViewFacebook' + $('.popupViewFacebook').length);
			
			var _facebook = null;
			var _footer = null;
			
			var _nbPicturesMax = -1;
			var _nbPicturesAuthorized = -1;
			
			this.init = function(params, initCompleteDeferred, footer)
			{
				_facebook = new FacebookConnector(params.appId);
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
				
				var pictureRqHandler = function(data, title){
					if( ! data.length ) {
						updateFooter("error");
						return;
					}
					
					nextViewDeferred.resolve({
						name: 'geotag',
						params: {
							title: title,
							data: data
						}
					});
				};
				
				if( _container.find("#facebookListAlbum1").find(":selected").index() >= 1)
					_facebook.getAlbum(
						_container.find("#facebookListAlbum1").val(), 
						true, 
						_nbPicturesAuthorized
					).then(function(data){
						var albumTitle = _container.find("#facebookListAlbum1 option:selected").text();
						albumTitle = albumTitle.split(/\ \([0-9]+\)/)[0];
						
						pictureRqHandler(data, albumTitle);
					});
				else 
					_facebook.getPageAlbum(
						_container.find("#facebookListAlbum2").val(), 
						_nbPicturesAuthorized, 
						true, 
						true
					).then(function(data){
						var albumTitle = _container.find("#facebookListAlbum2 option:selected").text();
						albumTitle = albumTitle.split(/\ \([0-9]+\)/)[0];
						
						pictureRqHandler(data, albumTitle);
					});
					
				return nextViewDeferred;
			};
			
			this.getTitle = function()
			{
				return i18n.viewer.viewFacebook.title;
			};
			
			function showView(params)
			{
				if (! params || ! params.isReturning) {
					disableNextBtn();
					disableLists();
					if( ! _container.find(".selectPageName").val() )
						_container.find('.btn-pageLookup').attr("disabled", "disabled");
				}
				
				// TODO private list is buggy if the page has been used when returning
				if( ! params.isReturning ) 
					loadUserAlbums();
				else
					_footer.find('.btnNext').html(i18n.viewer.onlinePhotoSharingCommon.footerImport);
				
				_container.find(".commonHeader").html(i18n.viewer.onlinePhotoSharingCommon.header2.replace('%NB1%', _nbPicturesAuthorized).replace('%MEDIA%', i18n.viewer.onlinePhotoSharingCommon.pictures).replace('%NB2%', _nbPicturesMax));
				updateFooter();
			}
			
			function loadUserAlbums()
			{
				var loadAlbums = function() {
					_facebook.getAlbums({ }).then(function(data){
						if( ! data || ! data.length )
							return;
						
						var outHtml = "<option value='' style='display:none;' disabled selected>" + i18n.viewer.onlinePhotoSharingCommon.pleaseChoose + "</option>";
						$.each(data, function(i, album){
							outHtml += '<option value="' + album.id + '">'
										+ album.name 
										+ ' (' + (album.count||0) + ')'
										+ ' - Privacy: ' + album.privacy
										+ '</option>';
						});
						_container.find("#facebookListAlbum1").html(outHtml);
						_container.find("#facebookListAlbum1").removeAttr("disabled");
					});
				};
				
				_facebook.loadApi().then(function(){
					_facebook.onLogout().then(function(){
						_container.find("#facebookListAlbum1").html("");
						_container.find("#facebookListAlbum1").attr("disabled", "disabled");
						loadUserAlbums();
					});
					loadAlbums();
				});
			}
			
			function lookupPage()
			{
				var pageName = _container.find(".selectPageName").val(); 
				_container.find(".lookingUpMsg").removeClass('error').html(i18n.viewer.onlinePhotoSharingCommon.userLookingup + ' <img src="resources/icons/loader-upload.gif" />');
				disableNextBtn();
				updateFooter();
				
				_facebook.getPageAlbums(pageName).then(
					function(data){
						var outHtml = "<option value='' style='display:none;' disabled selected>" + i18n.viewer.onlinePhotoSharingCommon.pleaseChoose + "</option>";
						$.each(data, function(i, album){
							outHtml += '<option value="' + album.id + '">'
										+ album.name 
										+ ' (' + (album.count||0) + ')'
										+ '</option>';
						});

						_container.find(".lookingUpMsg").html("");						
						_container.find("#facebookListAlbum2").removeAttr("disabled").html(outHtml);
						_container.find("#facebookListAlbum2").change();
					},
					function(){
						_container.find(".lookingUpMsg").addClass('error').html(i18n.viewer.viewFacebook.lookupMsgError);
						_container.find("#facebookListAlbum2").html("").attr("disabled", "disabled");
					}
				);
			}
			
			function initEvents()
			{
				_container.find('.btn-pageLookup').click(lookupPage);
				_container.find(".selectPageName").keyup(function(){
					if( $(this).val() )
						_container.find('.btn-pageLookup').removeAttr("disabled");
					else
						_container.find('.btn-pageLookup').attr("disabled", "disabled");
				});
				
				_container.find("#facebookListAlbum1").change(function(){ 
					selectChange(
						_container.find("#facebookListAlbum1"), 
						_container.find("#facebookListAlbum2"),
						i18n.viewer.onlinePhotoSharingCommon.footerImport
					);
				});
				
				_container.find("#facebookListAlbum2").change(function(){ 
					selectChange(
						_container.find("#facebookListAlbum2"), 
						_container.find("#facebookListAlbum1"),
						i18n.viewer.onlinePhotoSharingCommon.footerImport
					);
				});
				
				// iPad keyboard workaround
				_container.find('.selectPageName').blur(function(){ $(window).scrollTop(0); });
			}
			
			function selectChange(select, otherSelect, nextBtn)
			{
				otherSelect.find("option:nth-child(1)").attr("selected", "selected");
				otherSelect.focus();
				select.focus();
				
				if( select.find(":selected").index() ) {
					var btnNext = _footer.find('.btnNext');
					btnNext.html(nextBtn);
					btnNext.removeAttr("disabled");
				}
				
				updateFooter();
			}
			
			function disableLists()
			{
				_container.find("#facebookListAlbum1, #facebookListAlbum2").attr("disabled", "disabled");
				_container.find("#facebookListAlbum1").html("");
				_container.find("#facebookListAlbum2").html("");
			}
			
			function disableNextBtn()
			{
				var btnNext = _footer.find('.btnNext');
				btnNext.html(i18n.viewer.onlinePhotoSharingCommon.footerImport);
				btnNext.attr("disabled", "disabled");
			}
			
			function updateFooter(msg)
			{
				var footerText = _footer.find('.dataFooterText');
				if( msg == "error" )
					footerText.addClass("error").html(i18n.viewer.onlinePhotoSharingCommon.emptyDataset).show();
				else
					footerText.removeClass("error").html("").hide();
			}
			
			this.initLocalization = function()
			{
				_container.find('.header').append(i18n.viewer.viewFacebook.header);
				_container.find('.sideHeader').eq(0).html(i18n.viewer.viewFacebook.leftHeader);
				_container.find('.sideHeader').eq(1).html(i18n.viewer.viewFacebook.rightHeader + '<span style="font-size: 14px;"> <a><img src="resources/icons/builder-help.png" style="vertical-align: -4px;"/></a></span>');
				_container.find('.selectPageName').attr("placeholder", i18n.viewer.viewFacebook.pageInputLbl);
				_container.find('.control-label[for="facebookListAlbum1"]').html(i18n.viewer.onlinePhotoSharingCommon.selectAlbum2);
				_container.find('.control-label[for="facebookListAlbum2"]').html(i18n.viewer.onlinePhotoSharingCommon.selectAlbum);
				
				_container.find('.sideHeader a').popover({
					trigger: 'hover',
					placement: 'left',
					html: true,
					content: '<script>$(".sideHeader a").next(".popover").css("width", "350px");</script>'
								+ '<div style="font-weight: normal;">'
								+ i18n.viewer.viewFacebook.pageExplain
								+ '</div>'
								+ '<img style="margin-top: 6px" src="resources/icons/builder-import-tooltip-facebook.png" width="250px" height="100px"/>'
								
				});
				
				initEvents();
			};
		};
	}
);