define(["esri/dijit/Geocoder", 
		"storymaps/utils/MovableGraphic", 
		"storymaps/utils/ResamplePicture",
		"storymaps/maptour/core/MapTourHelper",
		"storymaps/utils/Helper",
		"storymaps/ui/mapCommand/MapCommand",
		"storymaps/maptour/core/WebApplicationData",
		"dojo/has",
		"esri/map",
		"esri/layers/GraphicsLayer",
		"esri/graphic",
		"esri/geometry/Point",
		"esri/geometry/webMercatorUtils",
		"esri/config",
		"dojo/Deferred",
		"dojo/topic",
		"dojo/on",
		"dojo/query",
		"dojo/dom-attr",
		"dojo/_base/lang"], 
	function (
		Geocoder, 
		MovableGraphic, 
		ResamplePicture, 
		MapTourHelper, 
		Helper, 
		MapCommand, 
		WebApplicationData,
		has,
		Map,
		GraphicsLayer,
		Graphic,
		Point,
		webMercatorUtils,
		esriConfig,
		Deferred,
		topic,
		on,
		query,
		domAttr,
		lang)
	{			
		return function AddPopup(container)
		{		
			var _modeAttachments = null,
				_tempItemData,
				_map,
				_geocoder,
				_container = container,
				_val = $(_container).find(".clearVal"),
				_html = $(_container).find(".clearHTML"),
				_tabs = $(_container).find(".tab"),
				_tabContent = $(_container).find(".tab-content"),
				_imgWrapper = $(_container).find(".imageUploadWrapper"),
				_uploadBtn = $("input.uploadButton",_container),
				_preImg = $(_container).find(".imagePreview"),
				_changePhoto = $(_container).find(".changePhoto button"),
				_preFileName = $(_container).find(".imagePreviewName"),
	
				_preivewPanel = $(_container).find(".previewPanel"),
				_exifData = $(_container).find(".exifData"),
				_setHeader = $(_container).find(".exifMinorHeader"),
				_exifMajor = $(_container).find(".exifMajor"),
				_exifMinor = $(_container).find(".exifMinor"),
				_mainPicCanvas = $('<canvas>').get(0),
				_thumbnailFile = $(_container).find(".thumbnailFile"),
				_thumbnailCanvas = document.getElementById("thumbnailFileCanvas"),
				_thumbnailForm = $(_container).find(".thumbnailForm"),
				_thumbnailName = _thumbnailForm.find('.fileName'),
				_thumbnailBtn = _thumbnailForm.find('input'),
	
				_picUrl = $(_container).find(".tourPointPicUrl"),
				_thumbUrl = $(_container).find(".tourPointThumbUrl"),
				
				_name = $(_container).find(".tourPointNameField"),
				_description = $(_container).find(".tourPointDescr"),
				
				_lat = $(_container).find(".latitude"),
				_long = $(_container).find(".longitude"),
				_pinContainer = $(_container).find(".pinContainer"),
				_error = $(_container).find(".errorList"),
				_btnSave = $(_container).find(".modal-footer .btnSave"),
				_btnClose = $(_container).find(".modal-footer .btnClose");		
				
			//
			// Popup managment 
			//
			
			this.present = function()
			{
				_modeAttachments = ! app.data.sourceIsNotFSAttachments();
				
				// If on application loading or right now, the dataset contained more than APPCFG.MAX_ALLOWED_POINTS features
				// Add is disabled permanently (dropping point has no effect)
				if( app.data.getMaxAllowedFeatureReached() || app.data.getTourPoints().length >= APPCFG.MAX_ALLOWED_POINTS ) {
					// By precaution for the second case
					app.data.setMaxAllowedFeatureReached(true);
					$('#addPopup .maxPictureReached').show();
					$('#addPopup .tab-content').hide();
					_tabs.unbind("click");
					_tabs.css("cursor", "default");
					_tabs.removeClass("active");
					_tabs.eq(0).addClass("active");
					cleanTabsIcons();
					_btnSave.hide();
					_btnClose.html(i18n.viewer.builderHTML.addClose).removeAttr("disabled");
					$(_container).modal();
					return;
				}
				
				_tempItemData = {
					// If a temporary point is created to display the picture on older browser
					objectId: null,
					pictureId: null,
					// If using FileReader API and canvas
					pictureData: null,
					// If using attributes
					picUrl: null,
					thumbUrl: null,
					name: '',
					description: '',
					color: APPCFG.PIN_DEFAULT_CFG,
					point: null,
					_attemptedToSave: false,
					isVideo: false
				};
				
				// Clean tabs			
				_tabs.removeClass("active");
				_tabs.eq(0).addClass("active");
				_tabs.eq(1).addClass("disabled");
				_tabs.eq(2).addClass("disabled");
				cleanTabsIcons();
				_tabContent.hide();
				_tabContent.eq(_modeAttachments ? 0 : 1).show();
				_long.val("");
				_lat.val("");
				changeFooterButtons("enabled");
				
				// Common tab cleanup
				_error.hide();
				_val.val("");
				_html.html("").hide();
				
				// Picture tab
				clearPictureInputs();
				_setHeader.hide();
				_thumbnailFile.hide();
				$(".imageUploadWrapper").css("display", "block");
				_preivewPanel.hide();
				_preImg.attr("src", "").hide();
				_thumbnailForm.hide();
				_thumbnailCanvas.getContext("2d").clearRect(0,0,_thumbnailCanvas.width,_thumbnailCanvas.height);
				
				$(_container).find('#addImageAttributesTypeChooser li').fastClick(function(){
					if( $(this).index() == 1 && WebApplicationData.getDisableVideo() )
						return;
					
					$(this).parent().find("li").removeClass("active");
					$(this).addClass("active");
					$(_container).find('.addImageAttributes .type-container').hide();
					$(_container).find('.addImageAttributes .type-container').eq($(this).index()).show();
					_error.eq(2).empty();
					_picUrl.change();
					_thumbUrl.change();
				});
				
				$(_container).find(".video input[name=addVideoSrc]").click(function(){
					var selected = $(_container).find(".video input[name=addVideoSrc]:checked", _container).val();
					
					//$(_container).find(".video tr").removeClass("fade");
					$(_container).find(".video input[type=text].type").removeAttr("disabled");
					
					//$(_container).find(".video tr:not(." + selected + ")").addClass("fade");
					$(_container).find(".video input[type=text].type:not(." + selected + ")").attr("disabled", "disabled");
				});
				
				// Youtube URL check
				$(_container).find(".video input.youtube").keyup(function(e){
					if( e.keyCode != 13)
						$(_container).find('i.youtube').removeClass("icon-ok icon-exclamation-sign").attr("title", "");
				});
				
				$(_container).find('.video img.click').eq(0).fastClick(checkYoutubeUrl);
				
				// Vimeo URL check
				$(_container).find(".video input.vimeo").keyup(function(e){
					if( e.keyCode != 13)
						$(_container).find('i.vimeo').removeClass("icon-ok icon-exclamation-sign").attr("title", "");
				});
				
				$(_container).find('.video img.click').eq(1).fastClick(checkVimeoUrl);
				
				// Lame reset
				$("html").find(".video input[name=addVideoSrc]").eq(0).click();
				$("html").find(".video input[name=addVideoSrc]").eq(0).click();
				$(_container).find('i.youtube').removeClass("icon-ok icon-exclamation-sign").attr("title", "");
				$(_container).find('i.vimeo').removeClass("icon-ok icon-exclamation-sign").attr("title", "");
				
				// Information tab
				var nameLength = app.data.sourceIsFS() ? 254 : 1000, 
					descrLength = 1000;
				$.each(app.data.getSourceLayer().fields, function(i, field){
					if( field.name == app.data.getFieldsConfig().getNameField() )
						nameLength = field.length;
					if( field.name == app.data.getFieldsConfig().getDescriptionField() )
						descrLength = field.length;
				});
				_name.attr("maxlength", nameLength);
				_description.attr("maxlength", descrLength);
				
				// Check textarea maximum length according to character escaping rules
				// '=' need to be escaped to it will take 2 char, need to adjust maxlength
				_name.keyup(function(){
					var nbCharToEscape = ($(this).val().match(/=/g)||[]).length;
					$(this).attr("maxlength", nameLength - nbCharToEscape);
				});
				_description.keyup(function(){
					var nbCharToEscape = ($(this).val().match(/=/g)||[]).length;
					$(this).attr("maxlength", descrLength - nbCharToEscape);
				});
				
				// Map tab
				if( _map ) {
					_map.destroy();
					_map = null;
					_geocoder.destroy();
					_geocoder = null;
				}
				_pinContainer.empty(); 
				_tempItemData.color = APPCFG.PIN_DEFAULT_CFG;
				$.each(MapTourHelper.getSymbolColors(), function(i, color){
					var selectedClass = color == APPCFG.PIN_DEFAULT_CFG ? "selected" : "";
					_pinContainer.append('<img class="pinSelector ' + selectedClass + '" src="' +  MapTourHelper.getSymbolUrl(color, app.data.getTourPoints().length+1) + '" alt="" />');				
				});
				$(_container).find(".pinSelector").fastClick(onSelectPinChange);
				
				if ( WebApplicationData.getDisableVideo() )
					$(_container).find("#addImageAttributesTypeChooser").find('li').eq(1).addClass('disabled');
				
				$(".modal-footer .error", _container).hide();
				$(_container).modal();
			};
		
			_tabs.fastClick(function(){
				verifyData();
				
				_tabs.removeClass("active");
				$(this).addClass("active");
				_tabContent.hide();
				
				var tabIndex = $(this).index();
				if( tabIndex === 0 && ! _modeAttachments )
					tabIndex = 1;
				else if ( tabIndex !== 0 )
					tabIndex++;
				_tabContent.eq(tabIndex).show();
				
				// Open Location tab
				if($(this).index() == 2) {
					// Prevent the map and the modal background to go crazy on iOS when coming from the second tab with keyboard open
					//if( has("ios")  )
						//$("body").scrollTop(0);
						
					if( ! _map )
						startupMap();
					else {
						var pt = new Point( _tempItemData.point || app.map.extent.getCenter());
						if(_lat.val() === "" || _long.val() === ""){
							latLongChange(pt);
						}
					}
				}
	
				$(this).removeClass("disabled");
			});
			
			function verifyData(saving)
			{
				var allVerified = true;
	
				_error.hide().html("");
	
				// Picture tab
				if( _modeAttachments ) {
					if (Helper.browserSupportAttachementUsingFileReader() && ! _tempItemData.pictureData){
						_tabs.eq(0).children(".tab-icon").removeClass("icon-ok").addClass("icon-exclamation-sign");
						allVerified = false;
						_error.eq(0).append("<li>"+i18n.viewer.addPopupJS.errorNoPhoto+"</li>").show();
					}
					else if( ! Helper.browserSupportAttachementUsingFileReader() && _thumbnailName.html() == i18n.viewer.builderHTML.addNoThumbSelected ) {
						_tabs.eq(0).children(".tab-icon").removeClass("icon-ok").addClass("icon-exclamation-sign");
						allVerified = false;
						_error.eq(1).append("<li>"+i18n.viewer.addPopupJS.errorNoThumbnail+"</li>").show();
					}		
					else {
						_tabs.eq(0).children(".tab-icon").removeClass("icon-exclamation-sign").addClass("icon-ok");
					}
				}
				else {
					// Picture
					if( $("html").find('#addImageAttributesTypeChooser li.active').index() === 0 ) {
						_tempItemData.isVideo = false;
						
						if( ! _tempItemData.picUrl )
							_error.eq(2).append("<li>"+i18n.viewer.addPopupJS.errorInvalidPicUrl+"</li>");
					}
					// Video
					else {
						_tempItemData.isVideo = true;
						
						var selectedType = $(_container).find(".video input[name=addVideoSrc]:checked", _container).val();
						var videoUrl = $(_container).find(".video input." + selectedType).val();
						
						if( selectedType == "youtube" )
							_tempItemData.picUrl = getYoutubeEmbed(videoUrl);
						else if ( selectedType == "vimeo" )
							_tempItemData.picUrl = getVimeoEmbed(videoUrl);
						else
							_tempItemData.picUrl = videoUrl;
						
						
						// Since 2.2 video need to use the is_video attribute or that URL indicator 
						if( ! app.data.layerHasVideoField() && _tempItemData.picUrl.indexOf('isVideo') == -1 )
							_tempItemData.picUrl = MapTourHelper.addIsVideoToURL(_tempItemData.picUrl);
						
						_tempItemData.thumbUrl = $(_container).find(".tourPointThumbUrl2").val();
						
						if( ! MapTourHelper.validateURL(_tempItemData.picUrl) )
							_tempItemData.picUrl = '';
							
						if( ! MapTourHelper.validateURL(_tempItemData.thumbUrl) )
							_tempItemData.thumbUrl = '';
						
						if( ! _tempItemData.picUrl )
							_error.eq(2).append("<li>"+i18n.viewer.addPopupJS.errorInvalidVideoUrl+"</li>");
					}
					
					if( ! _tempItemData.thumbUrl )
							_error.eq(2).append("<li>"+i18n.viewer.addPopupJS.errorInvalidThumbUrl+"</li>");
					
					if( ! _tempItemData.picUrl || ! _tempItemData.thumbUrl ) {
						allVerified = false;
						_tabs.eq(0).children(".tab-icon").removeClass("icon-ok").addClass("icon-exclamation-sign");
						_error.eq(2).show();
					}
					else
						_tabs.eq(0).children(".tab-icon").removeClass("icon-exclamation-sign").addClass("icon-ok");
				}
	
				// Information tab			
				if (_tempItemData.name === "" ){
					if(!_tabs.eq(1).hasClass("disabled") || saving || _tempItemData._attemptedToSave){
						_tabs.eq(1).children(".tab-icon").removeClass("icon-ok").addClass("icon-exclamation-sign");
						_error.eq(3).show();
					}
					
					if(_tempItemData.name === "")
						_error.eq(3).append("<li>"+i18n.viewer.addPopupJS.errorNoName+"</li>");
	
					allVerified = false;
				}
				else{
					if(!_tabs.eq(1).hasClass("disabled") || saving) {
						_tabs.eq(1).children(".tab-icon").removeClass("icon-exclamation-sign").addClass("icon-ok");
					}
				}
	
				// Location tab
				if (!_tempItemData.point){
					if(!_tabs.eq(2).hasClass("disabled") || saving){
						_tabs.eq(2).children(".tab-icon").removeClass("icon-ok").addClass("icon-exclamation-sign");
						_error.eq(4).append("<li>"+i18n.viewer.addPopupJS.errorNoLocation+"</li>");
						_error.eq(4).show();
					}
					allVerified = false;
				}
				else{
					if(!_tabs.eq(2).hasClass("disabled") || saving){
						_tabs.eq(2).children(".tab-icon").removeClass("icon-exclamation-sign").addClass("icon-ok");
					}
				}
	
				if(saving) {
					return allVerified;
				}
			}
			
			_btnSave.click(function() {
				_tempItemData._attemptedToSave = true;
				
				if ( verifyData(true) ) {
					$(".modal-footer .error", _container).hide();
					$(".modal-footer .success", _container).html(i18n.viewer.builderHTML.addUploading);
					$(".modal-footer .success", _container).show();
					$(".modal-footer .addSpinner", _container).show();
					changeFooterButtons("disabled");
					
					var addSuccessCallback = function() {
						$(".modal-footer .success", _container).html(i18n.viewer.addPopupJS.uploadSuccess);
						$(".modal-footer .addSpinner", _container).hide();
						setTimeout(function(){
							$(".modal-footer .success", _container).html(i18n.viewer.builderHTML.addUploading).hide();
							$(_container).modal("hide");
						}, 1000);
					};
					
					var addFailCallback = function(error) {
						var errMsg = i18n.viewer.addPopupJS.uploadError;
						
						if( error && error.code == 400 && error.details && error.details[0] && error.details[0].split('html content').length >= 2 )
							errMsg = i18n.viewer.addPopupJS.uploadError2;

						$(".modal-footer .success", _container).html(i18n.viewer.addPopupJS.uploadSuccess).hide();
						$(".modal-footer .addSpinner", _container).hide();
						$(".modal-footer .error", _container).html(errMsg).show();
						changeFooterButtons("enabled");
					};
					
					// Basic XSS check
					_tempItemData.name = (_tempItemData.name||'').replace(/<\/?script>/g,''); 
					_tempItemData.description = (_tempItemData.description||'').replace(/<\/?script>/g,''); 
					_tempItemData.picUrl = (_tempItemData.picUrl||'').replace(/<\/?script>/g,''); 
					_tempItemData.thumbUrl = (_tempItemData.thumbUrl||'').replace(/<\/?script>/g,''); 
					
					if( _tempItemData.point.spatialReference.wkid == 4326 && app.map.spatialReference.wkid == 102100 )
						_tempItemData.point = webMercatorUtils.geographicToWebMercator(_tempItemData.point);
						
					// Escape special characters
					_tempItemData.name = MapTourHelper.encodeText(_tempItemData.name);
					_tempItemData.description = MapTourHelper.encodeText(_tempItemData.description);
					
					// Using form
					if(_modeAttachments) {
						if( _tempItemData.objectId && _tempItemData.pictureId ) {
							app.data.saveTemporaryTourPointUsingForm(
								_tempItemData.objectId,
								_tempItemData.point,
								_tempItemData.name,
								_tempItemData.description,
								_tempItemData.color,
								_tempItemData.pictureId,
								"addImageUploadFormThumbnail",
								addSuccessCallback,
								addFailCallback
							);
						}
						// Using canvas
						else {
							var mainPictureResampled = $("input[name=picSize]:checked").val();
							if( mainPictureResampled == "resample")
								_tempItemData.pictureData = _mainPicCanvas.toDataURL("image/jpeg");
							
							app.data.addTourPointUsingData(
								_tempItemData.point,
								_tempItemData.name,
								_tempItemData.description,
								_tempItemData.color,
								_tempItemData.pictureData,
								_thumbnailCanvas.toDataURL("image/jpeg"),
								addSuccessCallback,
								addFailCallback
							);
						}
					}
					else {
						app.data.addTourPointUsingAttributes(
							_tempItemData.point,
							_tempItemData.name,
							_tempItemData.description,
							_tempItemData.color,
							_tempItemData.picUrl,
							_tempItemData.thumbUrl,
							_tempItemData.isVideo,
							function() {
								$(".modal-footer .addSpinner", _container).hide();
								$(".modal-footer .success", _container).html(i18n.viewer.builderHTML.addUploading).hide();
								$(_container).modal("hide");
							},
							addFailCallback
						);
					}
				}
				else{
					$(".modal-footer .error", _container).html(i18n.viewer.builderHTML.tabError).show();
				}
			});
			
			function cleanTabsIcons()
			{
				_tabs.children(".tab-icon").removeClass("icon-ok").removeClass("icon-exclamation-sign");
			}
			
			function changeFooterButtons(state){
				if( state == "enabled" ) {
					_btnSave.removeAttr("disabled");
					_btnClose.removeAttr("disabled");
				}
				else {
					_btnSave.attr("disabled", "true");
					_btnClose.attr("disabled", "true");
				}
			}
			
			//
			// Picture tab - Attachments
			//
			
			function pictureSelected(files)
			{	
				if (Helper.browserSupportAttachementUsingFileReader() && files && files[0])
					loadPictureFromFileReader(files[0]);
				else 
					loadPictureFromForm();
			}
	
			_changePhoto.fastClick(changePicture);
			
			function changePicture()
			{
				cleanTabsIcons();
				_preivewPanel.hide();
				_imgWrapper.show();
				clearPictureInputs();
			}
	
			function clearPictureInputs()
			{
				_uploadBtn.closest("form").get(0).reset();
				_thumbnailBtn.closest("form").get(0).reset();
				_thumbnailName.html(i18n.viewer.builderHTML.addNoThumbSelected);
				$(".addImage .pictureSize").html("").hide();
			}
	
			//
			// Picture tab - Attachments - File Reader
			// 
	
			function loadPictureFromFileReader(file)
			{
				if (file.type === "image/jpeg") {
					// Read as an image for saving to the FS
					var pictureReaderAsImg = new FileReader();
					pictureReaderAsImg.onloadend = function()
					{
						var photoDataURL = this.result;
						_preImg.attr("src", photoDataURL);
						_tempItemData.pictureData = photoDataURL;
						_preImg.load(function(e){
							var width = e.currentTarget.naturalWidth;
							var height = e.currentTarget.naturalHeight;
							
							// Create the thumbnail
							ResamplePicture.resample(
								_thumbnailCanvas,
								$("#addImagePreview"),
								width,
								height,
								app.config.thumbnailMaxWidth,
								app.config.thumbnailMaxHeight,
								window.orientation
							);
							
							_thumbnailFile.show();
							clearPictureInputs();
							
							// Propose to resize if needed
							if( width > app.config.picRecommendedWidth || height > app.config.picRecommendedHeight || file.size > 1000000 ) {
								var recommandedSize = ResamplePicture.resample(
									_mainPicCanvas,
									_preImg,
									width,
									height,
									app.config.picRecommendedWidth,
									app.config.picRecommendedHeight,
									window.orientation
								);
								
								var str = i18n.viewer.builderHTML.addPictureResolutionIntro;
								str += '<div style="font-weight: normal; padding-top: 2px">';
								str += ' <div><input type="radio" class="radio" name="picSize" value="resample" checked="checked" />' + i18n.viewer.builderHTML.addPictureResolutionResize.replace('%RESOLUTION%', recommandedSize[0] + 'x' + recommandedSize[1] + 'px') + '</div>';
								str += ' <div><input type="radio" class="radio" name="picSize" value="keep" />' + i18n.viewer.builderHTML.addPictureResolutionKeep.replace('%RESOLUTION%', width + 'x' + height + 'px') + '</div>';
								str += '</div>';
								$(".addImage .pictureSize").html(str).show();
							}
						}).fadeIn();
					};
					pictureReaderAsImg.readAsDataURL(file);
	
					// Read exif info
					var pictureReaderAsBinary = new FileReader();
					pictureReaderAsBinary.onloadend = function()
					{
						var result = Helper.getBinaryStringFromArrayBuffer(this.result);
						_exifData.hide();
						_preivewPanel.show();
						_preFileName.html(file.name.split(".")[0]).show();
						var exif = EXIF.readFromBinaryFile(new BinaryFile(result));
						displayExifInfo(exif);
					};
					
					// Let user benefits from FileReader upload even if that mean they won't have EXIF reading using FileReader
					// IE do not support readAsBinaryString
					if( Helper.browserSupportFileReaderBinaryString() )
						pictureReaderAsBinary.readAsArrayBuffer(file);
					else			
						_preivewPanel.show();
	
					$(".imageUploadWrapper").css("display", "none");
				}
				else{
					alert(i18n.viewer.addPopupJS.notJpg);
				}
			}
			
			//
			// Picture tab - Attachments - Form
			//
			
			function loadPictureFromForm()
			{
				$(".modal-footer .error", _container).hide();
				$(".modal-footer .success", _container).html(i18n.viewer.addPopupJS.uploadingPicture).show();
				$(".modal-footer .addSpinner", _container).show();
				
				app.data.addTemporaryTourPointUsingForm(
					"addImageUploadFormPicture", 
					pictureLoadedFromForm, 
					function(){
						$(".modal-footer .success", _container).html(i18n.viewer.addPopupJS.uploadSuccess).hide();
						$(".modal-footer .addSpinner", _container).hide();
						$(".modal-footer .error", _container).html(i18n.viewer.addPopupJS.uploadError).show();
						clearPictureInputs();
					}
				);
			}
	
			function pictureLoadedFromForm(objectId, pictureId, pictureUrl)
			{
				$(".modal-footer .success", _container).html("").hide();
				$(".modal-footer .addSpinner", _container).hide();
				clearPictureInputs();
				
				_tempItemData.objectId = objectId;
				_tempItemData.pictureId = pictureId;
	
				var layer = app.data.getSourceLayer();
				if(layer.credential && layer.credential.token )
					pictureUrl += "?token=" + layer.credential.token;
	
				_preImg.attr("src", pictureUrl);
				_preImg.load(function(){
					// Read exif data
					_preImg.exifLoad(function(exif){
						displayExifInfo(exif);
					});
					
					if( _preImg[0] && (_preImg[0].naturalWidth > app.config.picRecommendedWidth || _preImg[0].naturalHeight > app.config.picRecommendedHeight) )
						$(".addImage .pictureSize").html(i18n.viewer.builderHTML.addPictureResolutionOldBrowser.replace('%RECOMMENDED_RES%', app.config.picRecommendedWidth + 'x' + app.config.picRecommendedHeight + 'px')).show();
				});
				_preImg.fadeIn();
				
				_thumbnailForm.show();
				_preivewPanel.show();
				
				$(".imageUploadWrapper").css("display", "none");
			}
			
			//
			// Picture tab - Attachments - EXIF
			//
	
			function displayExifInfo(exif)
			{
				_exifMinor.html("");
				_exifMajor.html("");
				_setHeader.hide();
				
				if( ! exif )
					return;
				
				var exifStrings = {
					"camera" : {
						"setting" : "CAMERA",
						"string" : "<i class='icon-camera' style='vertical-align:text-top'></i> "+ exif.Make + " " + exif.Model,
						"value" : [exif.Make,exif.Model],
						"smallSetting" : false
					},
					"dateTaken" : {
						"setting" : "DATE",
						"string" : "<i class='icon-calendar' style='vertical-align:text-top'></i> "+ getSimplifiedDate(exif.DateTimeOriginal),
						"value" : [exif.DateTimeOriginal],
						"smallSetting" : false
					},
					"location" : {
						"setting" : "LATITUDE",
						"string" : "<i class='icon-globe' style='vertical-align:text-top'></i> "+ Math.round(Math.abs(coordinateConversion(exif.GPSLatitude, exif.GPSLatitudeRef))*1000)/1000+exif.GPSLatitudeRef+" "+Math.round(Math.abs(coordinateConversion(exif.GPSLongitude, exif.GPSLongitudeRef))*1000)/1000+exif.GPSLongitudeRef,
						"value" : [exif.GPSLatitude,exif.GPSLatitudeRef,exif.GPSLongitude,exif.GPSLongitudeRef],
						"smallSetting" : false
					},
					"shutterSpeed" : {
						"setting" : "SHUTTER SPEED",
						"string" : shutterSpeedToFraction(exif.ExposureTime) + " s",
						"value" : [exif.ExposureTime],
						"smallSetting" : true
					},
					"aperture" : {
						"setting" : "APERTURE",
						"string" : "f/" + parseFloat(exif.ApertureValue).toFixed(1),
						"value" : [exif.ApertureValue],
						"smallSetting" : true
					},
					"sensitivity" : {
						"setting" : "SENSITIVITY",
						"string" : "ISO " + exif.ISOSpeedRatings,
						"value" : [exif.ISOSpeedRatings],
						"smallSetting" : true
					}
				};
	
				for (var item in exifStrings) {
					var definedItem = true;
					$.each(exifStrings[item].value, function(i, item){
						if(!item){
							definedItem = false;
						}
					});
					if(definedItem){
						if(exifStrings[item].smallSetting){
							_exifMinor.append("<p class='cameraSmallSettings'>" + exifStrings[item].string + "</p>");
							_exifMinor.show();
							_setHeader.show();
						}
						else{
							_exifMajor.append("<p class='cameraSettings'>" + exifStrings[item].string + "</p>");
							_exifMajor.show();
						}
						_exifData.show();
					}
					$(".cameraSmallSettings").each(function(){
						if($(this).position().left + $(this).width() > $(this).offsetParent().width()){
							$(this).before("<br>");
						}
					});
				}
	
				if (exif.GPSLongitude && exif.GPSLatitude){
					var latitude = coordinateConversion(exif.GPSLatitude, exif.GPSLatitudeRef);
					var longitude = coordinateConversion(exif.GPSLongitude, exif.GPSLongitudeRef);
					latLongChange(new Point(longitude, latitude));
				}
			}
	
			function getSimplifiedDate(date)
			{
				if(date) {
					var splitDate = date.split(":");
					var year = splitDate[0];
					var month = splitDate[1];
					var splitDay = splitDate[2].split(" ");
					var day = splitDay[0];
	
					var fullDate = new Date(year,month,day);
	
					return (fullDate.getMonth()+1 + "/" + fullDate.getDate() + "/" + fullDate.getFullYear());
				}
			}
	
			function shutterSpeedToFraction(shutterSpeed)
			{
				if(shutterSpeed){
					var formattedSpeed;
					if(shutterSpeed < 1) {
						var speed = parseFloat(shutterSpeed);
						formattedSpeed = "1/" + Math.round(1/speed);
					}
					else {
						formattedSpeed = shutterSpeed;
					}
	
					return formattedSpeed;
				}
			}
	
			function coordinateConversion(coord, ref)
			{
				if(coord && ref) {
					if(ref === "S" || ref === "W") {
						return -(coord[0] + ((coord[1] + (coord[2]/60))/60));
					}
					else {
						return (coord[0] + ((coord[1] + (coord[2]/60))/60));
					}
				}
			}
			
			//
			// Picture tab - attributes
			//
			
			_picUrl.change(function()
			{
				_tempItemData.picUrl = MapTourHelper.validateURL(_picUrl.val()) ? _picUrl.val() : '';
			});
	
			_thumbUrl.change(function()
			{
				_tempItemData.thumbUrl = MapTourHelper.validateURL(_thumbUrl.val()) ? _thumbUrl.val() : '';
			});
			
			// iPad keyboard workaround
			_picUrl.blur(function(){ $(window).scrollTop(0); });
			_thumbUrl.blur(function(){ $(window).scrollTop(0); });
			$(_container).find(".video input[type='text']").blur(function(){ $(window).scrollTop(0); });
			
			function checkYoutubeUrl()
			{
				var thumb = getYoutubeThumbnail($(_container).find('input.youtube').val());
				if( thumb ) {
					$(_container).find('.tourPointThumbUrl2').val(thumb);
					$(_container).find('i.youtube')
						.removeClass("icon-exclamation-sign")
						.addClass("icon-ok")
						.attr("title", i18n.viewer.builderHTML.addMediaVideoHelpTooltip1);
				}
				else {
					$(_container).find('i.youtube')
						.removeClass("icon-ok")
						.addClass("icon-exclamation-sign")
						.attr("title", i18n.viewer.builderHTML.addMediaVideoHelpTooltip2);
				}
			}
			
			function getYoutubeThumbnail(url)
			{
				var test = /\?v\=([a-zA-Z0-9_-]{11})/.exec(url);
				return test && test.length == 2 ? "//img.youtube.com/vi/" + test[1] + "/default.jpg" : "";
			}
			
			function getYoutubeEmbed(url)
			{
				var test = /\?v\=([a-zA-Z0-9_-]{11})/.exec(url);
				return test && test.length == 2 ? "//www.youtube.com/embed/" + test[1] + "?wmode=opaque" : "";
			}
			
			function checkVimeoUrl()
			{
				getVimeoThumbnail($(_container).find('input.vimeo').val()).then(
					function(thumb) {
						$(_container).find('.tourPointThumbUrl2').val(thumb);
						$(_container).find('i.vimeo')
							.removeClass("icon-exclamation-sign")
							.addClass("icon-ok")
							.attr("title", i18n.viewer.builderHTML.addMediaVideoHelpTooltip1);
					},
					function() {
						$(_container).find('i.vimeo')
							.removeClass("icon-ok")
							.addClass("icon-exclamation-sign")
							.attr("title", i18n.viewer.builderHTML.addMediaVideoHelpTooltip2);
					}
				);
			}
			
			function getVimeoThumbnail(url)
			{
				var resultDeferred = new Deferred();
				var test = /vimeo\.com\/([0-9]{8})/.exec(url);
				
				if( ! test || test.length != 2 )
					resultDeferred.reject();
				else
					$.ajax({
						type:'GET',
						url: '//vimeo.com/api/v2/video/' + test[1] + '.json',
						jsonp: 'callback',
						dataType: 'jsonp',
						timeout: 4000
					}).then(
						function(data) {
							if( data && data[0] )
								resultDeferred.resolve(data[0].thumbnail_large);
							else
								resultDeferred.reject();
						},
						function() {
							resultDeferred.reject();
						}
					);
				
				return resultDeferred;
			}
			
			function getVimeoEmbed(url)
			{
				var test = /vimeo\.com\/([0-9]{8})/.exec(url);
				return test && test.length == 2 ? '//player.vimeo.com/video/' + test[1] : '';
			}
			
			//
			// Information tab
			//
			
			_name.change(function(){
				_tempItemData.name = _name.val();
			});
	
			_description.change(function(){
				_tempItemData.description = _description.val();
			});
			
			// iPad keyboard workaround
			_name.blur(function(){ $(window).scrollTop(0); });
			_description.blur(function(){ $(window).scrollTop(0); });
	
			//
			// Location tab
			//
	
			function startupMap()
			{
				if (!_tempItemData.point) {
					_tempItemData.point = app.map.extent.getCenter();
					latLongChange(_tempItemData.point);
				}
	
				_map = new Map("locateMap",{
					slider: true,
					center: _tempItemData.point,
					zoom: app.map.getLevel(),
					extent: app.map.extent,
					// iOS requirement
					autoResize: false
				});
	
				// Handle basemap - copy first layer, default to light grey canvas if bing or not tile/dynamic
				var basemap = app.map.getLayer(app.map.layerIds[0]);
				_map.addLayer(Helper.cloneLayer(basemap));
	
				var pointLayer = new GraphicsLayer();
				_map.addLayer(pointLayer);
				_map.pointLayer = pointLayer;
	
				var point = new Point(_tempItemData.point);
				var symbol = MapTourHelper.getSymbol(_tempItemData.color, app.data.getTourPoints().length + 1, 'selected');
				pointLayer.add(new Graphic(point, symbol));
	
				// Edit Point Location
				on.once(_map, "update-end", function() {
					_map.disableKeyboardNavigation();
					new MovableGraphic(_map, pointLayer, pointLayer.graphics[0], onMoveEndCallback);
					new MapCommand(_map, 
						function(newExtent) {
							_map.setExtent(_map._params.extent);
							
							if( ! newExtent.contains(_map.pointLayer.graphics[0].geometry) ) {
								_map.pointLayer.setVisibility(false);
								on.once(_map, "extent-change", function() {
									_map.pointLayer.graphics[0].setGeometry(newExtent.getCenter());
									_map.pointLayer.setVisibility(true);
								});
							}
						},
						zoomToDeviceLocation,
						true
					);
				});
	
				//
				// Geocoder
				//
				var params = lang.mixin(
					{
						map: _map
					},
					Helper.createGeocoderOptions()
				);

				if( ! $(".addLocation #geocoder").length )
					$(".addLocation").append('<div id="geocoder"></div>');

				_geocoder = new Geocoder(params, "geocoder");
				_geocoder.startup();
				$("#geocoder_input").attr("placeholder", i18n.viewer.builderHTML.addLocatePlaceholder+"...");
	
				on(_geocoder, "find-results", function(response){
					if( response.results && response.results.results && response.results.results.length ) {
						_map.geocodedResult = true;
						var geom = response.results.results[0].feature.geometry;
						pointLayer.graphics[0].setGeometry(geom);
					}
				});
				
				on(_geocoder, "select", function(){
					// Close the IOS keyboard
					if( has("ios") )
						document.activeElement.blur();
				});
	
				on(_map, "extent-change", function(){
					if(_map.geocodedResult){
						_map.geocodedResult = false;
						pointLayer.graphics[0].setGeometry(_map.extent.getCenter());
						latLongChange(_map.extent.getCenter());
					}
				});
				
				// iPad keyboard workaround
				$("#locateMap #geocoder_input").blur(function(){ $(window).scrollTop(0); });
			}
			
			_lat.change(latLongChange);
			_long.change(latLongChange);
			// iPad keyboard workaround
			_lat.blur(function(){ $(window).scrollTop(0); });
			_long.blur(function(){ $(window).scrollTop(0); });
	
			function latLongChange(pt)
			{
				if(pt && pt instanceof Point){
					_tempItemData.point = pt;
					if (pt.spatialReference.wkid === 4326 || pt.spatialReference.wkid === 102100){
						$(".locationForm").show();
						_long.val(Math.round(pt.getLongitude()*1000) / 1000);
						_lat.val(Math.round(pt.getLatitude()*1000) / 1000);
					}
					else{
						$(".locationForm").hide();
					}
				}
				else{
					_tempItemData.point = new Point(_long.val(), _lat.val());
				}
				
				if (_map){
					_map.pointLayer.graphics[0].setGeometry(_tempItemData.point);
					if( ! _map.extent.contains(_map.pointLayer.graphics[0].geometry) )
						_map.centerAt(_tempItemData.point);
				}
			}
	
			function onMoveEndCallback(graphic)
			{
				latLongChange(graphic.geometry);
			}
			
			function onSelectPinChange()
			{
				_pinContainer.find(".pinSelector").removeClass("selected");
				$(this).addClass("selected");
				_map.pointLayer.graphics[0].setSymbol(_map.pointLayer.graphics[0].symbol.setUrl($(this).attr("src")));
	
				var colorIndex = $(this).index();
				var color = $.grep(MapTourHelper.getSymbolColors(), function(color, index){ 
					return index == colorIndex;
				});
	
				_tempItemData.color = color[0];
			}
			
			function zoomToDeviceLocation(success, geom)
			{
				if( success ) {
					if ( _map.spatialReference.wkid != 102100 && _map.spatialReference.wkid != 4326 ) {
						esriConfig.defaults.geometryService.project([geom], _map.spatialReference, function(features){
							if( ! features || ! features[0] )
								return;
							
							latLongChange(features[0]);
						});
					}
					else					
						latLongChange(geom);
				}
			}
			
			//
			// Initialization
			//
			
			function initFileSelectEvents()
			{
				_uploadBtn = $("input.uploadButton",_container);
				_uploadBtn.change(function(){
					pictureSelected(this.files);
				});
				
				_thumbnailBtn = _thumbnailForm.find('input');
				_thumbnailBtn.change(function() {
					if( ! _thumbnailBtn[0].value )
						return;
	
					_error.eq(1).html("");
					_thumbnailName.html(i18n.viewer.builderHTML.addThumbSelected + ' ' + _thumbnailBtn[0].value.split('\\').splice(-1)[0]);
				});
				
				// Init drag and drop if supported
				if (Helper.browserSupportAttachementUsingFileReader()) {
					_imgWrapper.on("dragover", function(e){
						e.preventDefault();
						e.stopPropagation();
						$(this).css("border-color", "#52a552");
					}).on("drop", function(e){
						if (e.originalEvent.dataTransfer) {
							if (e.originalEvent.dataTransfer.files.length) {
								e.preventDefault();
								e.stopPropagation();
								pictureSelected(e.originalEvent.dataTransfer.files);
							}
						}
						$(this).css("border-color", "#848484");
					}).on("dragleave", function(e){
						e.preventDefault();
						e.stopPropagation();
						$(this).css("border-color", "#848484");
					});
				}
			}
			
			this.initLocalization = function()
			{
				query('#addPopup .maxPictureReached')[0].innerHTML = i18n.viewer.builderHTML.addMaxPointReached;
				
				// Tabs
				query('#addPopup h3')[0].innerHTML = i18n.viewer.builderHTML.addHeader;
				query('#addPopup .tab')[0].innerHTML += i18n.viewer.builderHTML.addTabPicture;
				query('#addPopup .tab')[1].innerHTML += i18n.viewer.builderHTML.addTabInformation;
				query('#addPopup .tab')[2].innerHTML += i18n.viewer.builderHTML.addTabLocation;
				
				// Picture - attachments
				// Set button localization and then init events
				var selectCaption = Helper.browserSupportAttachementUsingFileReader() ? i18n.viewer.builderHTML.addSelectCaption : i18n.viewer.builderHTML.addSelectCaptionNoFileReader;
				// Using _uploadBtn cause issues!
				$("input.uploadButton",_container).attr("title", selectCaption);	
				$("input.uploadButton",_container).closest("a").html($("input.uploadButton",_container).closest("a").html().replace('Browse', selectCaption));
				
				$('#addPopup .addNoteVideo').html('<div style="text-align: center;">' + i18n.viewer.builderHTML.addNoteVideo + '</div>');
				
				$('#addPopup #addImageUploadFormThumbnail a').html($('#addPopup #addImageUploadFormThumbnail a').html().replace('Browse', i18n.viewer.builderHTML.addSelectThumbnail));
				initFileSelectEvents();
				_thumbnailName.html(i18n.viewer.builderHTML.addNoThumbSelected);
				query('#addPopup .changePhoto button')[0].innerHTML = i18n.viewer.builderHTML.addChangePhoto;
				query('#addPopup .settingHeading')[0].innerHTML = i18n.viewer.builderHTML.addCameraSettingsHeader;
				query('#addPopup .settingHeading')[1].innerHTML = i18n.viewer.builderHTML.addThumbnailHeader;
				
				// Picture - attributes
				query('#addPopup #addImageAttributesTypeChooser')[0].innerHTML = '<li class="active"><a href="#">' + i18n.viewer.builderHTML.addLabelPicUrl + '</a></li>' + '<li><a href="#">' + i18n.viewer.builderHTML.addLabelVideo + '</a></li>';
				query('#addPopup .addImageAttributes label')[0].innerHTML = i18n.viewer.builderHTML.addLabelPicUrl;
				query('#addPopup .addImageAttributes label')[1].innerHTML = i18n.viewer.builderHTML.addLabelThumbUrl;
				query('#addPopup .addImageAttributes label')[2].innerHTML = i18n.viewer.builderHTML.addLabelVideo;
				query('#addPopup .addImageAttributes label')[3].innerHTML = i18n.viewer.builderHTML.addLabelThumbUrl;
				domAttr.set(query('#addPopup .addImageAttributes input[type="text"]')[0],"placeholder",i18n.viewer.builderHTML.addTextPlaceholderUrl+"...");
				domAttr.set(query('#addPopup .addImageAttributes input[type="text"]')[1],"placeholder",i18n.viewer.builderHTML.addTextPlaceholderUrl+"...");
				domAttr.set(query('#addPopup .addImageAttributes input[type="text"]')[2],"placeholder",i18n.viewer.builderHTML.addTextPlaceholderUrl2+"...");
				domAttr.set(query('#addPopup .addImageAttributes input[type="text"]')[3],"placeholder",i18n.viewer.builderHTML.addTextPlaceholderUrl3+"...");
				domAttr.set(query('#addPopup .addImageAttributes input[type="text"]')[4],"placeholder",i18n.viewer.builderHTML.addTextPlaceholderUrl4+"...");
				domAttr.set(query('#addPopup .addImageAttributes input[type="text"]')[5],"placeholder",i18n.viewer.builderHTML.addTextPlaceholderUrl+"...");
				query('#addPopup .addImageAttributes .video .other span')[0].innerHTML = i18n.viewer.builderHTML.addMediaVideoOther;
				query('#addPopup .addImageAttributes .video img')[0].src = "resources/icons/builder-help.png";
				query('#addPopup .addImageAttributes .video img')[1].src = "resources/icons/builder-settings.png";
				query('#addPopup .addImageAttributes .video img')[2].src = "resources/icons/builder-help.png";
				query('#addPopup .addImageAttributes .video img')[3].src = "resources/icons/builder-settings.png";
				query('#addPopup .addImageAttributes .video img')[4].src = "resources/icons/builder-help.png";
				query('#addPopup .addImageAttributes .video img.click')[0].title = i18n.viewer.builderHTML.addMediaVideoHelp;
				query('#addPopup .addImageAttributes .video img.click')[1].title = i18n.viewer.builderHTML.addMediaVideoHelp;
				
				_container.find('.addImageAttributes .video a').eq(0).popover({
					trigger: 'hover',
					placement: 'left',
					html: true,
					content: '<script>'
								+ ' $("#addPopup .addImageAttributes .video a").next(".popover").addClass("video1-popover");'
								+ '</script>'
								+ '<img src="resources/icons/builder-add-tooltip-youtube.png" width="380px" />' 
				});
				
				_container.find('.addImageAttributes .video a').eq(1).popover({
					trigger: 'hover',
					placement: 'left',
					html: true,
					content: '<script>'
								+ ' $("#addPopup .addImageAttributes .video a").next(".popover").addClass("video2-popover");'
								+ '</script>'
								+ '<img src="resources/icons/builder-add-tooltip-vimeo.png" />' 
				});
				
				_container.find('.addImageAttributes .video a').eq(2).popover({
					trigger: 'hover',
					placement: 'left',
					html: true,
					content: '<script>'
								+ ' $("#addPopup .addImageAttributes .video a").next(".popover").addClass("video1-popover");'
								+ '</script>'
								+ '<div style="font-size: 14px; margin-bottom: 2px;">' + i18n.viewer.builderHTML.addMediaVideoHelpTooltip4 + '</div><img src="resources/icons/builder-add-tooltip-vine.png" width="380px" />' 
				});
				
				// Information
				query('#addPopup .addText label')[0].innerHTML = i18n.viewer.builderHTML.addLabelName;
				query('#addPopup .addText label')[1].innerHTML = i18n.viewer.builderHTML.addLabelDescription;
				domAttr.set(query('#addPopup .addText input')[0],"placeholder",i18n.viewer.builderHTML.addTextPlaceholder+"...");
				domAttr.set(query('#addPopup .addText textarea')[0],"placeholder",i18n.viewer.builderHTML.addTextPlaceholder+"...");
				
				// Location
				query('#addPopup .addLocation label')[0].innerHTML = i18n.viewer.builderHTML.addPinColor;
				query('#addPopup .addLocation label')[1].innerHTML = i18n.viewer.builderHTML.addLatitude;
				query('#addPopup .addLocation label')[2].innerHTML = i18n.viewer.builderHTML.addLongitude;
				domAttr.set(query('#addPopup .addLocation input')[0],"placeholder",i18n.viewer.builderHTML.addLatitudePlaceholder);
				domAttr.set(query('#addPopup .addLocation input')[1],"placeholder",i18n.viewer.builderHTML.addLongitudePlaceholder);
				query('#addPopup .error')[0].innerHTML = i18n.viewer.builderHTML.tabError;
				query('#addPopup .success')[0].innerHTML = i18n.viewer.builderHTML.addUploading;
				query('#addPopup .btnClose')[0].innerHTML = i18n.viewer.builderHTML.modalCancel;
				query('#addPopup .btnSave')[0].innerHTML = i18n.viewer.builderHTML.addSave;
			};
		};
	}
);