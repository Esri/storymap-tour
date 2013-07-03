define([], 
	function () {
		return function HelpPopup(container) 
		{
			var _initDone = false;
			
			var _tabsBar = container.find(".tab");
			var _tabContent = container.find(".tab-content");
			var _btnClose = container.find(".btnClose");

			_tabsBar.click(onTabClick);
			
			this.present = function() 
			{			
				if( ! _initDone )
					initContent();
					
				_tabsBar.removeClass("disabled");
				_btnClose.removeAttr("disabled");
				container.find(".modal-header .close").attr("data-dismiss", "modal");
				displayTab(0);
				$(container).modal({keyboard: true});	
			}
			
			function onTabClick(event) 
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
			}
	
			function initContent()
			{
				container.find('h3').html(i18n.viewer.helpPopup.title);
				container.find('.btnClose').html(i18n.viewer.helpPopup.close);

				container.find('.tab').eq(0).html(i18n.viewer.helpPopup.tab1.title);
				container.find('#help-tab1').html(
					i18n.viewer.helpPopup.tab1.div1 + '<br /><br />'
					+ i18n.viewer.helpPopup.tab1.div2 + '<br /><br />'
					+ i18n.viewer.helpPopup.tab1.div3 + '<br />'
					+ i18n.viewer.helpPopup.tab1.div4 + '<br />'
					+ i18n.viewer.helpPopup.tab1.div5 + '<br />'
					+ i18n.viewer.helpPopup.tab1.div6 + '<br />'
					+ i18n.viewer.helpPopup.tab1.div7
				);
				
				container.find('.tab').eq(1).html(i18n.viewer.helpPopup.tab2.title);
				container.find('#help-tab2').html(
					i18n.viewer.helpPopup.tab2.div1 + '<br /><br />'
					+ i18n.viewer.helpPopup.tab2.div2 + '<br />'
					+ i18n.viewer.helpPopup.tab2.div3 + '<br />'
					+ '<b>' + i18n.viewer.helpPopup.tab2.div4 + '</b><ul>'
					+ '<li>' + i18n.viewer.helpPopup.tab2.div4b + '</li>'
					+ '<li>' + i18n.viewer.helpPopup.tab2.div5 + '</li>'
					+ '<li>' + i18n.viewer.helpPopup.tab2.div6 + '</li>'
					+ '<li>' + i18n.viewer.helpPopup.tab2.div7 + '</li></ul><br />'
					+ '<b>' + i18n.viewer.helpPopup.tab2.div8 + '</b><br />'
					+ i18n.viewer.helpPopup.tab2.div9 + '<br /><br />'
					+ '<b>' + i18n.viewer.helpPopup.tab2.div10 + '</b><br />'
					+ i18n.viewer.helpPopup.tab2.div11 + '<br /><br />'
					+ '<b>' + i18n.viewer.helpPopup.tab2.div12 + '</b><br />'
					+ i18n.viewer.helpPopup.tab2.div13 + '<br /><br />'
					+ i18n.viewer.helpPopup.tab2.div14 + '<br />'
					+ '<ul>' 
					+ ' <li><b>' + i18n.viewer.helpPopup.tab2.div151 + '</b>: ' + APPCFG.FIELDS_CANDIDATE.name.join(', ') + '</li>' 
					+ ' <li><b>' + i18n.viewer.helpPopup.tab2.div152 + '</b>: ' + APPCFG.FIELDS_CANDIDATE.description.join(', ') + '</li>' 
					+ ' <li><b>' + i18n.viewer.helpPopup.tab2.div153 + '</b>: ' + APPCFG.FIELDS_CANDIDATE.pic_url.join(', ') + '</li>' 
					+ ' <li><b>' + i18n.viewer.helpPopup.tab2.div154 + '</b>: ' + APPCFG.FIELDS_CANDIDATE.thumb_url.join(', ') + '</li>' 
					+ ' <li><b>' + i18n.viewer.helpPopup.tab2.div155 + '</b>: ' + APPCFG.FIELDS_CANDIDATE.color.join(', ') + '</li>' 
					+ '</ul><br />'
					+ i18n.viewer.helpPopup.tab2.div16 + '<br /><br />'
					+ i18n.viewer.helpPopup.tab2.div17 + '<br /><br />'
					+ '<b>' + i18n.viewer.helpPopup.tab2.div18 + '</b><br />'
					+ i18n.viewer.helpPopup.tab2.div19
				);

				container.find('.tab').eq(2).html(i18n.viewer.helpPopup.tab3.title);
				container.find('#help-tab3').html(
					i18n.viewer.helpPopup.tab3.div1 + '<br /><br />'
					+ i18n.viewer.helpPopup.tab3.div2 + '<br />'
					+ '<ul>' + i18n.viewer.helpPopup.tab3.div3 + '</ul><br />'
					+ i18n.viewer.helpPopup.tab3.div4 + '<br /><br />'
					+ i18n.viewer.helpPopup.tab3.div5
				);
				
				container.find('.tab').eq(3).html(i18n.viewer.helpPopup.tab4.title);
				container.find('#help-tab4').html(
					'<b>' + i18n.viewer.helpPopup.tab4.div1 + '</b><br />'
					+ i18n.viewer.helpPopup.tab4.div2 + '<br /><br />'
					+ '<b>' + i18n.viewer.helpPopup.tab4.div3 + '</b><br />'
					+ i18n.viewer.helpPopup.tab4.div4 + '<br /><br />'
					+ '<b>' + i18n.viewer.helpPopup.tab4.div5 + '</b><br />'
					+ i18n.viewer.helpPopup.tab4.div6 + '<br /><br />'
					+ '<b>' + i18n.viewer.helpPopup.tab4.div7 + '</b><br />'
					+ i18n.viewer.helpPopup.tab4.div8 + '<br /><br />'
					+ i18n.viewer.helpPopup.tab4.div9
				);
				
				container.find('.tab').eq(4).html(i18n.viewer.helpPopup.tab5.title);
				container.find('#help-tab5').html(
					i18n.viewer.helpPopup.tab5.div1 + '<br /><br />'
					+ i18n.viewer.helpPopup.tab5.div2 + '<br /><br />'
					+ i18n.viewer.helpPopup.tab5.div3 + '<br /><br />'
					+ (i18n.viewer.helpPopup.tab5.div4||'')
				);
				
				_initDone = true;
			}
			
			this.initLocalization = function()
			{
				//
			}
		}
	}
);