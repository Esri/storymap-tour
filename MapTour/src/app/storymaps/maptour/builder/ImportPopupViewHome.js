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
			}
			
			this.getView = function()
			{				
				_footer.find('.btnNext').attr("disabled", "disabled").html(i18n.viewer.onlinePhotoSharingCommon.select);
				return _container;
			}
			
			this.getNextView = function()
			{
				return _selectedView;
			}
			
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
				_container.find('.footer').append(" | <a href='https://raw.github.com/Esri/map-tour-storytelling-template-js/master/samples/csv_file__lat_long/Locations.csv' target='_blank' download>" + i18n.viewer.initPopupHome.footer3 + "</a><span style='font-size: 11px'> (" + (i18n.viewer.initPopupHome.footer4 || "Save as if it doesn't download") + ")</span>");
			}
		}
	}
);