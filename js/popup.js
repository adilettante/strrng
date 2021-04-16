// Copyright (c) 2012 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

'use strict';

const SHORTLIST_MAX_LINK_COUNT = 10

function home_click(e){
    window.close();
    chrome.tabs.create({ url: chrome.runtime.getURL('index.html') });
}
function clear_click(e){    
    clear_indexeddb("short_table", function(){
        window.close();     
    }); 
}

function click(e) {
    var key = e.currentTarget.getAttribute("data-key");     

    get_data_from_indexeddb("setting_table", "search_txt", function(res){
        var table_name = "short_table";
        if(res["html_string"] != ""){
            table_name = "search_table";
        }

        get_data_from_indexeddb(table_name, key, function(short_record){
            if(short_record["id"] == "")
                return;
            else{
                delete_data_from_indexeddb(table_name, short_record["id"], function()
                {
                    //alert(short_record["html_key"]);              
                    //chrome.tabs.create({ url: chrome.runtime.getURL('edit.html?html_key=' + key) });

                    chrome.tabs.query({}, function(tabs) {
                        var urls = tabs.map(function(tab) {
                            return tab.url;
                        });
                        // do something with urls
                        //console.log(urls);
                        var cc = tabs.length;
                        for(var i=0;i<cc;i++){
                            if(short_record["html_url"] == tabs[i]["url"]){
                                chrome.tabs.update(tabs[i].id, {active: true})
                                window.close();
                                return;         
                            }
                        }
                        chrome.tabs.create({ url: short_record["html_url"]});
                        window.close();
                    });
                });
            }
        });
    });
    
}

function close_click(e){
    var element = e.currentTarget;
    var key = element.getAttribute("data-key");  

    get_data_from_indexeddb("setting_table", "search_txt", function(res){
        var table_name = "short_table";
        if(res["html_string"] != ""){
            table_name = "search_table";
        }

        get_data_from_indexeddb(table_name, key, function(short_record){
            if(short_record["id"] == "")
                return;
            else{
                delete_data_from_indexeddb(table_name, short_record["id"], function()
                {
                    element.parentElement.remove();   

                    var content = document.getElementById("content");
                    var child = content.firstChild;
                    if(child == null){
                        var div = document.createElement("div");    
                        div.className = "item";     
                        div.innerHTML = "no data";
                        content.appendChild(div);                  
                    }                    
                });
            }
        });
    });

    e.stopPropagation();    
}

function show_export_submenu(){    
    document.getElementById("export_filter3").checked = true;
    document.getElementById("export_type1").checked = true;
    document.getElementById("export-submenu").setAttribute("style", "display: block");
}

