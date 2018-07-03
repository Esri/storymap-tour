define([
], function() {
  'use strict';

  return function(options) {
    this.initiated = false;

    if(options.isBuilder || options.classicEmbedMode || options.appCreationDate < options.june2018ReleaseDate){
      return;
    }

    // Defines current app/frame as a story map
    window.app.isEsriStoryMap = true;
    if (window.top !== window.self) {
      // Check if parent app/frame is story map
      try {
        if (parent.window.app.isEsriStoryMap) {
          window.app.isEmbeddedInEsriStoryMap = true;
        }
      } catch(err) {
        window.app.isEmbeddedInEsriStoryMap = false;
      }

      if (window.app.isEmbeddedInEsriStoryMap) {
        return;
      }
    } else {
      return;
    }

    var embedBarStyleTag = '\
      <style type="text/css">\
        .embed-bar {\
          position: absolute;\
          bottom: 0;\
          left: 0;\
          width: 100%;\
          height: 26px;\
          font-family: "Helvetica Neue", Helvetica, Arial, sans-serif;\
          background-color: #f1f1f1;\
          color: #505050;\
          z-index: 99999;\
          line-height: normal;\
        }\
        .embed-left {\
          position: absolute;\
          left: 10px;\
          margin-top: 5px;\
        }\
        .embed-right {\
          position: absolute;\
          right: 10px;\
          margin-top: 4px;\
        }\
        .embedLogoImg {\
          position: absolute;\
          top: 50%;\
          bottom: 50%;\
          left: 0px;\
          max-width: 250px;\
          max-height: 20px;\
          margin: auto 0;\
        }\
        .esri-tagline-embed {\
          margin-left: 70px;\
        }\
        .esri-tagline-embed :hover{\
          color: #036765;\
        }\
        .esri-tagline-embed a {\
          font-size: 15px;\
          font-weight: normal;\
          color: #505050;\
        }\
        .share-embed {\
          position: absolute;\
          top: 2px;\
          right: 22px;\
          padding-right: 8px;\
          outline: none;\
          cursor: pointer;\
        }\
        .open-newtab-embed {\
          position: absolute;\
          top: 2px;\
          right: 0px;\
          outline: none;\
        }\
        .fullscreen-embed {\
          position: absolute;\
          top: 2px;\
          right: 0px;\
          outline: none;\
          cursor: pointer;\
        }\
        .fullScreen {\
          width: 100%;\
          height: 100%;\
          position: absolute;\
          top: 0;\
          left: 0;\
        }\
        .embed-right svg {\
          width: 16px;\
          height: 16px;\
          cursor: pointer;\
        }\
        svg:hover #shareIcon,\
        svg:hover #newTabIcon,\
        svg:hover #fullscreenIcon,\
        svg:hover #compressIcon {\
          fill: #036765;\
        }\
      </style>\
    ';

    var embedBarTemplate = '\
      <div class="embed-left">\
        <div class="esri-logo-embed">\
          <a target="_blank" href="https://www.esri.com">\
						<img alt="Esri logo" class="embedLogoImg" src=' + options.logoPath + ' style="outline: none;">\
          </a>\
        </div>\
        <div class="esri-tagline-embed"><a href="https://storymaps.arcgis.com" target="_blank">' + options.strings.tagline + '</a></div>\
      </div>\
      <div class="embed-right">\
        <div class="share-embed" title="' + options.strings.share + '">\
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 448 512"><path id="shareIcon" fill="#505050" d="M352 320c-22.608 0-43.387 7.819-59.79 20.895l-102.486-64.054a96.551 96.551 0 0 0 0-41.683l102.486-64.054C308.613 184.181 329.392 192 352 192c53.019 0 96-42.981 96-96S405.019 0 352 0s-96 42.981-96 96c0 7.158.79 14.13 2.276 20.841L155.79 180.895C139.387 167.819 118.608 160 96 160c-53.019 0-96 42.981-96 96s42.981 96 96 96c22.608 0 43.387-7.819 59.79-20.895l102.486 64.054A96.301 96.301 0 0 0 256 416c0 53.019 42.981 96 96 96s96-42.981 96-96-42.981-96-96-96z"/></svg>\
        </div>\
        <div class="open-newtab-embed" title="' + options.strings.newTab + '">\
          <a href=' + window.location.href + ' target="_blank">\
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 577 512"><path id="newTabIcon" fill="#505050" d="M576 24v127.984c0 21.461-25.96 31.98-40.971 16.971l-35.707-35.709-243.523 243.523c-9.373 9.373-24.568 9.373-33.941 0l-22.627-22.627c-9.373-9.373-9.373-24.569 0-33.941L442.756 76.676l-35.703-35.705C391.982 25.9 402.656 0 424.024 0H552c13.255 0 24 10.745 24 24zM407.029 270.794l-16 16A23.999 23.999 0 0 0 384 303.765V448H64V128h264a24.003 24.003 0 0 0 16.97-7.029l16-16C376.089 89.851 365.381 64 344 64H48C21.49 64 0 85.49 0 112v352c0 26.51 21.49 48 48 48h352c26.51 0 48-21.49 48-48V287.764c0-21.382-25.852-32.09-40.971-16.97z"/></svg>\
          </a>\
        </div>\
        <div class="fullscreen-embed " title="' + options.strings.fullScreen + '">\
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 448 512"><path id="fullscreenIcon" fill="#505050" d="M0 180V56c0-13.3 10.7-24 24-24h124c6.6 0 12 5.4 12 12v40c0 6.6-5.4 12-12 12H64v84c0 6.6-5.4 12-12 12H12c-6.6 0-12-5.4-12-12zM288 44v40c0 6.6 5.4 12 12 12h84v84c0 6.6 5.4 12 12 12h40c6.6 0 12-5.4 12-12V56c0-13.3-10.7-24-24-24H300c-6.6 0-12 5.4-12 12zm148 276h-40c-6.6 0-12 5.4-12 12v84h-84c-6.6 0-12 5.4-12 12v40c0 6.6 5.4 12 12 12h124c13.3 0 24-10.7 24-24V332c0-6.6-5.4-12-12-12zM160 468v-40c0-6.6-5.4-12-12-12H64v-84c0-6.6-5.4-12-12-12H12c-6.6 0-12 5.4-12 12v124c0 13.3 10.7 24 24 24h124c6.6 0 12-5.4 12-12z"/></svg>\
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 448 512"><path id="compressIcon" fill="#505050" d="M436 192H312c-13.3 0-24-10.7-24-24V44c0-6.6 5.4-12 12-12h40c6.6 0 12 5.4 12 12v84h84c6.6 0 12 5.4 12 12v40c0 6.6-5.4 12-12 12zm-276-24V44c0-6.6-5.4-12-12-12h-40c-6.6 0-12 5.4-12 12v84H12c-6.6 0-12 5.4-12 12v40c0 6.6 5.4 12 12 12h124c13.3 0 24-10.7 24-24zm0 300V344c0-13.3-10.7-24-24-24H12c-6.6 0-12 5.4-12 12v40c0 6.6 5.4 12 12 12h84v84c0 6.6 5.4 12 12 12h40c6.6 0 12-5.4 12-12zm192 0v-84h84c6.6 0 12-5.4 12-12v-40c0-6.6-5.4-12-12-12H312c-13.3 0-24 10.7-24 24v124c0 6.6 5.4 12 12 12h40c6.6 0 12-5.4 12-12z"/></svg>\
        </div>\
      </div>\
    ';

    var shareModalStyleTag = '\
      <style type="text/css">\
        .embed-share-modal {\
          display: none;\
          position: fixed;\
          z-index: 999;\
          left: 0;\
          top: 0;\
          width: 100%;\
          height: 100%;\
          overflow: auto;\
          background-color: rgba(0,0,0, 0.4);\
        }\
        .embed-modal-content {\
          background-color: #fff;\
          margin: 15% auto;\
          padding: 20px;\
          border: 1px solid #888;\
          width: 80%;\
          max-width: 500px;\
          display: flex;\
          flex-direction: column;\
        }\
        .embed-modal-logo {\
          margin-top: -40px;\
          margin-left: -40px;\
          width: 40px;\
          height: 40px;\
          border: 4px solid #FFF;\
          border-radius: 24px;\
          background-color: #196fa6;\
          color: white;\
          font-size: 16px;\
          box-sizing: content-box;\
        }\
        .embed-modal-logo i{\
          margin-left: 8px;\
          margin-top: 7px;\
          font-size: 24px;\
        }\
        .embed-modal-header {\
          padding-bottom: 15px;\
        }\
        .embed-modal-title {\
          line-height: 1.1;\
          font-size: 19px;\
          font-weight: 200;\
          margin-top: -4px;\
        }\
        .embed-modal-body {\
          height: 60px;\
        }\
        .embed-share-url-social {\
          font-size: 10px;\
        }\
        .embed-share-social-container {\
          font-size: 2.5em;\
          color: #4c4c4c;\
        }\
        .embed-share-social-container i:hover {\
          cursor: pointer;\
          color: #036765;\
        }\
        .embed-share-facebook {\
          float: left;\
        }\
        .embed-share-twitter {\
          margin-left: 5px;\
          float: left;\
        }\
        #embed-bitlylink {\
          display: inline-block;\
          height: 38px;\
          width: 240px;\
          text-align: left;\
          font-size: 20px;\
          cursor: text;\
          padding: 0 0 0 10px;\
          line-height: 20px;\
          border: 1px solid #959595;\
          border-radius: 0;\
          background-color: #f8f8f8;\
          opacity: 1;\
        }\
        .embed-bar-btn {\
          background-image: none;\
          border: 1px solid transparent;\
          padding: 6px 12px;\
          font-size: 15px;\
          line-height: 1.5;\
          border-radius: 0;\
          margin-bottom: 0;\
          font-weight: 400;\
        }\
        .btn-bitlylink-open {\
          margin-top: 1px;\
          margin-bottom: 11px;\
          margin-left: 10px;\
          color: #fff;\
          background-color: #196fa6;\
          border-color: #166090;\
          text-transform: uppercase;\
        }\
        .btn-bitlylink-open:hover {\
          background-color: #005e95;\
          border-color: #005e95;\
        }\
        .embed-modal-footer {\
          margin-left: auto;\
          text-align: right;\
        }\
        .embed-modal-footer .btn-close {\
          background-color: #eee;\
          color: #6e6e6e;\
          margin-top: 20px;\
        }\
        .embed-modal-footer .btn-close:hover {\
          background-color: #ccc;\
          color: #6e6e6e;\
        }\
        .embed-modal-body svg {\
          width: 36px;\
          height: 36px;\
          cursor: pointer;\
        }\
        svg:hover #facebookIcon,\
        svg:hover #twitterIcon {\
          fill: #036765;\
        }\
        .embed-modal-logo svg  {\
          width: 24px;\
          height: 24px;\
          margin-top: 8px;\
          margin-left: 6px;\
        }\
        @media(max-width: 530px) {\
          .embed-share-url-container {\
            display: flex;\
            justify-content: flex-start;\
            align-items: stretch;\
            margin-bottom: 11px;\
          }\
          #embed-bitlylink {\
            width: auto;\
            min-width: 0;\
            max-width: 200px;\
            flex-grow: 1;\
            flex-shrink: 1;\
            flex-basis: 0;\
            padding-right: 10px;\
          }\
          .btn-bitlylink-open {\
            flex: 0 0 auto;\
          }\
        }\
      </style>\
    ';

    var shareModalTemplate = '\
      <div class="embed-share-modal">\
        <div class="embed-modal-content">\
          <div class="embed-modal-logo">\
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 448 512"><path id="shareIconLogo" fill="#fff" d="M352 320c-22.608 0-43.387 7.819-59.79 20.895l-102.486-64.054a96.551 96.551 0 0 0 0-41.683l102.486-64.054C308.613 184.181 329.392 192 352 192c53.019 0 96-42.981 96-96S405.019 0 352 0s-96 42.981-96 96c0 7.158.79 14.13 2.276 20.841L155.79 180.895C139.387 167.819 118.608 160 96 160c-53.019 0-96 42.981-96 96s42.981 96 96 96c22.608 0 43.387-7.819 59.79-20.895l102.486 64.054A96.301 96.301 0 0 0 256 416c0 53.019 42.981 96 96 96s96-42.981 96-96-42.981-96-96-96z"/></svg>\
          </div>\
          <div class="embed-modal-header">\
            <h4 class="embed-modal-title">' + options.strings.share + '</h4>\
          </div>\
          <div class="embed-modal-body">\
            <div class="embed-share-url-social">\
              <div class="embed-share-url-panel">\
                <div class="embed-share-url-container">\
                  <input type="text" id="embed-bitlylink" class="form-control embed-bitlylink" aria-label="bitly link">\
                  <a class="btn embed-bar-btn btn-primary btn-bitlylink-open" target="_blank" href="' + window.location.href + '">' + options.strings.open + '</a>\
                </div>\
              </div>\
            </div>\
            <div class="embed-share-social-container">\
              <div class="social-icon embed-share-facebook" title="' + options.strings.shareFacebook + '" aria-label="Share on Facebook button">\
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 448 512"><path id="facebookIcon" fill="#505050" d="M448 80v352c0 26.5-21.5 48-48 48h-85.3V302.8h60.6l8.7-67.6h-69.3V192c0-19.6 5.4-32.9 33.5-32.9H384V98.7c-6.2-.8-27.4-2.7-52.2-2.7-51.6 0-87 31.5-87 89.4v49.9H184v67.6h60.9V480H48c-26.5 0-48-21.5-48-48V80c0-26.5 21.5-48 48-48h352c26.5 0 48 21.5 48 48z"/></svg>\
              </div>\
              <div class="social-icon embed-share-twitter" title="' + options.strings.shareTwitter + '" aria-label="Share on Twitter button">\
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 448 512"><path id="twitterIcon" fill="#505050" d="M459.37 151.716c.325 4.548.325 9.097.325 13.645 0 138.72-105.583 298.558-298.558 298.558-59.452 0-114.68-17.219-161.137-47.106 8.447.974 16.568 1.299 25.34 1.299 49.055 0 94.213-16.568 130.274-44.832-46.132-.975-84.792-31.188-98.112-72.772 6.498.974 12.995 1.624 19.818 1.624 9.421 0 18.843-1.3 27.614-3.573-48.081-9.747-84.143-51.98-84.143-102.985v-1.299c13.969 7.797 30.214 12.67 47.431 13.319-28.264-18.843-46.781-51.005-46.781-87.391 0-19.492 5.197-37.36 14.294-52.954 51.655 63.675 129.3 105.258 216.365 109.807-1.624-7.797-2.599-15.918-2.599-24.04 0-57.828 46.782-104.934 104.934-104.934 30.213 0 57.502 12.67 76.67 33.137 23.715-4.548 46.456-13.32 66.599-25.34-7.798 24.366-24.366 44.833-46.132 57.827 21.117-2.273 41.584-8.122 60.426-16.243-14.292 20.791-32.161 39.308-52.628 54.253z"/></svg>\
              </div>\
            </div>\
          </div>\
          <div class="embed-modal-footer">\
            <button type="button" class="btn embed-bar-btn btnCancel btn-naked btn-close" data-dismiss="modal">' + options.strings.close + '</button>\
          </div>\
        </div>\
      </div>\
    ';

    var createMessage = function() {
      // Add DOM elements
      document.querySelector('body').appendChild(embedBarWrapper);
      document.querySelector('body').appendChild(shareModalWrapper);

      if(!document.fullscreenEnabled && !document.webkitFullscreenEnabled && !document.mozFullScreenEnabled && !document.msFullscreenEnabled){
        document.querySelector(".fullscreen-embed").style.display = "none";
      } else {
        document.querySelector(".open-newtab-embed").style.display = "none";
      }

      hideParentElements();
      createEvents();
    };

    var hideParentElements = function() {
      if(options.isEsriLogo){
        for (var i = 0; i<options.logoElements.length; i++) {
          document.querySelector(options.logoElements[i].selector).style.display = "none";
        }
      }
      for (var j = 0; j<options.shareElements.length; j++) {
        if(options.shareElements[j].length > 1) {
          for (var k = 0; k<options.shareElements[j].length; k++) {
            options.shareElements[j][k].style.display = "none";
          }
        } else {
          document.querySelector(options.shareElements[j].selector).style.display = "none";
        }

      }
      for (var l = 0; l<options.taglineElements.length; l++) {
        if(options.taglineElements[l].length > 1) {
          for (var m = 0; m<options.taglineElements[l].length; m++) {
            if(options.taglineElements[l][m].textContent && options.taglineElements[l][m].textContent.toLowerCase() == "a story map")
              options.taglineElements[l][m].style.display = "none";
          }
        } else {
          if(options.taglineElements[l].text() && options.taglineElements[l].text().toLowerCase() == "a story map")
            document.querySelector(options.taglineElements[l].selector).style.display = "none";
        }
      }
    };

    var createEvents = function() {
      document.querySelector(".fullscreen-embed").addEventListener("click", manageFullscreen);
      document.querySelector(".share-embed").addEventListener("click", toggleShare);
      document.querySelector(".embed-modal-footer .btn-close").addEventListener("click", hideShare);
      document.querySelector(".embed-share-facebook").addEventListener("click", shareFacebook);
      document.querySelector(".embed-share-twitter").addEventListener("click", shareTwitter);
      window.addEventListener("fullscreenchange", checkFullscreenChange);
      window.addEventListener("webkitfullscreenchange", checkFullscreenChange);
      window.addEventListener("mozfullscreenchange", checkFullscreenChange);
      window.addEventListener("msfullscreenchange", checkFullscreenChange);
    };

    var checkFullscreenChange = function(){
      if((document.fullscreenEnabled && !document.fullscreenElement)
        || (document.webkitFullscreenEnabled && !document.webkitFullscreenElement)
        || (document.mozFullScreenEnabled && !document.mozFullScreenElement)
        || (document.msFullscreenEnabled && !document.msFullscreenElement)
      ){
        if(document.querySelector("body").classList.contains("fullscreen"))
          document.querySelector("body").classList.toggle("fullscreen");
        document.querySelectorAll(".fullscreen-embed svg")[0].style.display = "block";
        document.querySelectorAll(".fullscreen-embed svg")[1].style.display = "none";
      }
    };

    var manageFullscreen = function() {
      var embeddedApp = document.querySelector("body");

      if (document.fullscreenEnabled ||
        document.webkitFullscreenEnabled ||
        document.mozFullScreenEnabled ||
        document.msFullscreenEnabled)
      {

        // Enter fullscreen
        if(!embeddedApp.classList.contains("fullscreen")) {
          if (embeddedApp.requestFullscreen) {
            embeddedApp.requestFullscreen();
          } else if (embeddedApp.webkitRequestFullscreen) {
            embeddedApp.webkitRequestFullscreen();
          } else if (embeddedApp.mozRequestFullScreen) {
            embeddedApp.mozRequestFullScreen();
          } else if (embeddedApp.msRequestFullscreen) {
            embeddedApp.msRequestFullscreen();
          }
          embeddedApp.classList.toggle("fullscreen");
          document.querySelector(".fullscreen-embed").title = options.strings.exitFullScreen;
          document.querySelectorAll(".fullscreen-embed svg")[1].style.display = "block";
          document.querySelectorAll(".fullscreen-embed svg")[0].style.display = "none";
        } else {
          // Exit fullscreen
          if (document.exitFullscreen) {
            document.exitFullscreen();
          } else if (document.webkitExitFullscreen) {
            document.webkitExitFullscreen();
          } else if (document.mozCancelFullScreen) {
            document.mozCancelFullScreen();
          } else if (document.msExitFullscreen) {
            document.msExitFullscreen();
          }
          document.querySelector(".fullscreen-embed").title = options.strings.fullScreen;
          document.querySelectorAll(".fullscreen-embed svg")[0].style.display = "block";
          document.querySelectorAll(".fullscreen-embed svg")[1].style.display = "none";
        }
      }
      else {
        document.querySelector(".fullscreen-embed").style.display = "none";
        document.querySelector(".open-newtab-embed").style.display = "block";
        console.log("Full screen not available");
      }
    };

    var toggleShare = function() {
      if(document.querySelector(".embed-share-modal").style.display == "block")
        document.querySelector(".embed-share-modal").style.display = "none";
      else{
        document.querySelector(".embed-share-modal").style.display = "block";
      }
      requestBitly();
    };

    var hideShare = function() {
      document.querySelector(".embed-share-modal").style.display = "none";
    };

    var shareFacebook = function() {
      window.open(
        'http://www.facebook.com/sharer/sharer.php?u=' + document.location.href,
        '',
        'toolbar=0,status=0,width=626,height=436'
      );
    };

    var shareTwitter = function() {
      var twitterOptions = 'text=' + options.appTitle
        + '&url=' + document.location.href
        + '&related=EsriStoryMaps'
        + '&hashtags=StoryMaps';

      window.open(
        'https://twitter.com/intent/tweet?' + twitterOptions,
        '',
        'toolbar=0,status=0,width=626,height=436'
      );
    };

    function requestBitly()
    {
      var bitlyUrl = 'https://arcg.is/prod/shorten?callback=?';
      var targetUrl = document.location.href;
      $.getJSON(
        bitlyUrl,
        {
          "format": "json",
          "apiKey": options.bitlyCreds[0],
          "login": options.bitlyCreds[1],
          "longUrl": targetUrl
        },
        function(response)
        {
          if( ! response || ! response || ! response.data.url )
            return;
          document.querySelector(".embed-bitlylink").value = response.data.url;
        }
      );
    }

    var embedBarHtml = embedBarStyleTag + embedBarTemplate;
    var embedBarWrapper = document.createElement("div");
    embedBarWrapper.className = "embed-bar";
    embedBarWrapper.innerHTML = embedBarHtml;

    var shareModalHtml = shareModalStyleTag + shareModalTemplate;
    var shareModalWrapper = document.createElement("div");
    shareModalWrapper.className = "embedbar-share-modal";
    shareModalWrapper.innerHTML = shareModalHtml;
    setTimeout(function() {
      createMessage();
    },0);
    this.initiated = true;
  };

});
