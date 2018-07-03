define([],
	function () {
		return function HelpPopup(container)
		{
			var _initDone = false;

			var _tabsBar = container.find(".tab");
			var _tabContent = container.find(".tab-content");
			var _btnClose = container.find(".btnClose");

			_tabsBar.click(onTabClick);

			this.present = function(tabIndex)
			{
				if( ! _initDone )
					initContent();

				_tabsBar.removeClass("disabled");
				_btnClose.removeAttr("disabled");
				container.find(".modal-header .close").attr("data-dismiss", "modal");
				displayTab(tabIndex ? tabIndex : 0);
				$(container).modal({keyboard: true});
			};

			function onTabClick()
			{
				if ( $(this).hasClass("disabled") )
					return;

				displayTab($(this).index());
			}

			function displayTab(index)
			{
				_tabsBar.removeClass("active disabled");
				_tabContent.hide();

				_tabsBar.eq(index).addClass("active");
				_tabContent.eq(index).show();
				var tabContentId = '#help-tab' + index;
				$(tabContentId).scrollTop(0);
			}

			function initContent()
			{
				container.find('h3').html(i18n.viewer.helpPopup.title);
				container.find('.btnClose').html(i18n.viewer.helpPopup.close);

				container.find('.tab').eq(0).html(i18n.viewer.helpPopup.tab1.title);
				container.find('#help-tab1').html(
					i18n.viewer.helpPopup.tab1.div1 + '<br /><br />'
					+ i18n.viewer.helpPopup.tab1.div2
					+ '<b>' + i18n.viewer.helpPopup.tab1.moreInfo + '</b><br /><br />'
					+ i18n.viewer.helpPopup.tab1.infoSites + '<br /><br />'
					+ i18n.viewer.helpPopup.tab1.mtFAQ + '<br /><br />'
				);

				container.find('.tab').eq(1).html(i18n.viewer.helpPopup.tab2.title);
				container.find('#help-tab2').html(
					i18n.viewer.helpPopup.tab2.div1 + '<br /><br />'
					+ i18n.viewer.helpPopup.tab2.div2 + '<br />'
					+ i18n.viewer.helpPopup.tab2.div3 + '<br />'
					+ '<b>' + i18n.viewer.helpPopup.tab2.div10 + '</b><br />'
					+ i18n.viewer.helpPopup.tab2.div11 + '<br /><br />'
					+ '<b>' + i18n.viewer.helpPopup.tab2.div12 + '</b><br />'
					+ i18n.viewer.helpPopup.tab2.div13 + '<br /><br />'
					+ i18n.viewer.helpPopup.tab2.div173 + ' <a href="https://github.com/Esri/map-tour-storytelling-template-js/tree/master/samples" target="_blank">GitHub</a>.<br /><br />'
					+ i18n.viewer.helpPopup.tab2.div14 + '<br />'
					+ '<ul>'
					+ ' <li><b>' + i18n.viewer.helpPopup.tab2.div151 + '</b>: ' + APPCFG.FIELDS_CANDIDATE.name.join(', ') + '</li>'
					+ ' <li><b>' + i18n.viewer.helpPopup.tab2.div152 + '</b>: ' + APPCFG.FIELDS_CANDIDATE.description.join(', ') + '</li>'
					+ ' <li><b>' + i18n.viewer.helpPopup.tab2.div153 + '</b>: ' + APPCFG.FIELDS_CANDIDATE.pic_url.join(', ') + '</li>'
					+ ' <li><b>' + i18n.viewer.helpPopup.tab2.div154 + '</b>: ' + APPCFG.FIELDS_CANDIDATE.thumb_url.join(', ') + '</li>'
					+ ' <li><b>' + i18n.viewer.helpPopup.tab2.div155 + '</b>: ' + APPCFG.FIELDS_CANDIDATE.color.join(', ') + '</li>'
					+ '</ul><br />'
					+ i18n.viewer.helpPopup.tab2.div174 + '<br /><br />'
					+ '<b>' + i18n.viewer.helpPopup.tab2.div20 + '</b><br />'
					+ i18n.viewer.helpPopup.tab2.div21 + '<br /><br />'
				);

				container.find('.tab').eq(2).html(i18n.viewer.helpPopup.tab4.title);
				container.find('#help-tab3').html(
					'<b>' + i18n.viewer.helpPopup.tab4.div1 + '</b><br />'
					+ i18n.viewer.helpPopup.tab4.div2 + '<br /><br />'
					+ '<b>' + i18n.viewer.helpPopup.tab4.div3 + '</b><br />'
					+ i18n.viewer.helpPopup.tab4.div4
					+ ' <div style="margin-left: 40px; margin-right: 70px; margin-top: 6px; color: #D14;background-color: #F7F7F9;border: 1px solid #E1E1E8; font-size: 12px; font-family: Monaco, Menlo, Consolas, monospace;">&lt;a href="https://www.esri.com/" style="color:green" target="_blank">More info&lt;/a></div>'
					+ '<br />'
					+ i18n.viewer.helpPopup.tab4.div4aa + '<br /><br />'
					+ '<b>' + i18n.viewer.helpPopup.tab4.div4a + '</b><br />'
					+ i18n.viewer.helpPopup.tab4.div4b + '<br /><br />'
					+ '<b>' + i18n.viewer.helpPopup.tab4.div5 + '</b><br />'
					+ i18n.viewer.helpPopup.tab4.div6 + '<br /><br />'
					+ '<b>' + i18n.viewer.helpPopup.tab4.div7 + '</b><br />'
					+ i18n.viewer.helpPopup.tab4.div8 + '<br /><br />'
					+ '<b>' + i18n.viewer.helpPopup.tab4.div10 + '</b><br />'
					+ i18n.viewer.helpPopup.tab4.div11
					+ ' ' + i18n.viewer.helpPopup.tab4.div12
				);

				_initDone = true;
			}

			this.initLocalization = function()
			{
				//
			};
		};
	}
);
