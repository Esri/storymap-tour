define(["dojo/Deferred"], 
	function(Deferred)
	{
		return function FacebookConnector(appId)
		{
			var _connectDeferred = null;
			var _logOutDeferred = null;
			
			// TODO assess validity of appid 
			if( ! appId ){
				console.error("Facebook initialization error - missing appId parameter");
				return;
			}
			
			//
			// Page albums - do not require to load Facebook API or to authenticate
			//
			
			this.getPageAlbums = function(page, noRefine)
			{
				var resultDeferred = new Deferred();
				var rqStr = document.location.protocol + '//graph.facebook.com/' + page + '/albums/?limit=50';
				
				if( ! page ) {
					resultDeferred.reject();
					return resultDeferred;
				}
				
				rqStr += noRefine ? '' : '&fields=name,count,privacy,type';
				
				$.getJSON(rqStr, function(data){
					resultDeferred.resolve(data.data);
				}).fail(function(){
					resultDeferred.reject();
				});
				
				return resultDeferred;
			};
			
			this.getPageAlbum = function(albumId, nbPicturesMax, refineResult)
			{
				var resultDeferred = new Deferred();
				var rqStr = document.location.protocol + '//graph.facebook.com/' + albumId + '/?fields=photos';
				
				if( ! albumId ) {
					resultDeferred.reject();
					return resultDeferred;
				}
				
				rqStr += refineResult ? '.fields(name,images,picture,source,place)' : '';
				rqStr += nbPicturesMax ? '&limit=' + nbPicturesMax : '';
				
				$.getJSON(rqStr, function(r){
					var photos = r && r.photos && r.photos.data ? r.photos.data : [];
					if( refineResult ) 
						resultDeferred.resolve(refineAlbumData(photos));
					else
						resultDeferred.resolve(photos);
				});
				
				return resultDeferred;
			};
			
			//
			// User albums - require to load Facebook API and to authenticate
			//
			
			this.loadApi = function()
			{
				_connectDeferred = new Deferred();
				_logOutDeferred = new Deferred();
					
				if( ! window.fbAsyncInit )
					load();
				else
					getUserInfo(_connectDeferred);
				
				return _connectDeferred;
			};
			
			this.onLogout = function()
			{
				return _logOutDeferred;
			};
			
			this.getAlbums = function(filters, noRefine)
			{
				var resultDeferred = new Deferred();
				
				var rqStr = '/me?fields=albums';
				rqStr += noRefine ? '' : '.fields(name,count,privacy,type)';
				
				FB.api(rqStr, function(r) {
					var albums = r && r.albums && r.albums.data ? r.albums.data : [];
					if( filters ) {
						albums = $.grep(albums, function(album){
							var match = true;
							$.each(Object.keys(filters), function(i, filter){
								if( album[filter] != filters[filter])
									match = false;
							});
							return match;
						});
					}
					resultDeferred.resolve(albums);
				});
				
				return resultDeferred;
			};
			
			this.getAlbum = function(albumId, refineResult, nbPicturesMax)
			{
				var resultDeferred = new Deferred();
				var rqStr = '/' + albumId + '/?fields=photos';
				
				if (!albumId) {
					resultDeferred.reject();
					return resultDeferred;
				}
				
				rqStr += refineResult ? '.fields(name,images,picture,source,place)' : '';
				rqStr += nbPicturesMax ? '.limit(' + nbPicturesMax + ')' : '';
				
				FB.api(rqStr, function(r) {
					var photos = r && r.photos && r.photos.data ? r.photos.data : [];
					if( refineResult ) 
						resultDeferred.resolve(refineAlbumData(photos));
					else
						resultDeferred.resolve(photos);
				});
				
				return resultDeferred;
			};
			
			function refineAlbumData(photos)
			{
				var result = [];
				$.each(photos, function(i, photo){
					result.push({
						name: photo.name || '',
						description: '',
						pic_url: photo.images && photo.images[0] ?  photo.images[0].source : photo.source,
						thumb_url: photo.picture,
						lat: photo.place && photo.place.location ? photo.place.location.latitude : '',
						lng: photo.place && photo.place.location ? photo.place.location.longitude: '',
						is_video: false
					});
				});
				return result;
			}
			
			function getUserInfo(connectDeferred)
			{
				FB.api('/me', function(r) {
					if( r && ! r.error )
						connectDeferred.resolve(r);
				});
			}
			
			function load()
			{
				window.fbAsyncInit = function() {
					FB.init({
						appId      : appId, // App ID
						status     : true, // check login status
						cookie     : true, // enable cookies to allow the server to access the session
						xfbml      : true,  // parse XFBML,
						version    : 'v2.1'
					});
					
					FB.Event.subscribe('auth.authResponseChange', function(response) {
						// Here we specify what we do with the response anytime this event occurs. 
						if (response.status === 'connected') {
							// The response object is returned with a status field that lets the app know the current
							// login status of the person. In this case, we're handling the situation where they 
							// have logged in to the app.
							getUserInfo(_connectDeferred);
						} 
					});
					
					FB.Event.subscribe('auth.logout', function() {
						_connectDeferred = new Deferred();
						_logOutDeferred.resolve(_connectDeferred);
					});
				};
				
				(function(d, s, id){
					var js, fjs = d.getElementsByTagName(s)[0];
					if (d.getElementById(id)) {return;}
					js = d.createElement(s); js.id = id;
					js.src = "//connect.facebook.net/en_US/sdk.js";
					fjs.parentNode.insertBefore(js, fjs);
				}(document, 'script', 'facebook-jssdk'));
			}
		};
	}
);