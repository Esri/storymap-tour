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

			this.getSizes = function(photoUrl, index)
			{
				var photoId = photoUrl.slice(photoUrl.lastIndexOf("/") + 1, photoUrl.indexOf("_"));
				var rqDef = new Deferred();
				request('flickr.photos.getSizes', {photo_id: photoId}).done(function(result){
					if(index > -1)
						result.elemId = index;
					rqDef.resolve(result);
				});
				return rqDef;
			};

			this.getInfo = function(photoUrl)
			{
				var photoId = photoUrl.slice(photoUrl.lastIndexOf("/") + 1, photoUrl.indexOf("_"));
				request('flickr.photos.getInfo', {api_key: "750b36a2ac65a72e03cf9cef06d79f45", photo_id: photoId}).done(function(result){
					console.log("RESULT = ", result);
				});
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
							lng: photo.longitude || '',
							is_video: false
						});
					});

					rqDef.resolve(response);
				});
				return rqDef;
			}

			function getPhotoURL(photo, size)
			{
				return 'https://farm' + photo.farm + '.static.flickr.com/'
							+ photo.server + '/' + photo.id + '_' + photo.secret
							+ '_' + size + '.jpg';
			}

			function request(method, params)
			{
				// http://code.flickr.net/2014/04/30/flickr-api-going-ssl-only-on-june-27th-2014/
				var url = 'https://' /*document.location.protocol*/
							+ 'api.flickr.com/services/rest/?method='
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
