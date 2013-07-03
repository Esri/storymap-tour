define([], function(){
	return function PicasaConnector()
	{
		this.getAlbums = function(userId)
		{
			var resultDeferred = new dojo.Deferred();
			var rqStr = 'http://picasaweb.google.com/data/feed/base/user/' + userId + '?alt=json&access=public';
			
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
					$.each(data.feed.entry, function(i, album) {
						albums.push({
							url: album.id['$t'],
							title: album.title['$t'] || ''
						});
					});
					resultDeferred.resolve(albums);
				},
				function(){
					resultDeferred.reject();
				}
			);
	
			return resultDeferred;
		}
		
		this.getAlbum = function(albumUrl, nbPicturesMax)
		{
			var resultDeferred = new dojo.Deferred();
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
					var photo = {
						name: item["media$group"]["media$description"]["$t"] || '',
						description: '',
						pic_url: item["media$group"]["media$content"][0].url,
						thumb_url: item["media$group"]["media$thumbnail"][2].url,
						lat: '',
						lng: ''
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
		}
	}
});