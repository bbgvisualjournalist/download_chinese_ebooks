var async = require("async");
var jsdom = require("jsdom");
var request = require("request");
var cheerio = require('cheerio');

var fs = require("fs");
var url = require("url");
var config = require('./config');


//base domain
//var domain = config.domain;
var domain = "http://localhost:8080"

var books = [];

request(domain, function(error, response, html) {
	if (!error && response.statusCode == 200) {
		var $ = cheerio.load(html);

		$('ul').each(function(n, element) {
			var bookFolder = $(this).attr('id');
			//console.log('*********'+ bookFolder)
			var imageFolder = bookFolder + "/images"
			var stylesheetsFolder = bookFolder + "/stylesheets"
			var fontsFolder = bookFolder + "/fonts"
			var metaFolder = bookFolder + "/META-INF"

			//Create book folder and subdirectories for /images, stylesheets etc ========================================
			if (!fs.existsSync(bookFolder)) fs.mkdirSync(bookFolder);
			if (!fs.existsSync(imageFolder)) fs.mkdirSync(imageFolder);
			if (!fs.existsSync(stylesheetsFolder)) fs.mkdirSync(stylesheetsFolder);
			if (!fs.existsSync(fontsFolder)) fs.mkdirSync(fontsFolder);
			if (!fs.existsSync(metaFolder)) fs.mkdirSync(metaFolder);

			//Add bookfolder to an array so that you can add files to it.
			books.push(bookFolder);
		});
		//console.log(books);

		/*
		//optional function for splitting the filename off of a url
		function getFileName(path) {
				return path.match(/^((http[s]?|ftp):\/)?\/?([^:\/\s]+)(:([^\/]*))?((\/[\w/-]+)*\/)([\w\-\.]+[^#?\s]+)(\?([^#]*))?(#(.*))?$/i)[8];
		}
		*/


		//ADD STYLESHEETS================================================================================
		console.log(' ')
		var files_array = ['stylesheet.css', 'page_styles.css'];

		var download = function(uri, filename, callback) {
			request.head(uri, function(err, res, body) {
				var r = request(uri).pipe(fs.createWriteStream(filename));
				r.on('close', callback);
			});
		};

		var counter = 0;
		var fileNumber = 0;

		function loop() {
			if (counter < books.length && fileNumber < files_array.length) {
				var source = domain + '/stylesheets/' + files_array[fileNumber];
				var output = books[counter] + '/stylesheets/' + files_array[fileNumber];
				//console.log('Saving ' + files_array[fileNumber] +' files in '+ books[counter]);
				download(source, output, function() {
					loop();
				});

				counter++;
			} else if (fileNumber < files_array.length) {
				counter = 0;
				fileNumber++;
				loop();
			} else {
				console.log(' ')
			}
		}
		loop();


		//Generalizing a function for downloading files.
		function callLoop(arrayInput, folderInput, bookNumberChapter) {
			var loop_array = arrayInput;
			var folder = folderInput; //optional variable for subdirectories e.g. 'fonts/'

			var book = 0;
			var fileNumber = 0;
			var inputFolder = '';

			function looper() {

				if (bookNumberChapter) {
					folder = '';
					inputFolder = 'book/' + book + '/';
					//console.log('-----------FOLDER: ' + inputFolder);
				}

				if (book < books.length && fileNumber < loop_array.length) {
					var source = domain + '/' + inputFolder + folder + loop_array[fileNumber] + "?mode=export";
					//console.log('Downloading: '+ loop_array[fileNumber]);
					//console.log('From: '+ source);
					var output = books[book] + '/' + folder + loop_array[fileNumber];
					//console.log('Saving ' + loop_array[fileNumber] +' in ' + books[book] + folder);
					//console.log(' ');
					download(source, output, function() {
						looper();
					});

					book++;
				} else if (fileNumber < loop_array.length) {
					book = 0;
					fileNumber++;
					looper();
				} else {
					console.log('Done with looper().');
				}
			}
			looper();
		}
		var fonts_array = config.fonts;
		if (config.downloadFonts) {
			callLoop(fonts_array, 'fonts/', false);
		}

		var mainFiles_array = ['backmatter.xhtml', 'bodymatter.xhtml', 'content.opf', 'cover.xhtml', 'introduction.xhtml', 'titlepage.xhtml', 'toc.xhtml', 'toc.ncx'];
		callLoop(mainFiles_array, '', true);

		var meta_array = ['container.xml'];
		callLoop(meta_array, 'META-INF/', false);


		//Manually creating mimetype file (instead of scraping) because scraping added a \n that broke validation.
		function addMime() {
			for (var s = 0; s < books.length; s++) {
				var targetMime = "book" + s + '/mimetype'
				fs.writeFile(targetMime, "application/epub+zip", function(err) {
					if (err) {
						return console.log(err);
					}
				});
			}
		}
		addMime();

		//LOADING PHOTOS BASED ON THE SPREADSHEET================================================================================

		var Tabletop = require('tabletop');
		var testURL = config.spreadsheet;

		var myData;

		function onLoad(data, tabletop) {
			console.log("loading spreadsheet");
			console.log('-----------------------');
			myData = data.photos.elements;
			//console.log(myData);
			loopPhotos();
		};

		var options = {
			key: testURL,
			callback: onLoad
		};

		Tabletop.init(options);

		var currentBook = 0;
		//SET PHOTO NUMBER TO 2 IN ORDER TO SKIP THE INTRO PHOTOS LISTED AT TOP OF SPREADSHEET
		var photo_number = 2;

		//BEGIN DOWNLOADING PHOTOS ================================================================================
		function loopPhotos() {
			//console.log('**********Running loopPhotos**********');
			//console.log('currentBook: ' + currentBook);
			//console.log('myData[photo_number].book: ' + myData[photo_number].book);

			var subfolder = '';
			if (config.subfolders){
				console.log('subfolders are turned on !!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!')
				subfolder = 'v2_' + (currentBook + 1) + '/';
			}

			if (currentBook < (books.length + 1) && photo_number < myData.length) {

				if (currentBook == myData[photo_number].book) {
					//console.log('');
					//var subfolder = 'v2_' + currentBook + '/'


					//CREATE IMAGE SUBFOLDERS IF THEY DON'T EXIST
					var imageSubfolder = books[currentBook - 1] + '/images/' + subfolder;
					if (!fs.existsSync(imageSubfolder)) fs.mkdirSync(imageSubfolder);

					var source = domain + '/images/' + subfolder + encodeURIComponent(myData[photo_number].filename);
					var output = books[currentBook - 1] + '/images/' + subfolder + myData[photo_number].filename;

					//DOWNLOAD CHAPTER PHOTOS INTO SUBFOLDERS
					download(source, output, function() {
						//console.log('Saving ' + myData[photo_number].filename + ' files in ' + imageSubfolder);
						photo_number++;
						loopPhotos();
					});
				} else {
					currentBook++;
					loopPhotos();
				}
			} else {
				console.log('Looping through intro photos');
				if (config.subfolders) {
					loopIntroPhotos();
				}

				//DOWNLOAD INTRO PHOTOS TO SUBFOLDERS
				function loopIntroPhotos() {
					//COUNT DOWN BOOK NUMBER FROM PREVIOUS FUNCTION
					currentBook--;
					//RESET PHOTO NUMBER TO FIRST ROW IN SPREADSHEET
					photo_number = 0;
					/*
					subfolder = '';
					if (config.subfolders){
						console.log('subfolders are turned on !!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!')
						subfolder = 'v2_' + (currentBook + 1) + '/';
					}
					*/

					//LOOP THROUGH FIRST TWO PHOTOS IN THE SPREADSHEET AND THROUGH THE SUBFOLDERS
					for (photo_number; photo_number < 3; photo_number++) {
						//
						if (photo_number < 2 && currentBook > -1) {
							var source = domain + '/images/' + subfolder + encodeURIComponent(myData[photo_number].filename);
							var output = books[currentBook] + '/images/' + subfolder + myData[photo_number].filename;
							console.log(output);

							download(source, output, function() {
								//console.log('Saved an intro photo...');
							});
						} else if (photo_number >= 2 && currentBook > -1) {
							loopIntroPhotos();
						}
					};
				};

				console.log('Done saving photos');
			}
		}

	}
});