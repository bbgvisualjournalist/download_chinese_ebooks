var config = {};

//The published spreadsheet to ebook book.
config.domain = 'http://localhost:8080/';

//The published spreadsheet (for photos).
//ebook2
config.spreadsheet = 'https://docs.google.com/spreadsheets/d/1b7l0h913IGWLmFzdwbEgeS4wl99qYq07KbFPikSFDjI/pubhtml';

//ebook1
//config.spreadsheet = 'https://docs.google.com/spreadsheets/d/1dXbUkXlGb8GyVMdKpuJB__82MAI6-VWqhzcvq2A3rYY/pubhtml';

//Volume 2 books need subfolders for images.
config.subfolders = false;

//Fonts to download.
config.fonts = ['AdobeFanHeitiStd-Bold.otf', 'AdobeHeitiStd-Regular.otf', 'ヒラギノ明朝ProW3.otf', 'ヒラギノ明朝ProW6.otf'];

//Download fonts? This can slow down the process. Consider turning this off for testing.
config.downloadFonts = true;

module.exports = config;