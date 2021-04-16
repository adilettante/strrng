(function($) {
    //var myWindow = window.open("aaa", "sss");
    //myWindow.document.write("<p>I replaced the current window.</p>");
    /*
    var s = 'data:text/html;charset=utf-8,' + 
        encodeURIComponent( // Escape for URL formatting
            '<!DOCTYPE html>'+
            '<html lang="en">'+
            '<head><title>Embedded Window</title></head>'+
            '<body><h1>42</h1></body>'+
            '</html>'
        );
    window.open(s);
    */

    //--- if edit, then get key from url and load key and string.

    var load_html_by_key = function(res){  
        if(res["id"] == ""){
            //there is no data
            alert("there is no data");
            window.location.href = 'index.html'; 
        }
        $("#html_id").val(res["id"]);      
        $("#html_key").val(res["html_key"]);
        $("#html_url").val(res["html_url"]);
        $("#html_string").val(res["html_string"]);   
        $("#ann").val(res["ann"]);   
    }
    
    var edit_key = location.search.split('html_key=')[1] ? location.search.split('html_key=')[1] : '';
    if(edit_key == ""){
        alert("please select correct html key.");
        window.location.href = 'index.html'; 
    }
    else{        
        get_data_from_indexeddb("html_table", edit_key, load_html_by_key);
    }

    $("#save_html").click(function(e){
        e.preventDefault();
        var html_id = $("#html_id").val();
        if(html_id == "")
            return;

        var html_id = parseInt(html_id);
        var html_key = $("#html_key").val();
        var html_url = $("#html_url").val();
        var html_string = $("#html_string").val();
        var ann = $("#ann").val();
        
        if(html_id == 0){
            add_data_to_indexeddb("html_table", html_key, html_string, html_url, ann, function(){
                window.location.href = 'index.html';        
            });    
        }
        else{
            update_data_to_indexeddb("html_table", html_id, html_key, html_string, html_url, 1, ann,function(){
                window.location.href = 'index.html';        
            });
        }
        
        
    });
   
})(jQuery); 