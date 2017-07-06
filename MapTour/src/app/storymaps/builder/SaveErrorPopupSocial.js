define([
	"../utils/Helper",
	"storymaps/maptour/core/WebApplicationData",
	"dojo/Deferred"
	],
	function (
		Helper,
		WebApplicationData,
		Deferred
	) {
		return function SaveErrorPopupSocial(container)
		{
			var _resultDeferred = null;
			
			initLocalization();
			initEvents();
			
			this.present = function()
			{
				_resultDeferred = new Deferred();
				
				container.find('.panel1 .help').tooltip({
					title: i18n.viewer.saveErrorSocial.panel1tooltip + '<img src="resources/icons/builder-help-social.png"/>',
					html: true,
					placement: 'left'
				});
				
				container.find('.panel2 .help').tooltip({
					title: i18n.viewer.saveErrorSocial.panel2q1tooltip,
					html: true
				});
				
				container.modal({ keyboard: false });
				
				return _resultDeferred;
			};
			
			function initLocalization()
			{
				container.find('.modal-title').html(i18n.viewer.saveErrorSocial.title);
				container.find('.panel1lbl').html(i18n.viewer.saveErrorSocial.panel1);
				container.find('.panel2lbl').html(i18n.viewer.saveErrorSocial.panel2);
				container.find('.panel2q1lbl').html(i18n.viewer.saveErrorSocial.panel2q1);
				container.find('.panel2q2lbl').html(i18n.viewer.saveErrorSocial.panel2q2);
				container.find('.panel3').html(i18n.viewer.saveErrorSocial.panel3
					.replace("${MYSTORIES}", '<a href="' + Helper.getMyStoriesURL() + '" target="_blank">' + i18n.viewer.saveErrorSocial.mystories + '</a>'));
				container.find('.panel4lbl').html(i18n.viewer.saveErrorSocial.panel4);
				container.find('.btn-primary').html(i18n.viewer.saveErrorSocial.btnSave);
				
				container.find('.panel1 .help img').attr('src', 'resources/icons/builder-help.png');
				container.find('.panel2 .help img').attr('src', 'resources/icons/builder-help.png');
			}
			
			function initEvents()
			{
				container.find("input[name='optErrorSocial']").change(function () {
					var value = container.find("input[name='optErrorSocial']:checked").val();
					if ( value == 'story' ) {
						container.find('.stop-asking input')
							.attr('disabled', 'disabled')
							.prop('checked', false);
						
						container.find('.stop-asking label').addClass('disabled');
					}
					else {
						container.find('.stop-asking input').removeAttr('disabled');
						container.find('.stop-asking label').removeClass('disabled');
					}
				});
				
				container.find(".btn-primary").click(function(){
					if ( container.find('.stop-asking input').is(':checked') ) {
						WebApplicationData.setDoNotWarnTitle(true);
					}
					
					_resultDeferred.resolve({
						choice: container.find("input[name='optErrorSocial']:checked").val()
					});
					container.modal('hide');
				});
			}
		};
	}
);