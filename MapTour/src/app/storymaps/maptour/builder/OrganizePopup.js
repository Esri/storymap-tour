define(["storymaps/maptour/core/MapTourHelper"], function (MapTourHelper) {
	return function OrganizePopup(container)
	{
		var _this = this;
		var _container = container;

		var _list = $(_container).find(".picturesGrid");
		var _btnSave = $(_container).find(".btnSave");
		var _btnClose = $(_container).find(".btnClose");
		var _btnDelete = $(_container).find("#btnDelete");
		var _btnHide = $(_container).find("#btnHide");

		var _selectedsIds = [];
		var _dropped = [];

		$(_btnDelete).fastClick(del);
		$(_btnHide).fastClick(hide);

		$(_btnSave).click(save);
		$(_btnClose).click(dismiss);
		
		this.present = function(tourPoints, hasIntroRecord)
		{
			_dropped = [];
			_selectedsIds = [];

			$(_list).empty();

			$.each(tourPoints, function(index, tourPoint) {
				var forceHidden = '';
				if( tourPoint == app.data.getIntroData() )
					forceHidden = 'style="display: none;"';
				
				var pinCssClass = MapTourHelper.getSymbolCss(tourPoint.attributes.getColor());
				var elt = $('<li data-featureid="'+tourPoint.attributes.getID()+'"' + forceHidden + '></li>');
				var img = $('<img src="' + tourPoint.attributes.getThumbURL() + '"/>');
				var num = $('<div class="numberLabel ' + pinCssClass + '">'+(index+1)+'</div>');
				var veil = $('<div class="veil"></div>');
				var halo = $('<div class="halo"></div>');
				
				$(elt).append(img);
				$(elt).append(num);
				$(elt).append(veil);
				$(elt).append(halo);
				$(_list).append(elt);

				if (!tourPoint.attributes.getTourVisibility()) {
					$(veil).show();
					$(num).hide();
				}
			});

			$(_list).sortable({
				start: function(event,ui) {
					$(_list).find(".halo").hide();
					_selectedsIds = [];
				},
				update:function(event,ui) {
					$(_list).find(".halo").hide();
					_selectedsIds = [];
					renumber();
				}
			});

			$(_container).modal();

			$($("li",_list)).bind("mousedown", function(event){
				setSelected(event.currentTarget);
			});
			
			// First record as intro
			$(_container).find('.organizeIntro').html(
				'<input type="checkbox" name="organizeFirstRecordIntro" ' + (hasIntroRecord ? "checked" : "") + '/> ' 
				+ i18n.viewer.builderHTML.introRecordActivate
			);
			
			$(_container).find('input[name="organizeFirstRecordIntro"]').change(onFirstRecordCheckboxChange);

			enableButtons(false);

			setTimeout(function(){
				$.each($("li",_list),function(index,value){
					var halo = $(".halo",value);
					$(halo).width($(value).width()-parseInt($(halo).css("border-left-width"))*2);
					$(halo).height($(value).height()-parseInt($(halo).css("border-left-width"))*2);
				});
			},300);

			renumber();
		}
		
		function save()
		{
			if (_dropped.length == 0) 
				saveConfirmed();
			else {
				createConfirmationPopover();
				return false;
			}
		}

		function setSelected(selectedNode)
		{
			var featureId = $(selectedNode).data("featureid");
			var alreadySelectedIndex = $.inArray(featureId, _selectedsIds);
			
			if( alreadySelectedIndex == -1 ) {
				_selectedsIds.push(featureId);
				$(".halo", selectedNode).show();
			}
			else {
				_selectedsIds.splice(alreadySelectedIndex, 1);
				$(".halo", selectedNode).hide();
			}
			
			if( _selectedsIds.length )
				enableButtons(true);
		}

		function del()
		{
			if (! _selectedsIds.length)
				return;
			
			getSelectedNodes().remove();
			
			_dropped = _dropped.concat(_selectedsIds);
			_selectedsIds = [];
			enableButtons(false);
			renumber();
		}

		function hide()
		{
			if (! _selectedsIds.length)
				return;
			
			var selectedNodes = getSelectedNodes();
			
			if ($(_btnHide).html() == i18n.viewer.organizePopupJS.labelButtonShow) {
				selectedNodes.find(".veil").hide();
				selectedNodes.find(".numberLabel").show();
			}
			else {
				selectedNodes.find(".veil").show();
				selectedNodes.find(".numberLabel").hide();
			}
			
			selectedNodes.find(".halo").hide();
			_selectedsIds = [];
			
			renumber()
			enableButtons(false);
		}
		
		function onFirstRecordCheckboxChange()
		{
			$(_list).find("li").first().css("display", $(this).is(":checked") ? "none" : "block");
			$(_list).find(".veil").first().css("display", $(this).is(":checked") ? "block" : "none");
			renumber();
		}
		
		function getFirstSelectedNode()
		{
			if( ! _selectedsIds.length )
				return;
			
			return $($.grep($(_list).find("li"), function(e){ 
				return $(e).data("featureid") == _selectedsIds[0]; 
			}));
		}
		
		function getSelectedNodes()
		{
			return $($.grep($(_list).find("li"), function(e){ 
				return $.inArray($(e).data("featureid"), _selectedsIds) != -1; 
			}));
		}
		
		function createConfirmationPopover()
		{
			_btnSave.popover({
				html: true,
				trigger: 'manual',
				// Inject the CSS properties
				content: '<script>$("#organizePopup .btnSave").next(".popover").addClass("savePopover");</script>'
							+ generateMessage(_dropped.length)
							+ ' <button type="button" class="btn btn-danger btn-small" onclick="app.builder.organizePopupSaveConfirmationCallback(true);">'+i18n.viewer.builderJS.yes+'</button> '
							+ '<button type="button" class="btn btn-small" onClick="app.builder.organizePopupSaveConfirmationCallback(false);">'+i18n.viewer.builderJS.no+'</button>'
			});
			_btnSave.popover('show');
		}

		this.saveConfirmationCallback = function(confirmed)
		{
			if( confirmed )
				saveConfirmed();
			else
				dismiss();
		}
		
		function saveConfirmed()
		{
			var pointsOrder = $(_list).find("li").map(function(index, element){
				return {
					id: parseInt($(this).data("featureid")),
					visible: $(this).find(".veil").css("display") == "none"
				}
			});
			
			dojo.publish("ORGANIZE_POPUP_SAVE", {
				order: pointsOrder.toArray(),
				dropped: _dropped,
				firstRecordAsIntro: $(_container).find('input[name="organizeFirstRecordIntro"]').is(":checked")
			});
			
			dismiss();
		}

		function dismiss()
		{
			_btnSave.popover('destroy');
			$(_container).modal('hide');
		}

		function renumber()
		{
			var count = 1;
			$.each($("li",_list),function(index,value) {
				if ($(".veil",value).css("display") == "none") {
					$(".numberLabel",value).show().html(count);
					count++;
				}
			});
		}

		function enableButtons(state)
		{
			if( state ) {
				_btnHide.removeAttr("disabled");
				_btnDelete.removeAttr("disabled");
			}
			else {
				_btnHide.attr("disabled", true);
				_btnDelete.attr("disabled", true);
			}

			// The label of the hide/show button is the one appropriate for the first selected item
			if ( _selectedsIds.length ) {
				var veil = $(".veil", getFirstSelectedNode())[0];
				$(_btnHide).html($(veil).css("display") == "none" ? i18n.viewer.organizePopupJS.labelButtonHide : i18n.viewer.organizePopupJS.labelButtonShow);
			} 
			else {
				$(_btnHide).html(i18n.viewer.organizePopupJS.labelButtonHide);
			}
		}

		function generateMessage(count)
		{
			var message;
			message = i18n.viewer.organizePopupJS.messageStart+" ";
			message = message + (count == 1 ? i18n.viewer.organizePopupJS.messageSinglePoint+"." : count+" "+i18n.viewer.organizePopupJS.messageMultiPoint+".");
			message = message + "  "+i18n.viewer.organizePopupJS.messagePermantRemove;
			message = message +  (count == 1 ? " "+i18n.viewer.organizePopupJS.messageRecord+" " : " "+i18n.viewer.organizePopupJS.messageRecordPlural+" ");
			message = message + i18n.viewer.organizePopupJS.messageConfirm;
			return message;
		}
		
		this.initLocalization = function()
		{
			dojo.query('#organizePopup h3')[0].innerHTML = i18n.viewer.builderHTML.organizeHeader;
			dojo.byId('generalCaption').innerHTML = i18n.viewer.builderHTML.organizeGeneralCaption;
			dojo.byId('btnDelete').innerHTML = i18n.viewer.builderHTML.organizeDelete;
			dojo.byId('btnHide').innerHTML = i18n.viewer.builderHTML.organizeHide;
			dojo.query('#organizePopup .btnClose')[0].innerHTML = i18n.viewer.builderHTML.modalCancel;
			dojo.query('#organizePopup .btnSave')[0].innerHTML = i18n.viewer.builderHTML.modalApply;
		}
	}
});