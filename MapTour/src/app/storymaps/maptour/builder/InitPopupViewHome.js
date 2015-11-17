define(["dojo/has"], 
	function (has) {
		return function InitPopupViewHome() 
		{
			var _container =  $('#initPopupViewHome');
			var _selectedView = "";
			var _footer = null;

			_container.find('.btn-select-flickr').click(function(){ select("Flickr", this); });
			_container.find('.btn-select-fb').click(function(){ select("Facebook", this); });
			_container.find('.btn-select-picasa').click(function(){ select("Picasa", this); });
			_container.find('.btn-select-youtube').click(function(){ select("Youtube", this); });
			_container.find('.btn-select-advanced').click(function(){ select("advanced", this); });
			_container.find('.btn-select-hostedFS').click(function(){ select("hostedFS", this); });
			
			this.init = function(params, initCompleteDeferred, footer)
			{
				_footer = footer;
				
				var errMsg = i18n.viewer.initPopupHome.hostedFsNA;
				
				// Public account
				if ( ! app.isPortal && ! app.portal.getPortalUser().orgId ) {
					errMsg = i18n.viewer.initPopupHome.hostedFsNA2.replace('%LINK%', "http://links.esri.com/storymaps/agol_trial_subscription' target='_blank'");
				}
				
				_container.find('.hostedFsNote').html(errMsg);
				
				if (APPCFG.AUTHORIZED_IMPORT_SOURCE) {
					if (!APPCFG.AUTHORIZED_IMPORT_SOURCE.featureService) {
						errMsg = i18n.viewer.onlinePhotoSharingCommon.disabled;
						if ( app.isPortal && ! app.portal.supportsSceneServices ) {
							errMsg = i18n.viewer.onlinePhotoSharingCommon.disabledPortal;
						} 
						
						_container.find('.btn-select-hostedFS img').parent().addClass("disabled");
						_container.find('.hostedFsNote').html(errMsg).show();
						_container.find('.btn-select-hostedFS').unbind('click');
						
					}
				}
				
				if (!has("touch")) {
					_container.find('.btn-select-hostedFS').popover({
						trigger: 'hover',
						placement: 'top',
						html: true,
						content: i18n.viewer.initPopupHome.hostedFSTooltip,
						container: '.popover-init'
					});
				}
			};
					
			this.getView = function()
			{
				if( ! app.data.userIsOrgaPublisher() || (! app.data.userIsAppOwner() && ! app.isDirectCreation) ){
					$(".btn-select-hostedFS").addClass("disabled");
					$(".notAvailable").css("display", "block");
				}
				_footer.find('.btnNext').attr("disabled", "disabled").html(i18n.viewer.onlinePhotoSharingCommon.select);
				
				if ( app.isPortal && APPCFG.YOUTUBE_DISABLE_ON_PORTAL ) { 
					_container.find('.btn-select-youtube').addClass("disabled").unbind('click');
					_container.find('.btn-select-youtube').popover('destroy').popover({
						trigger: 'hover',
						placement: 'top',
						html: true,
						content: i18n.viewer.onlinePhotoSharingCommon.disabled,
						container: '.popover-init'
					});
				}
				
				return _container;
			};
			
			this.getNextView = function()
			{
				return _selectedView;
			};
			
			this.getTitle = function()
			{
				return i18n.viewer.initPopup.title + ' <a class="initHeaderTooltip"><img src="resources/icons/builder-help2.png" style="width: 14px; vertical-align: -1px;"/></a>';
			};
			
			function select(selectedView, target)
			{
				if( $(target).hasClass("disabled") )
					return;
				
				_selectedView = selectedView;
				_footer.find('.btnNext').click();
			}
			
			this.initLocalization = function()
			{
				_container.find('.header').append(i18n.viewer.initPopupHome.header1);
				
				_container.find('.sideTitle1').append(i18n.viewer.initPopupHome.title1);
				_container.find('.sideTitle2').append(i18n.viewer.initPopupHome.title2);

				_container.find('.footer').append("<a data-href='#' onClick='app.builder.openHelpPopup(1)'>" + i18n.viewer.initPopupHome.footer5 + "</a>");
				
				_container.find('.btn-select-flickr img').attr('src', 'resources/icons/builder-import-flickr.png');
				_container.find('.btn-select-fb img').attr('src', 'resources/icons/builder-import-facebook.png');
				_container.find('.btn-select-picasa img').attr('src', 'resources/icons/builder-import-picasa.png');
				_container.find('.btn-select-youtube img').attr('src', 'resources/icons/builder-import-youtube.png');
				_container.find('.btn-select-advanced img').attr('src', 'resources/icons/builder-import-scratch.png');
				_container.find('.btn-select-hostedFS img').attr('src', 'resources/icons/builder-import-arcgis.png');
				
				if (!APPCFG.AUTHORIZED_IMPORT_SOURCE.flickr)
					_container.find('.btn-select-flickr').addClass("disabled").unbind('click');
				if (!APPCFG.AUTHORIZED_IMPORT_SOURCE.facebook) 
					_container.find('.btn-select-fb').addClass("disabled").unbind('click');
				if (!APPCFG.AUTHORIZED_IMPORT_SOURCE.picasa)
					_container.find('.btn-select-picasa').addClass("disabled").unbind('click');
				if (!APPCFG.AUTHORIZED_IMPORT_SOURCE.youtube) 
					_container.find('.btn-select-youtube').addClass("disabled").unbind('click');
				
				if (!has("touch") || !APPCFG.AUTHORIZED_IMPORT_SOURCE.flickr) {
					_container.find('.btn-select-flickr').popover({
						trigger: 'hover',
						placement: 'top',
						html: true,
						content: APPCFG.AUTHORIZED_IMPORT_SOURCE.flickr ? 'Flickr' : i18n.viewer.onlinePhotoSharingCommon.disabled,
						container: '.popover-init'
					});
				}
				
				if (!has("touch") || !APPCFG.AUTHORIZED_IMPORT_SOURCE.facebook) {
					_container.find('.btn-select-fb').popover({
						trigger: 'hover',
						placement: 'top',
						html: true,
						content: APPCFG.AUTHORIZED_IMPORT_SOURCE.facebook ? 'Facebook' : i18n.viewer.onlinePhotoSharingCommon.disabled,
						container: '.popover-init'
					});
				}
				
				if (!has("touch") || !APPCFG.AUTHORIZED_IMPORT_SOURCE.picasa) {
					_container.find('.btn-select-picasa').popover({
						trigger: 'hover',
						placement: 'top',
						html: true,
						content: APPCFG.AUTHORIZED_IMPORT_SOURCE.picasa ? 'Picasa' : i18n.viewer.onlinePhotoSharingCommon.disabled,
						container: '.popover-init'
					});
				}
				
				if (!has("touch") || !APPCFG.AUTHORIZED_IMPORT_SOURCE.youtube) {
					_container.find('.btn-select-youtube').popover({
						trigger: 'hover',
						placement: 'top',
						html: true,
						content: APPCFG.AUTHORIZED_IMPORT_SOURCE.youtube ? 'YouTube' : i18n.viewer.onlinePhotoSharingCommon.disabled,
						container: '.popover-init'
					});
				}
				
				if (!has("touch")) {
					_container.find('.btn-select-advanced').popover({
						trigger: 'hover',
						placement: 'top',
						html: true,
						content: i18n.viewer.onlinePhotoSharingCommon.advanced,
						container: '.popover-init'
					});
				}
			};
		};
	}
);