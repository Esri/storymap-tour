var loadingIndicator = {};
var i18n = null;

if (document.location.protocol == "file:") {
	$(document).ready(function() {
		$("#fatalError .error-title").html("Application loading failed");
		$("#fatalError .error-msg").html("The application has to be accessed through a web server. Consult user guide for detail.");
		$("#fatalError").show();
	});
}
else {
	dojo.addOnLoad(function() {
		require([
				"dojo/i18n!./resources/nls/template.js?v=" + version,
				"storymaps/ui/loadingIndicator/LoadingIndicator",
				"dojo/domReady!",
				"dojo/ready"
			], function(
				_i18n,
				LoadingIndicator
			){

				i18n = _i18n;
				loadingIndicator = new LoadingIndicator("", "loadingMessage");
				loadingIndicator.setMessage(i18n.viewer.loading.step1);

				require(["storymaps/core/Core", "storymaps/maptour/core/MainView", "storymaps/utils/Helper"], function(Core, MainView, Helper){
					var urlParams = Helper.getUrlParams();
					var isInBuilderMode = urlParams.edit != null || urlParams.fromScratch != null || urlParams.fromscratch != null || urlParams.fromGallery != null;

					if (isInBuilderMode) {
						require(["storymaps/builder/Builder", "storymaps/maptour/builder/BuilderView"], function(Builder, BuilderView) {
							Core.init(new MainView(), Builder);
							Builder.init(Core, new BuilderView());
						});
					}
					else
						Core.init(new MainView());
				});
			}
		);
	});
}
