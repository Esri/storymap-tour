define(["storymaps/maptour/builder/MapTourBuilderHelper", "storymaps/utils/WebMapHelper", "storymaps/utils/Helper", "esri/geometry/Extent"], 
	function (MapTourBuilderHelper, WebMapHelper, Helper, Extent) {
		return function InitPopupViewAdvanced() 
		{
			var _container =  $('#initPopupViewAdvanced');
			var _footer = null;
			var _selectedView = null;
			
			// 'Start from scratch' option
			var _webmap = null;
			var _portal = null;			
			var _initCompleteDeferred = null;
			
			this.init = function(params, initCompleteDeferred, footer)
			{
				_webmap = params.webmap;
				_portal = params.portal;
				_initCompleteDeferred = initCompleteDeferred;
				_footer = footer;
			};
			
			this.getView = function(params)
			{
				if( params )
					showView(params);
				return _container;
			};
			
			this.getNextView = function()
			{
				if (_selectedView == "SCRATCH") {
					_container.find(".btn-adv").attr("disabled", "disabled");
					changeFooterState("progress");
					addEmptyLayerToWebmap();
					return "advanced";
				}
				
				return _selectedView;
			};
			
			this.getTitle = function()
			{
				return i18n.viewer.onlinePhotoSharingCommon.advanced;
			};
			
			function showView()
			{
				disableNextBtn();
			}
			
			function initEvents()
			{
				_container.find('.btn-select-csv').click(function(){ select("CSV", this); });
				_container.find('.btn-select-scratch').click(function(){ select("SCRATCH", this); });
			}
			
			function select(selectedView, target)
			{
				if( $(target).hasClass("disabled") )
					return;
				
				_selectedView = selectedView;
				_footer.find('.btnNext').click();
			}
			
			function disableNextBtn()
			{
				var btnNext = _footer.find('.btnNext');
				btnNext.html(i18n.viewer.onlinePhotoSharingCommon.select);
				btnNext.attr("disabled", "disabled");
			}
			
			/*
			 * 'Start from scratch' option
			 */
			
			function addEmptyLayerToWebmap()
			{
				var layer = MapTourBuilderHelper.getNewLayerJSON(MapTourBuilderHelper.getFeatureCollectionTemplate(true));
				_webmap.itemData.operationalLayers.push(layer);
				
				// Set the extent to the portal default
				if ( app.portal && app.portal.defaultExtent )
					app.data.getWebMapItem().item.extent = Helper.serializeExtentToItem(new Extent(app.portal.defaultExtent));
				
				var saveSucceed = function() {
					changeFooterState("succeed");
					setTimeout(function(){
						_initCompleteDeferred.resolve();
					}, 800);
				};
				
				if( app.isDirectCreationFirstSave || app.isGalleryCreation ) 
					saveSucceed();
				else
					WebMapHelper.saveWebmap(_webmap, _portal).then(saveSucceed);
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
				_container.find('.btn-select-scratch').html(i18n.viewer.onlinePhotoSharingCommon.advancedScratchLbl);
				_container.find('.btn-select-scratch').popover({
					trigger: 'hover',
					placement: 'top',
					html: true,
					content: i18n.viewer.onlinePhotoSharingCommon.advancedScratchTip + ' ' + i18n.viewer.onlinePhotoSharingCommon.advancedCommonTip
				});
				
				_container.find('.btn-select-csv').html(i18n.viewer.onlinePhotoSharingCommon.advancedCSVLbl);
				_container.find('.btn-select-csv').popover({
					trigger: 'hover',
					placement: 'top',
					html: true,
					content: i18n.viewer.onlinePhotoSharingCommon.advancedCSVTip + ' ' + i18n.viewer.onlinePhotoSharingCommon.advancedCommonTip
				});
				
				_container.find('.csv-note').html("<a href='https://raw.github.com/Esri/map-tour-storytelling-template-js/master/samples/csv_file__lat_long/Locations.csv' target='_blank' download>" + i18n.viewer.initPopupHome.footer3 + "</a><br /><span style='font-size: 11px'> (" + i18n.viewer.initPopupHome.footer4bis + ")</span>");
				
				initEvents();
			};
		};
	}
);