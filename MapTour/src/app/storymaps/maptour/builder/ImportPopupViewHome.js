define(["storymaps/maptour/core/WebApplicationData", "dojo/has"], 
	function (WebApplicationData, has) {
		return function ImportPopupViewHome() 
		{
			var _container =  $('#importPopupViewHome');
			var _footer = null;
			var _selectedView = null;
			
			_container.find('.btn-select-flickr').click(function(){ select("Flickr"); });
			_container.find('.btn-select-fb').click(function(){ select("Facebook"); });
			_container.find('.btn-select-picasa').click(function(){ select("Picasa"); });
			_container.find('.btn-select-youtube').click(function(){ select("Youtube"); });
			_container.find('.btn-select-csv').click(function(){ select("CSV"); });
			
			this.init = function(footer)
			{
				_footer = footer;
			};
			
			this.getView = function()
			{				
				_footer.find('.btnNext').attr("disabled", "disabled").html(i18n.viewer.onlinePhotoSharingCommon.select);
				
				if ( app.isPortal && APPCFG.YOUTUBE_DISABLE_ON_PORTAL ) { 
					_container.find('.btn-select-youtube').addClass("disabled").unbind('click');
					_container.find('.btn-select-youtube').popover('destroy').popover({
						trigger: 'hover',
						placement: 'top',
						html: true,
						content: i18n.viewer.onlinePhotoSharingCommon.disabled,
						container: '.popover-import'
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
				return i18n.viewer.importPopup.title;
			};
			
			function select(selectedView)
			{
				_selectedView = selectedView;
				_footer.find('.btnNext').click();
			}
			
			this.initLocalization = function()
			{
				_container.find('.header').html(i18n.viewer.initPopupHome.header1);
				
				_container.find('.footer').html(
					"<a data-href='#' onClick='app.builder.openHelpPopup(1)'>" + i18n.viewer.initPopupHome.footer5 + "</a>"
					+ " | <a href='https://raw.github.com/Esri/map-tour-storytelling-template-js/master/samples/csv_file__lat_long/Locations.csv' target='_blank' download>" + i18n.viewer.initPopupHome.footer3 + "</a><span style='font-size: 11px'> (" + i18n.viewer.initPopupHome.footer4 + ")</span>"
				);
				
				_container.find('.btn-select-flickr img').attr('src', 'resources/icons/builder-import-flickr.png');
				_container.find('.btn-select-fb img').attr('src', 'resources/icons/builder-import-facebook.png');
				_container.find('.btn-select-picasa img').attr('src', 'resources/icons/builder-import-picasa.png');
				_container.find('.btn-select-youtube img').attr('src', 'resources/icons/builder-import-youtube.png');
				_container.find('.btn-select-csv img').attr('src', 'resources/icons/builder-import-csv.png');
				
				var disableYoutube = ! APPCFG.AUTHORIZED_IMPORT_SOURCE.youtube || WebApplicationData.getDisableVideo();
				
				if (!APPCFG.AUTHORIZED_IMPORT_SOURCE.flickr)
					_container.find('.btn-select-flickr').addClass("disabled").unbind('click');
				if (!APPCFG.AUTHORIZED_IMPORT_SOURCE.facebook)
					_container.find('.btn-select-fb').addClass("disabled").unbind('click');
				if (!APPCFG.AUTHORIZED_IMPORT_SOURCE.picasa)
					_container.find('.btn-select-picasa').addClass("disabled").unbind('click');
				if ( disableYoutube )
					_container.find('.btn-select-youtube').addClass("disabled").unbind('click');
				
				if (! has("touch") || ! APPCFG.AUTHORIZED_IMPORT_SOURCE.flickr) {
					_container.find('.btn-select-flickr').popover({
						trigger: 'hover',
						placement: 'top',
						html: true,
						content: APPCFG.AUTHORIZED_IMPORT_SOURCE.flickr ? 'Flickr' : i18n.viewer.onlinePhotoSharingCommon.disabled,
						container: '.popover-import'
					});
				}
				
				if (!has("touch") || !APPCFG.AUTHORIZED_IMPORT_SOURCE.facebook) {
					_container.find('.btn-select-fb').popover({
						trigger: 'hover',
						placement: 'top',
						html: true,
						content: APPCFG.AUTHORIZED_IMPORT_SOURCE.facebook ? 'Facebook' : i18n.viewer.onlinePhotoSharingCommon.disabled,
						container: '.popover-import'
					});
				}
				
				if (!has("touch") || !APPCFG.AUTHORIZED_IMPORT_SOURCE.picasa) {
					_container.find('.btn-select-picasa').popover({
						trigger: 'hover',
						placement: 'top',
						html: true,
						content: APPCFG.AUTHORIZED_IMPORT_SOURCE.picasa ? 'Picasa' : i18n.viewer.onlinePhotoSharingCommon.disabled,
						container: '.popover-import'
					});
				}
				
				if (!has("touch") || disableYoutube) {
					_container.find('.btn-select-youtube').popover({
						trigger: 'hover',
						placement: 'top',
						html: true,
						content: !disableYoutube ? 'YouTube' : i18n.viewer.onlinePhotoSharingCommon.disabled,
						container: '.popover-import'
					});
				}
				
				if (!has("touch")) {
					_container.find('.btn-select-csv').popover({
						trigger: 'hover',
						placement: 'top',
						html: true,
						content: i18n.viewer.onlinePhotoSharingCommon.csv,
						container: '.popover-import'
					});
				}
			};
		};
	}
);