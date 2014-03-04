define(["dojo/Deferred"], 
	function(Deferred)
	{
		/*jshint -W069 */
		return function PicasaConnector()
		{
			this.getAlbums = function(userId)
			{
				var resultDeferred = new Deferred();
				var rqStr = document.location.protocol + '//picasaweb.google.com/data/feed/base/user/' + userId + '?alt=json&access=public';
				
				if( ! userId ) {
					resultDeferred.reject();
					return resultDeferred;
				}
				
				$.ajax({
					url: rqStr,
					dataType: 'jsonp',
					timeout: 4000 // handle 404 for user name not found
				}).then(
					function(data){
						var albums = [];

						if( data && data.feed && data.feed.entry ) {
							$.each(data.feed.entry, function(i, album) {
								albums.push({
									url: album.id['$t'],
									title: album.title['$t'] || ''
								});
							});
						}
						
						resultDeferred.resolve(albums);
					},
					function(){
						resultDeferred.reject();
					}
				);
		
				return resultDeferred;
			};
			
			this.getAlbum = function(albumUrl, nbPicturesMax)
			{
				var resultDeferred = new Deferred();
				var rqStr = albumUrl.replace('/data/entry/base/', '/data/feed/base/') + '&kind=photo&fields=title,subtitle,icon,entry(title,gphoto:numphotos,media:group(media:content,media:thumbnail,media:description),georss:where)';
				
				if( ! albumUrl ) {
					resultDeferred.reject();
					return resultDeferred;
				}
				
				rqStr += '&imgmax=1600';
				rqStr += nbPicturesMax ? '&max-results=' + nbPicturesMax : '';
				
				$.getJSON(rqStr, function(data) {
					var photos = [];
					$.each(data.feed.entry, function(i, item) {
						var picUrl = item["media$group"]["media$content"][0].url || '';
						var thumbUrl = item["media$group"]["media$thumbnail"][2].url || '';
						
						// If the builder is used in HTTPS, the picture will have an HTTPS url
						// Some browser won't load picture using HTTPS when the app is accessed over HTTP
						picUrl = picUrl.replace('https://', 'http://');
						thumbUrl = thumbUrl.replace('https://', 'http://');
						
						var photo = {
							name: item["media$group"]["media$description"]["$t"] || '',
							description: '',
							pic_url: picUrl,
							thumb_url: thumbUrl,
							lat: '',
							lng: '',
							is_video: false
						};
						
						if( item["georss$where"] && item["georss$where"]["gml$Point"] 
							&& item["georss$where"]["gml$Point"]["gml$pos"] 
							&& item["georss$where"]["gml$Point"]["gml$pos"]["$t"]
							&& item["georss$where"]["gml$Point"]["gml$pos"]["$t"].split(' ').length == 2 ) {
								photo.lat = item["georss$where"]["gml$Point"]["gml$pos"]["$t"].split(' ')[0];
								photo.lng = item["georss$where"]["gml$Point"]["gml$pos"]["$t"].split(' ')[1];
						}
	
						photos.push(photo);
					});
					resultDeferred.resolve(photos);
				});
				
				return resultDeferred;
			};
		};
	}
);