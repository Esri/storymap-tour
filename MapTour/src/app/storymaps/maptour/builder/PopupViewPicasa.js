define(["storymaps/utils/PicasaConnector", "dojo/Deferred"], 
	function (PicasaConnector, Deferred) {
		return function PopupViewPicasa() 
		{
			$('#init-import-views').append($('#popupViewPicasa').clone());
			var _container = $('.popupViewPicasa').last();
			var _picasa = null;
			var _footer = null;
			
			var _nbPicturesMax = -1;
			var _nbPicturesAuthorized = -1;
			
			this.init = function(params, initCompleteDeferred, footer)
			{
				_picasa = new PicasaConnector();
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
				
				_picasa.getAlbum(_container.find("#picasaListAlbum").val(), _nbPicturesAuthorized).then(function(data){
					if( ! data.length ) {
						updateFooter("error");
						return;
					}
					
					nextViewDeferred.resolve({
						name: 'geotag',
						params: {
							data: data
						}
					});
				});
				return nextViewDeferred;
			};
			
			function showView(params)
			{
				if (! params || ! params.isReturning) {
					disableNextBtn();
					disableList();
					if( ! _container.find(".selectUserName").val() )
						_container.find('.btn-userLogin').attr("disabled", "disabled");
				}
				
				// Restore tne next button text
				if( params.isReturning ) {
					/*if( _container.find("#flickrListTag option:selected").index() )
						_footer.find('.btnNext').html(i18n.viewer.viewFlickr.footerImportTag);
					else
						_footer.find('.btnNext').html(i18n.viewer.viewFlickr.footerImportSet);*/
				}
				
				_container.find(".commonHeader").html(
					i18n.viewer.onlinePhotoSharingCommon.header1 
					+ ' ' 
					+ i18n.viewer.onlinePhotoSharingCommon.header2.replace('%NB1%', _nbPicturesAuthorized).replace('%NB2%', _nbPicturesMax)
				);
				updateFooter();
			}
			
			function lookup()
			{
				var userName = _container.find(".selectUserName").val(); 
				_container.find(".signInMsg").removeClass('error').html(i18n.viewer.onlinePhotoSharingCommon.userLookingup + ' <img src="resources/icons/loader-upload.gif" />');
				disableList();
				disableNextBtn();
				updateFooter();
				
				_picasa.getAlbums(userName).then(
					function(data){
						var outHtml = "<option value='' style='display:none;' disabled selected>" + i18n.viewer.onlinePhotoSharingCommon.pleaseChoose + "</option>";
						$.each(data, function(i, album){
							outHtml += '<option value="' + album.url + '">' + album.title + '</option>';
						});
						_container.find("#picasaListAlbum").html(outHtml);
						_container.find("#picasaListAlbum").removeAttr("disabled");
						_container.find(".signInMsg").html("");
					},
					function() {
						_container.find(".signInMsg").addClass('error').html(i18n.viewer.viewFlickr.signInMsg2);
					}
				);				
			}
			
			function initEvents()
			{
				_container.find('.btn-userLogin').click(lookup);
				_container.find(".selectUserName").keyup(function(){
					if( $(this).val() )
						_container.find('.btn-userLogin').removeAttr("disabled");
					else
						_container.find('.btn-userLogin').attr("disabled", "disabled");
				});
				
				_container.find("#picasaListAlbum").change(function(){ 
					var btnNext = _footer.find('.btnNext');
					btnNext.removeAttr("disabled");
					updateFooter();
				});
				
				// iPad keyboard workaround
				_container.find('.selectUserName').blur(function(){ $(window).scrollTop(0); });
			}
			
			function disableList()
			{
				_container.find("#picasaListAlbum").attr("disabled", "disabled");
				_container.find("#picasaListAlbum").html("");
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
				_container.find('.header').append(i18n.viewer.viewPicasa.header);
				_container.find('.selectUserName').attr("placeholder", i18n.viewer.viewPicasa.userInputLbl);
				_container.find('.btn-userLogin').html(i18n.viewer.onlinePhotoSharingCommon.userLookup);
				_container.find('.control-label[for="picasaListAlbum"]').html(i18n.viewer.onlinePhotoSharingCommon.selectAlbum);
				_container.find('.howToFind a').html(i18n.viewer.viewPicasa.howToFind);
				
				_container.find('.howToFind a').popover({
					trigger: 'hover',
					placement: 'top',
					html: true,
					content: '<script>'
								+ ' $(".howToFind a").next(".popover").addClass("howToFind-popover");'
								+ '</script>'
								+ '<div style="text-align: center">' 
								+   i18n.viewer.viewPicasa.howToFind2
								+   '<img style="margin-top: 6px" src="resources/icons/builder-import-tooltip-picasa.png" width="350px" height="144px"/>'
								+ '</div>' 
				});
				
				initEvents();
			};
		};
	}
);