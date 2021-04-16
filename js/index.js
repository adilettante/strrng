(function($) {
    function AddZero(num) {
        return (num >= 0 && num < 10) ? "0" + num : num + "";
    }
    function getToday(){
        var now = new Date();
        var str_today = now.getFullYear() + "-" + AddZero(now.getMonth() + 1) + "-" + AddZero(now.getDate());
        return str_today;
    }

    var g_bookmarks_folder_id = "0"; //bookmarks root

    var g_port;

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

    chrome.browserAction.setIcon({path: "images/icon16.png"});

    function find_create_bookmark_folder_by_name(target_name, callback_func){
        var is_find = false;
        function printBookmarks(bookmarks, target) {            
            bookmarks.forEach(function(bookmark) {
                console.log(bookmark.id + ' - ' + bookmark.title + ' - ' + bookmark.url + " = " + target);
                if(bookmark.title == target){
                    is_find = true;
                    g_bookmarks_folder_id = bookmark.id;
                }
                if (bookmark.children)
                    printBookmarks(bookmark.children, target);
            });            
        }

        chrome.bookmarks.getTree(function(bookmarks) {
            printBookmarks(bookmarks, target_name);
            if(is_find == false){
                if(g_bookmarks_folder_id == "0"){
                    //create new folder named with target_name
                    var createBookmark = chrome.bookmarks.create({
                        title: target_name,
                        url: "",
                        parentId: "1" //id of bookmarks bar                    
                    }, function(newfolder){
                        g_bookmarks_folder_id = newfolder.id;
                        callback_func();
                    });
                    
                }
                else{
                    var createBookmark = chrome.bookmarks.create({
                        title: target_name,
                        url: "",
                        parentId: g_bookmarks_folder_id //id of bookmarks bar                    
                    }, function(newfolder){
                        g_bookmarks_folder_id = newfolder.id;
                        callback_func();
                    });
                }
            }
            else{
                callback_func();
            }
        });
    }

    function create_bookmark_url_by_name_and_url(target_name, target_url, callback_func){
        var is_find = false;
        function printBookmarks(bookmarks, target) {            
            bookmarks.forEach(function(bookmark) {
                console.log(bookmark.id + ' - ' + bookmark.title + ' - ' + bookmark.url + " = " + target);
                if((bookmark.title == target_name)&&(bookmark.url == target_url)){
                    is_find = true;
                    return;
                }
                if (bookmark.children)
                    printBookmarks(bookmark.children, target);
            });            
        }

        chrome.bookmarks.getTree(function(bookmarks) {
            printBookmarks(bookmarks, target_name);                        
            if(is_find == false){
                var createBookmark = chrome.bookmarks.create({
                    title: target_name,
                    url: target_url,
                    parentId: g_bookmarks_folder_id 
                }, callback_func);
            }
            else{
                callback_func();
            }
        });
    }

    function delete_bookmark_by_name_and_url(target_name, target_url, callback_func){
        var existed_id = "0";
        function printBookmarks(bookmarks, target) {            
            bookmarks.forEach(function(bookmark) {
                console.log(bookmark.id + ' - ' + bookmark.title + ' - ' + bookmark.url + " = " + target);
                if((bookmark.title == target_name)&&(bookmark.url == target_url)){
                    existed_id = bookmark.id;
                    return;
                }
                if (bookmark.children)
                    printBookmarks(bookmark.children, target);
            });            
        }

        chrome.bookmarks.getTree(function(bookmarks) {
            printBookmarks(bookmarks, target_name);                        
            if(existed_id != "0"){
                chrome.bookmarks.remove(existed_id, callback_func);
            }
            else{
                callback_func();
            }
        });
    }

    var process_all_html_data = function(data){
        var len = data.length;
        var html_key = "";
        var html_url = "";
        var html_string = "";
        var action_string = "";
        var html_id;
        var target = null;
        
        table_data = [];

        var html_id_list = [];
        var html_key_list = [];

        var index = len;

        for(var i=len-1; i>=0; i--){                
            var tmp = data[i];
            if(tmp["is_visible"] == 0){
                html_id_list.push(tmp["id"]);
                html_key_list.push(tmp["html_key"]);
                continue;
            }            
            html_id = tmp["id"];
            html_key = tmp["html_key"];
            html_url = tmp["html_url"];
            //ann = tmp["ann"];

            html_url_str = '<a href="javascript:;" class="page-url">' + html_url + '</a>';
            html_string = tmp["html_string"];
            if(i == 0){
                action_string = '<div><a href="javascript:;" class="menu-btn" data-key="' + html_key + '">Add to menu</a></div>' + '<div><a href="javascript:;" class="book-btn" data-key="' + html_key + '">Bookmark</a></div>';
            }
            else{
                action_string = '<div><a href="javascript:;" class="menu-btn" data-key="' + html_key + '">Add to menu</a></div>' + '<div><a href="javascript:;" class="book-btn" data-key="' + html_key + '">Bookmark</a></div>' + '<div><a href="javascript:;" class="delete-btn" data-key="' + html_key + '">Delete</a></div>';
    
            }
            
            tmp_data = [index, html_string, html_url_str, action_string];
            table_data.push(tmp_data);
            index--;        
        }

        delete_multi_data_from_all_table_indexeddb(html_id_list, html_key_list, function(){
            console.log("delete all success");
        });

        
        var datatable = $('#html_samples').DataTable( {
            data: table_data,            
            columns: [
                { title: "ID", "width": "5%"},                
                { title: "Html String", "width": "60%"},
                { title: "Web Page", "width": "20%"},
                { title: "Action", "width": "15%"}            
            ],
            "pagingType": "simple",
            "columnDefs": [
                {
                    "targets": [0, 1, 2, 3],
                    "orderable": false
                },
                {
                    "width": "200px", "targets": 3
                }
            ],
            "dom": "<'row'<'col-sm-12 col-md-6'l><'col-sm-12 col-md-6'f>><'row'<'col-sm-12'tr>><'row'<'col-sm-12 col-md-6'i><'col-sm-12 col-md-2 toolbar'><'col-sm-12 col-md-4'p>>",
            "order": [],  // not set any order rule for any column.
            "oSearch": { "bSmart": false, "bRegex": true }
        });

        $("div.toolbar").html('<div class="export_csv_btn" title="download search or all"><img src="images/csv.png"></div>');
        $(document.querySelector('.export_csv_btn')).on('click', function(e){
            var export_data = "ID,String,URL\r\n";  
            var search_txt = datatable.search(); 
            get_all_data_from_indexeddb("html_table", search_txt, function(data){        
                
                for(var i=0;i<data.length; i++){
                    var html_string = data[i].html_string.replace(/"/g, '""');
                    var html_url = data[i].html_url;

                    var row = "" + (i+1) + ',"' + html_string + '",' + html_url + '\r\n';
                    export_data = export_data + row;
                }

                var file_name = "backup.csv";
                var mime_type = "text/csv;charset=utf-8";

                var blob = new Blob([export_data], {type: mime_type});

                var msg = {"key": "download", "file_name":file_name, "value": window.URL.createObjectURL(blob)};
                g_port.postMessage(msg); //send message to background
            });
        });
        
        $(document).on('click', "#html_samples tbody a", function(e){
            target = $(e.currentTarget);            
            
            var btn_class = $(e.currentTarget).attr("class");
            if(btn_class == "menu-btn"){
                e.preventDefault();
                var html_key = $(e.currentTarget).data("key");  
                var btn_type = $(e.currentTarget).text();

                get_data_from_indexeddb("html_table", html_key, function(record){
                    var str = record["html_string"];
                    var str_arr = str.split(" ");
                    var short_str = "";
                    for(var j=0; j<str_arr.length;j++){
                        short_str = short_str + str_arr[j] + " ";
                        if(j>=9) {
                            short_str = short_str + "...";
                            break;
                        }
                    }
                    get_data_from_indexeddb("short_table", html_key, function(short_record){
                        if(btn_type == "Add to menu"){
                            target.text("Undo");
                            target.css("color", "#ff8c00");
                            target.parent().parent().parent().contents().css("background-color", "#00ff8c");

                            if (short_record["id"] == ""){
                                add_data_to_indexeddb("short_table", html_key, short_str, record["html_url"], record["ann"], function(){
                                    console.log("add this entry to menu");
                                    //location.reload();   
                                });
                            }  
                            else{
                                html_id = parseInt(short_record["id"]);
                                delete_data_from_indexeddb("short_table", html_id, function(){
                                    add_data_to_indexeddb("short_table", html_key, short_str, record["html_url"], record["ann"], function(){
                                        console.log("add this entry to menu");
                                        //location.reload();    
                                    });
                                });
                            }
                        }   
                        else{
                            target.text("Add to menu");
                            target.css("color", "#00ff8c");
                            //target.parent().parent().parent().contents().removeAttr("style");
                            target.parent().parent().parent().contents().css("background-color", "#ff8c00");
                            if (short_record["id"] != ""){
                                html_id = parseInt(short_record["id"]);
                                delete_data_from_indexeddb("short_table", html_id, function(){
                                });
                            }
                        }              
                    });    
                });
            }
            else if(btn_class == "book-btn"){
                e.preventDefault();
                var html_key = $(e.currentTarget).data("key");
                var btn_type = $(e.currentTarget).text();
                
                get_data_from_indexeddb("html_table", html_key, function(record){
                    var str = record["html_string"];
                    var str_arr = str.split(" ");
                    var short_str = "";
                    for(var j=0; j<str_arr.length;j++){
                        short_str = short_str + str_arr[j] + " ";
                        if(j>=9) {
                            short_str = short_str + "...";
                            break;
                        }
                    }                    
                    if(btn_type == "Bookmark"){
                        create_bookmark_url_by_name_and_url(short_str, record["html_url"], function(){ 
                            target.text("Undo");
                            target.css("color", "#ff8c00");
                            target.parent().parent().parent().contents().css("background-color", "#0073ff");
                        });
                    }
                    else{
                        delete_bookmark_by_name_and_url(short_str, record["html_url"], function(){ 
                            target.text("Bookmark");
                            target.css("color", "#0073ff");
                            //target.parent().parent().parent().contents().removeAttr("style");
                            target.parent().parent().parent().contents().css("background-color", "#ff8c00");
                        });
                    }
                });
                
            }
            else if(btn_class == "delete-btn"){
                e.preventDefault();
                var html_key = $(e.currentTarget).data("key");
                var btn_type = $(e.currentTarget).text();
                if(btn_type == "Delete"){
                    get_data_from_indexeddb("html_table", html_key, function(record){
                        update_data_to_indexeddb("html_table", record["id"], html_key, record["html_string"], record["html_url"], 0, record["ann"], function(){
                            target.text("Undo");
                            target.parent().parent().parent().contents().css("background-color", "#ff0073");
                            target.css("color", "#ff8c00");
                        });
                    });    
                }
                else{
                    get_data_from_indexeddb("html_table", html_key, function(record){
                        update_data_to_indexeddb("html_table", record["id"], html_key, record["html_string"], record["html_url"], 1, record["ann"], function(){
                            target.text("Delete");
                            target.css("color", "#ff0073");
                            //target.parent().parent().parent().contents().removeAttr("style");
                            target.parent().parent().parent().contents().css("background-color", "#ff8c00");
                        });
                    });
                }                
            }  
            else if(btn_class == "page-url"){
                e.preventDefault();
                var target_url = $(e.currentTarget).text();
 
                chrome.tabs.query({}, function(tabs) {
                    var urls = tabs.map(function(tab) {
                        return tab.url;
                    });
                    // do something with urls
                    //console.log(urls);
                    var cc = tabs.length;
                    for(var i=0;i<cc;i++){
                        if(target_url == tabs[i]["url"]){
                            chrome.tabs.update(tabs[i].id, {active: true});
                            return;         
                        }
                    }
                    chrome.tabs.create({ url: target_url});                    
                });
                
            }          
        }); 
    };



    get_all_data_from_indexeddb("html_table", "", process_all_html_data);

    var today = getToday();
    var bookmarks_root_folder_name = "Sttrng Bookmarks " + today;
    var is_find = find_create_bookmark_folder_by_name(bookmarks_root_folder_name, function(){
        console.log("created bookmarks folder");        
    });

})(jQuery); 