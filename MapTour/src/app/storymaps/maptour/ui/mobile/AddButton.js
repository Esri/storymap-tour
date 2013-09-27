define(["storymaps/utils/ResamplePicture"], 
	function(ResamplePicture)
	{
		return function AddButton()
		{
			var _addMobileMainCanvas = null;
			var _addMobileThumbnailCanvas = null;
			var _addMobileThumbnailImg = null;
			var _addMobileThumbnailImg2 = null;
			var _saveApp = null;
			
			this.init = function(saveApp)
			{
				_saveApp = saveApp;
				
				if( ! _saveApp )
					return;
				
				$('.builderMobile a').html($('.builderMobile a').html().replace('Browse', '+'));
				$('.builderMobile').show();
				
				$('.builderMobile input').change(function(){
					_addMobileMainCanvas = $('<canvas>');
					_addMobileThumbnailCanvas = $('<canvas>');
					_addMobileThumbnailImg = $('<img/>');
					_addMobileThumbnailImg2 = $('<img/>');
					
					var file = this.files[0];
					setTimeout(function(){
						mobileAddPoint(file);
					}, 0);
				});
			};
			
			function mobileAddPoint(file)
			{
				if(! file || file.type != "image/jpeg")
					return;
				
				// If on application loading or right now, the dataset contained more than APPCFG.MAX_ALLOWED_POINTS features
				// Add is disabled permanently (dropping point has no effect)
				if( app.data.getMaxAllowedFeatureReached() || app.data.getTourPoints().length >= APPCFG.MAX_ALLOWED_POINTS ) {
					alert(i18n.viewer.builderHTML.addMaxPointReachedMobile);
					return;
				}
				
				var pointName = prompt(i18n.viewer.builderHTML.addMobileName + ':');
				if( pointName ) {
					loadingIndicator.start();
					loadingIndicator.setMessage(i18n.viewer.builderHTML.addMobileUploading);
					
					// Resample main picture using an IMG tag to avoid bug in iOS 
					// http://stackoverflow.com/questions/12554947/mobile-safari-renders-img-src-dataimage-jpegbase64-scaled-on-canvas 
					var mpImg = new MegaPixImage(file);
					mpImg.render(
						_addMobileThumbnailImg.get(0), 
						{
							maxWidth: app.config.picRecommendedWidth, 
							maxHeight: app.config.picRecommendedHeight
						}
					);
					
					_addMobileThumbnailImg.load(function(e){
						// Resample main picture
						ResamplePicture.resample(
							_addMobileMainCanvas.get(0),
							_addMobileThumbnailImg,
							e.currentTarget.naturalWidth,
							e.currentTarget.naturalHeight,
							app.config.picRecommendedWidth,
							app.config.picRecommendedHeight,
							window.orientation
						);
						
						// Resample thumbnail
						ResamplePicture.resample(
							_addMobileThumbnailCanvas.get(0),
							_addMobileThumbnailImg,
							e.currentTarget.naturalWidth,
							e.currentTarget.naturalHeight,
							app.config.thumbnailMaxWidth,
							app.config.thumbnailMaxHeight,
							window.orientation
						);
						
						app.data.addTourPointUsingData(
							app.map.extent.getCenter(),
							pointName,
							'',
							APPCFG.PIN_DEFAULT_CFG,
							_addMobileMainCanvas.get(0).toDataURL("image/jpeg"),
							_addMobileThumbnailCanvas.get(0).toDataURL("image/jpeg"),
							function(){
								_saveApp();
								$('.builderMobile form').get(0).reset();
								loadingIndicator.stop();
							},
							function() {
								$('.builderMobile form').get(0).reset();
								loadingIndicator.stop();
								loadingIndicator.setMessage(i18n.viewer.builderHTML.addMobileError);
								setTimeout(function(){
									loadingIndicator.stop();
								}, 2500);
							}
						);
					});
				}
				else
					alert(i18n.viewer.builderHTML.addMobileNameMandatory);
			}
		};
	}
);