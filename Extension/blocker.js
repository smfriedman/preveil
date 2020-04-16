var disorder_id = "2";
var protection_level = "click"; // disabled, click, full
var sensitivity = "0";
var blur_words = true
var customized_blacklist = [];
//get user data
chrome.storage.sync.get(["trigger_id", "trigger", "protection", "sensitivity", "blur_words", "blacklist_words"], function(data){
	if(data.trigger_id != undefined){
		disorder_id = data.trigger_id;
	}
	if(data.protection != undefined){
		protection_level = data.protection;
	}
	if(data.sensitivity != undefined){
		sensitivity = data.sensitivity;
	}

	if(data.blur_words != undefined){
		blur_words = data.blur_words;
	}

	if(data.blacklist_words != undefined){
		customized_blacklist = data.blacklist_words;
	}

	if(protection_level != "disabled"){
		getWordsBlacklist();
		document.body.addEventListener("DOMNodeInserted", scanContent,false);
		scanContent();	
}

});

var words_matcher = undefined;

function getWordsBlacklist(){

	var url = "http://ec2-54-68-94-207.us-west-2.compute.amazonaws.com:8080/Blacklist/" + disorder_id;

	var xmlHttp = new XMLHttpRequest();
	xmlHttp.onreadystatechange = function() { 
    	if (xmlHttp.readyState == 4 && xmlHttp.status == 200)
	   		handleResponseBlacklist(xmlHttp.responseText);
	}
	xmlHttp.open("GET", url, false); // true for asynchronous 
	xmlHttp.send(null);
}

function handleResponseBlacklist(data){
	var data = JSON.parse(data);
	var words = data.reduce(function(a,b){ return a + b.word + "|";}, "").slice(0,-1);
	if(customized_blacklist.length > 0){
		if(words != ""){
			words += "|";
		}
		words += customized_blacklist.reduce(function(a,b){ return a + b + "|";}, "").slice(0,-1);
	}
	var regex_template = '\\b' + words + '\\b';
	words_matcher = new RegExp(regex_template, 'i');
}

function scanContent(){
	// Filter Images:
	images = document.getElementsByTagName('img');
	for(var i=0; i<images.length; i++) {
  		var img = images[i];
  		if(isNodeToBlur(img)){
  			blurImage(img);
  			shouldUnblur(img);
		}
	}
	if(blur_words){
		textNodes1 = document.getElementsByTagName('p');
		for(var i=0; i<textNodes1.length; i++) {
	  		var node = textNodes1[i];
	  		if(isNodeToBlur(node)){
	  			blurImage(node);
			}
		}
		textNodes2 = document.getElementsByTagName('span');
		for(var i=0; i<textNodes2.length; i++) {
	  		var node = textNodes2[i];
	  		if(isNodeToBlur(node)){
	  			blurImage(node);
			}
		}
		// textNodes3 = document.getElementsByTagName('a');
		// for(var i=0; i<textNodes3.length; i++) {
	 //  		var node = textNodes3[i];
	 //  		if(isNodeToBlur(node)){
	 //  			blurImage(node);
		// 	}
		// }
	}
	
};

