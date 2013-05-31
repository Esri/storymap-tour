define(["storymaps/maptour/core/TourPointAttributes",
		"storymaps/maptour/core/MapTourHelper"], 
		function (TourPointAttributes, MapTourHelper) {
	return function FeatureServiceManager()
	{
		var graphics = [];
		var nbRequest = 0;
		var resultCounter = 0;
		
		this.process = function(featureLayer, isFSWithURLFields)
		{
			/*
			 * Accessing Feature Service attachment require a call for each feature.
			 * As the carousel as to be ready after startup, there will be 1 call / feature
			 * That can prevent the app from loading on mobile
			 * So for Feature service created through the APP, we manage two fields that contains the URL of the attachments
			 * 
			 * Also use that mode if the FS doesn't have attachment
			 */
			if( isFSWithURLFields  || ! featureLayer.hasAttachments ) {
				for (var i = 0; i < featureLayer.graphics.length; i++) {
					var feature = featureLayer.graphics[i];
					var graphic = new esri.Graphic(
						new esri.geometry.Point(
							feature.geometry.x,
							feature.geometry.y,
							feature.geometry.spatialReference
						),
						null,
						new TourPointAttributes(feature)
					);
					graphics.push(graphic);
				}
				publishCompleteEvent();
			}
			else {
				for (var i=0; i < featureLayer.graphics.length; i++) {
					queryAttachment(featureLayer, app.data.getSourceLayer().objectIdField, featureLayer.graphics[i]);
				}
				
				if( featureLayer.graphics.length == 0 )
					publishCompleteEvent();
			}
		}
		
		function queryAttachment(featureLayer, idField, feature)
		{
			if( feature.geometry != null ) {
				nbRequest++;
				featureLayer.queryAttachmentInfos(
					feature.attributes[idField], 
					function(attachmentInfos) {
						onQueryFeatureCallback(feature, attachmentInfos);
					},
					function(error){
						onQueryFeatureError(feature, error);
					}
				);
			}
		}
		
		function onQueryFeatureCallback(feature, attachmentInfos)
		{
			resultCounter++;
			
			if (attachmentInfos && attachmentInfos.length >= 2) {
				var pict  = attachmentInfos[0].id < attachmentInfos[1].id ? attachmentInfos[0] : attachmentInfos[1];
				var thumb = attachmentInfos[0].id > attachmentInfos[1].id ? attachmentInfos[0] : attachmentInfos[1];
				
				// Check the type of attahcment
				if( MapTourHelper.isSupportedMedia(pict.name) && MapTourHelper.isSupportedMedia(thumb.name) ) {
					var graphic = new esri.Graphic(
						new esri.geometry.Point(
							feature.geometry.x,
							feature.geometry.y,
							feature.geometry.spatialReference
						),
						null,
						new TourPointAttributes(
							feature, 
							pict.url, 
							thumb.url
						)
					);
					
					graphics.push(graphic);
				}
			}
			
			if (resultCounter == nbRequest)
				publishCompleteEvent();	
		}
		
		function onQueryFeatureError(feature, error)
		{
			console.error(i18n.viewer.errors.featureServiceLoad, index, feature, resultCounter, nbRequest)
			resultCounter++;
			
			if (resultCounter == nbRequest)
				publishCompleteEvent();
		}
		
		function publishCompleteEvent()
		{
			setTimeout(function(){
				dojo.publish("FS_MANAGER_LAYER_LOADED", { graphics: graphics });
			}, 0);
		}
	}
});