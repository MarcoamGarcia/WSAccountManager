// Works with Firefox and Safari.
// use timeout (onreadystatechange and onload don't work for all browsers - tested with safari).
// Dynamically loading JS libraries and detecting when they're loaded: http://www.ejeliot.com/blog/109 
javascript:(function(){
    function load_help() {
        window.helplib=helpjs.require("helplib", "http://widget.dev:3000/javascripts/embed.js");
    }
    function onLightningjsAvailable() {
        if (typeof window.helpjs !== "undefined") {
            load_help();
        } else {
            setTimeout(function () {
                onLightningjsAvailable();
            }, 50);
        }
    }
    onLightningjsAvailable();
    inst_help_script=document.createElement('SCRIPT');
    inst_help_script.type='text/javascript';
    inst_help_script.src='http://widget.dev:3000/api/files/start';
    document.getElementsByTagName('body')[0].insertBefore(inst_help_script,document.getElementsByTagName('body')[0].firstChild);
})();

// Https version
javascript:(function(){
    function load_help() {
        window.helplib=helpjs.require("helplib", "https://widget.dev:4430/javascripts/embed.js");
    }
    function onLightningjsAvailable() {
        if (typeof window.helpjs !== "undefined") {
            load_help();
        } else {
            setTimeout(function () {
                onLightningjsAvailable();
            }, 50);
        }
    }
    onLightningjsAvailable();
    inst_help_script=document.createElement('SCRIPT');
    inst_help_script.type='text/javascript';
    inst_help_script.src='https://widget.dev:4430/api/files/start';
    document.getElementsByTagName('body')[0].insertBefore(inst_help_script,document.getElementsByTagName('body')[0].firstChild);
})();

javascript:(function(){
    function load_help() {
        window.helplib=helpjs.require("helplib", "https://widget.dev:4430/javascripts/embed.js");
    }
    function onLightningjsAvailable() {
        if (typeof window.helpjs !== "undefined") {
            load_help();
        } else {
            setTimeout(function () {
                onLightningjsAvailable();
            }, 50);
        }
    }
    onLightningjsAvailable();
    inst_help_script=document.createElement('SCRIPT');
    inst_help_script.type='text/javascript';
    inst_help_script.src='https://widget.dev:4430/api/files/startFile';
    document.getElementsByTagName('body')[0].insertBefore(inst_help_script,document.getElementsByTagName('body')[0].firstChild);
})();

// Works in Firefox
javascript:(function(){
    function load_help() {
        window.help_site_key="SITE_DEMO_PUBLISHER_API_TOKEN";
        window.help_page_key="SITE_DEMO_PAGE_KEY";
        window.helplib=helpjs.require("helplib", "http://wsam.com/api/files/start");
    }
    
    inst_help_script=document.createElement('SCRIPT');
    inst_help_script.type='text/javascript';
    inst_help_script.onreadystatechange= function () {
        if (this.readyState == 'complete') { 
            load_help();
        }   
    };
    inst_help_script.onload = load_help;
    inst_help_script.src='http://wsam.com/javascripts/embed.js';
    document.getElementsByTagName('body')[0].insertBefore(inst_help_script,document.getElementsByTagName('body')[0].firstChild);
    
})();


// Works in Safari
javascript:(function(){
    function onLightningjsAvailable() {
        alert((typeof window.helpjs));
        if (typeof window.helpjs !== "undefined") {
            window.help_site_key="SITE_DEMO_PUBLISHER_API_TOKEN";
            window.help_page_key="SITE_DEMO_PAGE_KEY";
            window.helplib=helpjs.require("helplib", "//wsam.com/api/files/start");
        } else {
            setTimeout(function () {
                onLightningjsAvailable();
            }, 50);
        }
    }
    
    onLightningjsAvailable();
    inst_help_script=document.createElement('SCRIPT');
    inst_help_script.type='text/javascript';
    inst_help_script.src='http://wsam.com/javascripts/embed.js';
    document.getElementsByTagName('body')[0].insertBefore(inst_help_script,document.getElementsByTagName('body')[0].firstChild);
    
})();