function shouldUnblur(img){
	var id = img.getAttribute('safeZoneId');

	var link = encodeURIComponent(img.src);

	var url = "http://ec2-54-68-94-207.us-west-2.compute.amazonaws.com:8080/check?pic_id=" + id + "&disorder_id=" + disorder_id + "&sensitivity=" + sensitivity + "&url=" + link;

	if(img.style.backgroundImage != undefined && img.style.backgroundImage !=""){
		url += "&background_url=" + encodeURIComponent(img.style.backgroundImage.replace(/^url\(["']?/, '').replace(/["']?\)$/, ''));
	}

	var xmlHttp = new XMLHttpRequest();
	xmlHttp.onreadystatechange = function() { 
    	if (xmlHttp.readyState == 4 && xmlHttp.status == 200)
	   		handleResponse(xmlHttp.responseText);
	}
	xmlHttp.open("GET", url, true); // true for asynchronous 
	xmlHttp.send(null);
}

function handleResponse(data){
	data = JSON.parse(data);
	if(!data.is_match){
		unblur(data.id);
	}
}

function guidGenerator() {
    var S4 = function() {
       return (((1+Math.random())*0x10000)|0).toString(16).substring(1);
    };
    return (S4()+S4()+"-"+S4()+"-"+S4()+"-"+S4()+"-"+S4()+S4()+S4());
}

function blurImage(img){
	var id = guidGenerator();
	img.setAttribute('safeZoneId',id);
	img.className += ' safeZoneBlur';
	var nodeToWrap = hasHyperLinkParent(img);
	if(nodeToWrap == undefined){
		nodeToWrap = img;
		nodeToWrap.addEventListener('resize',onImageResize,false);
		nodeToWrap.addEventListener('load',onImageResize,false);
	}
	nodeToWrap.setAttribute("safeZoneWrapId", id);
	var container = document.createElement('div');
	container.className = 'safeZoneContainer';
	container.setAttribute("safeZoneId", "container" + id);
	nodeToWrap.parentNode.insertBefore(container,nodeToWrap);

	container.appendChild(nodeToWrap);

	var layer = document.createElement('div');
	layer.className = 'safeZoneLayer';
	layer.setAttribute('safeZoneId','layer' + id);

	var rect = nodeToWrap.getBoundingClientRect();
	layer.style.height = rect.height + 'px';
	layer.style.width = rect.width + 'px';
	layer.style.top = nodeToWrap.offsetTop + 'px';
	layer.style.left = nodeToWrap.offsetLeft + 'px';
	layer.style.bottom = nodeToWrap.offsetBottom + 'px';
	layer.style.right = nodeToWrap.offsetRight + 'px';
	layer.addEventListener('click',unblurClicked,false);
	container.appendChild(layer);
}

function onImageResize(e){
	var img = e.target;
	var id = img.getAttribute('safeZoneId');
	var layer = document.querySelector("[safeZoneId='layer"+ id +"']");
	layer.style.height = img.clientHeight + 'px';
	layer.style.width = img.clientWidth + 'px';
	layer.style.top = img.clientTop + 'px';
	layer.style.left = img.clientLeft + 'px';
}

function hasHyperLinkParent(node){
	var parent = node.parentNode
	while(parent != null){
		if (parent.nodeName == "A"){
			return parent;
		}
		parent = parent.parentNode;
	}
	return undefined;
}

function unblur(id){
	var img = document.querySelector("[safeZoneId='"+ id +"']");
	var layer = document.querySelector("[safeZoneId='layer"+ id +"']");
	if(img != undefined){
		img.className = img.className.replace("safeZoneBlur","");
	}
	if(layer != undefined){
		layer.remove();
	}
}

function unblurClicked(e){
	e.stopPropagation();
	if(protection_level == "full"){
		return;
	}
	var id = e.target.getAttribute('safeZoneId').substring(5);
	unblur(id);
}

function isNodeToBlur(node){
	var nodeName = node.nodeName.toLowerCase(); 
	if(nodeName == "img"){
		return node.getAttribute('safeZoneId') == undefined && node.clientHeight > 89 && node.clientWidth > 89;
	}
	if(nodeName == "p" || nodeName == "span"){
		if(node.getAttribute('safeZoneTextChecked') != undefined){
			return false;
		}
		node.setAttribute("safeZoneTextChecked","done");
		if(words_matcher != undefined){
			return words_matcher.test(node.innerHTML);
		}
		return false;
	}
}

function blurNewNode(e){
	var img = e.target;
	var images = img.getElementsByTagName("img");
	if(isNodeToBlur(e.target)){
		blurImage(img);
	}
	for(var i=0; i<images.length; i++) {
		if(isNodeToBlur(images[i])){
			blurImage(img);
		}
	} 
}


