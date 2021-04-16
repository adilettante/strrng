function generate_key(){
    return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
}

function openIndexedDB () {
    // This works on all devices/browsers, and uses IndexedDBShim as a final fallback 
    var indexedDB = window.indexedDB || window.mozIndexedDB || window.webkitIndexedDB || window.msIndexedDB || window.shimIndexedDB;
    var dbVersion = 1.0;
    var openDB = indexedDB.open("htmlDB", dbVersion);

    openDB.onupgradeneeded = function() {
        var db = {}
        db.result = openDB.result;    
        if(!db.result.objectStoreNames.contains("html_table")) {            
            var objectStore = db.result.createObjectStore("html_table", {keyPath: 'id', autoIncrement:true});  
            objectStore.createIndex("html_key", "html_key", { unique: true });
        }

        if(!db.result.objectStoreNames.contains("short_table")) {            
            var objectStore = db.result.createObjectStore("short_table", {keyPath: 'id', autoIncrement:true});  
            objectStore.createIndex("html_key", "html_key", { unique: true });
        } 

        if(!db.result.objectStoreNames.contains("setting_table")) {            
            var objectStore = db.result.createObjectStore("setting_table", {keyPath: 'id', autoIncrement:true});  
            objectStore.createIndex("html_key", "html_key", { unique: true });
        }   

        if(!db.result.objectStoreNames.contains("search_table")) {            
            var objectStore = db.result.createObjectStore("search_table", {keyPath: 'id', autoIncrement:true});  
            objectStore.createIndex("html_key", "html_key", { unique: true });
        }  
    };

    return openDB;
}

function getStoreIndexedDB (openDB, table_name) {
    var db = {};
    db.result = openDB.result;
    db.tx = db.result.transaction(table_name, "readwrite");
    db.store = db.tx.objectStore(table_name);
    db.index = db.store.index("html_key");
    return db;
}

//TEMP TO REMOVE
function add_data_to_indexeddb(table_name, html_key, html_string, url, ann, callback) {
    var openDB  = openIndexedDB();
    openDB.onsuccess = function() {
        var db = getStoreIndexedDB(openDB, table_name);

        var request = db.store.add( {html_key: html_key, html_string: html_string, url:url, is_visible:1, ann:ann });
        request.onsuccess = function(event) {
            console.log("add success");
            callback();
        };
    }
}

function get_all_data_from_indexeddb(table_name, search_text, callback){
    var openDB = openIndexedDB();
    openDB.onsuccess = function() {

        var db = getStoreIndexedDB(openDB, table_name);

        db.store.getAll().onsuccess = function(event){
            var html_data = [];
            var items = event.target.result;
            var search_text_lower = search_text.toLowerCase();
            for(var i=0; i<items.length; i++){
                var item = items[i];
                var _str = "";
                var _str_lower = "";
                if(item.html_string != undefined) {
                    _str = item.html_string;
                    _str_lower = _str.toLowerCase();
                }

                var _url = "";
                var _url_lower = "";
                if(item.url != undefined){
                    _url = item.url;
                    _url_lower = _url.toLowerCase();  
                } 

                var data = {id:item.id, html_key: item.html_key, html_string: _str, html_url:_url, is_visible:item.is_visible, ann:item.ann};

                if( (search_text_lower != "")&&
                    (!_str_lower.includes(search_text_lower))&&
                    (!_url_lower.includes(search_text_lower))){
                }
                else{                    
                    html_data.push(data);
                }
            }
            callback(html_data);
        } 
    }
}

function get_data_from_indexeddb(table_name, html_key, callback){
    var openDB = openIndexedDB();
    openDB.onsuccess = function() {
        var db = getStoreIndexedDB(openDB, table_name);    
        var data = db.index.get(html_key);
        data.onsuccess = function() {
            var res = {id:"", html_key:"", html_string:"", html_url:"", is_visible:1, ann:""};
            if(data.result == undefined){
                callback(res);
            }
            else{
                res = {id:data.result.id, html_key:data.result.html_key, html_string:data.result.html_string, html_url:data.result.url, is_visible:data.result.is_visible, ann:data.result.ann}
                callback(res);
            }
        };
    };
}



