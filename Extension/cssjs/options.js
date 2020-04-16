var pass;
document.addEventListener('DOMContentLoaded', function () {
	isPasswordProtected();
	var xmlHttp = new XMLHttpRequest();
	xmlHttp.onreadystatechange = function() { 
    	if (xmlHttp.readyState == 4 && xmlHttp.status == 200){
    		console.log(xmlHttp.responseText);
	   		populateOptions(JSON.parse(xmlHttp.responseText), function(){
	   			listenForChange();		
	   		});
	   	}
	}
	xmlHttp.open("GET", "http://ec2-54-68-94-207.us-west-2.compute.amazonaws.com:8080/Disorders", true); // true for asynchronous 
	xmlHttp.send(null);

});

function isPasswordProtected(){
	chrome.storage.sync.get(["password"], function(data){
		if(data.password && data.password != ""){
			pass = data.password;
			openModal();
		}

	});
}

function login(){
	if($("#login_pass").val() == pass){
		closeModal();
	}
}

function closeModal(){
   $('#loginModal').modal('hide');
}

function openModal(){
   $('#loginModal').modal({
      keyboard: false,
      backdrop: 'static'
   });
   document.getElementById('login_pass').onkeydown = function(e){
   if(e.keyCode == 13){
     login();
   }
};
   document.getElementById('enter_password').addEventListener("click",login);
}

function populateOptions(res, callback){
	//get existing data to sync
	var trigger_id = null;
	//var enabled = false;
	var degree = null;
	$("#pass").val(pass);
	chrome.storage.sync.get(["trigger_id", "protection", "sensitivity", "blur_words","blacklist_words"], function(data){
		trigger_id = data.trigger_id;
		//enabled = data.enabled;
		degree = data.sensitivity;
		$("#" + data.protection + "-radio").prop("checked", true);
		if(data.blur_words){
			$("#blur_words").prop("checked",true);
		}

		var blacklist = data.blacklist_words;
		if(blacklist){
			for(var i = 0; i< blacklist.length; i++){
				$("#blacklist_words").tagsinput('add', blacklist[i]);
			}
		}
		//fill retrieved options
		var select = document.getElementById("trigger-list");
		for(var i = 0; i < res.length; i++){
			var option = document.createElement("option");
			option.setAttribute("value", res[i].id);
			if(res[i].id != null && res[i].id == trigger_id) option.selected = true;
			option.innerHTML = res[i].type;
			select.appendChild(option);
		}
		//if(enabled) document.getElementById("enable-check").checked = true;
		if(degree){
			document.getElementById("degree").value = degree;
			document.getElementById("degree-text").value = degree;
		} 
		callback();		
	});

}

function listenForChange(){
	document.getElementById("trigger-list").addEventListener("change", function(){
		saveData();
	});

	document.getElementById("degree").addEventListener("change", function(){
		document.getElementById("degree-text").value = document.getElementById("degree").value;
		saveData();
	});

	document.getElementById("degree-text").addEventListener("change", function(evt){
		evt.preventDefault();
		document.getElementById("degree").value = document.getElementById("degree-text").value;
		saveData();
	});

	document.getElementById("pass").addEventListener("change", function(evt){
		saveData();
	});

	document.getElementById("save").addEventListener("click",function(evt){
		saveData();
	});

	document.getElementById("blur_words").addEventListener("click", function(evt){
		saveData();
	});

	document.getElementById("blacklist_words").addEventListener("change",function(evt){
		saveData();
	});

	var protection_elts = document.getElementsByName("protection");
	for(var i = 0; i < protection_elts.length; i++){
		protection_elts[i].addEventListener("click", function(){
			saveData();
		});
	}
}

function saveData(){
	var select = document.getElementById("trigger-list");
	var trigger = select.options[select.selectedIndex].text;
	var trigger_id = select.options[select.selectedIndex].value;

	var degree = document.getElementById("degree").value;

	var protection_elts = document.getElementsByName("protection");
	var protection = "click";
	for(var i = 0; i < protection_elts.length; i++){
		if(protection_elts[i].checked) protection = protection_elts[i].value;
	}

	var blur_words = $("#blur_words").prop("checked");

	var password = $("#pass").val();

	var blacklist = $("#blacklist_words").tagsinput('items');

	chrome.storage.sync.set({
		"trigger": trigger, 
		"trigger_id": trigger_id, 
		"password": password, 
		"sensitivity": parseInt(degree),
		"protection": protection,
		"blur_words" : blur_words,
		"blacklist_words" : blacklist
	}, function(){
		console.log(trigger);
		console.log("saved settings");
	});
}