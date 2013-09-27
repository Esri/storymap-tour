define([], 
	function () {
		return function ImportPopupViewHome() 
		{
			var _container =  $('#importPopupViewHome');
			var _footer = null;
			var _selectedView = null;
			
			_container.find('.btn-select-flickr').click(function(){ select("Flickr"); });
			_container.find('.btn-select-fb').click(function(){ select("Facebook"); });
			_container.find('.btn-select-picasa').click(function(){ select("Picasa"); });
			_container.find('.btn-select-csv').click(function(){ select("CSV"); });
			
			this.init = function(footer)
			{
				_footer = footer;
			};
			
			this.getView = function()
			{				
				_footer.find('.btnNext').attr("disabled", "disabled").html(i18n.viewer.onlinePhotoSharingCommon.select);
				return _container;
			};
			
			this.getNextView = function()
			{
				return _selectedView;
			};
			
			function select(selectedView)
			{
				_selectedView = selectedView;
				_footer.find('.btnNext').click();
			}
			
			this.initLocalization = function()
			{
				_container.find('.header').append(i18n.viewer.importPopupHome.header);
				_container.find('.csvLbl').append(i18n.viewer.onlinePhotoSharingCommon.csv);
				
				_container.find('.footer').append("<a data-href='#' onClick='app.builder.openHelpPopup()'>" + i18n.viewer.initPopupHome.footer2 + "</a>");
				_container.find('.footer').append(" | <a href='https://raw.github.com/Esri/map-tour-storytelling-template-js/master/samples/csv_file__lat_long/Locations.csv' target='_blank' download>" + i18n.viewer.initPopupHome.footer3 + "</a><span style='font-size: 11px'> (" + i18n.viewer.initPopupHome.footer4 + ")</span>");
				
				_container.find('.btn-select-flickr img').attr('src', 'resources/icons/builder-import-flickr.png');
				_container.find('.btn-select-fb img').attr('src', 'resources/icons/builder-import-facebook.png');
				_container.find('.btn-select-picasa img').attr('src', 'resources/icons/builder-import-picasa.png');
				_container.find('.btn-select-csv img').attr('src', 'resources/icons/builder-import-csv.png');
				
				if( APPCFG.AUTHORIZED_IMPORT_SOURCE ) {
					if (!APPCFG.AUTHORIZED_IMPORT_SOURCE.flickr) {
						_container.find('.btn-select-flickr img').parent().addClass("disabled").attr("title", i18n.viewer.onlinePhotoSharingCommon.disabled);
						_container.find('.btn-select-flickr').unbind('click');
					}
					if (!APPCFG.AUTHORIZED_IMPORT_SOURCE.facebook) {
						_container.find('.btn-select-fb img').parent().addClass("disabled").attr("title", i18n.viewer.onlinePhotoSharingCommon.disabled);
						_container.find('.btn-select-fb').unbind('click');
					}
					if (!APPCFG.AUTHORIZED_IMPORT_SOURCE.picasa) {
						_container.find('.btn-select-picasa img').parent().addClass("disabled").attr("title", i18n.viewer.onlinePhotoSharingCommon.disabled);
						_container.find('.btn-select-picasa').unbind('click');
					}
				}
			};
		};
	}
);