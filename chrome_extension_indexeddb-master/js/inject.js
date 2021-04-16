// this is the code which will be injected into a given page...

/*
 * share-selection: Medium like popover menu to share on Twitter or by email any text selected on the page
 *
 * -- Requires jQuery --
 * -- AMD compatible  --
 *
 * Author: Xavier Damman (@xdamman)
 * GIT: https://github.com/xdamman/share-selection
 * MIT License
 */

//(function($) {
    /*
    $.getScript(chrome.runtime.getURL("annotator-full.min.js"),function(){
        if (typeof annotator === 'undefined') {
            alert("Oops! it looks like you haven't built Annotator. " +
            "Either download a tagged release from GitHub, or build the " +
            "package by running `make`");
        } else {
            var app = new annotator.App();
            app.include(annotator.ui.main);
            app.start();
        }
    });
    */
    console.log("inject");
    
    if (typeof annotator === 'undefined') {
            alert("Oops! it looks like you haven't built Annotator. " +
            "Either download a tagged release from GitHub, or build the " +
            "package by running `make`");
        } else {
            var app = new annotator.App();
            app.include(annotator.ui.main);
            app.start();
        }

//})(jQuery);



