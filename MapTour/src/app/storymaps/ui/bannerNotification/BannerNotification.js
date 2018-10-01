define([
  // Import reusable strings as needed (e.g. dojo/i18n!./path/to/template.js)
], function(
 // String Object (e.g. ViewerStrings)
) {
  'use strict';

  var existingNotifications = [];
  var isUniqueNotification = function(id) {
    if (existingNotifications.indexOf(id) >= 0) {
      return false;
    }
    existingNotifications.push(id);
    return true;
  };

  return function(options) {

    // Configuration needed for each template to reference string and other settings
    var config = {
      // BannerNotification strings
      strings: i18n.viewer.bannerNotification
    };

    var settings = {
      // Unique ID for notification DOM element
      id: options.id,
      // Background color of banner message and primary action buttons
      primaryColor: options.primaryColor || '#027bd2',
      // Contrasing color used with primary color
      secondaryColor: options.secondaryColor || '#fff',
      // Override the "Learn More" text in the banner button.
      bannerMainActionText: options.bannerMainActionText || config.strings.learnMore,
      // The browser tooltip text for the close button
      bannerCloseActionText: options.bannerCloseActionText || config.strings.close,
      // Text to display next to a checkbox to tell the user the message shouldn't display again
      dontShowAgainText: options.dontShowAgainText || config.strings.dontShowAgain,
      // The message to display in the banner
      bannerMsg: options.bannerMsg,
      // The html of the main message. CSS supports the following tags h1, h2, h3, and p.
      mainMsgHtml: options.mainMsgHtml,
      // An array of action objects
      // {
      //   primary: true or false, Should the button be themed as a primary action or secondary action.
      //   string: 'Example', // The text for the button
      //   action: function () {...}, // The method to call
      //   closeOnAction: true or false, // Should the banner notification be closed when the action is called
      // }
      actions: [].concat(options.actions),
      // The cookie properties for "Do not show again"
      // See syntax attributes: https://developer.mozilla.org/en-US/docs/Web/API/Document/cookie
      // Supported attributes (domain, path, and max-age)
      // {
      //   domain: 'www.example.org',
      //   path: '/example/path',
      //   maxAge: 123456 //(calculated expiry date for browser support).
      // }
      cookie: {
        domain: options.cookie.domain,
        path: options.cookie.path,
        maxAge: options.cookie.maxAge || 0
      },
      // The number of times to show the banner message before it doesn't shown
      // again.
      autohideAfter: typeof options.autohideAfter !== 'undefined' ? options.autohideAfter : 2,
      // The number of milliseconds after which the banner will disappear.
      fadeAfter: typeof options.fadeAfter !== 'undefined' ? options.fadeAfter : 30000,
      // The IDs of other banner notification that will block this banner from
      // showing if their hidden cookie has not been set. This allows you to
      // only show a single banner per app load.
      // NOTE: All blockingNotifications must use the same cookie domain
      blockingNotifications: options.blockingNotifications || []
    };

    var cookieKey = 'bannerNotification_' + settings.id + '_hidden';

    var setDontShowCookie = function(incrementAutoHide) {
      var domain = settings.cookie.domain ? 'domain=' + settings.cookie.domain + ';' : '';
      var path = settings.cookie.path ? 'path=' + settings.cookie.path + ';' : '';
      var maxAge = new Date(new Date().getTime() + (settings.cookie.maxAge * 1000)).toUTCString();
      var dontShowCheckbox = document.querySelector('#'+ settings.id + '-banner-notification-dont-show');
      if (dontShowCheckbox && dontShowCheckbox.checked) {
        document.cookie = cookieKey + '=true;expires=' + maxAge + ';' + domain + path;
      }
      else if (incrementAutoHide === true) {
        var cookieValue = document.cookie.replace(new RegExp('(?:(?:^|.*;\\s*)' + cookieKey + '\\s*\\=\\s*([^;]*).*$)|^.*$'), '$1');
        var cookieInt = parseInt(cookieValue, 10);
        if (settings.autohideAfter === 0) {
          document.cookie = cookieKey + '=true;expires=' + maxAge + ';' + domain + path;
        }
        else if (cookieValue.length === 0) {
          document.cookie = cookieKey + '=0;expires=' + maxAge + ';' + domain + path;
        }
        else if (cookieInt !== isNaN && cookieInt < settings.autohideAfter - 1) {
          document.cookie = cookieKey + '=' + (cookieInt + 1) + ';expires=' + maxAge + ';' + domain + path;
        }
        else if (cookieInt !== isNaN && cookieInt >= settings.autohideAfter - 1) {
          window.onbeforeunload = function() {
            var cv = document.cookie.replace(new RegExp('(?:(?:^|.*;\\s*)' + cookieKey + '\\s*\\=\\s*([^;]*).*$)|^.*$'), '$1');
            if (cv !== 'false') {
              document.cookie = cookieKey + '=true;expires=' + maxAge + ';' + domain + path;
            }
          };
        }
      }
      else {
        document.cookie = cookieKey + '=false;expires=' + maxAge + ';' + domain + path;
      }
    };

	var bannerTimer;
    var isNotificationBlocked = function() {
      var isBlocked = false;
      var blockingNotifications = [].concat(settings.blockingNotifications);

      for (var i = 0; i < blockingNotifications.length; i++) {
        if (document.cookie.replace(new RegExp('(?:(?:^|.*;\\s*)bannerNotification_' + blockingNotifications[i] + '_hidden\\s*\\=\\s*([^;]*).*$)|^.*$'), '$1') !== 'true') {
          isBlocked = true;
        }
      }
      return isBlocked;
    };

    var isHidden = function () {
      var cookieValue = document.cookie.replace(new RegExp('(?:(?:^|.*;\\s*)' + cookieKey + '\\s*\\=\\s*([^;]*).*$)|^.*$'), "$1");
      if (settings.autohideAfter === 0) {
        setDontShowCookie(true);
        return true;
      }
      if (isNotificationBlocked() || window.location.href.search(settings.cookie.domain) < 0) {
        return true;
      }
      setDontShowCookie(true);
      return cookieValue === 'true';
    };

    if (!isHidden() && isUniqueNotification(settings.id)) {
      var styleTag = '\
        <style type="text/css">\
          .mobile-view .banner-notification {\
            display: none;\
          }\
          .banner-notification {\
            position: fixed;\
            top: 0;\
            width: 100%;\
            z-index: 9999;\
            animation-duration: 1s;\
            animation-name: slideInBannerNotificationMiniMessage;\
            font-family: "Helvetica Neue", Helvetica, Arial, sans-serif;\
          }\
          #' + settings.id + '.banner-notification .mini-msg-popup {\
            background-color: ' + settings.primaryColor + ';\
            color: ' + settings.secondaryColor + ';\
            padding: 8px 45px 8px 8px;\
            text-align: center;\
            font-size: 16px;\
            cursor: pointer;\
          }\
          .banner-notification button {\
            border: solid 1px;\
            margin: 0;\
            padding: 3px 6px;\
            border-radius: 3px;\
			text-transform: uppercase;\
            width: auto;\
            overflow: visible;\
            background: inherit;\
            font: inherit;\
            color: inherit;\
            cursor: pointer;\
            text-align: inherit;\
            -webkit-font-smoothing: inherit;\
            -moz-osx-font-smoothing: inherit;\
            -webkit-appearance: none;\
          }\
          .banner-notification .mini-msg-popup p {\
            display: inline-block;\
            font-size: 16px;\
            padding: 3px;\
          }\
          #' + settings.id + '.banner-notification .mini-msg-btn {\
            border-color: ' + settings.secondaryColor + ';\
            background-color: ' + settings.primaryColor + ';\
            font-size: 13px;\
          }\
          #' + settings.id + '.banner-notification .mini-msg-btn:hover,\
          #' + settings.id + '.banner-notification .mini-msg-btn:focus {\
            color: ' + settings.primaryColor + ';\
            background-color: ' + settings.secondaryColor + ';\
          }\
          .banner-notification .mini-close {\
            position: absolute;\
            border: none;\
            right: 1px;\
            top: -1px;\
            border-radius: 0;\
            background: none;\
            padding: 0 10px 4px;\
            font-size: 36px;\
            line-height: 1;\
            opacity: 0.6;\
            overflow: hidden;\
          }\
          @media all and (-ms-high-contrast: none), (-ms-high-contrast: active) {\
            .banner-notification .mini-close {\
              top: 3px;\
            }\
          }\
          @supports (-ms-ime-align:auto) {\
            .banner-notification .mini-close {\
              top: 3px;\
            }\
          }\
          .banner-notification .mini-close:hover,\
          .banner-notification .mini-close:focus {\
            opacity: 1;\
          }\
          @keyframes slideInBannerNotificationMiniMessage {\
            from {\
              top: -50px;\
            }\
            to: {\
              top: 0\
            }\
          }\
          \
          .banner-notification .main-msg-wrapper {\
            display: none;\
            width: 100%;\
            background-color: #fff;\
            overflow: auto;\
            -webkit-overflow-scrolling: touch;\
          }\
          .banner-notification.msg-visible .main-msg-wrapper {\
            display: block;\
          }\
          .banner-notification.msg-visible .banner-notification-learn-more-btn {\
            display: none;\
          }\
          .banner-notification .text-column-wrapper {\
            width: 100%;\
            max-width: 700px;\
            margin: auto;\
            line-height: 1.6em;\
          }\
          .banner-notification .text-column-wrapper-inner {\
            width: 100%;\
            margin: 0 15px;\
          }\
          .banner-notification .text-column-wrapper h1 {\
            font-size: 1.9em;\
            margin: 25px 0 15px;\
            font-weight: 400;\
          }\
          .banner-notification .text-column-wrapper h2 {\
            font-size: 1.5em;\
            margin: 30px 0 -10px;\
            font-weight: 400;\
          }\
          .banner-notification .text-column-wrapper h3 {\
            font-size: 1.3em;\
            margin: 30px 0 -10px;\
            font-weight: 400;\
          }\
          .banner-notification .text-column-wrapper p {\
            margin: 20px 0 0;\
            font-size: 1.1em;\
            font-weight: 200; \
          }\
          .banner-notification .text-column-wrapper p strong{\
            font-weight: 400;\
          }\
          #' + settings.id + '.banner-notification .text-column-wrapper p a {\
            font-weight: 200;\
            color: ' + settings.primaryColor + ';\
          }\
          #' + settings.id + '.banner-notification .main-msg-btn {\
            margin: 15px 7px 0 0;\
            padding: 3px 22px;\
            border-color: ' + settings.primaryColor + ';\
            font-size: 15px;\
          }\
          #' + settings.id + '.banner-notification .primary-action {\
            color: ' + settings.secondaryColor + ';\
            background-color: ' + settings.primaryColor + ';\
          }\
          #' + settings.id + '.banner-notification .primary-action:hover,\
          #' + settings.id + '.banner-notification .primary-action:focus {\
            color: ' + settings.primaryColor + ';\
            background-color: ' + settings.secondaryColor + ';\
          }\
          #' + settings.id + '.banner-notification .secondary-action {\
            color: ' + settings.primaryColor + ';\
            background-color: ' + settings.secondaryColor + ';\
          }\
          #' + settings.id + '.banner-notification .secondary-action:hover,\
          #' + settings.id + '.banner-notification .secondary-action:focus {\
            color: ' + settings.secondaryColor + ';\
            background-color: ' + settings.primaryColor + ';\
          }\
          .banner-notification .banner-notification-dont-show {\
            margin: 25px 0 0 0;\
          }\
          .banner-notification .banner-notification-dont-show label {\
            display: inline;\
            font-size: 0.9em;\
            vertical-align: middle;\
          }\
          .banner-notification .actions-buttons {\
            padding-bottom: 15px;\
          }\
          \
          \
          .banner-notification.msg-visible .main-msg-wrapper {\
            opacity: 1;\
            animation-duration: 0.5s; \
            animation-name: openBannerNotificationMainMessage; \
          }\
          @keyframes openBannerNotificationMainMessage {\
            from {\
              opacity: 0;\
            }\
            to: {\
              opacity: 1;\
            }\
          }\
          .banner-notification.closing {\
            opacity: 0;\
            animation-duration: 0.5s; \
            animation-name: closeBannerNotificationMessage; \
          }\
          @keyframes closeBannerNotificationMessage {\
            from {\
              opacity: 1;\
            }\
            to: {\
              opacity: 0;\
            }\
          }\
        </style>\
      ';

      var miniMsgTemplate = '\
        <div class="mini-msg-popup">\
          <p>' + settings.bannerMsg + '</p>&nbsp;\
          <button type="button" class="mini-msg-btn banner-notification-learn-more-btn">' + settings.bannerMainActionText + '</button>\
          <button type="button" class="banner-notification-close-btn mini-close" title=' + settings.bannerCloseActionText + '>&times;</button>\
        </div>\
      ';

      var mainMsgTemplate = '\
        <div class="main-msg-wrapper">\
          <div class="text-column-wrapper">\
            ' + settings.mainMsgHtml + '\
            <form class="banner-notification-dont-show">\
            <input type="checkbox" id="'+ settings.id + '-banner-notification-dont-show">\
            <label for="'+ settings.id + '-banner-notification-dont-show">' + settings.dontShowAgainText + '</label>\
            </form>\
            <div class="actions-buttons"></div>\
          </div>\
        </div>\
      ';

      var appendActionButtons = function() {
        var actionsPanel = document.querySelector('#' + settings.id + ' .actions-buttons');

        for (var i = 0; i < settings.actions.length; i++) {
          var props = settings.actions[i];
          var actionBtn = document.createElement('button');

          actionBtn.innerHTML = props.string;
          actionBtn.setAttribute('type', 'button');
          actionBtn.classList.add('main-msg-btn');

          if (props.primary) {
            actionBtn.classList.add('primary-action');
          } else {
            actionBtn.classList.add('secondary-action');
          }

          if (props.closeOnAction) {
            actionBtn.classList.add('banner-notification-close-btn');
          }

          if (typeof props.action === 'function') {
            actionBtn.addEventListener('click', props.action);
            actionBtn.addEventListener('keypress', function(e) {
              if (e.keyCode === 13) {
                props.action();
              }
            });
          }

          actionsPanel.appendChild(actionBtn);
        }
      };

      var escapeEvent = function (e) {
        if (e.keyCode === 27) {
          closeMessage();
        }
      };

      var resizeMainMsg = function () {
        var newHeight = document.body.offsetHeight - document.querySelector('#' + settings.id + '.banner-notification .mini-msg-popup').offsetHeight;

        document.querySelector('#' + settings.id + ' .main-msg-wrapper').style.height = newHeight + "px";
      };

      var openMessage = function () {
        document.querySelector('#' + settings.id + '.banner-notification').classList
          .add('msg-visible');

        document.addEventListener('keyup', escapeEvent);

        document.querySelector('#' + settings.id + '-banner-notification-dont-show').checked = true;
        setDontShowCookie();
		clearTimeout(bannerTimer);
      };

      var closeMessage = function (e) {
        if (e && e.stopPropagation) {
          e.stopPropagation();
        }

        document.removeEventListener('keyup', escapeEvent);
        window.removeEventListener('resize', resizeMainMsg);

        var msgWrapper = document.querySelector('#' + settings.id + '.banner-notification');
        msgWrapper.classList
          .add('closing');

        setTimeout(function() {
          msgWrapper.parentNode.removeChild(msgWrapper);
        }, 500);
      };

      var createMessage = function() {
        // Add DOM elements
        document.querySelector('body').appendChild(bannerNotificationWrapper);

        // Add actions buttons
        appendActionButtons();

        // Add events
        var learnMore = document.querySelector('#' + settings.id + ' .mini-msg-popup');
        var closeBtns = document.querySelectorAll('#' + settings.id + ' .banner-notification-close-btn');
        var dontShowCheckbox = document.querySelector('#'+ settings.id + '-banner-notification-dont-show');

        window.addEventListener('resize', resizeMainMsg);

        // Open Message
        learnMore.addEventListener('click', openMessage);
        learnMore.addEventListener('keypress', function(e) {
          if (e.keyCode === 13) {
            openMessage();
          }
        });

        // Close Message
        for (var i = 0; i < closeBtns.length; i++) {
          var closeBtn = closeBtns[i];
          closeBtn.addEventListener('click', closeMessage);
          closeBtn.addEventListener('keypress', function (e) {
            if (e.keyCode == 13) {
              closeMessage(e);
            }
          });
        }
		// Close message if ignored by author when bannerTimer expires
        bannerTimer = setTimeout(closeMessage, settings.fadeAfter);

        // Don't show again checkbox
        dontShowCheckbox.addEventListener('click', setDontShowCookie);
        dontShowCheckbox.addEventListener('keypress', function(e) {
          if (e.keyCode === 13) {
            setDontShowCookie();
          }
        });

        learnMore.focus();
        resizeMainMsg();
      };

      // Create wrapper and append to body
      var bannerNoficationMsgHtml = styleTag + miniMsgTemplate + mainMsgTemplate;
      var bannerNotificationWrapper = document.createElement("div");
      bannerNotificationWrapper.setAttribute("id", settings.id);
      bannerNotificationWrapper.className = "banner-notification";
      bannerNotificationWrapper.innerHTML = bannerNoficationMsgHtml;
      setTimeout(function() {
        createMessage();
      },2000);
    }

  };

});
