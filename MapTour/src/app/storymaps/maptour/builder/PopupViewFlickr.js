define(["storymaps/utils/FlickrConnector", "dojo/Deferred"], 
	function (FlickrConnector, Deferred) {
		return function PopupViewFlickr() 
		{
			$('#init-import-views').append($('#popupViewFlickr').clone());
			var _container = $('.popupViewFlickr').last();
			var _flickr = null;
			var _footer = null;
			
			var _nbPicturesMax = -1;
			var _nbPicturesAuthorized = -1;
			
			this.init = function(params, initCompleteDeferred, footer)
			{
				_flickr = new FlickrConnector(params.apiKey);
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
				var pictureRqHandler = function(data){
					if( ! data.length ) {
						updateFooter("error");
						return;
					}
					
					if( ! _container.find(".useLocation input").is(":checked") ) {
						$.each(data, function(i, pic){
							pic.lat = '';
							pic.lng = '';
						});
					}
					
					nextViewDeferred.resolve({
						name: 'geotag',
						params: {
							data: data
						}
					});
				};
				
				_footer.find('.btnNext').attr("disabled", "disabled");
				
				if( _container.find("#flickrListSet").find(":selected").attr("disabled") )
					_flickr.getPicturesByTag(
						_container.find("#flickrListTag").val(), 
						{
							per_page: _nbPicturesAuthorized
						}
					).then(pictureRqHandler);
				else 
					_flickr.getPicturesInSet(
						_container.find("#flickrListSet").val(),
						{
							per_page: _nbPicturesAuthorized
						}
					).then(pictureRqHandler);
					
				return nextViewDeferred;
			};
			
			function showView(params)
			{
				if (! params || ! params.isReturning) {
					_container.find(".useLocation input").attr("checked", "checked");
					if( ! _container.find(".selectUserName").val() )
						_container.find('.btn-userLogin').attr("disabled", "disabled");
					disableNextBtn();
					disableLists();
				}
				
				// TODO: buggy when a set and a tag has been selected and return from geotag screen
				// Restore the next button text
				if( params.isReturning ) {
					if( _container.find("#flickrListTag option:selected").index() )
						_footer.find('.btnNext').html(i18n.viewer.viewFlickr.footerImportTag);
					else
						_footer.find('.btnNext').html(i18n.viewer.viewFlickr.footerImportSet);
				}
				
				_container.find(".commonHeader").html(
					i18n.viewer.onlinePhotoSharingCommon.header1 
					+ ' ' 
					+ i18n.viewer.onlinePhotoSharingCommon.header2.replace('%NB1%', _nbPicturesAuthorized).replace('%NB2%', _nbPicturesMax)
				);
				updateFooter();
			}
			
			function login()
			{
				var userName = _container.find(".selectUserName").val(); 
				_container.find(".signInMsg").removeClass('error').html(i18n.viewer.onlinePhotoSharingCommon.userLookingup + ' <img src="resources/icons/loader-upload.gif" />');
				disableLists();
				disableNextBtn();
				updateFooter();
				
				_flickr.connect(userName).then(
					function(data){
						// Sets
						var outHtml = "<option value='' style='display:none;' disabled selected>" + i18n.viewer.onlinePhotoSharingCommon.pleaseChoose + "</option>";
						$.each(data.sets, function(i, set){
							outHtml += '<option value="' + set.id + '">' + set.title._content + ' (' + set.photos + ')</option>';
						});
						_container.find("#flickrListSet").html(outHtml);
						
						// Tags
						outHtml = "<option value='' style='display:none;' disabled selected>" + i18n.viewer.onlinePhotoSharingCommon.pleaseChoose + "</option>";
						$.each(data.tags, function(i, tag){
							outHtml += '<option value="' + tag._content + '">' + tag._content + '</option>';
						});
						_container.find("#flickrListTag").html(outHtml);
						
						_container.find("#flickrListSet, #flickrListTag").removeAttr("disabled");
						_container.find(".signInMsg").html("");
					},
					function(){
						_container.find(".signInMsg").addClass('error').html(i18n.viewer.viewFlickr.signInMsg2);
					}
				);
			}
			
			function initEvents()
			{
				_container.find('.btn-userLogin').click(login);
				_container.find(".selectUserName").keyup(function(){
					if( $(this).val() )
						_container.find('.btn-userLogin').removeAttr("disabled");
					else
						_container.find('.btn-userLogin').attr("disabled", "disabled");
				});
				
				_container.find("#flickrListSet").change(function(){ 
					selectChange(
						_container.find("#flickrListSet"), 
						_container.find("#flickrListTag"),
						i18n.viewer.viewFlickr.footerImportSet
					);
				});
				
				_container.find("#flickrListTag").change(function(){ 
					selectChange(
						_container.find("#flickrListTag"), 
						_container.find("#flickrListSet"),
						i18n.viewer.viewFlickr.footerImportTag
					);
				});
				
				// iPad keyboard workaround
				_container.find('.selectUserName').blur(function(){ $(window).scrollTop(0); });
			}
			
			function selectChange(select, otherSelect, nextBtn)
			{
				otherSelect.find("option:nth-child(1)").attr("selected", "selected");
				otherSelect.focus();
				select.focus();
				
				var btnNext = _footer.find('.btnNext');
				btnNext.html(nextBtn);
				btnNext.removeAttr("disabled");
				updateFooter();
			}
			
			function disableLists()
			{
				_container.find("#flickrListSet, #flickrListTag").attr("disabled", "disabled");
				_container.find("#flickrListSet").html("");
				_container.find("#flickrListTag").html("");
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
				_container.find('.header').append(i18n.viewer.viewFlickr.header);
				_container.find('.selectUserName').attr("placeholder", i18n.viewer.viewFlickr.userInputLbl);
				_container.find('.btn-userLogin').html(i18n.viewer.onlinePhotoSharingCommon.userLookup);
				_container.find('.control-label[for="flickrListSet"]').html(i18n.viewer.viewFlickr.selectSet);
				_container.find('.control-label[for="flickrListTag"]').html(i18n.viewer.viewFlickr.selectTag);
				
				_container.find('.useLocation span').html(
					i18n.viewer.onlinePhotoSharingCommon.locUse 
					+ '<a><img src="resources/icons/builder-help.png" style="vertical-align: -4px;"/><a>'
				);
				_container.find('.useLocation a').popover({
					trigger: 'hover',
					placement: 'top',
					html: true,
					content: '<script>$(".useLocation a").next(".popover").css("width", "350px");</script>'
								+ i18n.viewer.onlinePhotoSharingCommon.locExplain
				});
				
				initEvents();
			};
		};
	}
);