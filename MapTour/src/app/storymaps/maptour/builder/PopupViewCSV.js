define(["storymaps/utils/Helper",
		"storymaps/utils/WebMapHelper",
		"storymaps/maptour/builder/MapTourBuilderHelper",
		"storymaps/maptour/core/MapTourHelper",
		"dojo/_base/lang",
		"dojox/data/CsvStore",
		"esri/map",
		"esri/layers/FeatureLayer",
		"esri/geometry/Point",
		"esri/renderers/UniqueValueRenderer",
		"esri/geometry/webMercatorUtils",
		"esri/graphicsUtils",
		"esri/config",
		"dojo/_base/array",
		"dojo/on"],
	function (
		Helper,
		WebMapHelper,
		MapTourBuilderHelper,
		MapTourHelper,
		lang,
		CsvStore,
		Map,
		FeatureLayer,
		Point,
		UniqueValueRenderer,
		webMercatorUtils,
		graphicsUtils,
		esriConfig,
		array,
		on)
	{
		return function PopupViewCSV(parentContainer)
		{
			var LAT_FIELD_CANDIDATES  = ["lat", "latitude", "y", "ycenter"];
			var LONG_FIELD_CANDIDATES = ["lon", "long", "longitude", "x", "xcenter"];

			// Clone the #popupViewCSV template into a new DIV
			$('#init-import-views').append($('#popupViewCSV').clone());
			// The container is the newly cloned
			var _container = $('.popupViewCSV').last();
			// Assign an unique ID
			_container.attr("id", "popupViewCSV_" + parentContainer.attr("id"));

			// Assign an unique id to the webmap container
			var _mapDivId = "csvResultMap_" + parentContainer.attr("id");
			_container.find(".csvResultMap").attr("id", _mapDivId);

			var _state = "home";

			var _portal = null;
			var _webmap = null;
			var _layer = null;
			var _fields = null;
			var _startIndex = null;
			var _nbPicturesMax = -1;
			var _nbPicturesAuthorized = -1;

			var _initCompleteDeferred = null;
			var _footer = null;

			var _csvMap = null;
			var _resultFeatureCollection = null;

			this.init = function(params, initCompleteDeferred, footer)
			{
				// Init screen specific
				_portal = params.portal;
				_webmap = params.webmap;
				// Import screen specific
				_layer = params.layer;
				_fields = params.layerFields;
				_startIndex = params.startIndex || 0;
				// Common
				_nbPicturesMax = params.nbPicturesMax;
				_nbPicturesAuthorized = params.nbPicturesAuthorized;

				_initCompleteDeferred = initCompleteDeferred;
				_footer = footer;

			};

			this.getView = function()
			{
				if( window.FileReader )
					showView('home');
				else
					showView('error');
				return _container;
			};

			this.getNextView = function()
			{
				if( _state == "result" ) {
					if( _layer )
						importLayer();
					else
						saveWebmap();
				}

				return;
			};

			this.getTitle = function()
			{
				return i18n.viewer.viewCSV.title;
			};

			//
			// FILE SELECTION VIEW
			//

			function fileSelected(data)
			{
				if( data.files || data ) {
					var files = data.files || data;

					if ( files.length != 1 || files[0].name.indexOf(".csv") == -1 )
						return;

					var file = files[0];
					var reader = new FileReader();
					reader.onload = function (){ parseCSV(reader.result); };
					reader.readAsText(file);

					/*
					if (file.data) {
						var decoded = bytesToString(dojox.encoding.base64.decode(file.data));
						parseCSV(decoded);
					}
					*/
				}
				// IE ActiveX
				/*
				else if ( data.value ){
					if ( data.value.indexOf(".csv") == -1 )
						return;

					var fso  = new ActiveXObject("Scripting.FileSystemObject");
					var fh = fso.OpenTextFile(data.value, 1);
					var contents = fh.ReadAll();
					fh.Close();
					parseCSV(contents);
				}
				*/
			}

			function parseCSV(data)
			{
				var newLineIdx = data.indexOf("\n");
				var firstLine = lang.trim(data.substr(0, newLineIdx));
				var separator = getSeparator(firstLine);

				// Initialize a Dojo CsvStore
				var csvStore = new CsvStore({
					data: data,
					separator: separator
				});

				// Clean up
				_container.find('.csvResultHeader').removeClass('error');
				_container.find('.csvResultFields').html("");
				clearFileSelectInput();
				if( _csvMap ) {
					_csvMap.destroy();
					_csvMap = null;
					_container.find("#" + _mapDivId).hide();
				}

				csvStore.fetch({
					onComplete: function(items){
						var objectId = _startIndex;
						var latField, longField;
						var fieldNames = csvStore._attributes;
						var error;

						// Empty CSV
						if( ! items.length ) {
							showError(i18n.viewer.viewCSV.resultHeaderEmpty);
							showView('result', 'error');
							return;
						}

						// Find lat/long fields
						array.forEach(fieldNames, function(fieldName){
							var matchId = null;

							matchId = array.indexOf(LAT_FIELD_CANDIDATES, fieldName.toLowerCase());
							if (matchId !== -1)
								latField = fieldName;

							matchId = array.indexOf(LONG_FIELD_CANDIDATES, fieldName.toLowerCase());
							if (matchId !== -1)
								longField = fieldName;
						});

						if( ! latField || ! longField ) {
							showError(i18n.viewer.viewCSV.errorLatLng.replace('%LAT%', LAT_FIELD_CANDIDATES.join(', ')).replace('%LONG%', LONG_FIELD_CANDIDATES.join(', ')));
							showView('result', 'error');
							return;
						}

						// Look for name/description/url and thumb fields
						// Fail if not found
						var fieldsMatchCSV = app.data.lookForMatchingFields(fieldNames);
						if( ! fieldsMatchCSV.allFieldsFound ) {
							error = i18n.viewer.viewCSV.errorFieldsExplain + ":";

							error += "<ul>";
							if( ! fieldsMatchCSV.fields.fieldName )
								error += "<li>" + i18n.viewer.viewCSV.errorFieldsName.replace('%VAL%', APPCFG.FIELDS_CANDIDATE.name.join(', ')) + "</li>";
							if( ! fieldsMatchCSV.fields.fieldDescription )
								error += "<li>" + i18n.viewer.viewCSV.errorFieldsDesc.replace('%VAL%', APPCFG.FIELDS_CANDIDATE.description.join(', ')) + "</li>";
							if( ! fieldsMatchCSV.fields.fieldURL )
								error += "<li>" + i18n.viewer.viewCSV.errorFieldsUrl.replace('%VAL%', APPCFG.FIELDS_CANDIDATE.pic_url.join(', ')) + "</li>";
							if( ! fieldsMatchCSV.fields.fieldThumb )
								error += "<li>" + i18n.viewer.viewCSV.errorFieldsThumb.replace('%VAL%', APPCFG.FIELDS_CANDIDATE.thumb_url.join(', ')) + "</li>";
							error += "</ul>";

							showError(error);
							showView('result', 'error');
							return;
						}

						// Add the optional color field if not present
						if( ! fieldsMatchCSV.fields.fieldColor )
							fieldNames.push(APPCFG.FIELDS_CANDIDATE.color[0]);

						// If in import mode, filter the fields to only keep the one present in the existing layer
						if( _fields ) {
							fieldNames = fieldNames.filter(function(field) {
								return _fields.indexOf(field) != -1;
							});
						}

						// Look for fields after the filtering
						// Fail if some are not found
						var fieldsMatchCSVAfterFilter = app.data.lookForMatchingFields(fieldNames);
						if( _fields ) {
							var fieldsMatchLayer = app.data.lookForMatchingFields(_fields);

							if( ! fieldsMatchCSVAfterFilter.allFieldsFound ) {
								error = i18n.viewer.viewCSV.errorFields2Explain + ":";

								error += "<ul>";
								if (!fieldsMatchCSVAfterFilter.fields.fieldName)
									error += "<li>" + i18n.viewer.viewCSV.errorFields2Name.replace('%VAL1%', fieldsMatchCSV.fields.fieldName).replace('%VAL2%', fieldsMatchLayer.fields.fieldName) + "</li>";
								if (!fieldsMatchCSVAfterFilter.fields.fieldDescription)
									error += "<li>" + i18n.viewer.viewCSV.errorFields2Desc.replace('%VAL1%', fieldsMatchCSV.fields.fieldDescription).replace('%VAL2%', fieldsMatchLayer.fields.fieldDescription) + "</li>";
								if (!fieldsMatchCSVAfterFilter.fields.fieldURL)
									error += "<li>" + i18n.viewer.viewCSV.errorFields2Url.replace('%VAL1%', fieldsMatchCSV.fields.fieldURL).replace('%VAL2%', fieldsMatchLayer.fields.fieldURL) + "</li>";
								if (!fieldsMatchCSVAfterFilter.fields.fieldThumb)
									error += "<li>" + i18n.viewer.viewCSV.errorFields2Thumb.replace('%VAL1%', fieldsMatchCSV.fields.fieldThumb).replace('%VAL2%', fieldsMatchLayer.fields.fieldThumb) + "</li>";
								error += "</ul>";

								showError(error);
								showView('result', 'error');
								return;
							}
						}

						// Add back the lat and long field if needed
						if( fieldNames.indexOf(latField) == -1 )
							fieldNames.push(latField);
						if( fieldNames.indexOf(longField) == -1 )
							fieldNames.push(longField);

						// Get the feature collection template
						var featureCollection = generateFeatureCollectionTemplateCsv(csvStore, items);

						// Add records in the CSV
						var nbPointsAdded = 0;
						var featuresNeedReprojection = [];
						array.forEach(items, function(item){
							var attributes = {};

							// Enforce the import limitation
							if( nbPointsAdded >= _nbPicturesAuthorized )
								return;

							nbPointsAdded++;

							// Read all the attributes for  this record/item
							array.forEach(fieldNames, function(attr){
								var value = Number(csvStore.getValue(item, attr));
								if( isNaN(value) )
									value = csvStore.getValue(item, attr);
								if ( value == null || value === undefined )
									value = '';

								attributes[attr] = value;
							});

							attributes.__OBJECTID = objectId++;

							// Take care of lat/long
							var latitude = parseFloat(attributes[latField]);
							var longitude = parseFloat(attributes[longField]);

							if (isNaN(latitude) || isNaN(longitude))
								return;

							// Add new points to the FC
							var geometry = new Point(longitude, latitude);

							if (app.map.spatialReference.wkid == 102100)
								geometry = webMercatorUtils.geographicToWebMercator(geometry);

							var feature = {
								"geometry": geometry.toJson(),
								"attributes": attributes
							};
							featureCollection.featureSet.features.push(feature);

							if ( app.map.spatialReference.wkid != 102100 && app.map.spatialReference.wkid != 4326 )
								featuresNeedReprojection.push(geometry);
						});

						// Prepare the warning message if the number of features imported has been limited
						var importLimitation = "";
						if( nbPointsAdded != items.length ) {
							importLimitation = i18n.viewer.viewCSV.resultHasBeenLimited
												.replace('%VAL1%', nbPointsAdded)
												.replace('%VAL2%', items.length)
												.replace('%VAL3%', _nbPicturesMax);
						}

						if (featuresNeedReprojection.length > 0) {
							// TODO: there should be a wait indicator somewhere (the button on the main screen?)
							esriConfig.defaults.geometryService.project(featuresNeedReprojection, app.map.spatialReference, function(features){
								if (!features || !features.length) {
									console.error("Error fetching items from CSV store: ", error);
									showError(i18n.viewer.viewCSV.resultHeaderEmpty);
									showView('result', 'error');
									return;
								}

								$.each(features, function(i, point){
									featureCollection.featureSet.features[i].geometry = point.toJson();
								});

								showResultMap(featureCollection, csvStore._attributes, importLimitation);
								showView('result');
							});
						}
						else {
							showResultMap(featureCollection, csvStore._attributes, importLimitation);
							showView('result');
						}
					},
					onError: function(error){
						console.error("Error fetching items from CSV store: ", error);
						showError(i18n.viewer.viewCSV.resultHeaderEmpty);
						showView('result', 'error');
					}
				});
			}

			//
			// RESULT VIEW
			//

			function showResultMap(featureCollection, csvFields, importLimitation)
			{
				// The FeatureLayer will pollute featureCollection
				_resultFeatureCollection = lang.clone(featureCollection);

				var featureLayer = new FeatureLayer(featureCollection, { id: 'csvLayer' });

				// Set the renderer
				var renderer = new UniqueValueRenderer(null, "__OBJECTID");
				if( ! _startIndex )
					_startIndex = 1;

				$(featureLayer.graphics).each(function(index, graphic) {
					renderer.addValue({
						value: graphic.attributes.__OBJECTID,
						symbol: MapTourHelper.getSymbol(null, _startIndex + index)
					});
				});
				featureLayer.setRenderer(renderer);

				var nbPoints = featureLayer.graphics.length;

				var headerText = "<b>" + i18n.viewer.viewCSV.resultHeaderSuccess.replace('%NB_POINTS%', nbPoints) + "</b>";
				if( importLimitation )
					headerText += ". " + importLimitation + "." ;
				_container.find('.csvResultHeader').html(headerText);

				// Right Fields panel
				var featureFields = Object.keys(featureLayer.graphics[0].attributes);
				var droppedFields = $(csvFields).not(featureFields).get();
				var fieldsHtml = "";
				if( droppedFields.length ) {
					fieldsHtml += (i18n.viewer.viewCSV.resultFieldsNotAll + ":");

					fieldsHtml += "<ul>";
					$.each(droppedFields, function(i, field){
						fieldsHtml += "<li>" + field + "</li>";
					});
					fieldsHtml += "</ul>";

					fieldsHtml += ("<br />" + i18n.viewer.viewCSV.resultFieldsNotAll2 + ":");
				}
				else
					fieldsHtml += (i18n.viewer.viewCSV.resultFieldsAll + ":");

				fieldsHtml += "<ul>";
				$.each(featureFields, function(i, field) {
					if ( field == "__OBJECTID" || field == "icon_color" )
						return;
					fieldsHtml += "<li>" + field + "</li>";
				});
				fieldsHtml += "</ul>";
				_container.find('.csvResultFields').html(fieldsHtml);

				// Map
				var initialExtent = graphicsUtils.graphicsExtent(featureLayer.graphics);
				_container.find("#" + _mapDivId).show();
				_csvMap = new Map(_mapDivId, {
					slider: true,
					extent: initialExtent,
					smartNavigation: false,
					// iOS requirement
					autoResize: false
				});

				// Handle basemap - copy first layer, default to light grey canvas if bing or not tile/dynamic
				if(app.data.getWebMapItem() && app.data.getWebMapItem().itemData.baseMap){
					$.each(app.data.getWebMapItem().itemData.baseMap.baseMapLayers, function(i, bmLayer){
						$.each(app.map.layerIds, function(i, layerId){
							var basemap;
							if(app.map.getLayer(layerId).url == bmLayer.url){
								_csvMap.addLayer(Helper.cloneLayer(app.map.getLayer(layerId)));
								if(!basemap)
									basemap = app.map.getLayer(layerId);
							} else if(app.map.getLayer(layerId).url && bmLayer.styleUrl){
								var parser1 = document.createElement('a');
								parser1.href = app.map.getLayer(layerId).url;
								var parser2 = document.createElement('a');
								parser2.href = bmLayer.styleUrl;
								if(parser1.hostname + parser1.pathname == parser2.hostname + parser2.pathname){
									_csvMap.addLayer(Helper.cloneLayer(app.map.getLayer(layerId), bmLayer));
									if(!basemap)
										basemap = app.map.getLayer(layerId);
								}
							}
						});
					});
				}
				_csvMap.addLayer(featureLayer);

				on.once(_csvMap, "update-end", function() {
					_csvMap.resize();
					_csvMap.reposition();
					_csvMap.disableKeyboardNavigation();
					initialExtent && _csvMap.setExtent(initialExtent, true);
				});
			}

			//
			// SAVE/IMPORT
			//

			function saveWebmap()
			{
				changeFooterState("progress");

				if( ! _resultFeatureCollection ) {
					console.error("No data to save");
					return;
				}

				// Add the new layer
				_webmap.itemData.operationalLayers.push(MapTourBuilderHelper.getNewLayerJSON(_resultFeatureCollection));
				// Set the extent to the dataset
				app.data.getWebMapItem().item.extent = Helper.serializeExtentToItem(_csvMap.extent);

				var saveSucceed = function() {
					changeFooterState("succeed");
					setTimeout(function(){
						_initCompleteDeferred.resolve();
					}, 800);
				};

				if( app.isDirectCreationFirstSave || app.isGalleryCreation )
					saveSucceed();
				else
					WebMapHelper.saveWebmap(_webmap, _portal).then(saveSucceed);
			}

			function importLayer()
			{
				changeFooterState("progress");

				setTimeout(function(){
					_initCompleteDeferred.resolve(_resultFeatureCollection);
				}, 800);
			}

			//
			// UTILS
			//

			function generateFeatureCollectionTemplateCsv(store, items)
			{
				var featureCollection = MapTourBuilderHelper.getFeatureCollectionTemplate(false);

				array.forEach(store._attributes, function(field){
					var value = store.getValue(items[0], field);
					var parsedValue = Number(value);

					featureCollection.layerDefinition.fields.push({
						"name": field,
						"alias": field,
						"type": isNaN(parsedValue) ? "esriFieldTypeString" : "esriFieldTypeDouble",
						"editable": true,
						"domain": null
					});
				});

				return featureCollection;
			}

			/*
			function bytesToString(b)
			{
				var s = [];
				array.forEach(b, function (c) {
					s.push(String.fromCharCode(c));
				});
				return s.join("");
			}
			*/

			function getSeparator(string)
			{
				var separators = [",", "      ", ";", "|"];
				var maxSeparatorLength = 0;
				var maxSeparatorValue = "";
				array.forEach(separators, function (separator) {
					var length = string.split(separator).length;
					if (length > maxSeparatorLength) {
						maxSeparatorLength = length;
						maxSeparatorValue = separator;
					}
				});
				return maxSeparatorValue;
			}

			//
			// UI
			//

			function showView(view, options)
			{
				_container.find('.popupViewCSVView').hide();
				_container.find('.popupViewCSV-' + view).show();

				changeFooterState(view, options);
			}

			function showError(error)
			{
				_container.find('.csvResultHeader').addClass('error').html(error);
			}

			function changeFooterState(state, options)
			{
				var btnPrev = _footer.find('.btnPrev');
				var btnNext = _footer.find('.btnNext');
				var footerText = _footer.find('.dataFooterText');

				_state = state;

				if( state == "result" ) {
					btnNext.html(i18n.viewer.onlinePhotoSharingCommon.footerImport);
					if( options == "error" )
						btnNext.attr("disabled", "true");
					else
						btnNext.removeAttr("disabled");
					btnNext.show();
					btnPrev.removeAttr("disabled");
					footerText.html("");
					footerText.hide();
				}
				else if( state == "progress" ) {
					btnNext.attr("disabled", "true");
					btnPrev.attr("disabled", "true");
					footerText.html(i18n.viewer.viewCSV.footerProgress + ' <img src="resources/icons/loader-upload.gif" />');
					footerText.show();
				}
				else if( state == "succeed" ) {
					btnNext.attr("disabled", "true");
					btnPrev.attr("disabled", "true");
					footerText.html(i18n.viewer.viewCSV.footerSucceed);
					footerText.show();
				}
				else {
					btnNext.hide();
					btnNext.removeAttr("disabled");
					btnPrev.removeAttr("disabled");
					footerText.html("");
					footerText.hide();
				}
			}

			function clearFileSelectInput()
			{
				_container.find('input.uploadButton').closest("form").get(0).reset();
			}

			function initEvents()
			{
				_container.find('input.uploadButton').change(function(){ fileSelected(this); });

				if( window.File || window.FileReader ) {
					_container.find('.csvUploadWrapper').on("dragover", function(e){
						e.preventDefault();
						e.stopPropagation();
						$(this).css("border-color", "#52a552");
					}).on("drop", function(e){
						if (e.originalEvent.dataTransfer) {
							if (e.originalEvent.dataTransfer.files.length) {
								e.preventDefault();
								e.stopPropagation();
								fileSelected(e.originalEvent.dataTransfer.files);
							}
						}
						$(this).css("border-color", "#848484");
					}).on("dragleave", function(e){
						e.preventDefault();
						e.stopPropagation();
						$(this).css("border-color", "#848484");
					});
				}
			}

			this.initLocalization = function()
			{
				var uploadBtn = _container.find('input.uploadButton');
				var uploadBtnText = i18n.viewer.viewCSV.uploadBtn;
				uploadBtn.attr("title", uploadBtnText);
				uploadBtn.closest("a").html(uploadBtn.closest("a").html().replace('Browse', uploadBtnText));

				_container.find('.popupViewCSV-error').html(i18n.viewer.viewCSV.browserSupport);

				initEvents();
			};
		};
	}
);
