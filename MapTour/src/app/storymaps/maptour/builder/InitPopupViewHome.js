define(["storymaps/maptour/builder/MapTourBuilderHelper", "storymaps/utils/WebMapHelper"], 
	function (MapTourBuilderHelper, WebMapHelper) {
		return function InitPopupViewHome() 
		{
			var _container =  $('#initPopupViewHome');
			
			var _selectedView = "";

			var _webmap = null;
			var _portal = null;			
			var _initCompleteDeferred = null;
			var _footer = null;

			_container.find('.btn-select-flickr').click(function(){ select("Flickr", this); });
			_container.find('.btn-select-fb').click(function(){ select("Facebook", this); });
			_container.find('.btn-select-picasa').click(function(){ select("Picasa", this); });
			
			_container.find('.btn-select-csv').click(function(){ select("CSV", this); });
			_container.find('.btn-select-scratch').click(function(){ select("SCRATCH", this); });
			
			_container.find('.btn-select-hostedFS').click(function(){ select("hostedFS", this); });
			
			this.init = function(params, initCompleteDeferred, footer)
			{
				_webmap = params.webmap;
				_portal = params.portal;
				
				_initCompleteDeferred = initCompleteDeferred;
				_footer = footer;
			}
					
			this.getView = function()
			{
				if( ! app.data.userIsOrgaPublisher() || ! app.data.userIsAppOwnerOrAdmin() ){
					$(".btn-select-hostedFS").addClass("disabled");
					$(".notAvailable").css("display", "block");
				}
				_footer.find('.btnNext').attr("disabled", "disabled").html(i18n.viewer.onlinePhotoSharingCommon.select);
				
				return _container;
			}
			
			this.getNextView = function()
			{
				if (_selectedView == "SCRATCH") {
					_container.find("td").addClass("disabled");
					changeFooterState("progress");
					addEmptyLayerToWebmap();
					return "home";
				}
				
				return _selectedView;
			}
			
			function addEmptyLayerToWebmap()
			{
				var layer = MapTourBuilderHelper.getNewLayerJSON(MapTourBuilderHelper.getFeatureCollectionTemplate(true));
				_webmap.itemData.operationalLayers.push(layer);
				
				WebMapHelper.saveWebmap(_webmap, _portal).then(function(){
					changeFooterState("succeed");
					setTimeout(function(){
						_initCompleteDeferred.resolve();
					}, 800);
				});
			}
			
			function select(selectedView, target)
			{
				if( $(target).hasClass("disabled") )
					return;
				
				_selectedView = selectedView;
				_footer.find('.btnNext').click();
			}
			
			function changeFooterState(state)
			{
				var btnNext = _footer.find('.btnNext');
				var footerText = _footer.find('.dataFooterText');

				if( state == "progress" ) {
					btnNext.attr("disabled", "true");
					footerText.html(i18n.viewer.initPopupHome.footerProgress + ' <img src="resources/icons/loader-upload.gif" />');
					footerText.show();
				}
				else if( state == "succeed" ) {
					btnNext.attr("disabled", "true");
					footerText.html(i18n.viewer.initPopupHome.footerSucceed);
					footerText.show();
				}
			}
			
			this.initLocalization = function()
			{
				_container.find('.header').append(i18n.viewer.initPopupHome.header);
				_container.find('.header2').append(i18n.viewer.initPopupHome.header2);
				
				_container.find('.sideTitle1').append(i18n.viewer.initPopupHome.title1);
				_container.find('.sideTitle2').append(i18n.viewer.initPopupHome.title2);
				
				_container.find('.csvLbl').append(i18n.viewer.onlinePhotoSharingCommon.csv);
				_container.find('.scratchLbl').append(i18n.viewer.onlinePhotoSharingCommon.fromScratch);
				
				_container.find('.hostedFsNote').append(i18n.viewer.initPopupHome.hostedFsNA);
				
				_container.find('.footer1').append(i18n.viewer.initPopupHome.footer1);
				_container.find('.footer2').append("<a data-href='#' onClick='app.builder.openHelpPopup()'>" + i18n.viewer.initPopupHome.footer2 + "</a>");
				_container.find('.footer2').append(" | <a href='https://raw.github.com/Esri/map-tour-storytelling-template-js/master/samples/csv_file__lat_long/Locations.csv' target='_blank' download>" + i18n.viewer.initPopupHome.footer3 + "</a><span style='font-size: 11px'> (" + (i18n.viewer.initPopupHome.footer4 || "Save as if it doesn't download") + ")</span>");
			}
		}
	}
);