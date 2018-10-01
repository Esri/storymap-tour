define(["dojo/Deferred"], 
	function(Deferred)
	{
		return function YoutubeConnector()
		{
			this.getUserVideos = function(userId, nbResultMax)
			{
				var resultDeferred = new Deferred();
				var videos = [];
				
				if( ! userId ) {
					resultDeferred.reject();
					return resultDeferred;
				}
				
				var userRqStr = 'https://www.googleapis.com/youtube/v3/search' 
					+ '?part=id'
					+ '&q=' + userId
					+ '&type=channel'
					+ '&key=' + APPCFG.YOUTUBE_API_KEY;
				
				$.ajax({
					url: userRqStr,
					dataType: 'json',
					timeout: 4000
				}).then(
					function(userRqResponse){
						var channelId = null;
						
						if ( userRqResponse && userRqResponse.items && userRqResponse.items.length && userRqResponse.items[0].id ) {
							channelId = userRqResponse.items[0].id.channelId;
						}
						
						// Youtube queries are limited to 50 results
						// Should be made more robust if nbResultMax could be > 99
						var nbResultRq1 = nbResultMax > 50 ? 50 : nbResultMax;
						var rqStr = 'https://www.googleapis.com/youtube/v3/search'
									+ '?part=snippet'
									+ '&channelId=' + channelId
									+ '&key=' + APPCFG.YOUTUBE_API_KEY;
						
						$.ajax({
							url: rqStr + '&maxResults=' + nbResultRq1,
							dataType: 'json',
							timeout: 4000
						}).then(
							function(response){
								videos = videos.concat(parseResults(response));

								// Fetch more data id needed
								if ( nbResultRq1 != nbResultMax && response.pageInfo && response.pageInfo.totalResults > nbResultRq1 ) {
									rqStr += '&maxResults=' + (nbResultMax - nbResultRq1) 
											+ '&pageToken=' + response.nextPageToken;
									
									$.ajax({
										url: rqStr,
										dataType: 'json',
										timeout: 4000
									}).then(
										function(response){
											videos = videos.concat(parseResults(response));
											resultDeferred.resolve(videos);
										}
									);
								}
								else
									resultDeferred.resolve(videos);
							},
							function(){
								resultDeferred.reject();
							}
						);
					},
					function(){
						resultDeferred.reject();
					}
				);
				
				return resultDeferred;
			};
			
			function parseResults(response)
			{
				var videos = [];
				var data = response && response.items ? response.items : [];
						
				$.each(data, function(i, video) {
					var videoURL = getYoutubeEmbed(video && video.id ? video.id.videoId : '');
					
					if ( videoURL && video.snippet ) {
						videos.push({
							name: video.snippet.title || '',
							description: video.snippet.description || '',
							pic_url: videoURL,
							thumb_url: video.snippet.thumbnails['default'].url,
							lat: '', // Extra request to get those?
							lng: '',
							is_video: true
						});
					}
				});
				
				return videos;
			}
			
			function getYoutubeEmbed(videoId)
			{
				return "//www.youtube.com/embed/" + videoId + "?wmode=opaque";
			}
		};
	}
);