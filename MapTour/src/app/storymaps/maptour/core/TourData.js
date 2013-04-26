define(["storymaps/maptour/core/WebApplicationData",
		"storymaps/maptour/core/TourPointAttributes",
		"storymaps/maptour/core/FieldConfig",
		"storymaps/utils/Helper"],
	function(WebApplicationData, TourPointAttributes, FieldConfig, Helper)
	{
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

		// Reference to the esri.Map layer created through esri.arcgis.utils.createMap
		// This layer is hidden and only used to save data
		var _sourceLayer = null;
		
		// The esri.layers.GraphicsLayer with the tour point collection
		var _tourLayer = null;

		// Collection of esri.graphic that represent the Map Tour points
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

		// Reference to the esri.graphic of the currently selected Map Tour point
		var _currentGraphic = null;
		// Index of the currently selected Map Tour point in _tourPoints
		var _currentIndex = -1;
		
		// Optional introductive tour point
		var _introData = null;
		// Determine if on application loading, the dataset contained more than APPCFG.MAX_ALLOWED_POINTS features
		// In than case add is disabled permanently
		// Dropping some data has no effect, it is necessary to reload the application 
		var _isMaxAllowedFeatureReached = false;

		this.initialExtentHasBeenEdited = false;

		this.getWebMapItem = function()
		{
			return _webmapItem;
		}

		this.setWebMapItem = function(webmapItem)
		{
			_webmapItem = webmapItem;
		}

		this.getAppItem = function()
		{
			return _appItem || {};
		}

		this.setAppItem = function(appItem)
		{
			_appItem = appItem;
		}

		this.getSourceLayer = function()
		{
			return _sourceLayer;
		}

		this.setSourceLayer = function(sourceLayer)
		{
			_sourceLayer = sourceLayer;
		}
		
		this.getTourLayer = function()
		{
			return _tourLayer;
		}
		
		this.setTourLayer = function(tourLayer)
		{
			_tourLayer = tourLayer;
		}

		/**
		 * Get the tour points
		 * Use of this function is mandatory even inside TourData (to avoid wrong indexing because of hidden points)
		 * @param {Object} includeHiddenPoints optionally specify to include hidden points
		 */
		this.getTourPoints = function(includeHiddenPoints)
		{
			return includeHiddenPoints ?
				_tourPointsOrdered :
				$.grep(_tourPointsOrdered, function(p){
					return p.attributes.getTourVisibility();
				});
		}
		
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
			
			return _tourPointsOrdered.concat(outsideFeatures);
		}

		this.setTourPoints = function(tourPoints)
		{
			_tourPoints = tourPoints;

			// If no feature order has been found in the web map application data
			// compute the feature order by the feature ID
			if( ! WebApplicationData.getTourPointOrder() )
				processPointsOrder( computeInitialTourPointOrder() );
			// Take the order back from web map application data
			else
				processPointsOrder( computeTourPointOrderFromConfig() );
		}

		this.getCurrentGraphic = function()
		{
			return _currentGraphic;
		}

		this.getCurrentIndex = function()
		{
			return _currentIndex;
		}

		this.getCurrentAttributes = function()
		{
			return _currentGraphic ? _currentGraphic.attributes : null;
		}

		this.getCurrentId = function()
		{
			if( ! _currentGraphic )
				return  null;
			
			return _currentGraphic.attributes.getID();
		}

		this.setCurrentPointByGraphic = function(graphic)
		{
			_currentGraphic = graphic;
			_currentIndex = $.inArray(graphic, _tourPointsOrdered);
		}

		this.setCurrentPointByIndex = function(index)
		{
			_currentGraphic = this.getTourPoints(false)[index];
			_currentIndex = index;
		}

		this.setIntroData = function(introData)
		{
			_introData = introData;
		}
		
		this.getIntroData = function()
		{
			return _introData;
		}
		
		this.setMaxAllowedFeatureReached = function(isMaxAllowedFeatureReached)
		{
			_isMaxAllowedFeatureReached = isMaxAllowedFeatureReached;
		}
		
		this.getMaxAllowedFeatureReached = function()
		{
			return _isMaxAllowedFeatureReached;
		}

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
		}

		this.getNbPoints = function()
		{
			return _tourPointsOrdered ? _tourPointsOrdered.length : 0;
		}

		/**
		 * Return true if the web map data source containing the Map Tour data is a Feature Layer
		 */
		this.sourceIsFS = function()
		{
			return _sourceLayer instanceof esri.layers.FeatureLayer && _sourceLayer.url != null;
		}

		/**
		 * Return true if the web map data source containing the Map Tour data is an web map embedded data layer
		 */
		this.sourceIsWebmap = function()
		{
			return _sourceLayer instanceof esri.layers.FeatureLayer && _sourceLayer.url == null;
		}

		this.hasBeenAdded = function(tourPoint)
		{
			var found = $.grep(_tourPoints, function(tourPoint, i) {
				return _tourPointsAdded.indexOf(tourPoint.attributes.getID()) != -1;
			});
			
			return found.length != 0;
		}

		/**
		 * Return the collection of dropped tour points Id's
		 */
		this.getDroppedPoints = function()
		{
			return _tourPointsDropped;
		}
		
		this.userIsAppOwnerOrAdmin = function()
		{
			return Helper.getPortalRole() == "account_admin" 
					|| (Helper.getPortalUser() != null && Helper.getPortalUser() == this.getAppItem().owner);	
		}
		
		/**
		 * Check that we are on an orga and user has the privileges to create Feature Service
		 */
		this.userIsOrgaPublisher = function()
		{
			var user = app.portal ? app.portal.getPortalUser() : null;
			return user && user.orgId && (user.role == 'org_admin' || user.role == 'org_publisher');
		}
		
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
		 * @param {esri.geometry.Point} point in map units
		 * @param {Object} name
		 * @param {Object} description
		 * @param {Object} color
		 * @param {Object} pictureData
		 * @param {Object} thumbnailData
		 */
		this.addTourPointUsingData = function(point, name, description, color, pictureData, thumbnailData, successCallback, errorCallback)
		{
			if( point == null || ! name /*|| ! description*/ || ! color || ! pictureData || ! thumbnailData )
				return false;

			var fields = this.getFieldsConfig();
			var attributes = {};
			attributes[fields.getNameField()] = name;
			attributes[fields.getDescriptionField()] = description;
			attributes[fields.getIconColorField()] = color;

			var newPoint = new esri.Graphic(point, null, attributes);

			app.builder.addFSNewTourPointUsingData(
				newPoint,
				pictureData,
				thumbnailData,
				function(success, id, imgID, thumbID) {
					if( success )
						tourPointAdded(id, newPoint, imgID, thumbID, successCallback, errorCallback);
					else
						errorCallback();
				}
			);
		}
		
		this.addTemporaryTourPointUsingForm = function(pictureFormId, successCallback, errorCallback)
		{
			var fields = this.getFieldsConfig();
			var attributes = {};
			attributes[fields.getNameField()] = "";
			attributes[fields.getDescriptionField()] = "";
			attributes[fields.getIconColorField()] = "";

			app.builder.addTemporaryTourPointUsingForm(
				new esri.Graphic(new esri.geometry.Point(0, 0), null, attributes), 
				pictureFormId,
				function(success, id, imgID) {
					if( success )
						successCallback(id, imgID, app.data.getSourceLayer().url + '/' + id + '/attachments/' + imgID);
					else
						errorCallback();
				}
			);
		}
		
		this.saveTemporaryTourPointUsingForm = function(objectId, point, name, description, color, imgID, thumbnailFormId, successCallback, errorCallback)
		{
			if( objectId == null || point == null || ! name || ! color || ! thumbnailFormId )
				return false;
				
			var fields = this.getFieldsConfig();
			var attributes = {};
			attributes[fields.getIDField()] = objectId;
			attributes[fields.getNameField()] = name;
			attributes[fields.getDescriptionField()] = description;
			attributes[fields.getIconColorField()] = color;

			var newPoint = new esri.Graphic(point, null, attributes);
			
			app.builder.saveTemporaryTourPointUsingForm(
				objectId,
				newPoint,
				thumbnailFormId,
				function(success, id, thumbID) {
					if( success )
						tourPointAdded(id, newPoint, imgID, thumbID, successCallback, errorCallback);
					else
						errorCallback();
				}
			);
		}

		this.changeCurrentPointPicAndThumbUsingData = function(pictureData, thumbnailData, callback)
		{
			app.builder.changePicAndThumbUsingData(
				this.getCurrentAttributes().getID(),
				pictureData,
				thumbnailData,
				function(success, id, imgID, thumbID){
					if (success)
						changedPictureAndThumbnail(id, imgID, thumbID, callback);
					else
						callback(false);
				}
			);
		}

		this.changeCurrentPointThumbnailUsingData = function(thumbnailData, callback)
		{
			app.builder.changeThumbnailUsingData(
				this.getCurrentAttributes().getID(),
				thumbnailData,
				function(success, id, thumbID){
					if (success)
						changedThumbnail(id, thumbID, callback);
					else
						callback(false);
				}
			);
		}
		
		this.changeCurrentPointPicAndThumbUsingForm = function(pictureFormId, thumbnailFormId, callback)
		{
			app.builder.changePicAndThumbUsingForm(
				this.getCurrentAttributes().getID(),
				pictureFormId,
				thumbnailFormId,
				function(success, id, imgID, thumbID){
					if (success)
						changedPictureAndThumbnail(id, imgID, thumbID, callback);
					else
						callback(false);
				}
			);
		}
		
		function changedPictureAndThumbnail(id, imgID, thumbID, callback)
		{
			var imgURL = app.data.getSourceLayer().url + '/' + id + '/attachments/' + imgID;
			var thumbURL = app.data.getSourceLayer().url + '/' + id + '/attachments/' + thumbID;
			
			_this.getCurrentAttributes().setURL(imgURL);
			_this.getCurrentAttributes().setThumbURL(thumbURL);
			
			if (_this.isFSWithURLFields()) {
				// TODO that shouldn't be needed, the change through getCurrentAttributes should already be applied
				var fields = _this.getFieldsConfig();
				var fieldsNoOverride = _this.getFieldsConfig(true);
				var feature = _this.getCurrentGraphic().getUpdatedFeature();
				feature.attributes[fields.getURLField() || fieldsNoOverride.getURLField()] = imgURL;
				feature.attributes[fields.getThumbField() || fieldsNoOverride.getThumbField()] = thumbURL;
				
				app.builder.updateFSTourPoint( 
					feature,
					function(result) {
						callback(true);
						dojo.publish("CORE_UPDATE_UI");
					},
					function() { callback(false); }
				);
			}
			else {
				callback(true);
				dojo.publish("CORE_UPDATE_UI");
			}
		}
		
		function changedThumbnail(id, thumbID, callback)
		{
			var thumbURL = app.data.getSourceLayer().url + '/' + id + '/attachments/' + thumbID;
			_this.getCurrentAttributes().setThumbURL(thumbURL);

			if (_this.isFSWithURLFields()) {
				// TODO that shouldn't be needed, the change through getCurrentAttributes should already be applied
				var fields = _this.getFieldsConfig();
				var fieldsNoOverride = _this.getFieldsConfig(true);
				var feature = _this.getCurrentGraphic().getUpdatedFeature();
				feature.attributes[fields.getThumbField() || fieldsNoOverride.getThumbField()] = thumbURL;
				
				app.builder.updateFSTourPoint(
					feature,
					function(result){
						callback(true);
						dojo.publish("CORE_UPDATE_UI");
					},
					function() { callback(false); }
				);
			}
			else {
				callback(true);
				dojo.publish("CORE_UPDATE_UI");
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
				
				app.builder.updateFSTourPoint( 
					new esri.Graphic(newPoint.geometry, null, newPoint.attributes),
					function(result) {
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
			_tourPointsAdded.push(newPoint.attributes.getID());
			
			WebApplicationData.setTourPointOrder( _tourPointsOrder.concat(newPointOrder) );
			processPointsOrder( computeTourPointOrderFromConfig() );
			app.data.setCurrentPointByGraphic(newPoint);
			
			app.builder.incrementSaveCounter();

			dojo.publish("CORE_UPDATE_UI");
			successCallback();
		}

		/**
		 * Update tour points order to the one given by pointsObjectIds
		 * @param {Object} pointsObjectIds Array of Object Id's in the expected new order
		 */
		this.updateTourPointsOrder = function(pointsObjectIds)
		{
			// pointsObjectIds contains all the point of the layer including those who havn't been saved into webappdata before
			// Build a list with only those that are in webappdata (visible or hidden) and new visible point
			var newPointsOrders = [];
			
			// Get the points that where not in _tourPointsOrder before
			var newPoints = $.grep(pointsObjectIds, function(feature){
				var found = $.grep(_tourPointsOrder, function(point){
					return point.id == feature.id;
				});
				
				// If point is found or if it's a new visible point
				if( found.length || (! found.length && feature.visible) )
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
			if( this.getTourPoints().length == 0 )
				app.data.setCurrentPointByIndex(-1);
			
			dojo.publish("CORE_UPDATE_UI");
		}

		/**
		 * Tag the given tour points as dropped (will be dropped on global save)
		 * @param {Object} droppedIds Array of feature Id
		 */
		this.dropTourPoints = function(droppedIds)
		{			
			// Drop tour points that were in the web app data
			_tourPointsOrdered = $.grep(_tourPointsOrdered, function(tourPoint, i) {
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
		}
		
		this.discardChanges = function()
		{
			// Remove added point
			_tourPointsOrdered = $.grep(_tourPointsOrdered, function(tourPoint, i) {
				return _tourPointsAdded.indexOf(tourPoint.attributes.getID()) == -1;
			});
			
			processPointsOrder( computeTourPointOrderFromConfig() );
		}

		this.updateAfterSave = function()
		{
			// Remove dropped points from _tourPoints
			_tourPoints = $.grep(_tourPoints, function(tourPoint, i) {
				return _tourPointsDropped.indexOf(tourPoint.attributes.getID()) == -1;
			});

			_tourPointsDropped = [];
			_tourPointsAdded = [];
			
			processPointsOrder( computeTourPointOrderFromConfig() );
			
			app.data.initialExtentHasBeenEdited = false;
		}

		/**
		 * Update the name and description of the currently selected tour point
		 * @param {Object} name
		 * @param {Object} description
		 */
		this.updateCurrentTourPoint = function(name, description)
		{
			_currentGraphic.attributes.updateNameAndDescription(name, description);

			dojo.publish("CORE_SELECTED_TOURPOINT_UPDATE", {
				index: _currentIndex,
				name: name,
				description: description,
				color: _currentGraphic.attributes.getColor()
			});
		}
		
		this.updateCurrentTourPointColor = function(color)
		{
			_currentGraphic.attributes.setColor(color);

			dojo.publish("CORE_SELECTED_TOURPOINT_UPDATE", {
				index: _currentIndex,
				color: _currentGraphic.attributes.getColor()
			});
		}

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
			var hiddenPoints = [];

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
		 * @param {Object} points Object that include points order and hidden points id's
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

		/**
		 * Find the best matching fields to construct a Map Tour point from the graphic attributes
		 */
		this.electFields = function(attributes)
		{
			console.log("TourData - electFields");

			return new FieldConfig({
				fieldID: electFieldFromAttributes(attributes, APPCFG.FIELDS_CANDIDATE['objectid']) || app.data.getSourceLayer().objectIdField,
				fieldName: electFieldFromAttributes(attributes, APPCFG.FIELDS_CANDIDATE['name']),
				fieldDescription: electFieldFromAttributes(attributes, APPCFG.FIELDS_CANDIDATE['description']),
				fieldURL: electFieldFromAttributes(attributes, APPCFG.FIELDS_CANDIDATE['pic_url']),
				fieldThumb: electFieldFromAttributes(attributes, APPCFG.FIELDS_CANDIDATE['thumb_url']),
				fieldIconColor: electFieldFromAttributes(attributes, APPCFG.FIELDS_CANDIDATE['color'])
			});
		}
		
		function electFieldFromAttributes(attributes, candidates)
		{
			for(var i=0; i < candidates.length; i++) {
				for (var fieldName in attributes) {
					if( fieldName.toLowerCase() == candidates[i].toLowerCase() )
						return fieldName;
				}
			}
			return '';
		}
		
		function electFieldFromFieldsList(fields, candidates)
		{
			for(var i=0; i < candidates.length; i++) {
				for (var j=0; j < fields.length; j++) {
					if( fields[j].name.toLowerCase() == candidates[i].toLowerCase() )
						return fields[j].name;
				}
			}
			return '';
		}

		this.getFieldsConfig = function(disableOverride)
		{
			if( ! disableOverride && WebApplicationData.getFieldsOverride() )
				return WebApplicationData.getFieldsOverride();

			var aTourPoint = this.getTourPoints()[0];
			if( aTourPoint && aTourPoint.attributes )
				return aTourPoint.attributes.getFieldsConfig();
			else
				return this.electFields(app.data.getSourceLayer().templates[0].prototype.attributes);
		}
		
		this.isFSWithURLFields = function()
		{
			var fields = app.data.getSourceLayer().fields;
			return electFieldFromFieldsList(fields, APPCFG.FIELDS_CANDIDATE['pic_url']) != '' 
					&& electFieldFromFieldsList(fields, APPCFG.FIELDS_CANDIDATE['thumb_url']) != '';
		}
		
		this.getWebAppData = function()
		{
			return WebApplicationData.get();
		}
	}
});