function export_database() {
    var form_elements = document.getElementById('export_submenu_form').elements;
    var export_type = form_elements['export_type'].value;
    var export_filter = form_elements['export_filter'].value;

    var export_table = "html_table";

    var file_type = "txt";
    if(export_type == 1) file_type = "csv";

    get_all_data_from_indexeddb("short_table", "", function(list){
        get_all_data_from_indexeddb(export_table, "", function(data){            
            var export_data = [];
            if(export_filter == 1){ //short list filter
                for(var j=0; j<list.length; j++){
                    for(var k=0; k<data.length; k++){
                        if(data[k].html_key == list[j].html_key){
                            export_data.push(data[k]);
                            break;
                        }
                    }
                }
            }
            else{ //all filter
                export_data = data;
            }
            var mime_type = "";
            var export_data_str = "";
            var file_name = "";

            if(file_type == "txt"){
                mime_type = "text/plain";
                file_name = "backup.txt";
                export_data_str = JSON.stringify(export_data);
            }
            else{ //csv format
                mime_type = "text/csv";
                file_name = "backup.csv";
                export_data_str = "ID,Key,String,URL,Annotation\r\n";
                for(var i=0;i<export_data.length;i++){
                    if(export_data[i].ann == undefined) export_data[i].ann = "";
                    var base64_ann = Base64.encode(export_data[i].ann);

                    if(export_data[i].html_string == undefined) export_data[i].html_string = "";
                    var html_string = export_data[i].html_string.replace(/"/g, '""');
                    
                    if(export_data[i].html_url == undefined) export_data[i].html_url = "";

                    var row = '"' + (i+1) + '","' + export_data[i].html_key + '","' + html_string + '","' + export_data[i].html_url + '","' + base64_ann + '"\r\n';
                    export_data_str = export_data_str + row;
                }
            }

            var blob = new Blob([export_data_str], {type: mime_type});

            var msg = {"key": "download", "file_type": file_type, "file_name":file_name, "value": window.URL.createObjectURL(blob)};
            g_port.postMessage(msg); //send message to background

            /*
            var dlink = document.createElement('a');
            dlink.download = "html_table.txt";
            dlink.href = window.URL.createObjectURL(blob);      
            dlink.onclick = function(e) {
                // revokeObjectURL needs a delay to work properly
                var that = this;
                setTimeout(function() {
                    window.URL.revokeObjectURL(that.href);
                }, 1500);
            };

            //document.getElementById("home").appendChild(dlink);

            dlink.click();
            dlink.remove();
            */
        });
    });
}

function import_database(){

    var element = document.createElement('div');
    element.innerHTML = '<input type="file">';
    var fileInput = element.firstChild;

    fileInput.addEventListener('change', function() {

        document.getElementById("blockOverlay").setAttribute("style", "display: block;");
        document.getElementById("blockMsg").setAttribute("style", "display: block;");

        var file = fileInput.files[0];

        if (file.name.match(/\.(txt|json|csv)$/)) {
            var reader = new FileReader();

            var data_arr = [];

            reader.onload = function() {
                try{
                    data_arr = JSON.parse(reader.result);
                    
                }
                catch(error){
                    //this is csv case
                    
                    var rows = reader.result.split("\r\n"); 

                    for(var i=1; i<rows.length; i++){
                        var row = rows[i].trim();
                        if(row == "") continue;
                        var columns = row.split('","');

                        var ann = Base64.decode(columns[4].substring(0, columns[4].length-1));
                        
                        var data = {"html_key": columns[1], "html_string": columns[2], "html_url": columns[3], "ann": ann};
                        data_arr.push(data);
                    }  
                }

                //import_database_from_json("short_table", data_arr, function(){
                import_database_from_json("html_table", data_arr, function(){
                    import_database_from_json("short_table", data_arr, function(){
                        document.getElementById("blockOverlay").setAttribute("style", "display: none;");
                        document.getElementById("blockMsg").setAttribute("style", "display: none;");
                        document.getElementById("sub_setting").setAttribute("style", "display: none;");

                        chrome.tabs.query({windowType:'normal'}, function(tabs) {
                            for(var i = 0; i < tabs.length; i++) {
                               chrome.tabs.update(tabs[i].id, {url: tabs[i].url});
                            }
                        });

                        clean_search_func();
                    });
                    //location.reload();
                    //chrome.tabs.create({ url: chrome.runtime.getURL('index.html') });
                });             
            };

            reader.readAsText(file);    
        } else {
            alert("File not supported, .txt or .json files only");            
            document.getElementById("blockOverlay").setAttribute("style", "display: none;");
            document.getElementById("blockMsg").setAttribute("style", "display: none;");
        }
    });

    fileInput.click();
}

function setting_click(e){
    var sub_setting_div = document.getElementById("sub_setting");
    var sub_export_div = document.getElementById("export-submenu");

    var style = sub_setting_div.getAttribute("style", "display: block;");
    if(style == "display: none;")
        sub_setting_div.setAttribute("style", "display: block;");
    else{
        sub_setting_div.setAttribute("style", "display: none;");
        sub_export_div.setAttribute("style", "display: none;");
    }
}

var is_setting_over = 0;
var is_subsetting_over = 0;

function setting_mouse_out(e){
    is_setting_over = 0;
    if((is_setting_over == 0) && (is_subsetting_over == 0)){
        var sub_setting_div = document.getElementById("sub_setting");
        sub_setting_div.setAttribute("style", "display: none;");
        console.log("setting leave");
    }
}
function setting_mouse_over(e){
    if((is_setting_over == 0) && (is_subsetting_over == 0)){
        return;
    }
    is_setting_over = 1;

    var sub_setting_div = document.getElementById("sub_setting");
    sub_setting_div.setAttribute("style", "display: block;");
    console.log("setting over")
}

function setting_subitem_hover(e){
    is_subsetting_over = 1;
    var sub_setting_div = document.getElementById("sub_setting");
    sub_setting_div.setAttribute("style", "display: block;");
    console.log("sub-setting hover")
}
function setting_subitem_out(e){
    is_subsetting_over = 0;
    if((is_setting_over == 0) && (is_subsetting_over == 0)){
        var sub_setting_div = document.getElementById("sub_setting");
        sub_setting_div.setAttribute("style", "display: none;");
        var sub_setting_div = document.getElementById("export-submenu");
        sub_setting_div.setAttribute("style", "display: none;");
        console.log("sub-setting out");
    }
}

function export_submenu_out(e){     
    var sub_setting_div = document.getElementById("export-submenu");
    sub_setting_div.setAttribute("style", "display: none;");
    console.log("sub-setting out"); 
}

var g_search_txt_id = "";
var g_port;

function getSearchText(evt){
    var search_txt = this.value;
    var clean_search = document.getElementById("clean_search");

    if(search_txt != ""){        
        clean_search.style.opacity = 1;
        get_all_data_from_indexeddb("html_table", search_txt, function(data){
            update_data_to_indexeddb("setting_table", g_search_txt_id, "search_txt", search_txt, "", 0, "",
                function(res){
                    clear_indexeddb("search_table", function(){ 
                        add_bulk_raws_database("search_table", data, function(){
                            process_all_shortlist_data(data);                       
                        });
                        
                    });                     
                }
            );
        }); 
    }
    else{
        clean_search.style.opacity = 0;
        update_data_to_indexeddb("setting_table", g_search_txt_id, "search_txt", search_txt, "", 0, "", function(res){
                clear_indexeddb("search_table", function(){ 
                    get_all_data_from_indexeddb("short_table", "", process_all_shortlist_data);
                }); 
            }
        );
        
    }
}

function clean_search_func(){
    var search_input = document.getElementById("search_input");
    search_input.value = "";
    search_input.dispatchEvent(new Event("input"));
}

function toggle_on_off(){
    get_data_from_indexeddb("setting_table", "toggle", function(res){
        var toggle_value = "on";
        if(res["html_string"] == "on"){
            toggle_value = "off";                    
        }
        update_data_to_indexeddb("setting_table", res["id"], "toggle", toggle_value, "", 0, "", function(res){
            if(toggle_value == "on"){
                document.getElementById("toggle_on").style.color = "#000000";
                document.getElementById("toggle_off").style.color = "#888888";
            }
            else{
                document.getElementById("toggle_on").style.color = "#888888";
                document.getElementById("toggle_off").style.color = "#000000";
            }

            var msg = {"key": "toggle", "value":toggle_value};
            g_port.postMessage(msg); //send message to background
        });
    })
}

function process_all_shortlist_data(data){
    console.log("data");
    var content = document.getElementById("content");
    content.textContent = '';
    if(data.length == 0)
    {           
        var div = document.createElement("div");    

        div.className = "item";     
        div.innerHTML = "no data";
        content.appendChild(div);       
    }
    else{
        var cc = data.length;
        var end_index = 0;
        if(cc>SHORTLIST_MAX_LINK_COUNT) end_index = cc - SHORTLIST_MAX_LINK_COUNT;

        for(var i=cc-1; i>=end_index; i--){
            var div = document.createElement("div");
            
            div.className = "item";     
            var str = data[i].html_string;
            var str_arr = str.split(" ");
            var short_str = "";
            for(var j=0; j<str_arr.length;j++){
                short_str = short_str + str_arr[j] + " ";
                if(j>=9) {
                    short_str = short_str + "...";
                    break;
                }
            }


            div.innerHTML = short_str;
            div.setAttribute("data-key", data[i].html_key);
            div.setAttribute("title", "click to open/view highlights on web");
            div.addEventListener('click', click);

            var close_div = document.createElement("div");
            close_div.className = "close-div"
            close_div.innerHTML = "&nbsp;[X]"
            close_div.setAttribute("data-key", data[i].html_key);
            close_div.setAttribute("title", "click to close row");
            close_div.addEventListener('click', close_click);            

            div.appendChild(close_div)

            content.appendChild(div);   

        }
    }
}

function recieve_from_background(msg){
    console.log("from background, message recieved" + msg);
}

function ping() {
    var command = 7; //PING
    chrome.runtime.sendMessage({command: command}, response => {
        if(chrome.runtime.lastError) {
            setTimeout(ping, 500);
        } else {
            g_port = chrome.extension.connect({
                name: "Sample Communication"
            });
            g_port.onMessage.addListener(recieve_from_background);
        }
    });
}

ping();

document.addEventListener('DOMContentLoaded', function () {

    var home_div = document.getElementById("home");
    home_div.addEventListener('click', home_click);

    var clear_div = document.getElementById("clear");
    clear_div.addEventListener('click', clear_click);

    var show_export_submenu_div = document.getElementById("show_export_submenu");
    show_export_submenu_div.addEventListener('click', show_export_submenu);

    var expert_div = document.getElementById("expert");
    expert_div.addEventListener('click', export_database);

    var import_div = document.getElementById("import");
    import_div.addEventListener('click', import_database);

    var toggle_on_span = document.getElementById("toggle_on");
    toggle_on_span.addEventListener('click', toggle_on_off);
    var toggle_off_span = document.getElementById("toggle_off");
    toggle_off_span.addEventListener('click', toggle_on_off);

    var search_input = document.getElementById("search_input");
    search_input.addEventListener('input', getSearchText);

    
    var setting_div = document.getElementById("setting");
    setting_div.addEventListener('click', setting_click);
    //setting_div.addEventListener('mouseleave', setting_mouse_out);
    //setting_div.addEventListener('mouseover', setting_mouse_over);

    var sub_setting_div = document.getElementById("sub_setting");
    //sub_setting_div.addEventListener('mouseover', setting_subitem_hover);
    //sub_setting_div.addEventListener('mouseleave', setting_subitem_out);
    sub_setting_div.setAttribute("style", "display: none;");

    var export_submenu_div = document.getElementById("export-submenu"); 
    export_submenu_div.addEventListener('mouseleave', export_submenu_out); 
    export_submenu_div.setAttribute("style", "display: none;");

    var clean_search = document.getElementById("clean_search");
    clean_search.addEventListener('click', clean_search_func); 

    /*
    var filter_search = document.getElementById("export_filter1");
    filter_search.addEventListener('click', function(a){
        document.getElementById("export_type2").checked=true;
        document.getElementById("export_type1").disabled=true;
    });

    var filter_list = document.getElementById("export_filter2");
    filter_list.addEventListener('click', function(a){
        document.getElementById("export_type2").checked=true;
        document.getElementById("export_type1").disabled=true;
    });

    var filter_all = document.getElementById("export_filter3");
    filter_all.addEventListener('click', function(a){
        document.getElementById("export_type1").disabled=false;
        document.getElementById("export_type1").checked=true;        
    });
    */


    
    function reload_menu_data(search_txt){
        var clean_search = document.getElementById("clean_search");        
        if((search_txt == "") || (search_txt == undefined)){
            clean_search.style.opacity = 0;
            get_all_data_from_indexeddb("short_table", "", process_all_shortlist_data);     
        }
        else{
            clean_search.style.opacity = 1;
            get_all_data_from_indexeddb("search_table", "", process_all_shortlist_data);    
        }
    }

    function process_menu_links(){
        get_data_from_indexeddb("setting_table", "search_txt", function(res){
            g_search_txt_id = res["id"];
            document.getElementById("search_input").value = res["html_string"];
            reload_menu_data(res["html_string"]);
        });
    }

    chrome.browserAction.setIcon({path: "images/icon16.png"});
    

    process_menu_links();

    get_data_from_indexeddb("setting_table", "toggle", function(res){
        
        if(res["html_string"] == "on"){
            document.getElementById("toggle_on").style.color = "#000000";
            document.getElementById("toggle_off").style.color = "#888888";
        }
        else{
            document.getElementById("toggle_on").style.color = "#888888";
            document.getElementById("toggle_off").style.color = "#000000";
        }
    
    });

    //donation dialog code
    document.getElementById("pay").addEventListener("click", () => {
        let money = document.querySelector("input[name=donateAmount]:checked").value
        window.open(getMoneyDonateUrl(money));
    });

    document.getElementById("donation").addEventListener("click", () => {
        document.getElementById("main-menu").style.display = "none";
        document.getElementById("donation-menu").style.display = "block";
    });

    function getMoneyDonateUrl(money) {
        return 'https://www.paypal.com/cgi-bin/webscr?cmd=_donations&business=joseph%40adilettante.com&currency_code=GBP&amount=' + money;
    }
});


