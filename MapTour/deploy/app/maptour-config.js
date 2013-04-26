APPCFG = {
	//
	// UI
	//
	
	// Header Logo
	HEADER_LOGO_URL: "resources/icons/esri-logo.png",
	HEADER_LOGO_TARGET: "http://www.esri.com",
	// Header top right link
	HEADER_LINK_TEXT: "A story map",
	HEADER_LINK_URL: "http://storymaps.esri.com/home/",
	// Header, Picture Panel and Carousel colors
	COLORS: ["#444", "#797979", "#c2c2c2"],
	
	MINIMUM_MAP_WIDTH: 450,
	TIMEOUT_VIEWER_LOAD: 12000,
	TIMEOUT_VIEWER_REQUEST: 8000,
	TIMEOUT_BUILDER_REQUEST: 20000,
	
	//
	// DATA
	//
	
	// Case insensitive prioritized list of fields name to be used
	FIELDS_CANDIDATE: {
		objectid: ['__objectid', 'objectid', 'id', 'fid'],
		name: ['name', 'title', 'name-short', 'name-long'],
		description: ['description', 'caption', 'snippet', 'comment'],
		color: ['icon_color', 'color', 'style'],
		pic_url: ['pic_url', 'url', 'pic', 'picture'],
		thumb_url: ['thumb_url', 'thumb', 'thumbnail']
	},
	
	// Pin has to be numbered from 1 to that value
	MAX_ALLOWED_POINTS: 99,
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
		}
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
			// Normal state has to define the clip information for mobile components
			clipRules: "clip: rect(0px, 22px, 22px, 0px); left: 13px; top: 13px; height:40px;"
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
	
	//
	// Builder
	//
	
	DEFAULT_SHARING_URL: "//www.arcgis.com/sharing/content/items",
	COLOR_SCHEMES:  [
		// COLORS is added as the first item at runtime
		{name: "Black", headerColor: "#000", middleColor: "#797979", footerColor: "#c2c2c2"},
		{name: "Blue", headerColor: "#0e3867", middleColor: "#5d6f89", footerColor: "#9096a9"},
		{name: "Green", headerColor: "#1a3606", middleColor: "#737c6c", footerColor: "#a8b09e"}
	],
	// Optional array of server that will leverage CORS (for developement or specific cross domain deployment)
	CORS_SERVER: []
};