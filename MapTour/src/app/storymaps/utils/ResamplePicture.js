define(["dojo/has"], function(has){
	return {
		resample: function(canvas, imgNode, picWidth, picHeight, maxWidth, maxHeight, deviceOrientation)
		{
			if( ! canvas || ! imgNode || ! picWidth || ! picHeight || ! maxWidth || ! maxHeight )
				return false;
			
			var context = canvas.getContext("2d");
			
			/*
			// Crop portrait picture
			var ratio = picWidth / picHeight;
			var width = ratio <= 1.5 ? 120 : (80 * ratio);
			var height = ratio > 1.5 ? 80 : (120 / ratio);
			var left = ratio <= 1.5 ? 0 : -((width-120)/2);
			var top = ratio > 1.5 ? 0 : -((height - 80)/2);
			*/
			
			// Bound max dimension by picture
			maxWidth  = Math.min(picWidth, maxWidth);
			maxHeight = Math.min(picHeight, maxHeight);
			
			var ratio  = picWidth / picHeight;
			var width  = ratio >= 1 ? maxWidth  : picWidth / (picHeight / maxHeight);
			var height = ratio < 1 ? maxHeight : picHeight / (picWidth / maxWidth);
			
			if( height > maxHeight ) {
				width = width / (height / maxHeight);
				height = maxHeight;
			}
			else if ( width > maxWidth ) {
				height = height / (width / maxWidth);
				width = maxWidth;
			}

			width = parseInt(width);
			height = parseInt(height);

			// iOS Portrait
			if( has("ios") && deviceOrientation == 0 ) {
				canvas.width = height;
				canvas.height = width;
				context.translate(height, 0);
				context.rotate(90 * Math.PI/180);
			}
			// iOS Portrait upside-down 
			else if( has("ios") && deviceOrientation == 180 ) {
				canvas.width = height;
				canvas.height = width;
				context.translate(0, width);
				context.rotate(2 * Math.PI/180);
			}
			// iOS Landscape upside-down 
			else if( has("ios") && deviceOrientation == -90 ) {
				canvas.width = width;
				canvas.height = height;
				context.translate(width, height);
				context.rotate(180 * Math.PI/180);
			}
			// iOS Landscape - Android - Desktop
			else {
				canvas.width = width;
				canvas.height = height;
			}
			
			context.drawImage(imgNode.get(0), 0, 0, width, height);
			return [width, height];
		}
	}
});