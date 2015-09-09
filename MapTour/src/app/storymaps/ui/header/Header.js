define(["storymaps/ui/inlineFieldEdit/InlineFieldEdit",
		"storymaps/utils/Helper",
		"dojo/has", 
		"dojo/topic"], 
	function(
		InlineFieldEdit,
		Helper, 
		has, 
		topic
	){
		/**
		 * Header
		 * @class Header
		 *
		 * UI Header component
		 *  - Mobile and desktop title/subtitle doesn't share the same div
		 *  - So title and subtile are set twice and edits in desktop are reported to the mobile
		 */
		return function Header(selector, isInBuilderMode)
		{
			var _builderButtonHidden = false;
			var _bitlyStartIndexStatus = '';
			
			this.init = function(hideDesktop, title, subtitle, bgColor, logoURL, logoTarget, displaySwitchBuilderButton, topLinkText, topLinkURL, social)
			{
				this.setColor(bgColor);
				this.setLogoInfo(logoURL, logoTarget);
				
				if( hideDesktop )
					$(selector).addClass('hideDesktop');
	
				// Mobile
				$(selector + ' #headerMobile .title').html(title);
				$(selector + ' #headerMobile .subtitle').html(subtitle);
	
				// Desktop builder
				if( isInBuilderMode ) {
					$(selector).addClass('isBuilder');
					title =  "<div class='text_edit_label'>" + (title || i18n.viewer.headerJS.editMe) + "</div>";
					title += "<div class='text_edit_icon' title='"+i18n.viewer.headerJS.templateTitle+"'></div>";
					title += "<textarea rows='1' class='text_edit_input' type='text' spellcheck='true'></textarea>";
	
					subtitle =  "<span class='text_edit_label'>" + (subtitle || i18n.viewer.headerJS.editMe) + "</span>";
					subtitle += "<div class='text_edit_icon' title='"+i18n.viewer.headerJS.templateSubtitle+"'></div>";
					subtitle += "<textarea rows='2' class='text_edit_input' type='text' spellcheck='true'></textarea>";
				}
	
				$(selector + ' #headerDesktop .title').html(title);
				$(selector + ' #headerDesktop .subtitle').html(subtitle);
	
				// Desktop builder
				if( isInBuilderMode )
					new InlineFieldEdit(selector, editFieldsEnterEvent, editFieldsExitEvent);
				
				if( ! isInBuilderMode && ! subtitle ) {
					$(selector + ' #headerDesktop .title').css("margin-top", 40);
					$(selector + ' #headerDesktop .subtitle').css("height", 32).attr("tabindex", "-1");
				}
	
				// Mobile init
				$(window).scroll(this.hideMobileBanner);
				$(selector + " #headerMobile .banner").fastClick(this.hideMobileBanner);
				$(selector + " #openHeaderMobile").fastClick(showMobileHeader);
	
				// Navigation bar
				$(".navBar span").fastClick(function(){
					if( ! $(this).hasClass("current") )
						location.hash = $(this).data("viewid");
				});
	
				if ( displaySwitchBuilderButton ) {
					$(selector + " .switchBuilder").fastClick(this.switchToBuilder);
					$(selector + " .switchBuilder").show();
				}
	
				showMobileHeader(true);
				this.setTopRightLink(topLinkText, topLinkURL);
				this.setSocial(social, true);
				
				$(selector).css("display", "block");
				
				app.requestBitly = requestBitly;
			};
			
			this.resize = function(widthViewport)
			{
				var rightAreaWidth = Math.max($(selector + " #headerDesktop .headerLogoImg").outerWidth() + 50, $(selector + " #headerDesktop .rightArea").outerWidth() + 20);
				$(selector + " #headerDesktop .textArea").width(widthViewport - rightAreaWidth - 15);
			};
	
			this.hideMobileBanner = function(immediate)
			{
				$(selector + " #headerMobile .banner").slideUp(immediate === true ? 0 : 250);
				$(selector + " #openHeaderMobile").css("top", "40px");
				$(selector + " #headerMobile").removeClass("firstDisplay");
			};
			
			this.mobileHeaderIsInFirstState = function()
			{
				return $(selector + " #headerMobile").hasClass("firstDisplay");
			};
	
			this.setColor = function(bgColor)
			{
				$(selector).css("background-color", bgColor);
				$(selector + " #builderPanel").css("background-color", bgColor);
				$(selector + ' #headerMobile').css("background-color", bgColor);
				$("#openHeaderMobile").css("background-color", bgColor);
			};
	
			this.setLogoInfo = function(url, target)
			{
				if ( ! url || url == "NO_LOGO" ) {
					$(selector + ' .logo img').hide();
				}
				else {
					$(selector + ' .logo img').attr("src", url);
					if (target) {
						$(selector + ' .logo img').closest("a")
							.css("cursor", "pointer")
							.attr("href", target)
							.attr("tabindex", "-1");
					}
					else 
						$(selector + ' .logo img').closest("a").css("cursor", "default");
					
					$(selector + ' .logo img').show();
				}
			};
			
			this.setTopRightLink = function(text, link)
			{
				if( link )
					$(selector + ' .social .msLink').html(text ? '<a href="' + link + '" target="_blank" tabindex="-1">' + text + '</a>' : '');
				else if ( text )
					$(selector + ' .social .msLink').html('<span>' + text + '</a>');
				else 
					$(selector + ' .social .msLink').html('');
			};
			
			this.setTitleAndSubtitle = function(title, subtitle)
			{
				$(selector + ' #headerMobile .title').html(title);
				$(selector + ' #headerMobile .subtitle').html(subtitle);
				
				var defaultText = isInBuilderMode ? i18n.viewer.headerJS.editMe : '';
				
				$(selector + ' #headerDesktop .title' + (isInBuilderMode ? ' .text_edit_label' : '')).html(title || defaultText);
				$(selector + ' #headerDesktop .subtitle' + (isInBuilderMode ? ' .text_edit_label' : '')).html(subtitle || defaultText);
			};
			
			this.setSocial = function(social, initialCfg)
			{
				$(selector + " .share_facebook").toggle(
					APPCFG.HEADER_SOCIAL 
					&& APPCFG.HEADER_SOCIAL.facebook 
					&& (!social || social.facebook)
				);
				
				$(selector + " .share_twitter").toggle(
					APPCFG.HEADER_SOCIAL 
					&& APPCFG.HEADER_SOCIAL.twitter 
					&& (!social || social.twitter)
				);
				
				$(selector + " .share_bitly").toggle(
					APPCFG.HEADER_SOCIAL && APPCFG.HEADER_SOCIAL.bitly
					&& APPCFG.HEADER_SOCIAL.bitly.enable && APPCFG.HEADER_SOCIAL.bitly.login 
					&& APPCFG.HEADER_SOCIAL.bitly.key && (!social || social.bitly)
				);
					
				if( initialCfg ) {
					$(selector + " .share_facebook").unbind('click');
					$(selector + " .share_twitter").unbind('click');
					$(selector + " .share_bitly").unbind('click');
					
					$(selector + " .share_facebook").fastClick(shareFacebook);
					$(selector + " .share_twitter").fastClick(shareTwitter);
					$(selector + " .share_bitly").fastClick(shareBitly);
					
					// Bind keyboard enter to click
					$(selector).find(".shareIcon").off('keypress').keypress(function (e) {
						if(e.which == 13) {
							$(this).click();
							return false;  
						}
					});
					
				}
			};
			
			function shareFacebook()
			{
				var options = '&p[title]=' + encodeURIComponent($(selector + ' #headerMobile .title').text())
								+ '&p[summary]=' + encodeURIComponent($(selector + ' #headerMobile .subtitle').text())
								+ '&p[url]=' + encodeURIComponent(document.location.href);
			
				var counter = 0;
				// TODO: make multiple images works 
				/*if ($("meta[property='og:image']").attr("content")) {
					options += '&p[images][' + counter + ']=' + encodeURIComponent($("meta[property='og:image']").attr("content"));
					counter++;
				}*/
				
				$(".carousel-item-div img").slice(0, 1).each(function(i, img){
					options += '&p[images][' + counter + ']=' + encodeURIComponent($(img).attr('src'));
					counter++;
				});
				
				window.open(
					'http://www.facebook.com/sharer.php?s=100' + options, 
					'', 
					'toolbar=0,status=0,width=626,height=436'
				);
			}
			
			function shareTwitter()
			{
				var options = 'text=' + encodeURIComponent($(selector + ' #headerMobile .title').text())
								+ '&url=' + encodeURIComponent(document.location.href)
								+ '&related=EsriStoryMaps'
								+ '&hashtags=storymap'; 
			
				window.open(
					'https://twitter.com/intent/tweet?' + options, 
					'', 
					'toolbar=0,status=0,width=626,height=436'
				);
			}
			
			function shareBitly()
			{
				$(selector).find(".share_bitly").popover({
					trigger: 'manual',
					placement: 'left',
					html: true,
					content: 
						'<div style="width:150px; min-height: 50px; text-align: center">'
						+ ' <div id="bitlyLoad" style="position:absolute; top: 16px; left: 24px; width:130px; text-align:center;">'
						+ '  <img src="resources/icons/loader-upload.gif" alt="Loading" />'
						+ ' </div>'
						+ ' <input id="bitlyInput" type="text" value="" style="display:none; width: 130px; margin-bottom: 0px;"/>'
						+ ' <div style="font-size: 0.8em; margin-top: 2px; margin-bottom: -1px; position: absolute; top: 40px; width: 100%; left: 0px; text-align: center;">'
						+ '  <input id="bitlyStartIndex" type="checkbox" style="width: 10px; vertical-align: -2px;" ' + _bitlyStartIndexStatus + '/> ' 
						+    i18n.viewer.desktopHTML.bitlyStartIndex
						+ ' </div>'
						+ '</div>'
						+ '<script>'
						+ ' $(document).on("click touchstart", function(src) { if( ! src || ! src.target || ! $(src.target).parents(".popover").length ){ $(".share_bitly").popover("hide"); $(document).off("click"); } });'
						+ ' $("#bitlyStartIndex").change(app.requestBitly); '
						+ '</script>'
				}).popover('toggle');
				
				requestBitly();
			}
			
			function requestBitly()
			{
				var bitlyUrls = [
					"http://api.bitly.com/v3/shorten?callback=?", 
					"https://api-ssl.bitly.com/v3/shorten?callback=?"
				];
				var bitlyUrl = location.protocol == 'http:' ? bitlyUrls[0] : bitlyUrls[1];
				
				var urlParams = Helper.getUrlParams();
				var currentIndex = app.data.getCurrentIndex() + 1;
				var targetUrl = document.location.href;
				
				if( $("#bitlyStartIndex").is(":checked") ) {
					if( urlParams.index )
						targetUrl = targetUrl.replace(/index\=[0-9]+/, 'index=' + currentIndex);
					else
						targetUrl = document.location.origin 
									+ document.location.pathname
									+ (!urlParams || $.isEmptyObject(urlParams) ? '?' : document.location.search + '&')
									+ 'index=' + currentIndex 
									+ document.location.hash;
				}
				//else {
					// remove index parameter if any
					//targetUrl = targetUrl.replace(/index\=[0-9]+/, '');
				//}	
				
				if ( isInBuilderMode ) {
					targetUrl = targetUrl.replace(/\?edit&/, '?');
					targetUrl = targetUrl.replace(/\?edit/, '');
					targetUrl = targetUrl.replace(/\&edit/, '');
				}
				
				_bitlyStartIndexStatus = $("#bitlyStartIndex").is(":checked") ? 'checked' : '';
				
				$.getJSON(
					bitlyUrl, 
					{ 
						"format": "json",
						"apiKey": APPCFG.HEADER_SOCIAL.bitly.key,
						"login": APPCFG.HEADER_SOCIAL.bitly.login,
						"longUrl": targetUrl
					},
					function(response)
					{
						if( ! response || ! response || ! response.data.url )
							return;
						
						$("#bitlyLoad").fadeOut();
						$("#bitlyInput").fadeIn();
						$("#bitlyInput").val(response.data.url);
						$("#bitlyInput").select();
					}
				);
			}
	
			function showMobileHeader(immediate)
			{
				$(selector + " #headerMobile .banner").slideDown(immediate === true ? 0 : 250);
			}
			
			function editFieldsEnterEvent()
			{
				if( ! _builderButtonHidden )
					$(selector + " #builderPanel").fadeOut("fast");
				_builderButtonHidden = false;
			}
			
			function editFieldsExitEvent(src, value)
			{
				_builderButtonHidden = true;
				setTimeout(function(){ 
					if( _builderButtonHidden )
						$(selector + " #builderPanel").fadeIn("fast");
					_builderButtonHidden = false;
				}, has("ios") || has("ie") >= 10 ? 500 : 100);
				
				setTimeout(function(){ 
					topic.publish("HEADER_EDITED", {
						src: $(src).attr("class"), 
						value: value
					});
					$(selector + ' #headerMobile .banner .' + $(src).attr("class")).html(value);
				}, has("ios") || has("ie") >= 10 ? 700 : 0);
				
				app.builder.hideSaveConfirmation();
			}
	
			this.switchToBuilder = function() 
			{
				if( document.location.search.match(/appid/) )
					document.location = document.location.protocol + '//' + document.location.host + document.location.pathname + document.location.search + "&edit" + document.location.hash;
				else if ( document.location.search.slice(-1) == '?' )
					document.location = document.location.protocol + '//' + document.location.host + document.location.pathname + "edit"  + document.location.hash;
				else
					document.location = document.location.protocol + '//' + document.location.host + document.location.pathname + "?edit"  + document.location.hash;
			};
			
			this.initLocalization = function()
			{
				//Mobile
				$(selector + ' #closeHeaderMobile').html(i18n.viewer.mobileHTML.hideIntro);
				$(selector + ' #openHeaderMobile').html(i18n.viewer.mobileHTML.showIntro);
				$(selector + ' #listViewLink').html(i18n.viewer.mobileHTML.navList);
				$(selector + ' #mapViewLink').html(i18n.viewer.mobileHTML.navMap);
				$(selector + ' #infoViewLink').html(i18n.viewer.mobileHTML.navInfo);
				//Desktop
				$(selector + ' .msLink').html(i18n.viewer.desktopHTML.storymapsText);
				$(selector + ' .switchBuilder').html('<div><img src="resources/icons/builder-edit-fields.png" /></div>' + i18n.viewer.desktopHTML.builderButton);
				$(selector + ' .share_facebook').attr("title", i18n.viewer.desktopHTML.facebookTooltip);
				$(selector + ' .share_twitter').attr("title", i18n.viewer.desktopHTML.twitterTooltip);
				$(selector + ' .share_bitly').attr("title", i18n.viewer.desktopHTML.bitlyTooltip);
			};
		};
	}
);