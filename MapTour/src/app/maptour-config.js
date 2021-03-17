APPCFG = {
	//
	// UI
	//

	// Enable embed mode: disable header on desktop
	// Can also be set through url parameter ?embed
	EMBED: false,

	// Header Logo
	HEADER_LOGO_URL: "resources/icons/esri-logo-white.png",
	HEADER_LOGO_TARGET: "https://www.esri.com",
	// Header top right link
	HEADER_LINK_TEXT: "A Story Map",
	HEADER_LINK_URL: "https://storymaps.arcgis.com",
	// Control display of Facebook and Twitter links
	HEADER_SOCIAL: {
		facebook: true,
		twitter: true,
		bitly: {
			enable: true,
			login: "esristorymaps",
			key: "R_14fc9f92e48f7c78c21db32bd01f7014"
		}
	},

	// Header, Picture Panel and Carousel colors
	COLORS: ["#444", "#B4B4B4", "#E5E5E5"],

	// Map popup colors
	POPUP_BACKGROUND_COLOR: "#444444",
	POPUP_BORDER_COLOR: "#444444",
	POPUP_ARROW_COLOR: "#444444",

	// Map popup colors
	HOVER_POPUP_BACKGROUND_COLOR: "#666666",
	HOVER_POPUP_BORDER_COLOR: "#666666",
	HOVER_POPUP_ARROW_COLOR: "#666666",

	// Add a 'zoom on my location' button under the +/home/- buttons
	// For example this is not supported in IE 8
	DISPLAY_LOCATE_BUTTON: false,

	MINIMUM_MAP_WIDTH: 450,
	TIMEOUT_VIEWER_LOAD: 12000,
	TIMEOUT_VIEWER_REQUEST: 8000,
	TIMEOUT_BUILDER_REQUEST: 20000,

	//
	// DATA
	//

	// Date to enforce HTML sanitization and embed bar for apps created after 6/27/18 (June '18 release)
	HTML_SANITIZER_DATE: 1530072000000,
	JUNE_CREATED_DATE: 1530072000000,

	// Case insensitive prioritized list of fields name to be used
	FIELDS_CANDIDATE: {
		objectid: ['__objectid', 'objectid', 'id', 'fid'],
		name: ['name', 'title', 'name-short', 'name-long'],
		description: ['description', 'caption', 'snippet', 'comment'],
		color: ['icon_color', 'color', 'style'],
		pic_url: ['pic_url', 'url', 'pic', 'picture'],
		thumb_url: ['thumb_url', 'thumb', 'thumbnail'],
		is_video: ['is_video', 'video', 'isVideo']
	},

	// Maximum number of points in the tour
	// If not using the USE_STATIC_ICON option, markers have to be numbered from 1 to that value
	MAX_ALLOWED_POINTS: 150,

	//
	// MAP MARKERS
	//

	// Enable the use of static icons for map markers
	// The desktop carousel and mobile UI won't be numbered
	USE_STATIC_ICON: {
		enabled: false,
		// The path can be relative or absolute
		url: 'resources/markers/StaticIcon1.png',
		// If width and height are defined here, markers won't have hover or selected effect
		// To keep those effects, comment the following line and the value from ICON_CFG will be used
		width: 24,
		height: 24
	},
	// Ordered list of pin configuration (has to be lower case)
	PIN_CFG: {
		r: {
			iconPath: 'resources/markers/red/NumberIcon',
			// A css class that define the color to be used for the Desktop carousel and builder organize popup
			cssClass: 'number-red'
		},
		b: {
			iconPath: 'resources/markers/blue/NumberIconb',
			cssClass: 'number-blue'
		},
		g: {
			iconPath: 'resources/markers/green/NumberIcong',
			cssClass: 'number-green'
		},
		p: {
			iconPath: 'resources/markers/purple/IconPurple',
			cssClass: 'number-purple'
		},
		custom: {
			iconPath: 'resources/icons/PaddleTall_Color_Crushed.png',
			iconPath2: 'resources/icons/PaddleTall_Chrome_Crushed.png',
			iconPath3: 'resources/icons/PaddleTall_Chrome_Selected_Crushed.png'
		}
	},
	ICON_CUSTOM_COLORS: {
		r: "#ff5833",
		b: "#33b4ff",
		g: "#63cf73",
		p: "#9374be"
	},
	ICON_CUSTOM_SELECTED_COLOR: {
		r: "#de2900",
		b: "#007ac2",
		g: "#35ac46",
		p: "#7751ab"
	},
	// Default color
	PIN_DEFAULT_CFG: 'r',
	// Pin states
	ICON_CFG: {
		normal: {
			width: 22,
			height: 28,
			offsetX: 3,
			offsetY: 8,
			// Normal state has to define the clip information for mobile UI (carousel, list and picture view)
			clipRules: "clip: rect(0px, 22px, 22px, 0px); left: 13px; top: 13px; height:40px; width: 32px;"
		},
		hover: {
			width: 24,
			height: 30,
			offsetX: 3,
			offsetY: 8
		},
		selected: {
			width: 32,
			height: 40,
			offsetX: 3,
			offsetY: 11
		}
	},

	ICON_CUSTOM_CFG: {
		normal: {
			width: 31,
			height: 49,
			offsetX: 1,
			offsetY: 20
		},
		hover: {
			width: 34,
			height: 54,
			offsetX: 1,
			offsetY: 23
		},
		selected: {
			width: 41,
			height: 65,
			offsetX: 1,
			offsetY: 25
		}
	},

	//
	// Builder
	//

	HELP_URL: "http://links.esri.com/storymaps/map_tour_template",
	HELP_URL_PORTAL: "#/Story_Map_Tour/0193000000w0000000/",

	// links to third-party terms of service
	YOUTUBE_TERMS_LINK: "http://links.esri.com/storymaps/youtube-terms",
	VIMEO_TERMS_LINK: "http://links.esri.com/storymaps/vimeo-terms",
	FLICKR_TERMS_LINK: "http://links.esri.com/storymaps/flickr-terms",
	GOOGLE_TERMS_LINK: "http://links.esri.com/storymaps/google-terms",

	// Control the authorized data source (for initialization and import screen)
	AUTHORIZED_IMPORT_SOURCE: {
		// featureService is set to false in the app when the Map Tour is hosted
		// on a Portal for ArcGIS instance 10.2 as that feature isn't supported yet
		featureService: true,
		flickr: true,
		facebook: true,
		picasa: true,
		youtube: true
	},

	// Online photo sharing services connection parameters
	FLICKR_API_KEY: "750b36a2ac65a72e03cf9cef06d79f45",
	// This Youtube key is valid for application running on arcgis.com and esri.com domains
	// If the application is deployed on Portal for ArcGIS or your own server, the Youtube api call
	//  won't be perfomed until you set the following flag and provide your own key
	YOUTUBE_DISABLE_ON_PORTAL: true,
	YOUTUBE_API_KEY: "AIzaSyDevTFP16nz6sA-akiOVi6wWXiplJnQ4qw",

	COLOR_SCHEMES:  [
		// COLORS is added as the first item at runtime
		{name: "Black", headerColor: "#000", middleColor: "#B4B4B4", footerColor: "#E5E5E5"},
		{name: "Blue", headerColor: "#0e3867", middleColor: "#5d6f89", footerColor: "#9096a9"},
		{name: "Green", headerColor: "#1a3606", middleColor: "#737c6c", footerColor: "#a8b09e"}
	],

	WEBAPP_KEYWORD_GENERIC: ["JavaScript", "Map", "Mapping Site", "Online Map", "Ready To Use", "selfConfigured", "Web Map"],
	WEBAPP_KEYWORD_APP: ["Story Map", "Story Maps", "Map Tour", "MapTour"],

	//
	// Portal configuration
	//

	// Optional array of servers that will leverage CORS (for development or specific cross domain deployment)
	CORS_SERVER: [],

	// Optional array of proxy rules
	PROXY_RULES: [
		/*{
			urlPrefix: "http://services.arcgis.com/",
			proxyUrl: "http://myserver.domain.com/DotNet/proxy.ash"
		}*/
	],

	BING_MAPS_KEY: "",
	HELPER_SERVICES: {
		geometry: {
			//url: location.protocol + "//utility.arcgisonline.com/ArcGIS/rest/services/Geometry/GeometryServer"
		},
		geocode: [
			/*
			{
				url: location.protocol + "//geocode.arcgis.com/arcgis/rest/services/World/GeocodeServer",
				name: "My Geocoder"
			}
			*/
		]
	},

	// Edit those to set a custom sharing or proxy URL
	// You have to edit those only if your webmap is deployed on Portal for ArcGIS instance and if you are not deploying the template on the Portal webserver
	// If you are using ArcGIS Online or deploying the template on a Portal instance, you don't have to edit those URL
	DEFAULT_SHARING_URL: "//www.arcgis.com/sharing/rest/content/items",
	//DEFAULT_SHARING_URL: "//portal.internal.com/arcgis/sharing/rest/content/items",
	DEFAULT_PROXY_URL: "//www.arcgis.com/sharing/proxy"
	//DEFAULT_PROXY_URL: "//portal.internal.com/arcgis/sharing/proxy"
};
