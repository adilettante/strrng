// this is the background code...

const AUDIO_FILE_COUNT = 6

const CODE_NEW_HTML = 1
const LOAD_ANNOTATION = 3
const LOAD_ANNOTATION_1 = 4
const PLAY_AUDIO = 5
const GET_TOGGLE_AND_DONTSHOW_STATUS = 6
const PING = 7;
const SEND_TOGGLE_STATUS_TO_ACTIVE_TAB = 8
const DONT_SHOW = 9
const GET_DONT_SHOW = 10

const SEND_CONTEXT_MENU_HIGHLIGHTS = 11

function generate_key(){
    return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
}
// listen for our browerAction to be clicked
chrome.browserAction.onClicked.addListener(function (tab) {
	// for the current tab, inject the "inject.js" file & execute it
	chrome.tabs.executeScript(tab.ib, {
		file: 'inject.js'
	});
});

var g_anns_json = "";
var g_toggle_status = "";
var g_audio_index = 0;
var g_dont_show = 0;

chrome.runtime.onMessage.addListener(
    function(request, sender, sendResponse){
        var command = request.command;        
        switch(command){
            case CODE_NEW_HTML:
                var random_key = generate_key();
                add_data_to_indexeddb("html_table", random_key, request.selected_text, request.url, request.ann, function(){
                        var str = request.selected_text;
                        var str_arr = str.split(" ");
                        var short_str = "";
                        for(var j=0; j<str_arr.length;j++){
                            short_str = short_str + str_arr[j] + " ";
                            if(j>=9) {
                                short_str = short_str + "...";
                                break;
                            }
                        }

                        add_data_to_indexeddb("short_table", random_key, short_str, request.url, request.ann, function(){

                            chrome.browserAction.setIcon({path: "images/highlight16.png"});
                                //chrome.tabs.create({ url: chrome.runtime.getURL("edit.html?html_key=" + random_key) });
                        });
                }); 
                sendResponse(request.selected_text + "ok");                        
                break;            
            case LOAD_ANNOTATION:
                var url = request.url;                
                g_anns_json = "";
                console.log(url);
                get_all_ann_from_indexeddb(url, function(anns){
                    g_anns_json = JSON.stringify(anns);                    
                    return;
                });  
                sendResponse(g_anns_json);
                return;
                break; 
            case LOAD_ANNOTATION_1:
                sendResponse(g_anns_json);
                return;
            case PLAY_AUDIO:
                var no = g_audio_index % AUDIO_FILE_COUNT + 1; 
                var audio = new Audio('audio/' + no + '.mp3');
                audio.volume = 1;
                audio.play();
                g_audio_index++;
                sendResponse("ok");
                return;
            case GET_TOGGLE_AND_DONTSHOW_STATUS:
                chrome.browserAction.setIcon({path: "images/icon16.png"});

                sendResponse({"toggle":g_toggle_status, "dontshow": g_dont_show});
                break;
            case PING:
                sendResponse("pong");
                break;
            case DONT_SHOW:
                //chrome.tabs.create({ url: chrome.runtime.getURL('index.html') });
                get_data_from_indexeddb("setting_table", "dont_show", function(res){
                    update_data_to_indexeddb("setting_table", res["id"], "dont_show", "1", "", 0, "", function(res){
                        g_dont_show = 1;
                    });
                });
                sendResponse("ok");
                break;
            case GET_DONT_SHOW:
                sendResponse(g_dont_show);
            default:
        }   
    }
);

function genericOnClick(info, tab) {
    if(info.menuItemId == 1){
        //send message to current active tab
        var browser = browser || chrome;
        chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
            var currTab = tabs[0];
            if (currTab) { // Sanity check
                browser.tabs.sendMessage(currTab.id, {command:SEND_CONTEXT_MENU_HIGHLIGHTS});
            }
        });        
    }
    else if((info.menuItemId == 2)||(info.menuItemId == 3)){
         chrome.tabs.query({}, function(tabs) {
            var urls = tabs.map(function(tab) {
                return tab.url;
            });

            var _url = chrome.runtime.getURL('index.html')
            // do something with urls
            //console.log(urls);
            var cc = tabs.length;
            for(var i=0;i<cc;i++){
                if(_url == tabs[i]["url"]){
                    chrome.tabs.update(tabs[i].id, {active: true})
                    return;         
                }
            }
            chrome.tabs.create({ url: chrome.runtime.getURL('index.html') });             
        });            
    }
}


//----- by p
var parent = chrome.contextMenus.create({"id": "1", "title": "Highlight", contexts:["selection"], "onclick":genericOnClick});
var parent1 = chrome.contextMenus.create({"id": "2", "title": "View Home", contexts:["selection"], "onclick":genericOnClick});     

var parent2 = chrome.contextMenus.create({"id": "3", "title": "View Home", "onclick":genericOnClick});
var parent3 = chrome.contextMenus.create({"id": "4", "title": "Highlight", "onclick":genericOnClick, "visible": false});
//var parent1 = chrome.contextMenus.create({"title": ""});     

