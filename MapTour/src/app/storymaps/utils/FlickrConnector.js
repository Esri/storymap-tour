define(["dojo/Deferred", "dojo/_base/lang"], 
	function(Deferred, lang)
	{
		return function FlickrConnector(apiKey)
		{
			var _userId = null;
			
			if( ! apiKey ){
				console.error("Flickr initialization error - missing apiKey parameter");
				return;
			}
					
			this.connect = function(userName)
			{
				var connectDeferred = new Deferred();
				
				request('flickr.people.findByUsername', {username: userName}).done(function(result){
					if( result && result.stat == "ok" ){
						_userId = result.user.id;
						
						$.when(getTags(), getSets()).done(function(tags, sets) {
							connectDeferred.resolve({
								tags: tags[0].who.tags.tag,
								sets: sets[0].photosets.photoset
							});
						});
					}
					else
						connectDeferred.reject();
				});
				
				return connectDeferred;
			};
			
			this.getPicturesInSet = function(setId, options)
			{
				return getPictures('flickr.photosets.getPhotos', lang.mixin({photoset_id: setId}, options));
			};
			
			this.getPicturesByTag = function(tags, options)
			{
				return getPictures('flickr.photos.search', lang.mixin({tags: tags}, options));
			};
			
			function getTags()
			{
				return request('flickr.tags.getListUser', {user_id: _userId});
			}
			
			function getSets()
			{
				return request('flickr.photosets.getList', {user_id: _userId});
			}
			
			function getPictures(method, params)
			{
				var rqDef = new Deferred();
				
				params.photoSize = params.photoSize || 'b';
				params.thumbSize = params.thumbSize || 'm';
				
				var searchParams = lang.mixin(
					{
						extras: 'geo,description'
					}, 
					{
						user_id: _userId
					}, 
					params
				);
				
				request(method, searchParams).done(function(result){
					if( ! result || result.stat != "ok" )
						rqDef.reject();
					
					var response = [];
					var photos = result.photos ? result.photos.photo : result.photoset.photo;
					$.each(photos, function(i, photo) {
						response.push({
							name: photo.title || '',
							description: photo.description ? (photo.description._content || '') : '',
							pic_url: getPhotoURL(photo, params.photoSize),
							thumb_url: getPhotoURL(photo, params.thumbSize),
							lat: photo.latitude || '',
							lng: photo.longitude || ''
						});
					});
					
					rqDef.resolve(response);
				});
				return rqDef;
			}
			
			function getPhotoURL(photo, size)
			{
				return 'http://farm' + photo.farm + '.static.flickr.com/' 
							+ photo.server + '/' + photo.id + '_' + photo.secret 
							+ '_' + size + '.jpg';
			}
			
			function request(method, params)
			{
				var url = 'http://api.flickr.com/services/rest/?method=' 
							+ method 
							+ '&format=json' 
							+ '&api_key=' + apiKey 
							+ (! params ? '' : '&' + $.param(params)) 
							+ '&jsoncallback=?';
							
				return $.getJSON(url);
			}
		};
	}
);