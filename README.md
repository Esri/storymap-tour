Map Tour
========
The Map Tour template is designed for presenting geographic information where there is a compelling photographic element to the story you want to tell. This is a new version of the popular map tour template that provide a better experience on smartphone and an interactive builder on ArcGIS Online, see [what's new](#whats-new).

![App](https://raw.github.com/Esri/map-tour-storytelling-template-js/master/map-tour-storytelling-template-js.png)

[View it live](http://storymaps.esri.com/stories/maptour-palmsprings/) | 
[Features](http://arcgis.com/apps/MapTour/preview.html) | 
[User Download (source code not included)](https://github.com/Esri/map-tour-storytelling-template-js/raw/master/Storytelling-MapTour-2.0.zip) | 
[Developer Download](https://github.com/Esri/map-tour-storytelling-template-js/archive/master.zip) 

**Latest release is version 2.0**, if you want to be informed of new releases, we recommend you to watch these repository.


The template produces an attractive, easy-to-use web application that lets you present a small set of places on a map in a numbered sequence through which users can browse. The template is designed to be used in any web browser on any device, including smartphones and tablets.

This help will guide you through the steps for publishing Map Tours like:
 * [Palm Springs Map Tour](http://storymaps.esri.com/stories/demo/map_tour/?webmap=7190edafe7464cb19c1caf1360cd6ee5)
 * [Nederland country's best mountain biking](http://story.maps.arcgis.com/apps/MapTour/index.html?appid=4d6054b109ce482d88588d5c06a7a478)
 * [Los Angeles River Map Tour](http://ugis.esri.com/LA_River_Tour/)

Help content:
 * [Introduction](#introduction)
 * [How to deploy a Map Tour](#how-to-deploy-a-map-tour)
 * [Data storage options](#data-storage-options)
 * [FAQ](#faq)
 * [Tips](#tips)
 * [What's new](#whats-new)
 * [Customize the look and feel](#customize-the-look-and-feel)
 * [Developer guide](#developer-guide)
 * [Feedback](#feedback)
 * [Issues](#issues)
 * [Contributing](#contributing)
 * [Licensing](#licensing)

## Introduction

The template is available in two versions:
 * **An hosted version** in ArcGIS Online that provide hosting and an interactive builder tool to all ArcGIS Online account levels including the free Public account
 * **A downloadable version** that you can deploy on your web server and enhance to fit your needs

You don't have to download the template to use it! You can create and deploy a Map Tour using the hosted version of this template that is built into ArcGIS.com. This is available to all ArcGIS Online account levels including the free Public account. We host the template for you so you don't have to download the template and put it on your server or website. There's an interactive builder too that makes it easy to author your Map Tour. Using the hosted template is the easiest and fastest way to create a Map Tour.

The main element to consider when building a Map Tour is to choose where your pictures will be stored. A Map Tour can use pictures stored on major photo sharing services, on any web server or in Feature Services.
Applications produced by both versions provides the same capabilities, only the authoring is different.

### The hosted version

To use the hosted Map Tour template, you start by making a web map and publishing it with the Map Tour template.

[This article](https://developers.arcgis.com/en/tools/web-mapping-templates/) provides step-by-step instructions. 
For Map Tour, your webmap doesn't need to contains any layer. In the Share dialog available from ArcGIS Online web map viewer, choose the 'Make a Web Application' option and then choose the Map Tour template from the gallery of templates that appears, and continue with the steps that you see. When you configure the application, the interactive builder will open automatically.

The interactive builder gives you two options for handling the images in your Map Tour:
 * You can use **photos that are already online**, such as images stored in a photo sharing site like Flickr or images stored on your own website. These images will be referenced in your Map Tour via their URLs
 * You can also **upload photos from your computer** directly into your Map Tour. This upload option requires that you have an ArcGIS for Organizations subscription account and you have Publisher or Administrator privileges (because it automatically creates a hosted feature service for you in which your photos are stored as attachments)

Using the hosed version will allow you to benefits from ArcGIS Online periodic updates that improve performance and fix issues without introducting breaking changes.
 
### The downloadable version

The hosted Map Tour template provides several customization options that are accessible through the SETTINGS button in the top panel. If you don't find the option you expect or you are a developer and want to enhance the application, you should use the downloadable version.

The downloadable version doesn't offer the interactive builder. The Map Tour gets its data from a web map and its configuration from parameters in a file that offer the same capabilities than the hosted version. We recommend that you create and refine your web map using the hosted version and that you reuse it with the downloadable.

## How to deploy a Map Tour

To use the downloadable version, download the [User Download archive](https://github.com/Esri/map-tour-storytelling-template-js/raw/master/Storytelling-MapTour-2.0.zip), it contains the following files:

| File                	                     | Contains                                                              |
| ------------------------------------------ | --------------------------------------------------------------------- |
| app/            	                         | Optimized source code and configuration files (maptour-config.js)     |
| resources/                                 | Resources (markers, icons, translation)                               |
| **samples/**      			             | Sample data layer to create your webmap                               |
| **index.html**         		             | Application html file (to be edited with web map id)                  |
| **Readme.pdf**       		                 | Detailed readme guide                                                 |

Map Tour rely on a web map to get the tour data. That's the only mandatory configuration. There is multiple ways to build a Map Tour web map:
 * The traditional way, that is to build a CSV and add it as a web map layer using ArcGIS Online web map viewer. [This ArcWatch article](http://www.esri.com/esri-news/arcwatch/0513/make-a-map-tour-story-map) provides step-by-step instructions
 * Using an existing Feature Service, see the chapter below
 * Using the interactive builder on ArcGIS Online. This allow you to build the webmap that you will reuse with the downloadable version. This include importing photos from Flickr, Facebook, Picasa

For detailed instructions and recommendations, please refer to the **[Readme document](https://github.com/Esri/map-tour-storytelling-template-js/raw/master/Readme.pdf)**.

For quick start, a typical Map Tour configuration involves the following steps:
 * Create a web map that fits your need (basemap, eventual additional context layers like the path of your tour, etc.)
 * Import your data
 * Center the web map to the initial extent you want for the tour
 * **Save and share the web map publicly**
 * Open **index.html** with a text file editor
 * Locate the configuration section at the beginning of the file
 * Edit the line **webmap:""** to **include your web map id** between the quotes
 * Optionally remove samples folder and Readme.pdf
 * Copy files to your web server root or in a specific folder

It is crucial for the application performance that your tour points have well-defined thumbnail images. Thumbnail images are used on the bottom carousel and on mobile device. If you choose to host the pictures yourself, you will have to manually create thumbnails of your pictures. Using the full resolution pictures for the thumbnail will result in poor performance. For that reason we strongly recommend that you use an online photo sharing services or a Feature Service in conjunction with the interactive builder that will do that for you. The recommended thumbnail size is 140x93px.

## Data storage options

In addition to the workflow supported by the interactive builder, you can use any point Feature Service, Map Service, Shapefile or CSV as a Map Tour data source if you follow some rules.
To use a layer, simply add it into your webmap through ArcGIS Online web map viewer, 
consult [FAQ](#which-web-map-layer-will-be-used) to learn more about which web map layer will be used.

### Using a CSV

The interactive builder support importing CSV, it will give you detailed information if your CSV doesn't match the requirements. 

### Using an existing Feature Service, Map Service or Shapefile

The application will try to find the expected attributes using a configurable list of possible field name. 
By default, the valid fields names are:

| Fields            		                                | Valid fields names (case insensitive)     |
| ---------------------------------------------------------	| -----------------------------------------	|
| Name (mandatory)     		                                | name, title, name-short, name-long 	    |
| description (mandatory)                                   | caption, description, snippet, comment 	|
| Picture (optional for Feature service with attachments) 	| pic_url, pic, picture, url                |
| Thumbnail (optional for Feature service with attachments)	| thumb_url, thumb, thumbnail               |
| Color (optional for viewer, mandatory for builder)            | icon_color, color, style                  |

If that doesn't match your data, you can change the possible fields name through the configuration file **app/maptour-config.js**.

The picture and Thumbnail fields are mandatory for Feature Service without attachments and optional but strongly recommended for Feature service with attachments (this save one request per feature to get the URL of the picture and thumbnail).

When using a Feature Service that store the pictures as attachments, only the features with two attachments will be used (first attachments defines the main picture, second defines the thumbnail).

The color field is mandatory for the interactive builder. This means that if you are looking to reuse a web map containing a Map Tour layer that doesn't include a color field, the interactive builder will ask you to choose which field has to be used for defining the color. You can select any field and it will default to the default color (red) if the record doesn't contains valid values. But if you choose to use a field used for another Map Tour information, you should not use the  color selection as it would overwrite that information by the new color you define.
If possible, it is more safe to add that extra field to your data.

### Importing pictures from online photo sharing services

Using the interactive builder, you can create a webmap to be reused in the downloadable. That webmap will use photos that are already online, such as images stored in a photo sharing site like Flickr or images stored on your own website. Images will be referenced in your web map via their URLs and a feature collection. This mean that pictures are not stored in ArcGIS Online. If hosted pictures can't be accessed, they won't be available in the Map Tour and you'll see a 'Picture not available' image. Depending on your photo service provider, the Map Tour may not import the name, description and location of the pictures. Those attributes are stored in the web map and any edits to the online services won't be reflected in the Map Tour.

## FAQ

### Is the template compatible with previous version?
Yes, web map designed for the previous version should continue to work without any modification. Customization and enhancement of the application will require code changes, most of them should be easy to translate into the new application.

### Can I deploy Map Tour on Portal for ArcGIS
Yes, but some limitations apply and you will need a special version. Please contact us to get it. Map Tour should be included in future releases of Portal for ArcGIS (after 10.2).

### Can I use the builder with the downloadable
We distribute the builder source code but for technical reason it's not yet usable without a code modification that we don't document. If you are interested, please contact us.

### What are the configuration settings?

Configuration happens in two files:
 * index.html
  - Web map id
  - Application layout
  - Use the first data record as an introduction slide
  - Header title/subtitle (webmap title/subtitle used by default)
  - Force webmap layer to be used
  - Optional zoom level to be applied for the story points following introduction
  - Bing map key
  - Proxy URL
  - Portal URL
  - Geometry service URL
 * app/maptour-config.js
  - Header, picture panel and carousel colors
  - Header logo image and link
  - Header "A story map" title and link
  - Marker sets  
  - Data fields name
  - Map popup

### Which web map layer will be used?
The application will use the web map **upper visible point feature layer**. 

Eligible feature layer are:
 - Feature service with two attachments per feature (main picture has first attachment, thumbnail as the second)
 - Feature layer without attachments
 - Web map embedded data: CSV, Shapefile
 - Map service: specific layer only (e.g. MyService/MapServer/0)

If that doesn't match your web map structure, look for the configuration property named **sourceLayerTitle** in index.html and set it to the title of your web map layer.

  
## Tips

### Pictures

We recommend landscape orientation photos instead of portrait. Portrait orientation images can be used but on smaller screens like the iPad, a lot of the photo may be obscured by the caption, because text takes up more space when it is displayed in a tall area compared to a wide area. Although images of different sizes, shapes and orientation can be used in one Map Tour, we recommend using the exact same size and shape for all the images. In this way, the user won't be distracted by different sized images as they follow the tour.

The recommended picture size is 1090x725px. The recommended thumbnail size is 140x93px.

### Formatting your caption text using HTML tags

The caption text can include HTML tags to define formatting and links, see [this blog post](http://blogs.esri.com/esri/arcgis/2013/03/29/add-links-map-tour/).

### Supporting Layers

You can add additional supporting layers into the map. These layers will appear in your Map Tour to provide orientation, background, and any other geographic features you want the map to show in addition to the Map Tour points, such as a study area, a walking or driving route linking your tour points, etc. The template displays these additional supporting layers using the symbology you specify in the web map, the popup aren't available.

### Keep your tour short and sweet

There's a limit of 99 points per tour. Most Map Tours will of course be significantly shorter than that. Don't expect your audience to want to step through too many tour points. You might find your subject fascinating, but don't assume they will too!


## What's new?

#### Map Tour 2.0 released on 07/03/2013
Major version with the following new functionalities:
 * The hosted version is available to all ArcGIS Online account levels including the free Public account
 * The interactive builder offer to import photos from Flickr, Facebook, Picasa and a CSV
 * The interactive builder can use CSV added through ArcGIS Online web map viewer
 * Serveral UI and productivity improvements for the hosted interactive builder
 * Improved loading time
 * Support of non mercator data
 * Picture panel respond to swipe and keyboard event
 * Mobile introduction view include a start button and can be swiped away
 * Mobile view images are clipped instead of cropped
 * The Map popup can now customized through the configuration file
 
Bug fixes :
 * Application loading issues when using Internet Explorer
 * Application loading issues when using Bing Maps basemap
 * Interactive builder enforce description maximum length

#### Map Tour 1.2 released on 05/31/2013
Minor version with few bug fixes :
 * Optimize application loading process  which should result in improved load times especially on slower connections like 3G mobile connections 
 * Improve header's UI when the subtitle is wrapped on three lines

#### Map Tour 1.1 released on 05/09/2013
Minor version with few bug fixes :
 * Fix some map navigation issues in the three panel layout after important browser width resize (pan impossible on some part of the map)
 * Add the map Esri logo on the three-layout panel
 * Prevent closed black popup to reappear after a map zoom

#### Map Tour 1.0 released on 04/26/2013
 * Responsive web design that offer a new user experience on Smartphone
 * Localized in 20 languages: Arabic, Brazilian Portuguese, Chinese, Danish, Dutch, French, English, German, Hebrew, Italian, Japanese, Korean, Lithuanian, Norwegian, Polish, Portuguese, Romanian, Russian, Spanish and Swedish.
 * Support of Feature Service
 * New layout option: picture float on the right of the map
 * The thumbnail carousel is more interactive (support touch on tablet device, support scrolling on desktop)


## Customize the look and feel
Most of the look and feel customization can be done using the user download and including the css/html override directly into index.html. 
If you want to change the behavior of one functionality or want to add new one, you will need to read the developer guide below.

The easiest way to find the id or path to the DOM element that you want to customize is to use your browser developer tool, read documentation for for [Chrome](https://developers.google.com/chrome-developer-tools/), [Safari](http://developer.apple.com/library/safari/#documentation/AppleApplications/Conceptual/Safari_Developer_Guide/2SafariDeveloperTools/SafariDeveloperTools.html), [Firefox](https://getfirebug.com/).

Here are some customization examples that have to be included inside a \<style\> element after the \<body\> element like below :

      ...
      <body class="claro">
         <style>
            #element {
               /* changes */
            }
         </style>
      <div id="header">
      ...

#### Use an image as the background of the desktop header

      #headerDesktop {
         background: url('resources/my_background.jpg');
      }

To remove the bottom border:

      #header {
         background: none !important;
      }

#### Customizing the links in the top right of the header

Hide the link to the external website and the social buttons:

      #header .social {
         visibility: hidden; 
      }

Same but reuse the vertical space for the logo:

      #header .social {
         display: none;
      }

Hide only the social buttons:

      #header .social > span:not(.msLink) {
         display: none;
      }

The external link can be configured through maptour-config.js file. 

To hide the text, empty the HEADER_LINK_TEXT property.

To display multiple line text, empty the HEADER_LINK_URL and configure HEADER_LINK_TEXT with html markup like 

      <a href='http://myorganization.com' target='_blank'>My organization</a><br /><a href='http://myorganization.com/myproject' target='_blank'>My project</a>

#### Customizing the header logo

The logo image can be configured through maptour-config.js file. To hide the logo, empty the HEADER_LOGO_URL property.

The logo dimension is constrained to 250x50px. To use more horizontal or vertical space you need to remove this restriction using:

      #headerDesktop .logo img {
         max-width: none;
         max-height: 90px;
      }
      
You can save 10 more px by changing the top margin of the logo:

      #headerDesktop .rightArea {
         padding-top: 15px;
      }

      #headerDesktop .logo img {
         max-width: none;
         max-height: 100px;
      }

#### Customize the Map background color
This is useful if you use a custom basemap that don't cover the whole world.

      #mapPanel {
		background-color: #1F1F1F !important;
	  }


## Developer guide

This developer guide is intended to developer that wants to modify behavior or add new functionalities to the Map Tour application. If you only need to customize look and feel of the Map Tour, you should be able to do so using the User download.
It requires basic knowledge of HTML, Javascript and CSS languages.

### Developer archive

Download and unzip the [Developer download](https://github.com/Esri/map-tour-storytelling-template-js/archive/master.zip) or clone the repo.

| File                                       | Contains                                                              |
| ------------------------------------------ | --------------------------------------------------------------------- |
| **MapTour/**            	                 | Map Tour source folder                                                |
| **MapTour/src/**                           | The application source code                                           |
| **MapTour/deploy/**                        | The ready to be deployed Map Tour application                         |
| **MapTour/tools/**                         | Developer tools to build deploy/ from src/                            |
| samples/      			                 | Sample data layer to create your webmap                               |
| Storytelling-MapTour-2.0.zip      		 | User download archive	                                             |
| Readme.pdf       		                     | The detailed readme guide                                             |
| Readme.md                                  | This document                                                         |
| map-tour-storytelling-template-js.png      | The application screenshot                                            |
| license.txt                                | The application license                                               |


### Introduction

To build a production version of the application from the source code, you need:
 * a Windows OS 
 * [Node.js](http://nodejs.org/)
 * [Java Runtime version 6 or higher](http://www.oracle.com/technetwork/java/javase/downloads/jre7-downloads-1880261.html)

The build script use: 
 * [RequireJS](http://requirejs.org/) to optimize the Map Tour code 
 * [Google Closure Compiler](https://developers.google.com/closure/compiler/) and [YUI Compressor](http://yui.github.com/yuicompressor/) to optimize external dependencies

 The script will be ported to a full node.js later on. 

### Design
Map Tour relies on AMD and Dojo loader [AMD](http://help.arcgis.com/en/webapi/javascript/arcgis/jshelp/#inside_dojo_amd) for application structure.

The application is structured as this:

| Path          			                  	| Contains																				|
| ---------------------------------------------	|  ------------------------------------------------------------------------------------ |
| app/      				                     	| Package structured Javascript and CSS source code 									|
| app/maptour-config.js			            	| Configuration file (loaded at execution time) 										|
| app/storymaps/builder/		         		| Builder modules common with other storymaps templates (main module is Builder.js)		|
| app/storymaps/core/		         			| Core modules common with other storymaps templates (main module is Core.js)			|
| app/storymaps/maptour/builder/	         	| UI components of the interactive builder (main module is BuilderView.js) 				|
| app/storymaps/maptour/core/		         	| Core modules (main module is MainView.js) 											|
| app/storymaps/maptour/ui/ 		         	| UI components of the viewer grouped by target device 									|
| app/storymaps/maptour/ui/Responsive.css      	| CSS Media queries rules							 									|
| app/storymaps/maptour/BuildConfigBuilder.js 	| Require.js build configuration file for the interactive builder						|
| app/storymaps/maptour/BuildConfigViewer.js 	| Require.js build configuration file for the viewer 									|
| app/storymaps/ui/ 			               	| UI components common with other storymaps templates 									|
| app/storymaps/utils/ 			            	| Utility modules common with other storymaps templates  								|
| lib/ 					                     	| External dependencies 																|
| resources/nls/                  				| Externalized text strings of the application  										|
| resources/markers/ 			            	| The 4 colors set of map marker 														|
| resources/icons/ 			               		| Icons 																				|

The main dependencies are:
 * [jQuery](http://jquery.com/)
 * [Bootstrap](http://twitter.github.com/bootstrap/)
 * [iScroll](http://cubiq.org/iscroll-4)
 * [SwipeView](http://cubiq.org/swipeview)

### How to use the application from the source code
 * Make accessible the src folder to your web server
 * Edit index.html to the web map you want to use

### How to build application from the source code
  * Open a terminal and navigate to the tools folder 
  * Run the following command:

        build.bat

The deploy folder now contains the built application that you can deploy to your web server.

## Feedback

We would love to hear from you!
* Email us at storymaps@esri.com
* [StoryMaps Website](http://storymaps.esri.com/home/)
* [@EsriStoryMaps](http://twitter.com/EsriStoryMaps)
* [ArcGIS Blog](http://blogs.esri.com/esri/arcgis/)

## Issues

Find a bug or want to request a new feature? Please let us know by submitting an issue.

## Contributing

Anyone and everyone is welcome to contribute.

## Licensing
Copyright 2012 Esri

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

   http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.

A copy of the license is available in the repository's [license.txt](license.txt) file.


[](Esri Tags: Storytelling MapTour ArcGIS-Online Template Map Tour Picture)
[](Esri Language: JavaScript)
