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

		var _selected;
		var _dropped;

		$(_btnSave).click(save);
		$(_btnClose).click(dismiss);

		$(_btnDelete).fastClick(function(){
			if (_selected) {
				_dropped.push(parseInt($(_selected).data("featureid")));
				$(_selected).remove();
				enableButtons(false);
				renumber();
			}
		});

		$(_btnHide).fastClick(function(){

			if (_selected) {
				if ($(_btnHide).html() == i18n.viewer.organizePopupJS.labelButtonShow) {
					$(_selected).find(".veil").hide();
					$(_selected).find(".numberLabel").show();
				}
				else {
					$(_selected).find(".veil").show();
					$(_selected).find(".numberLabel").hide();
				}

				renumber()
				enableButtons(true);
			}

		});

		this.present = function(tourPoints)
		{
			_dropped = [];

			$(_list).empty();

			$.each(tourPoints, function(index, tourPoint) {
				var pinCssClass = MapTourHelper.getSymbolCss(tourPoint.attributes.getColor());
				var elt = $('<li data-featureid="'+tourPoint.attributes.getID()+'"></li>');
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
				},
				update:function(event,ui) {
					renumber();
				}
			});

			$(_container).modal();

			$($("li",_list)).bind("mousedown", function(event){
				setSelected(event.currentTarget);
			});

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

		function setSelected(selection)
		{
			if (_selected) 
				$(".halo",_selected).hide();
			
			_selected = selection;
			$(".halo",_selected).show();
			enableButtons(true);
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
				dropped: _dropped
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
					$(".numberLabel",value).html(count);
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

			if (_selected) {
				var veil = $(".veil",_selected)[0];
				($(veil).css("display") == "none") ? $(_btnHide).html(i18n.viewer.organizePopupJS.labelButtonHide) : $(_btnHide).html(i18n.viewer.organizePopupJS.labelButtonShow);
			} else
			{
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