function update_data_to_indexeddb(table_name, html_id, html_key, html_string, url, is_visible, ann, callback){
    var openDB = openIndexedDB();
    openDB.onsuccess = function() {
        var db = getStoreIndexedDB(openDB, table_name); 
        var request = db.store.put({id:html_id, html_key:html_key, html_string:html_string, url: url, is_visible:is_visible, ann:ann});        
        request.onsuccess = function(evt) {  
            console.log("updated success");
            callback();
        };
        request.onerror = function(evt){
            console.log("updated error");  
            callback();
        }
    }    
}

function delete_data_from_indexeddb(table_name, html_id, callback){
    var openDB = openIndexedDB();
    openDB.onsuccess = function() {
        var db = getStoreIndexedDB(openDB, table_name); 
        var request = db.store.delete(html_id);
        request.onsuccess = function(evt) {  
            console.log("deleted success");
            callback();
        };
    }    
}

function delete_multi_data_from_all_table_indexeddb(html_id_list, html_key_list, callback){
    recursiveDelete = function(_index){
        var id_count = html_id_list.length;
        if(_index >= id_count) {                
            callback();
            return;
        }
        var html_id = html_id_list[_index];
        delete_data_from_indexeddb("html_table", html_id, function(){
            get_data_from_indexeddb("short_table", html_key_list[_index], function(short_record)
            {
                if(short_record.id == "")
                    recursiveDelete(_index+1);
                else{
                    delete_data_from_indexeddb("short_table", short_record["id"], function()
                    {
                        recursiveDelete(_index+1);
                    });                        
                }
            });
        });            
    }
    
    recursiveDelete(0);            
}

function clear_indexeddb(table_name, callback){
    var openDB = openIndexedDB();
    openDB.onsuccess = function() {
        var db = getStoreIndexedDB(openDB, table_name); 
        var request = db.store.clear();
        request.onsuccess = function(evt) {  
            console.log("all records are deleted successfully");
            callback();
        };
    }    
}

function add_or_update_database(table_name, html_key, html_string, url, ann, callback){
    
    get_data_from_indexeddb(table_name, html_key, function(res){
        if(res["id"] == ""){
            add_data_to_indexeddb(table_name, html_key, html_string, url, ann, function(){
                callback("added");
            });
        }
        else{
            update_data_to_indexeddb(table_name, res["id"], html_key, html_string, url, 1, ann, function(){
                callback("updated");
            });
        }
    });
    
}
function import_database_from_json(table_name, json_arr, callback){
    /*
    for (var i = 0; i < json_arr.length; i++) { 
        add_or_update_database("html_table", json_arr[i].html_key, json_arr[i].html_string, json_arr[i].html_url, json_arr[i].ann);
    } 
    */
    recursiveImport = function(_index){
        var len = json_arr.length;
        if(_index >= len) {                
            callback();
            return;
        }
        add_or_update_database(table_name, json_arr[_index].html_key, json_arr[_index].html_string, json_arr[_index].html_url, json_arr[_index].ann, function(){
            recursiveImport(_index+1);
        });     
    }
    recursiveImport(0);
}

function add_bulk_raws_database(table_name, data, callback){
    /*
    for (var i = 0; i < data.length; i++) { 
        add_data_to_indexeddb(table_name, data[i]["html_key"], data[i]["html_string"], data[i]["html_url"], "", function(){});
    }
    */

    var openDB  = openIndexedDB();
    openDB.onsuccess = function() {
        var db = getStoreIndexedDB(openDB, table_name);

        for (var i = 0; i < data.length; i++) { 
            db.store.add({html_key:data[i]["html_key"], html_string:data[i]["html_string"], url:data[i]["html_url"], is_visible:1, ann:data[i]["ann"]});
        }
        db.tx.oncomplete = function(event) {
            callback();
        }
    }
    
}

function get_all_ann_from_indexeddb(url, callback){
    var openDB = openIndexedDB();
    openDB.onsuccess = function() {
        var db = getStoreIndexedDB(openDB, "html_table");

        var anns = [];
        db.store.openCursor().onsuccess = function(event) {  
            var cursor = event.target.result;  
            if (cursor) {                  
                if(cursor.value.url == url){
                    anns.push(cursor.value.ann);
                }                
                cursor.continue();  
            }  
            else {  
                console.log("Done with cursor");
                callback(anns);
            }  
        };  
    }
}
