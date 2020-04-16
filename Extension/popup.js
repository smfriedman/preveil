// document.addEventListener('DOMContentLoaded', function () {
//   	var link = document.getElementById('settings-link');  
// 	link.href = 'chrome-extension://' + chrome.runtime.id + '/options.html';
// });

chrome.browserAction.onClicked.addListener(function(tab) { 
	window.open('chrome-extension://' + chrome.runtime.id + '/options.html');
});