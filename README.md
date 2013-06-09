Map Tour
========

A storytelling template combining an interactive map, a photo and text panel, and a thumbnail carousel. This is a new version of the popular map tour template that provide a better experience on smartphone, see [what's new](#whats-new).

![App](https://raw.github.com/Esri/map-tour-storytelling-template-js/master/map-tour-storytelling-template-js.png)

The template is now available in two versions:
 * **An hosted version** in ArcGIS Online that provide an interactive builder tool
 * **A downloadable version** that you can deploy on your web server and enhance to fit your needs

The latest release is **V1.2**, if you want to be informed of new releases, we recommend you to watch these repository.

[View it live](http://storymaps.esri.com/stories/demo/map_tour/?webmap=7190edafe7464cb19c1caf1360cd6ee5) | [Features](http://arcgis.com/apps/MapTour/preview.html) | [User Download (production application, doesn't include source code)](https://github.com/Esri/map-tour-storytelling-template-js/raw/master/Storytelling-MapTour-1.2.zip) | [Developer Download](https://github.com/Esri/map-tour-storytelling-template-js/archive/master.zip) 


### About the hosted version

To use the hosted map tour template on ArcGIS Online you need to be a **member of an Organization and have Publisher or Administrator access**. The template can then be accessed from the ArcGIS Online's map viewer Share As Web Mapping Application dialog.

There is multiple ways to start building a Map Tour:
 * **Create your webmap without any "map tour layer"** and the builder will create an hosted Feature Service for you
 * **Add a CSV layer** (Add Layer from File) into your webmap, the builder will not be available. You can publish a fully functional map tour that way but cannot make any customization
 * **Upload a CSV as an item**, this will create a Hosted Feature Service, then add the Feature Service to your webmap. The builder will not be available by default but you can make it available (read below)
 * **Reference a Feature service** in your webmap. The builder will be available if the Feature Service meets the requirements (read below)

### Feature service requirements for using the interactive builder

To be able to use the builder when your data are stored in a Feature Service:
 * The layer needs to have the **same structure than the CSV** (see Readme in the downloadable)
 * The layer needs **attachments to be enabled**

When you create an hosted Feature Service from a CSV, the attachments are not enabled by default. To enable them, open the Feature Service item page, click the small arrow on the layer section and you will see that option. After that the map tour will continue to use the pictures and thumbnail you have referenced through attributes. Optionally if you want to upload your pictures as Feature Service attachments you will be able to do so through two buttons on the picture panel (change picture and change thumbnail).

### About the downloadable version

If you are not a member of an organization or want to customize the application, you need to use that version.

The downloadable does not offer the interactive builder that is available on for Organization but you will have access to the same configuration options through a configuration file. To use the downloadable you start with a webmap that reference a CSV or Feature Service (with or without attachments, hosted on ArcGIS Online or on ArcGIS for Server). There is short readme available on github and the download includes an extensive documentation.

## How to deploy a Map Tour with the downloadable version

Download the [User Download archive](https://github.com/Esri/map-tour-storytelling-template-js/raw/master/Storytelling-MapTour-1.1.zip), it contains the following files:

| File                	                     | Contains                                                              |
| ------------------------------------------ | --------------------------------------------------------------------- |
| app/            	                        | Optimized source code and configuration files (maptour-config.js)     |
| resources/                                 | Resources (markers, icons, translation)                               |
| **samples/**      			                  | Sample data layer to create your webmap                               |
| **index.html**         		               | Application html file (to be edited with web map id)                   |
| **Readme.pdf**       		                  | Detailed readme guide                                                 |

[This ArcWatch article](http://www.esri.com/esri-news/arcwatch/0513/make-a-map-tour-story-map) provides step-by-step instructions on how to make a map tour story map using the downloadable version of the template.
For detailed instructions and recommendations, please refer to the **[Readme document](https://github.com/Esri/map-tour-storytelling-template-js/raw/master/Readme.pdf)**.

For quick start, a typical Map Tour configuration involves the following steps:
 * Create a web map that fits your need (basemap, eventual additional context layers like the path of your tour, etc.)
 * Import your data:
   - Your data can be stored in **Feature Layer**, **CSV**, **Shapefile** or **Map Service**, see **samples** for ready to use layer
   - Mandatory attributes for each feature are: **name, description, picture and thumbnail URL**
   - Feature can also have an optional color, otherwise the default is red. 4 icons set are provided: **red/blue/green and purple** (the respective expected data values are r, b, g, p)
 * Center the web map to the initial extent you want for the tour
 * **Save and share the web map publicly**
 * Open **index.html** with a text file editor
 * Locate the configuration section at the beginning of the file
 * Edit the line **webmap:""** to **include your web map id** between the quotes
 * Optionally remove samples folder and Readme.pdf
 * Copy files to your web server root or in a specific folder

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

## FAQ

### Is the template compatible with previous version?
Yes, web map designed for the previous version should continue to work without any modification. Customization and enhancement of the application will require code changes, most of them should be easy to translate into the new application.

### What's new?

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

### Which web map layer will be used?
The application will use the web map **upper visible point feature layer**. 

Eligible feature layer are:
 - Feature service with two attachments per feature (main picture has first attachment, thumbnail as the second)
 - Feature layer without attachments
 - Web map embedded data: CSV, Shapefile
 - Map service: specific layer only (e.g. MyService/MapServer/0)

If that doesn't match your web map structure, look for the configuration property named **sourceLayerTitle** in index.html and set it to the title of your web map layer.

### How should my fields be named?

Here is the valid option for each field:

| Data             		                                    | Valid names (case insensitive)             |
| ---------------------------------------------------------	| -----------------------------------------	|
| Name      				                                    | name, title, name-short, name-long 	      |
| description         	                                    | caption, description, snippet, comment 	   |
| Picture (optional for Feature service with attachments) 	| pic_url, pic, picture, url                 |
| Thumbnail (optional for Feature service with attachments)	| thumb_url, thumb, thumbnail                |
| Color (optional)                                          | icon_color, color, style                   |

If that doesn't match your data, you can change that configuration in **app/maptour-config.js** 

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

### Can I enhance the application?
Yes, most of the look and feel customization can be done using the user download and including the css/html override directly into index.html. 
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


## Developer guide

This developer guide is intended to developer that wants to modify behavior or add new functionalities to the Map Tour application. If you only need to customize look and feel of the Map Tour, you should be able to do so using the User download.
It requires basic knowledge of HTML, Javascript and CSS languages.

### Developer archive

Download and unzip the [Developer download](https://github.com/Esri/map-tour-storytelling-template-js/archive/master.zip) or clone the repo.

| File                                       | Contains                                                              |
| ------------------------------------------ | --------------------------------------------------------------------- |
| **MapTour/**            	                  | Map Tour source folder                                                |
| **MapTour/src/**                           | The application source code                                           |
| **MapTour/deploy/**                        | The ready to be deployed Map Tour application                         |
| **MapTour/tools/**                         | Developer tools to build deploy/ from src/                            |
| samples/      			                     | Sample data layer to create your webmap                               |
| Storytelling-MapTour-1 0.zip      			| User download archive	                                                |
| Readme.pdf       		                     | The detailed readme guide                                             |
| Readme.md                                  | This document                                                         |
| map-tour-storytelling-template-js.png      | The application screenshot                                            |
| license.txt                                | The application license                                               |


### Introduction

To build a production version of the application from the source code, you need:
 * a Windows OS 
 * [Node.js](http://nodejs.org/)
 * [Java Runtime version 6 or higher](http://www.oracle.com/technetwork/java/javase/downloads/jre7-downloads-1880261.html)

The build script use [RequireJS](http://requirejs.org/) to optimize the application Javascript and [Google Closure Compiler](https://developers.google.com/closure/compiler/) and [YUI Compressor](http://yui.github.com/yuicompressor/) for external dependencies.
The script will be ported to a full node.js later on. 

### Design
Map Tour relies on AMD and Dojo loader [AMD](http://help.arcgis.com/en/webapi/javascript/arcgis/jshelp/#inside_dojo_amd) for application structure.

The application is structured as this:

| Path          			                  | Contains						|
| -------------------------------------	|  ----------------------------------------------------	|
| app      				                     | Package structured Javascript and CSS source code 	|
| app/maptour-config.js			            | Configuration file (loaded at execution time) 	|
| app/storymaps/maptour/core/		         | Core modules (main module is Core.js) 		|
| app/storymaps/maptour/ui/ 		         | UI components grouped by target device 		|
| app/storymaps/maptour/builder/	         | UI components of the builder mode 			|
| app/storymaps/maptour/BuildConfig.js 	| Require.js build configuration file			|
| app/storymaps/ui/ 			               | UI components not specific to the application 	|
| app/storymaps/utils/ 			            | Utility modules not specific to the application 	|
| lib/ 					                     | External dependencies 				|
| resources/nls/                  			| Externalized text strings of the application  	|
| resources/markers/ 			            | The 4 colors set of map marker 			|
| resources/icons/ 			               | Icons 						|

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
