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
			}
	
			function initContent()
			{
				container.find('h3').html(i18n.viewer.helpPopup.title);
				container.find('.btnClose').html(i18n.viewer.helpPopup.close);

				container.find('.tab').eq(0).html(i18n.viewer.helpPopup.tab1.title);
				container.find('#help-tab1').html(
					i18n.viewer.helpPopup.tab1.div1 + '<br /><br />'
					+ i18n.viewer.helpPopup.tab1.div2
					+ i18n.viewer.helpPopup.tab1.div42 + '<br /><br />'
					+ i18n.viewer.helpPopup.tab1.div5 + '<br />'
				);
				
				container.find('.tab').eq(1).html(i18n.viewer.helpPopup.tab2.title);
				container.find('#help-tab2').html(
					i18n.viewer.helpPopup.tab2.div1 + ' ' + i18n.viewer.helpPopup.tab2.div1a +'<br /><br />'
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
					+ i18n.viewer.helpPopup.tab2.div173 + ' <a href="https://github.com/Esri/map-tour-storytelling-template-js/tree/master/samples" target="_blank">GitHub</a>.<br /><br />'
					+ i18n.viewer.helpPopup.tab2.div14 + '<br />'
					+ '<ul>' 
					+ ' <li><b>' + i18n.viewer.helpPopup.tab2.div151 + '</b>: ' + APPCFG.FIELDS_CANDIDATE.name.join(', ') + '</li>' 
					+ ' <li><b>' + i18n.viewer.helpPopup.tab2.div152 + '</b>: ' + APPCFG.FIELDS_CANDIDATE.description.join(', ') + '</li>' 
					+ ' <li><b>' + i18n.viewer.helpPopup.tab2.div153 + '</b>: ' + APPCFG.FIELDS_CANDIDATE.pic_url.join(', ') + '</li>' 
					+ ' <li><b>' + i18n.viewer.helpPopup.tab2.div154 + '</b>: ' + APPCFG.FIELDS_CANDIDATE.thumb_url.join(', ') + '</li>' 
					+ ' <li><b>' + i18n.viewer.helpPopup.tab2.div155 + '</b>: ' + APPCFG.FIELDS_CANDIDATE.color.join(', ') + '</li>' 
					+ '</ul><br />'
					+ i18n.viewer.helpPopup.tab2.div16 + '<br /><br />'
					+ i18n.viewer.helpPopup.tab2.div162 + '<br /><br />'
					+ i18n.viewer.helpPopup.tab2.div17 + ' '
					+ i18n.viewer.helpPopup.tab2.div172 + '<br /><br />'
					+ '<b>' + i18n.viewer.helpPopup.tab2.div18 + '</b><br />'
					+ i18n.viewer.helpPopup.tab2.div19 + '<br /><br />'
					+ '<b>' + i18n.viewer.helpPopup.tab2.div20 + '</b><br />'
					+ i18n.viewer.helpPopup.tab2.div21 + '<br /><br />'
					+ i18n.viewer.helpPopup.tab2.div22 + '<br /><br />'
					+ i18n.viewer.helpPopup.tab2.div23 + '<br /><br />'
					+ '<div style="text-align:center"><img src="resources/icons/builder-help-data-fs-video.png" /></div><br />'
					+ i18n.viewer.helpPopup.tab2.div24
				);

				container.find('.tab').eq(2).html(i18n.viewer.helpPopup.tab3.title);
				container.find('#help-tab3').html(
					i18n.viewer.helpPopup.tab3.div1 + '<br /><br />'
					+ i18n.viewer.helpPopup.tab3.div2 + '<br />'
					+ '<ul>' + i18n.viewer.helpPopup.tab3.div3 + '</ul><br />'
					+ i18n.viewer.helpPopup.tab3.div4
					+ '<ul>'
					+ ' <li>' + i18n.viewer.helpPopup.tab3.div41 + '</li>'
					+ ' <li>' + i18n.viewer.helpPopup.tab3.div42 + '</li>'
					+ '</ul><br />'
					+ i18n.viewer.helpPopup.tab3.div43 + '<br /><br />'
					+ i18n.viewer.helpPopup.tab3.div5
				);
				
				container.find('.tab').eq(3).html(i18n.viewer.helpPopup.tab4.title);
				container.find('#help-tab4').html(
					'<b>' + i18n.viewer.helpPopup.tab4.div0 + '</b><br />'
					+ i18n.viewer.helpPopup.tab4.div0a + '<br /><br />'
					+ i18n.viewer.helpPopup.tab4.div0b + '<br /><br />'
					+ '<b>' + i18n.viewer.helpPopup.tab4.div1 + '</b><br />'
					+ i18n.viewer.helpPopup.tab4.div2 + '<br /><br />'
					+ i18n.viewer.helpPopup.tab4.div2a + '<br /><br />'
					+ '<b>' + i18n.viewer.helpPopup.tab4.div3 + '</b><br />'
					+ i18n.viewer.helpPopup.tab4.div4 
					+ ' <div style="margin-left: 40px; margin-right: 70px; margin-top: 6px; color: #D14;background-color: #F7F7F9;border: 1px solid #E1E1E8; font-size: 12px; font-family: Monaco, Menlo, Consolas, monospace;">&lt;a href="http://storymaps.esri.com/" style="color:yellow" target="_blank">StoryMaps Website&lt;/a></div>'
					+ '<br />'
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
				
				container.find('.tab').eq(4).html(i18n.viewer.helpPopup.tab5.title);
				container.find('#help-tab5').html(
					i18n.viewer.helpPopup.tab5.div1 + '<br /><br />'
					+ '<strong>' + i18n.viewer.helpPopup.tab5.div2a + '</strong><br />'
					+ i18n.viewer.helpPopup.tab5.div2b + '<br /><br />'
					+ '<strong>' + i18n.viewer.helpPopup.tab5.div2c + '</strong><br />'
					+ i18n.viewer.helpPopup.tab5.div2d + '<br /><br />'
					+ '<strong>' + i18n.viewer.helpPopup.tab5.div3t + '</strong><br />'
					+ i18n.viewer.helpPopup.tab5.div3a + '<br /><br />'
					+ '<strong>' + i18n.viewer.helpPopup.tab5.div3t2 + '</strong><br />'
					+ i18n.viewer.helpPopup.tab5.div3 + '<br /><br />'
					+ i18n.viewer.helpPopup.tab5.div4 + '<br /><br />'
					+ '<strong>' + i18n.viewer.helpPopup.tab5.div5a + '</strong><br />'
					+ i18n.viewer.helpPopup.tab5.div5b
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