chrome.commands.onCommand.addListener(function(command) {
    if (command == "toggle-turn-on-off") {
        // toggle on/off
        get_data_from_indexeddb("setting_table", "toggle", function(res){
            
            var toggle_value = "on";
            if(res["html_string"] == "on"){
                toggle_value = "off";  
            }
            update_data_to_indexeddb("setting_table", res["id"], "toggle", toggle_value, "", 0, "", function(res){
                g_toggle_status = toggle_value;
                var views = chrome.extension.getViews({
                    type: "popup"
                });
                for (var i = 0; i < views.length; i++) {
                    if(toggle_value == "on"){                            
                        views[i].document.getElementById('toggle_on').style.color = "#000000";
                        views[i].document.getElementById("toggle_off").style.color = "#888888";
                    }
                    else{
                        views[i].document.getElementById('toggle_on').style.color = "#888888";
                        views[i].document.getElementById("toggle_off").style.color = "#000000";
                    }

                }

                //update context menu
                if(toggle_value == "on"){
                    chrome.contextMenus.update("1", {"visible": true});
                }
                else{
                    chrome.contextMenus.update("1", {"visible": false});
                }
                //send message to current active tab
                var browser = browser || chrome;
                chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
                    var currTab = tabs[0];
                    if (currTab) { // Sanity check
                        browser.tabs.sendMessage(currTab.id, {command:SEND_TOGGLE_STATUS_TO_ACTIVE_TAB, status:g_toggle_status});
                    }
                });

            });
            
        });
    }
});

chrome.runtime.onInstalled.addListener(function(details){

    if(details.reason == "install"){
        console.log("This is a first install!");  
        g_anns_json = "";      
        add_data_to_indexeddb("setting_table", "toggle", "on", "", "", function(res){
            g_toggle_status = "on";
        });
        add_data_to_indexeddb("setting_table", "search_txt", "", "", "", function(res){
        });
        add_data_to_indexeddb("setting_table", "dont_show", "0", "", "", function(res){
        });

        g_dont_show = 0;

        var default_rows = [{"id":1,"html_key":"lfcqfz01218vlzz09btuui","html_string":"The Divine Mind in its mentation thinks itself;\nthe object of the thought is nothing external: Thinker and Thought are\none; therefore in its thinking and knowing it possesses itself,\nobserves itself and sees itself not as something unconscious but as\nknowing: in this Primal Knowing it must include, as one and the same\nAct, the knowledge of the knowing; and even the logical distinction\nmentioned above cannot be made in the case of the Divine; the very\neternity of its self-thinking precludes any such separation between\nthat intellective act and the consciousness of the act.","html_url":"http://trisagionseraph.tripod.com/Texts/Plotinus5.html","is_visible":1,"ann":"{\"quote\":\"The Divine Mind in its mentation thinks itself;\\nthe object of the thought is nothing external: Thinker and Thought are\\none; therefore in its thinking and knowing it possesses itself,\\nobserves itself and sees itself not as something unconscious but as\\nknowing: in this Primal Knowing it must include, as one and the same\\nAct, the knowledge of the knowing; and even the logical distinction\\nmentioned above cannot be made in the case of the Divine; the very\\neternity of its self-thinking precludes any such separation between\\nthat intellective act and the consciousness of the act.\",\"ranges\":[{\"start\":\"/div[1]/table[1]/tbody[1]/tr[1]/td[1]/div[1]/p[16]\",\"startOffset\":4,\"end\":\"/div[1]/table[1]/tbody[1]/tr[1]/td[1]/div[1]/p[16]\",\"endOffset\":582}],\"id\":0}"},{"id":2,"html_key":"z9b1olws7viffd1vs3og2f","html_string":"Hello World! So good to finally meet you. I've been expecting you here. Do you know what this place is? It's a digital ether. Unlimited in capacity. Take your time! Look around! This was given to you to bring joy to Creation :)","html_url":"http://adilettante.com/01.html","is_visible":1,"ann":"{\"quote\":\"Hello World! So good to finally meet you. I've been expecting you here. Do you know what this place is? It's a digital ether. Unlimited in capacity. Take your time! Look around! This was given to you to bring joy to Creation :)\",\"ranges\":[{\"start\":\"/div[1]/h4[1]\",\"startOffset\":0,\"end\":\"/div[1]/h4[1]\",\"endOffset\":227}],\"id\":0}"}];
        add_bulk_raws_database("html_table", default_rows, function(){});

        

    }else if(details.reason == "update"){        

        get_data_from_indexeddb("setting_table", "dont_show", function(res){
            update_data_to_indexeddb("setting_table", res["id"], "dont_show", "0", "", 0, "", function(res){
                g_dont_show = 0;
            });
        });

        get_data_from_indexeddb("setting_table", "toggle", function(res){
            update_data_to_indexeddb("setting_table", res["id"], "toggle", "on", "", 0, "", function(res){
                g_toggle_status = "on";
            });
        });
        
    }
    //refresh all tab
    chrome.tabs.query({windowType:'normal'}, function(tabs) {
        for(var i = 0; i < tabs.length; i++) {
           chrome.tabs.update(tabs[i].id, {url: tabs[i].url});
        }
    });
});
/*
chrome.downloads.onChanged.addListener(function(downloadItem) {
    var id = downloadItem.id;
    var file_name = downloadItem.filename;
    console.log(file_name);
    chrome.downloads.cancel(id, function(e){
        //console.log(filename);
    });
});
*/
chrome.extension.onConnect.addListener(function(port) {
    console.log("Connected ....."); 
    port.onMessage.addListener(function(msg) {
        //recieve message from popup        
        if(msg["key"] == "toggle"){
            g_toggle_status = msg["value"];
        }        
        else if(msg["key"] == "download"){
            var content = msg["value"];
            var file_name = msg["file_name"];

            chrome.downloads.download({
                url: content, 
                filename: file_name,
                saveAs: true,                
            }, function (downloadId) {
                console.log(downloadId);
            });
        }        
    });
});

//init browser part


get_data_from_indexeddb("setting_table", "toggle", function(res){
    g_toggle_status = res["html_string"];    
});
get_data_from_indexeddb("setting_table", "dont_show", function(res){
    if (res["html_string"] == "1"){
        g_dont_show = 1;
    }
    else{
        g_dont_show = 0;
    }
});
