var async = require("async");
var jsdom = require("jsdom");
var request = require("request");
var cheerio = require('cheerio');

var fs = require("fs");
var url = require("url");

//base domain
//var domain = "http://visualjournali.st";
var domain = "http://localhost:8080"
var books = [];


request(domain, function (error, response, html) {
	if (!error && response.statusCode == 200) {
		var $ = cheerio.load(html);

		$('ul').each(function(n, element){
			var bookFolder = $(this).attr('id');
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
		console.log(books);


		/*
		//optional function for splitting the filename off of a url
		function getFileName(path) {
				return path.match(/^((http[s]?|ftp):\/)?\/?([^:\/\s]+)(:([^\/]*))?((\/[\w/-]+)*\/)([\w\-\.]+[^#?\s]+)(\?([^#]*))?(#(.*))?$/i)[8];
		}
		*/



		//ADD STYLESHEETS================================================================================
		console.log(' ')
		var files_array = ['stylesheet.css', 'page_styles.css'];

		var download = function(uri, filename, callback){
			request.head(uri, function(err, res, body){
				var r = request(uri).pipe(fs.createWriteStream(filename));
				r.on('close', callback);
			});
		};

		var counter = 0;
		var fileNumber = 0;

		function loop(){
			if (counter<books.length&&fileNumber<files_array.length){
				var source=domain + '/stylesheets/' + files_array[fileNumber];
				var output=books[counter] + '/stylesheets/' + files_array[fileNumber];
				console.log('Saving ' + files_array[fileNumber] +' files in '+ books[counter]);
				download(source, output, function(){loop();});

				counter++;
			} else if (fileNumber<files_array.length){
				counter=0;
				fileNumber++;
				loop();
			} else{
				console.log(' ')
			}
		}
		loop();





		//Generalizing a function for downloading files.
		function callLoop(arrayInput, folderInput, bookNumberChapter){
			var loop_array = arrayInput;
			var folder = folderInput;//optional variable for subdirectories e.g. 'fonts/'

			var book = 0;
			var fileNumber = 0;
			var inputFolder = '';

			function looper(){

				if (bookNumberChapter){
						folder = '';
						inputFolder = 'book/'+book+'/'
						console.log('-----------FOLDER: '+folder);
				}

				if (book<books.length&&fileNumber<loop_array.length){
					var source=domain + '/' + inputFolder + folder + loop_array[fileNumber] + "?mode=export";
					console.log('Downloadingx: '+ loop_array[fileNumber])
					console.log('From: '+ source);
					console.log(' ')
					var output=books[book]+'/'+folder+loop_array[fileNumber];
					//console.log('Saving ' + loop_array[fileNumber] +' in ' + books[book] + folder);
					download(source, output, function(){looper();});

					book++;
				} else if (fileNumber<loop_array.length){
					book=0;
					fileNumber++;
					looper();
				} else{
					console.log('Done.')
				}
			}
			looper();
		}
		var fonts_array = ['AdobeFanHeitiStd-Bold.otf', 'AdobeHeitiStd-Regular.otf','ヒラギノ明朝ProW3.otf', 'ヒラギノ明朝ProW6.otf'];
		//var fonts_array = ['AdobeFanHeitiStd-Bold.otf', 'AdobeHeitiStd-Regular.otf'];
		//callLoop(fonts_array, 'fonts/', false);

		var mainFiles_array = ['backmatter.xhtml', 'bodymatter.xhtml', 'content.opf', 'cover.xhtml', 'introduction.xhtml', 'titlepage.xhtml', 'toc.xhtml', 'toc.ncx'];
		callLoop(mainFiles_array, '', true);

		var meta_array = ['container.xml'];
		callLoop(meta_array, 'META-INF/', false);



		//Manually creating mimetype file (instead of scraping) because scraping added a \n that broke validation.
		function addMime(){
			for (var s=0; s<books.length;s++){
				var targetMime = "book"+s+'/mimetype'
				fs.writeFile(targetMime, "application/epub+zip", function(err) {
					if(err) {
						return console.log(err);
					}
				});
			}
		}
		addMime();
		//var mime_array = ['mimetype'];
		//callLoop(mime_array, '', false);




		//LOADING PHOTOS BASED ON THE SPREADSHEET================================================================================

		var Tabletop = require('tabletop');
		var testURL = 'https://docs.google.com/spreadsheets/d/1dXbUkXlGb8GyVMdKpuJB__82MAI6-VWqhzcvq2A3rYY/pubhtml';

		var myData;
		function onLoad(data, tabletop) {
			console.log("loading spreadsheet");
			myData = data.photos.elements;
			console.log(myData);
			loopPhotos();
		};

		var options = {
			key: testURL,
			callback: onLoad
		};

		Tabletop.init(options);


		var currentBook = 0;
		var photo_number = 0;

		function loopPhotos(){
			if (currentBook < books.length && photo_number<myData.length){

				if(currentBook + 1 == myData[photo_number].book){
					var source=domain + '/images/' + myData[photo_number].filename;
					var output=books[currentBook] + '/images/' + myData[photo_number].filename;

					download(source, output, function(){
						console.log('Saving ' + myData[photo_number].filename + ' files in '+ books[currentBook]);
						photo_number++
						loopPhotos();
					});
				} else{
					currentBook++;
					loopPhotos();
				}
			}else{
				console.log('Done saving photos')
			}
		}

	}
});
