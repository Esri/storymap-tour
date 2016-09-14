define(["storymaps/maptour/core/WebApplicationData",
		"storymaps/maptour/core/TourPointAttributes",
		"storymaps/maptour/core/FieldConfig",
		"storymaps/maptour/builder/FeatureServiceManager",
		"storymaps/utils/Helper",
		"storymaps/maptour/core/MapTourHelper",
		"storymaps/utils/WebMapHelper",
		"esri/layers/FeatureLayer",
		"esri/graphic",
		"esri/geometry/Point",
		"dojo/topic"],
	function(
		WebApplicationData, 
		TourPointAttributes, 
		FieldConfig, 
		FeatureServiceManager, 
		Helper,
		MapTourHelper,
		WebMapHelper,
		FeatureLayer,
		Graphic,
		Point,
		topic
	){
		/**
		 * TourData
		 * @class TourData
		 *
		 * Application data model
		 */
		return function TourData()
		{
			var _this = this;
			
			// Web map and Web application JSON
			var _webmapItem = null;
			var _appItem = null;
			// App proxies
			var _appProxies = null;
	
			// Reference to the map layer created through arcgisUtils.createMap
			// This layer is hidden and only used to save data
			var _sourceLayer = null;
			
			// The GraphicsLayer with the tour point collection
			var _tourLayer = null;
	
			// Collection of Graphic that represent the Map Tour points
			// Graphics are created manually from the _sourceLayer original graphics and added to _tourLayer
			// The graphics attributes properties is a TourPointAttributes object
			var _tourPoints = null;
	
			/* Ordered array of tour points, elements have four properties :
			 *  - id: feature ID
			 *  - index: index in _tourPoints
			 *  - order: index in _tourPointsOrder
			 *  - visible: true/false
			 */
			var _tourPointsOrder = null;
			// _tourPoints ordered regarding order set by user through _tourPointsOrder
			var _tourPointsOrdered = null;
			
			// _tourPoints element that have been added since the last save
			var _tourPointsAdded = [];
			// _tourPoints element that have been dropped since the last save
			var _tourPointsDropped = [];
	
			// Reference to the Graphic of the currently selected Map Tour point
			var _currentGraphic = null;
			// Index of the currently selected Map Tour point in _tourPoints
			var _currentIndex = -1;
			
			// Optional introductive tour point
			var _introData = null;
			var _isEditingFirstRecord = false;
			
			// Determine if on application loading, the dataset contained more than APPCFG.MAX_ALLOWED_POINTS features
			// In than case add is disabled permanently
			// Dropping some data has no effect, it is necessary to reload the application 
			var _isMaxAllowedFeatureReached = false;
	
			this.initialExtentHasBeenEdited = false;
	
			this.getWebMapItem = function()
			{
				return _webmapItem;
			};
	
			this.setWebMapItem = function(webmapItem)
			{
				_webmapItem = webmapItem;
			};
	
			this.getAppItem = function()
			{
				return _appItem || {};
			};
	
			this.setAppItem = function(appItem)
			{
				_appItem = appItem;
			};
			
			this.getAppProxies = function()
			{
				return _appProxies;
			};
			
			this.setAppProxies = function(appProxies)
			{
				_appProxies = appProxies;
			};
	
			this.getSourceLayer = function()
			{
				return _sourceLayer;
			};
	
			this.setSourceLayer = function(sourceLayer)
			{
				_sourceLayer = sourceLayer;
			};
			
			this.getFSSourceLayerItemId = function()
			{
				var sourceLayerItemId = null;
				
				if ( ! this.sourceIsFS() )
					return sourceLayerItemId;
				
				$.each(_webmapItem.itemData.operationalLayers, function(i, layer){
					if( layer.id == _sourceLayer.id )
						sourceLayerItemId = layer.itemId;
				});
				return sourceLayerItemId;
			};
			
			this.getTourLayer = function()
			{
				return _tourLayer;
			};
			
			this.setTourLayer = function(tourLayer)
			{
				_tourLayer = tourLayer;
			};
	
			/**
			 * Get the tour points
			 * Use of this function is mandatory even inside TourData (to avoid wrong indexing because of hidden points)
			 * @param {Object} includeHiddenPoints optionally specify to include hidden points
			 */
			this.getTourPoints = function(includeHiddenPoints)
			{
				if( includeHiddenPoints ) {
					if( this.getIntroData() )
						return [this.getIntroData()].concat(_tourPointsOrdered);
					else
						return _tourPointsOrdered;
				}
				else 
					return $.grep(_tourPointsOrdered, function(p){
						return p.attributes.getTourVisibility();
					});
			};
			
			this.getOrder = function()
			{
				return _tourPointsOrder;
			};
			
			/**
			 * Get ALL tour points:
			 *  - Visible and hidden points that have an entry in web application order
			 *  - Points that are not in web application order (feature added externally in a FS, forgot to save web app config after adding a point)
			 * Points that are not in web app config are added at the end of the list and are hidden
			 */
			this.getAllFeatures = function()
			{
				// Get the difference between _tourPoints and _tourPointsOrdered
				var outsideFeatures = $.grep(_tourPoints, function(tourPoint){
					var isDropped = $.grep(_tourPointsDropped, function(dropped){
						return dropped.attributes.getID() == tourPoint.attributes.getID();
					});
					
					return _tourPointsOrdered.indexOf(tourPoint) == -1 && ! isDropped.length;
				});
				
				// Hide outsideFeatures
				$.each(outsideFeatures, function(i, feature){
					feature.attributes.setTourVisibility(false);
				});
				
				if (outsideFeatures.length && outsideFeatures[0] == _introData) {
					outsideFeatures = outsideFeatures.slice(1);
					return [_introData].concat(_tourPointsOrdered).concat(outsideFeatures);
				}
				else
					return _tourPointsOrdered.concat(outsideFeatures);
			};
	
			this.setTourPoints = function(tourPoints)
			{
				_tourPoints = tourPoints;
	
				// If no feature order has been found in the web map application data
				// or if the source is not editable (live source like CSV)
				// compute the feature order by the feature ID
				if( ! WebApplicationData.getTourPointOrder() || this.sourceIsNotEditable() )
					processPointsOrder( computeInitialTourPointOrder() );
				// Take the order back from web map application data
				else
					processPointsOrder( computeTourPointOrderFromConfig() );
			};
			
			this.resetPointsOrderAndHidden = function()
			{
				processPointsOrder( computeInitialTourPointOrder() );
			};
			
			this.getCurrentGraphic = function()
			{
				return _currentGraphic;
			};
	
			this.getCurrentIndex = function()
			{
				return _currentIndex;
			};
	
			this.getCurrentAttributes = function()
			{
				return _currentGraphic ? _currentGraphic.attributes : null;
			};
	
			this.getCurrentId = function()
			{
				if( ! _currentGraphic )
					return  null;
				
				return _currentGraphic.attributes.getID();
			};
	
			this.setCurrentPointByGraphic = function(graphic)
			{
				var newIndex = $.inArray(graphic, this.getTourPoints(false));
				
				topic.publish("maptour-point-change-before", _currentIndex, newIndex);
				
				_currentGraphic = graphic;
				_currentIndex = newIndex;
			};
	
			this.setCurrentPointByIndex = function(index)
			{
				topic.publish("maptour-point-change-before", _currentIndex, index);
				
				_currentGraphic = this.getTourPoints(false)[index];
				_currentIndex = index;
			};
	
			this.setIntroData = function(introData)
			{
				_introData = introData;
			};
			
			this.getIntroData = function()
			{
				return _introData;
			};
			
			this.hasIntroRecord = function()
			{
				return _introData != null;
			};
			
			this.setIsEditingFirstRecord = function(isEditingFirstRecord)
			{
				_isEditingFirstRecord = isEditingFirstRecord;
			};
			
			this.isEditingFirstRecord = function()
			{
				return _isEditingFirstRecord;
			};
			
			this.setFirstPointAsIntroRecord = function()
			{
				var firstPoint = this.getTourPoints(true)[0];
				this.setIntroData(firstPoint);
				_tourPointsOrdered = _tourPointsOrdered.slice(1);
			};
			
			this.restoreIntroRecordAsPoint = function()
			{
				_tourPointsOrdered.splice(0, null, this.getIntroData());
				this.setIntroData(null);
			};
			
			this.updateIntroRecord = function(name, description)
			{
				_introData.attributes.updateNameAndDescription(name, description);
			};
			
			this.setMaxAllowedFeatureReached = function(isMaxAllowedFeatureReached)
			{
				_isMaxAllowedFeatureReached = isMaxAllowedFeatureReached;
			};
			
			this.getMaxAllowedFeatureReached = function()
			{
				return _isMaxAllowedFeatureReached;
			};
	
			this.getFeatureIDField = function()
			{
				// Return the first feature ID field
				if( _tourPoints && _tourPoints[0] )
					return _tourPoints[0].attributes.getIDField();
	
				// No data yet, find field from the layer
				if( this.sourceIsFS() )
					return app.data.getSourceLayer().objectIdField;
				else if ( this.sourceIsWebmap() )
					return app.data.getSourceLayer().objectIdField || "__OBJECTID";
	
				return null;
			};

			this.getNbPoints = function()
			{
				return this.getTourPoints(false).length;
			};
	
			/**
			 * Return true if the web map data source containing the Map Tour data is a Feature Layer
			 */
			this.sourceIsFS = function()
			{
				return _sourceLayer instanceof FeatureLayer && _sourceLayer.url != null && ! _sourceLayer.id.match(/^csv_/);
			};
	
			/**
			 * Return true if the web map data source containing the Map Tour data is an web map embedded data layer
			 */
			this.sourceIsWebmap = function()
			{
				return _sourceLayer instanceof FeatureLayer && (_sourceLayer.url == null || (_sourceLayer.updating === false && _sourceLayer.id.match(/^csv_/)) );
			};
			
			this.sourceIsNotFSAttachments = function()
			{
				return this.sourceIsWebmap() || this.sourceIsFS() && ! _sourceLayer.hasAttachments;
			};
			
			this.sourceIsNotEditable = function()
			{
				return _sourceLayer instanceof FeatureLayer 
					&& /^csv_/.test(_sourceLayer.id) && WebMapHelper.findLayerTypeById(app.data.getWebMapItem().itemData, _sourceLayer.id) == "CSV";
			};
			
			this.sourceIsEditable = function()
			{
				return ! this.sourceIsNotEditable();
			};
	
			this.hasBeenAdded = function(point)
			{
				return _tourPointsAdded.indexOf(point.attributes.getID()) != -1;
			};
	
			this.pointsAdded = function()
			{
				return this.getAddedPoints().length !== 0;
			};
			
			this.getAddedPoints = function()
			{
				var graphics = [];
				$.each(_tourPoints, function(i, tourPoint) {
					if( _tourPointsAdded.indexOf(tourPoint.attributes.getID()) != -1 )
						graphics.push(tourPoint.attributes.getOriginalGraphic());
				});
				return graphics;
			};
	
			/**
			 * Return the collection of dropped tour points
			 */
			this.getDroppedPoints = function()
			{
				return _tourPointsDropped;
			};
			
			this.getDroppedPointsGraphics = function()
			{
				var graphics = [];
				$.each(this.getDroppedPoints(), function(i, tourPoint) {
					graphics.push(tourPoint.attributes.getOriginalGraphic());
				});
				return graphics;
			};
			
			this.userIsAppOwner = function()
			{
				var portalUser = app.portal ? app.portal.getPortalUser() : null;
				
				return  (portalUser && portalUser.username == this.getAppItem().owner)
						|| (Helper.getPortalUser() != null && Helper.getPortalUser() == this.getAppItem().owner)
						// Admin privilege
						|| (portalUser && portalUser.privileges && $.inArray("portal:admin:updateItems", portalUser.privileges) > -1 )
						|| this.getAppItem().itemControl == "admin"
						// Group with shared ownership
						|| this.getAppItem().itemControl == "update";
			};
			
			this.checkUserItemPrivileges = function()
			{
				var portalUser = app.portal ? app.portal.getPortalUser() : null;
				
				return (portalUser && ! portalUser.orgId && ! portalUser.privileges)
						|| (portalUser && portalUser.privileges && $.inArray("portal:user:createItem", portalUser.privileges) > -1);
			};
	
			this.userIsOrgaPublisher = function()
			{
				var user = app.portal ? app.portal.getPortalUser() : null;
				
				if ( ! user || ! user.orgId ) {
					return false;
				}
				
				if ( $.inArray("portal:publisher:publishFeatures", user.privileges) != -1 
						&& $.inArray("portal:user:createItem", user.privileges) != -1 ) {
					return true;
				}
				
				return false;
			};
				
			this.isOrga = function()
			{
				if ( ! app.portal || ! app.portal.getPortalUser() )
					return false;
				
				return !! app.portal.getPortalUser().orgId;
			};
			
			/*
			this.userIsWebmapOwner = function()
			{
				return Helper.getPortalUser() != null && Helper.getPortalUser() == this.getWebMapItem().item.owner;
			}
			*/
			
			//
			// Public functions that manage the tour points
			//
	
			/**
			 * Add a new Tour point
			 *  - create a new feature in the FS
			 *  - add the attachments
			 *  - add to _tourPoints
			 *  - refresh the UI
			 * @param {Object} point in map units
			 * @param {Object} name
			 * @param {Object} description
			 * @param {Object} color
			 * @param {Object} pictureData
			 * @param {Object} thumbnailData
             * @param {Object} successCallback
             * @param {Object} errorCallback
			 */
			this.addTourPointUsingData = function(point, name, description, color, pictureData, thumbnailData, successCallback, errorCallback)
			{
				if( point == null || ! name /*|| ! description*/ || ! color || ! pictureData || ! thumbnailData )
					return;
	
				var fields = this.getFieldsConfig();
				var attributes = {};
				attributes[fields.getNameField()] = name;
				attributes[fields.getDescriptionField()] = description;
				attributes[fields.getIconColorField()] = color;
				
				if ( app.data.layerHasVideoField() )
					attributes[fields.getIsVideoField()] = "false";
	
				var newPoint = new Graphic(point, null, attributes);
	
				FeatureServiceManager.addFSNewTourPointUsingData(
					newPoint,
					pictureData,
					thumbnailData,
					function(success, idOrError, imgID, thumbID) {
						if( success )
							tourPointAdded(idOrError, newPoint, imgID, thumbID, successCallback, errorCallback);
						else
							errorCallback(idOrError);
					}
				);
			};
			
			this.addTourPointUsingAttributes = function(point, name, description, color, pictureUrl, thumbnailUrl, isVideo, successCallback)
			{
				if( point == null || ! name /*|| ! description*/ || ! color || ! pictureUrl || ! thumbnailUrl )
					return;
	
				var fields = this.getFieldsConfig();
				var attributes = {};
				attributes[fields.getNameField()] = name;
				attributes[fields.getDescriptionField()] = description;
				attributes[fields.getIconColorField()] = color;
				attributes[fields.getURLField()] = pictureUrl;
				attributes[fields.getThumbField()] = thumbnailUrl;
				
				if ( app.data.layerHasVideoField() )
					attributes[fields.getIsVideoField()] = "" + isVideo;
				
				addTourPointUsingAttributes(point, attributes);
				
				processPointsOrder( computeTourPointOrderFromConfig() );
				app.data.setCurrentPointByIndex(this.getTourPoints(false).length - 1);
				
				topic.publish("BUILDER_INCREMENT_COUNTER", 1);
				topic.publish("CORE_UPDATE_UI");
				
				successCallback();
			};
			
			this.importTourPoints = function(featureCollection)
			{
				var nbPointsBeforeImport = this.getTourPoints(false).length;
				
				$.each(featureCollection.featureSet.features, function(i, feature){
					addTourPointUsingAttributes(new Point(feature.geometry), feature.attributes);
				});
				
				processPointsOrder( computeTourPointOrderFromConfig() );
				app.data.setCurrentPointByIndex(nbPointsBeforeImport);
				
				topic.publish("BUILDER_INCREMENT_COUNTER", featureCollection.featureSet.features.length);
				topic.publish("CORE_UPDATE_UI");
			};
			
			function addTourPointUsingAttributes(geometry, attributes)
			{
				// Create a temporary new point
				var graphicTmp = new Graphic(geometry, null, attributes);
				
				// Assign a new ID
				var newId = app.data.getSourceLayer()._nextId;
				graphicTmp.attributes[_this.getFieldsConfig().getIDField()] = newId;
				
				// Create the new point
				var newPoint = new Graphic(graphicTmp.geometry, null, new TourPointAttributes(graphicTmp));
				
				var newPointsOrder = {
					id: newId,
					visible: true
				};
				
				_tourPoints.push(newPoint);
				app.data.getTourLayer().add(newPoint);
				_tourPointsAdded.push(newPoint.attributes.getID());
				_tourPointsOrder = _tourPointsOrder.concat([newPointsOrder]);
				WebApplicationData.setTourPointOrder(_tourPointsOrder);
				
				app.data.getSourceLayer()._nextId++;
			}
			
			this.addTemporaryTourPointUsingForm = function(pictureFormId, successCallback, errorCallback)
			{
				var fields = this.getFieldsConfig();
				var attributes = {};
				attributes[fields.getNameField()] = "";
				attributes[fields.getDescriptionField()] = "";
				attributes[fields.getIconColorField()] = "";
	
				FeatureServiceManager.addTemporaryTourPointUsingForm(
					new Graphic(new Point(0, 0), null, attributes), 
					pictureFormId,
					function(success, idOrError, imgID) {
						if( success )
							successCallback(idOrError, imgID, app.data.getSourceLayer().url + '/' + idOrError + '/attachments/' + imgID);
						else
							errorCallback(idOrError);
					}
				);
			};
			
			this.saveTemporaryTourPointUsingForm = function(objectId, point, name, description, color, imgID, thumbnailFormId, successCallback, errorCallback)
			{
				if( objectId == null || point == null || ! name || ! color || ! thumbnailFormId )
					return;
					
				var fields = this.getFieldsConfig();
				var attributes = {};
				attributes[fields.getIDField()] = objectId;
				attributes[fields.getNameField()] = name;
				attributes[fields.getDescriptionField()] = description;
				attributes[fields.getIconColorField()] = color;
				
				if ( app.data.layerHasVideoField() )
					attributes[fields.getIsVideoField()] = "false";
	
				var newPoint = new Graphic(point, null, attributes);
				
				FeatureServiceManager.saveTemporaryTourPointUsingForm(
					objectId,
					newPoint,
					thumbnailFormId,
					function(success, idOrError, thumbID) {
						if( success )
							tourPointAdded(idOrError, newPoint, imgID, thumbID, successCallback, errorCallback);
						else
							errorCallback(idOrError);
					}
				);
			};
	
			this.changeCurrentPointPicAndThumbUsingData = function(pictureData, thumbnailData, callback)
			{
				var attr =  this.getCurrentAttributes() || this.getIntroData().attributes;
				if( ! attr ) {
					callback(false);
					return;
				}
				
				FeatureServiceManager.changePicAndThumbUsingData(
					attr.getID(),
					pictureData,
					thumbnailData,
					function(success, id, imgID, thumbID){
						if (success)
							changedPictureAndThumbnail(id, imgID, thumbID, callback);
						else
							callback(false);
					}
				);
			};
	
			this.changeCurrentPointThumbnailUsingData = function(thumbnailData, callback)
			{
				var attr =  this.getCurrentAttributes() || this.getIntroData().attributes;
				if( ! attr ) {
					callback(false);
					return;
				}
				
				FeatureServiceManager.changeThumbnailUsingData(
					attr.getID(),
					thumbnailData,
					function(success, id, thumbID){
						if (success)
							changedThumbnail(id, thumbID, callback);
						else
							callback(false);
					}
				);
			};
			
			this.changeCurrentPointPicAndThumbUsingForm = function(pictureFormId, thumbnailFormId, callback)
			{
				var attr =  this.getCurrentAttributes() || this.getIntroData().attributes;
				if( ! attr ) {
					callback(false);
					return;
				}
				
				FeatureServiceManager.changePicAndThumbUsingForm(
					attr.getID(),
					pictureFormId,
					thumbnailFormId,
					function(success, id, imgID, thumbID){
						if (success)
							changedPictureAndThumbnail(id, imgID, thumbID, callback);
						else
							callback(false);
					}
				);
			};
			
			this.changeCurrentPointPicURL = function(target, value, isVideo)
			{
				var attributes = _this.getCurrentAttributes() || _this.getIntroData().attributes;
				
				if( target == "picture" )
					attributes.setURL(value);
				else
					attributes.setThumbURL(value);
					
				if ( app.data.layerHasVideoField() )
					attributes.setIsVideo(isVideo);
				
				topic.publish("BUILDER_INCREMENT_COUNTER", 1);
				topic.publish("CORE_UPDATE_UI", { editFirstRecord: ! _this.getCurrentAttributes() });
			};
			
			function changedPictureAndThumbnail(id, imgID, thumbID, callback)
			{
				var imgURL = app.data.getSourceLayer().url + '/' + id + '/attachments/' + imgID;
				var thumbURL = app.data.getSourceLayer().url + '/' + id + '/attachments/' + thumbID;
				
				var attr =  _this.getCurrentAttributes() || _this.getIntroData().attributes;
				if( ! attr ) {
					callback(false);
					return;
				}
				
				var layer = app.data.getSourceLayer();
				if(!_this.isFSWithURLFields() && layer.credential && layer.credential.token ) {
					imgURL += "?token=" + layer.credential.token;
					thumbURL += "?token=" + layer.credential.token;
				}
				
				attr.setURL(imgURL);
				attr.setThumbURL(thumbURL);
				
				if (_this.isFSWithURLFields()) {
					// TODO that shouldn't be needed, the change through getCurrentAttributes should already be applied
					var fields = _this.getFieldsConfig();
					var fieldsNoOverride = _this.getFieldsConfig(true);
					var graphic = _this.getCurrentGraphic() || _this.getIntroData(); 
					var feature = graphic.getUpdatedFeature();
					feature.attributes[fields.getURLField() || fieldsNoOverride.getURLField()] = imgURL;
					feature.attributes[fields.getThumbField() || fieldsNoOverride.getThumbField()] = thumbURL;
					
					updateFSTourPoint( 
						feature,
						function() {
							callback(true);
							topic.publish("CORE_UPDATE_UI", { editFirstRecord: ! _this.getCurrentAttributes() });
						},
						function() { callback(false); }
					);
				}
				else {
					callback(true);
					topic.publish("CORE_UPDATE_UI", { editFirstRecord: ! _this.getCurrentAttributes() });
				}
			}
			
			function changedThumbnail(id, thumbID, callback)
			{
				var thumbURL = app.data.getSourceLayer().url + '/' + id + '/attachments/' + thumbID;
				
				var attr =  _this.getCurrentAttributes() || _this.getIntroData().attributes;
				if( ! attr ) {
					callback(false);
					return;
				}
				
				var layer = app.data.getSourceLayer();
				if(!_this.isFSWithURLFields() && layer.credential && layer.credential.token) {
					thumbURL += "?token=" + layer.credential.token;
				}
				
				attr.setThumbURL(thumbURL);
	
				if (_this.isFSWithURLFields()) {
					// TODO that shouldn't be needed, the change through getCurrentAttributes should already be applied
					var fields = _this.getFieldsConfig();
					var fieldsNoOverride = _this.getFieldsConfig(true);
					var graphic = _this.getCurrentGraphic() || _this.getIntroData(); 
					var feature = graphic.getUpdatedFeature();
					feature.attributes[fields.getThumbField() || fieldsNoOverride.getThumbField()] = thumbURL;
					
					updateFSTourPoint(
						feature,
						function(){
							callback(true);
							topic.publish("CORE_UPDATE_UI", { editFirstRecord: ! _this.getCurrentAttributes() });
						},
						function() { callback(false); }
					);
				}
				else {
					callback(true);
					topic.publish("CORE_UPDATE_UI", { editFirstRecord: ! _this.getCurrentAttributes() });
				}
			}
			
			function tourPointAdded(id, newPoint, imgID, thumbID, successCallback, errorCallback)
			{
				var fields = _this.getFieldsConfig();
				var fieldsNoOverride = _this.getFieldsConfig(true); // TODO should not be needed
				var imgURL = app.data.getSourceLayer().url + '/' + id + '/attachments/' + imgID;
				var thumbURL = app.data.getSourceLayer().url + '/' + id + '/attachments/' + thumbID;
				
				newPoint.attributes[fields.getIDField()] = id;
				
				// Store the URL of the newly added attchment if the FS has the expected fields
				if( _this.isFSWithURLFields() ) {
					newPoint.attributes[fields.getURLField() || fieldsNoOverride.getURLField()] = imgURL;
					newPoint.attributes[fields.getThumbField() || fieldsNoOverride.getThumbField()] = thumbURL;
					
					updateFSTourPoint( 
						new Graphic(newPoint.geometry, null, newPoint.attributes),
						function() {
							// TODO : why result is empty ?
							// also apply changes to changedPictureAndThumbnail and changedThumbnail
							
							//if(!result || !result[0] || !result[0].success)
							//	errorCallback();
							//else
							
							newPoint.attributes = new TourPointAttributes(newPoint);
							tourPointAddedStep2(id, newPoint, successCallback);
						},
						errorCallback
					);
				}
				else {
					var layer = app.data.getSourceLayer();
					if(layer.credential && layer.credential.token ) {
						imgURL += "?token=" + layer.credential.token;
						thumbURL += "?token=" + layer.credential.token;
					}
					
					newPoint.attributes = new TourPointAttributes(newPoint, imgURL, thumbURL);
					tourPointAddedStep2(id, newPoint, successCallback);
				}
			}
			
			function tourPointAddedStep2(id, newPoint, successCallback)
			{
				_tourPoints.push(newPoint);
	
				var newPointOrder = {
					id: id,
					visible: true
				};
	
				app.data.getTourLayer().add(newPoint);
				//_tourPointsAdded.push(newPoint.attributes.getID());
				
				WebApplicationData.setTourPointOrder( _tourPointsOrder.concat(newPointOrder) );
				processPointsOrder( computeTourPointOrderFromConfig() );
				app.data.setCurrentPointByGraphic(newPoint);
				
				topic.publish("BUILDER_INCREMENT_COUNTER", 1);
	
				topic.publish("CORE_UPDATE_UI");
				successCallback();
			}
			
			function updateFSTourPoint(graphic, successCallback, errorCallback)
			{
				FeatureServiceManager.fsApplyEdits(app.data.getSourceLayer(), [], [graphic], [], successCallback, errorCallback);
			}
	
			/**
			 * Update tour points order to the one given by pointsObjectIds
			 * @param {Object} pointsObjectIds Array of Object Id's in the expected new order
			 */
			this.updateTourPointsOrder = function(pointsObjectIds)
			{
				// pointsObjectIds contains all the point of the layer including those who haven't been saved into webappdata before
				// Build a list with only those that are in webappdata (visible or hidden) and new visible point
				var newPointsOrders = [];
				
				// Get the points that where not in _tourPointsOrder before
				var newPoints = $.grep(pointsObjectIds, function(feature){
					var found = $.grep(_tourPointsOrder, function(point){
						return point.id == feature.id;
					});
					
					// If point is found or if it's a new visible point
					//if( found.length || (! found.length && feature.visible) )
					newPointsOrders.push(feature);
					
					return feature.visible && ! found.length;
				});
				
				// Add new points to the layer
				$.each(newPoints, function(i, newPoint){
					var point = $.grep(_tourPoints, function(point){
						return point.attributes.getID() == newPoint.id;
					});
					
					if (point)
						app.data.getTourLayer().add(point[0]);
				});
				
				processPointsOrder( computePointsOrderFromIds(newPointsOrders) );
				if( this.getTourPoints().length === 0 )
					app.data.setCurrentPointByIndex(-1);
				
				topic.publish("CORE_UPDATE_UI");
			};
	
			/**
			 * Tag the given tour points as dropped (will be dropped on global save)
			 * @param {Object} droppedIds Array of feature Id
			 */
			this.dropTourPoints = function(droppedIds)
			{			
				// Drop tour points that were in the web app data
				_tourPointsOrdered = $.grep(_tourPointsOrdered, function(tourPoint) {
					if( droppedIds.indexOf(tourPoint.attributes.getID()) > -1 ) {
						droppedIds.splice(droppedIds.indexOf(tourPoint.attributes.getID()), 1);
						_tourPointsDropped.push(tourPoint);
						return false;
					}
					return true;
				});
				
				// Drop tour point that weren't in the web app data
				$.each(droppedIds, function(i, id){
					$.each(_tourPoints, function(j, tourPoint){
						if( id == tourPoint.attributes.getID() )
							_tourPointsDropped.push(tourPoint);
					});
				});
			};
			
			this.discardChanges = function()
			{
				// Remove added point
				_tourPointsOrdered = $.grep(_tourPointsOrdered, function(tourPoint) {
					return _tourPointsAdded.indexOf(tourPoint.attributes.getID()) == -1;
				});
				
				processPointsOrder( computeTourPointOrderFromConfig() );
			};
	
			this.updateAfterSave = function()
			{
				WebApplicationData.updateAfterSave();
				
				// Remove dropped points from _tourPoints
				_tourPoints = $.grep(_tourPoints, function(tourPoint) {
					return _tourPointsDropped.indexOf(tourPoint) == -1;
				});
				
				_tourPointsDropped = [];
				_tourPointsAdded = [];
				
				processPointsOrder( computeTourPointOrderFromConfig() );
				
				app.data.initialExtentHasBeenEdited = false;
			};
	
			/**
			 * Update the name and description of the currently selected tour point
			 * @param {Object} name
			 * @param {Object} description
			 */
			this.updateCurrentTourPoint = function(name, description)
			{
				_currentGraphic.attributes.updateNameAndDescription(name, description);
	
				topic.publish("CORE_SELECTED_TOURPOINT_UPDATE", {
					index: _currentIndex,
					name: MapTourHelper.decodeText(name),
					description: MapTourHelper.decodeText(description),
					color: _currentGraphic.attributes.getColor()
				});
			};
			
			this.updateCurrentTourPointColor = function(color)
			{
				_currentGraphic.attributes.setColor(color);
	
				topic.publish("CORE_SELECTED_TOURPOINT_UPDATE", {
					index: _currentIndex,
					color: _currentGraphic.attributes.getColor()
				});
			};
	
			/**
			 * Compute the initial tour point order from the data
			 * @return an object with the array of tour point ordered by feature ID
			 */
			function computeInitialTourPointOrder()
			{
				var pointsOrder = [];
	
				$.each(_tourPoints, function(i, tourPoint) {
					pointsOrder.push({
						id: tourPoint.attributes.getID(),
						index: i,
						order: i,
						visible: true
					});
				});
	
				pointsOrder = pointsOrder.sort(function(a, b){
					return a.id - b.id;
				});
	
				return pointsOrder;
			}
	
			/**
			 * Compute the tour point order from a previously saved order in the web map application data
			 * @return the array of tour point ordered by feature ID
			 */
			function computeTourPointOrderFromConfig()
			{
				var order = WebApplicationData.getTourPointOrder();
				return computePointsOrderFromIds(order);
			}
	
			/**
			 * Compute the tour point order from the specified order
			 * Point id's that are not present in the specified order are dropped
			 * @param {Object} newOrder ordered array of object with two properties : id (in _tourPoints), visible
			 * @return the array of tour point ordered as specified
			 */
			function computePointsOrderFromIds(newOrder)
			{
				var pointsOrder = [];
	
				// Loop on _tourPoints
				$.each(_tourPoints, function(i, tourPoint) {
					var id = tourPoint.attributes.getID();
					var pos = -1;
	
					// Find the position of the point in newOrder
					$.each(newOrder, function(i, v){
						if (v.id == id) {
							pos = i;
							return true;
						}
					});
	
					// If it hasn't been dropped
					if( pos > -1 )
						pointsOrder.push({
							id: id,
							index: i,
							order: pos,
							visible: newOrder[pos].visible
						});
				});
	
				// Order by the position in newOrder
				pointsOrder = pointsOrder.sort(function(a, b){
					return a.order - b.order;
				});
	
				return pointsOrder;
			}
	
			/**
			 * Internal function to call after tour points order have changed
			 * It compute the _tourPointsOrdered and save the order in web map application data
			 * @param {Object} pointsOrder Object that include points order and hidden points id's
			 */
			function processPointsOrder(pointsOrder)
			{
				_tourPointsOrder = pointsOrder;
				_tourPointsOrdered = [];
	
				$.each(_tourPointsOrder, function(i, item){
					_tourPoints[item.index].attributes.setTourVisibility(item.visible);
					_tourPointsOrdered.push( _tourPoints[item.index] );
				});
	
				WebApplicationData.setTourPointOrder( _tourPointsOrder );
			}
			
			this.detectDataAddedOutsideOfBuilder = function()
			{
				var counter = 0;
				var pointOrder = WebApplicationData.getTourPointOrder() || [];
				
				// Loop on _tourPoints
				$.each(_tourPoints, function(i, tourPoint) {
					var id = tourPoint.attributes.getID();
					var pos = -1;
	
					// Find the position of the point in pointOrder
					$.each(pointOrder, function(i, v){
						if (v.id == id) {
							pos = i;
							return true;
						}
					});
	
					// If point id hasn't been found
					if( pos == -1 )
						counter++;
				});

				return counter;
			};
	
			/**
			 * Find the best matching fields to construct a Map Tour point from the graphic attributes
			 */
			this.electFields = function(attributes)
			{
				console.log("TourData - electFields");
	
				return new FieldConfig({
					fieldID: electFieldFromAttributes(attributes, APPCFG.FIELDS_CANDIDATE.objectid) || app.data.getSourceLayer().objectIdField,
					fieldName: electFieldFromAttributes(attributes, APPCFG.FIELDS_CANDIDATE.name),
					fieldDescription: electFieldFromAttributes(attributes, APPCFG.FIELDS_CANDIDATE.description),
					fieldURL: electFieldFromAttributes(attributes, APPCFG.FIELDS_CANDIDATE.pic_url),
					fieldThumb: electFieldFromAttributes(attributes, APPCFG.FIELDS_CANDIDATE.thumb_url),
					fieldIconColor: electFieldFromAttributes(attributes, APPCFG.FIELDS_CANDIDATE.color),
					fieldIsVideo: electFieldFromAttributes(attributes, APPCFG.FIELDS_CANDIDATE.is_video)
				});
			};
			
			this.electFieldsFromFieldsList = function(fieldsList)
			{
				console.log("TourData - electFields");
	
				return new FieldConfig({
					fieldID: electFieldFromFieldsList(fieldsList, APPCFG.FIELDS_CANDIDATE.objectid) || app.data.getSourceLayer().objectIdField,
					fieldName: electFieldFromFieldsList(fieldsList, APPCFG.FIELDS_CANDIDATE.name),
					fieldDescription: electFieldFromFieldsList(fieldsList, APPCFG.FIELDS_CANDIDATE.description),
					fieldURL: electFieldFromFieldsList(fieldsList, APPCFG.FIELDS_CANDIDATE.pic_url),
					fieldThumb: electFieldFromFieldsList(fieldsList, APPCFG.FIELDS_CANDIDATE.thumb_url),
					fieldIconColor: electFieldFromFieldsList(fieldsList, APPCFG.FIELDS_CANDIDATE.color),
					fieldIsVideo: electFieldFromFieldsList(fieldsList, APPCFG.FIELDS_CANDIDATE.is_video)
				});
			};
			
			function electFieldFromAttributes(attributes, candidates)
			{
				for(var i=0; i < candidates.length; i++) {
					for (var fieldName in attributes) {
						if( fieldName.toLowerCase().trim() == candidates[i].toLowerCase().trim() )
							return fieldName;
					}
				}
				return '';
			}
			
			function electFieldFromFieldsList(fields, candidates)
			{
				for(var i=0; i < candidates.length; i++) {
					for (var j=0; j < fields.length; j++) {
						if( fields[j].name.toLowerCase().trim() == candidates[i].toLowerCase().trim() )
							return fields[j].name;
					}
				}
				return '';
			}
			
			function electFieldFromFieldsArray(fields, candidates)
			{
				for(var i=0; i < candidates.length; i++) {
					for (var j=0; j < fields.length; j++) {
						if( fields[j].toLowerCase().trim() == candidates[i].toLowerCase().trim() )
							return fields[j];
					}
				}
				return '';
			}
	
			this.getFieldsConfig = function(disableOverride)
			{
				if( ! disableOverride && WebApplicationData.getFieldsOverride() )
					return WebApplicationData.getFieldsOverride();
	
				var aTourPoint = this.getTourPoints()[0];
				// If data
				if( aTourPoint && aTourPoint.attributes )
					return aTourPoint.attributes.getFieldsConfig();
				// If FS
				else if ( app.data.getSourceLayer().templates[0] )
					return this.electFields(app.data.getSourceLayer().templates[0].prototype.attributes);
				// If embedded
				else if ( app.data.getSourceLayer().fields )
					return this.electFieldsFromFieldsList(app.data.getSourceLayer().fields);
			};
			
			this.isFSWithURLFields = function()
			{
				var fields = app.data.getSourceLayer().fields;
				return electFieldFromFieldsList(fields, APPCFG.FIELDS_CANDIDATE.pic_url) !== '' 
						&& electFieldFromFieldsList(fields, APPCFG.FIELDS_CANDIDATE.thumb_url) !== '';
			};
			
			this.lookForMatchingFields = function(fieldsName)
			{
				var fields = {
					fieldName: electFieldFromFieldsArray(fieldsName, APPCFG.FIELDS_CANDIDATE.name),
					fieldDescription: electFieldFromFieldsArray(fieldsName, APPCFG.FIELDS_CANDIDATE.description),
					fieldURL: electFieldFromFieldsArray(fieldsName, APPCFG.FIELDS_CANDIDATE.pic_url),
					fieldThumb: electFieldFromFieldsArray(fieldsName, APPCFG.FIELDS_CANDIDATE.thumb_url),
					fieldVideo: electFieldFromFieldsArray(fieldsName, APPCFG.FIELDS_CANDIDATE.is_video)
				};
				
				return {
					allFieldsFound: fields.fieldName && fields.fieldDescription && fields.fieldURL && fields.fieldThumb,
					fields: fields
				};
			};
			
			this.layerHasVideoField = function()
			{
				if ( ! app.data.getSourceLayer() )
					return;
				
				var fields = app.data.getSourceLayer().fields;
				return electFieldFromFieldsList(fields, APPCFG.FIELDS_CANDIDATE.is_video) !== '';
			};
			
			this.getWebAppData = function()
			{
				return WebApplicationData.get();
			};
		};
	}
);