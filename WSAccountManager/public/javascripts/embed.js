// JavaScript detect an AJAX event
// http://stackoverflow.com/questions/3596583/javascript-detect-an-ajax-event
var s_ajaxListener = new Object();
s_ajaxListener.tempOpen = XMLHttpRequest.prototype.open;
s_ajaxListener.tempSend = XMLHttpRequest.prototype.send;

var temp = XMLHttpRequest.getResponseHeader;
XMLHttpRequest.prototype.getResponseHeader = function() { 
    console.log("getResponseHeader --------------------------<<<<<<<<<");
    temp.apply(this, arguments); 
};

s_ajaxListener.callback = function () {
    console.log("--------------------------> " + this.url);
  // this.method :the ajax method used
  // this.url    :the url of the requested script (including query string, if any) (urlencoded) 
  // this.data   :the data sent, if any ex: foo=bar&a=b (urlencoded)
}

XMLHttpRequest.prototype.open = function(a,b) {
  if (!a) var a='';
  if (!b) var b='';
  s_ajaxListener.tempOpen.apply(this, arguments);
  s_ajaxListener.method = a;  
  s_ajaxListener.url = b;
  if (a.toLowerCase() == 'get') {
    s_ajaxListener.data = b.split('?');
    s_ajaxListener.data = s_ajaxListener.data[1];
  }
}

XMLHttpRequest.prototype.send = function(a,b) {
  if (!a) var a='';
  if (!b) var b='';
  
  /* Wrap onreadystaechange callback */
  var mycallback = this.onreadystatechange;
  this.onreadystatechange = function() {     
      console.log("this.readyState: " + this.readyState);
      if (this.readyState == 4) {

          console.log("--------------------------<<<<<<<<<");
           /* We are in response; do something, like logging or anything you want */

       }
      mycallback.apply(this, arguments);
  }
  
  if(s_ajaxListener.method.toLowerCase() == 'post') s_ajaxListener.data = a;
  s_ajaxListener.callback();

  s_ajaxListener.tempSend.apply(this, arguments);
  
  
  
}

/*LightningJS is released by the Olark team under the following license.

2011 (c) Habla, Inc.

Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.

Contains substantial conceptual work from the Meebo embed code.

2010 (c) Meebo, Inc.

Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
*/
window.helpjs || (function(modules){
    var helpjsName = 'helpjs';
    function require(moduleName, url) {
        // attach the helpjs version to the URL to make versioning possible
        var helpjsVersion = '1';
        if (url) url += (/\?/.test(url) ? '&': '?') + 'lv=' + helpjsVersion;
        // declare the namespace
        modules[moduleName] || (function() {
            var theWindow = window,
            theDocument = document,
            namespace = moduleName,
            protocol = theDocument.location.protocol,
            load = "load",
            responseCounter = 0;
            (function() {
                // create a callback named after the namespace, and have it
                // recursively return deferred responses
                modules[namespace] = function() {
                    var theArguments = arguments,
                    context = this,

                    // freeze in the ID of the response of this function so that
                    // the nested methods can depened on its response
                    // (used to deserialize the callstack with proper dependency
                    // ordering later on)
                    promiseResponseId = ++responseCounter,
                    promiseFunctionId = (context && context != theWindow) ? (context.id || 0) : 0;

                    // push this call onto the callstack
                    (internalModule.s = internalModule.s || []).push([promiseResponseId, promiseFunctionId, theArguments]);

                    // create a deferred function that recursively applies this
                    // deferred call mechanism to allow nested deferred methods
                    function promiseFunction() {
                        promiseFunction.id = promiseResponseId;
                        return modules[namespace].apply(promiseFunction, arguments)
                    }

                    // add then() method to implement the CommonJS Promise API
                    // http://wiki.commonjs.org/wiki/Promises/A
                    promiseFunction.then = function(fulfillmentHandler, errorHandler, progressHandler) {

                        // initialize the handler queues
                        var fulfillmentHandlers = internalModule.fh[promiseResponseId] = internalModule.fh[promiseResponseId] || [],
                            errorHandlers = internalModule.eh[promiseResponseId] = internalModule.eh[promiseResponseId] || [],
                            progressHandlers = internalModule.ph[promiseResponseId] = internalModule.ph[promiseResponseId] || [];

                        // enqueue the appropriate handlers
                        fulfillmentHandler && fulfillmentHandlers.push(fulfillmentHandler);
                        errorHandler && errorHandlers.push(errorHandler);
                        progressHandler && progressHandlers.push(progressHandler);

                        // return the function itself to allow chaining
                        return promiseFunction;
                    }
                    return promiseFunction;
                };

                // the internal module keeps track of all our internal state
                // like callstacks and performance data
                var internalModule = modules[namespace]._ = {};

                // vars for tracking Promise API callbacks
                internalModule.fh = {}; // fulfillmentHandler list
                internalModule.eh = {}; // errorHandler list
                internalModule.ph = {}; // progressHandler list

                // generate the URL that we will download from (based on http/https)
                internalModule.l = url ? url.replace(/^\/\//, (protocol=='https:' ? protocol : 'http:') + '//') : url;

                // download performance tracking dictionary (keeps timestamps
                // of each stage of the download for later analysis)
                internalModule.p = {
                    0: +new Date
                };
                internalModule.P = function(f) {
                    internalModule.p[f] = new Date - internalModule.p[0]
                };

                // track the window.onload event
                function windowLoadHandler() {
                    internalModule.P(load);
                    // use internalModule.w to remember that the onload event
                    // triggered, for future module imports
                    internalModule.w = 1;
                    modules[namespace]('_load')
                }

                // if the window.onload event triggered previously for any other
                // namespace, trigger it again for this namespace
                if (internalModule.w) windowLoadHandler();

                // listen for onload
                theWindow.addEventListener ? theWindow.addEventListener(load, windowLoadHandler, false) : theWindow.attachEvent("on" + load, windowLoadHandler);

                // download the library (if a URL was given...otherwise we
                // assume that something else is providing this namespace)
                var downloadIntoFrameContext = function() {

                    // this helper is used to build the inner iframe where
                    // the module will live in its own window context
                    function buildInnerFrameHtml() {
                        return [
                            "<head></head><",body, ' onload="var d=',
                            documentString, ";d.getElementsByTagName('head')[0].",
                            appendChild, "(d.", createElement, "('script')).",
                            srcAttr, "='", internalModule.l, "'\"></", body, ">"
                        ].join("")
                    }

                    // try to get a handle on the document body
                    var body = "body",
                    documentBody = theDocument[body];

                    // if the document body does not exist yet, wait 100ms
                    // and retry this anonymous closure
                    if (!documentBody) {
                        return setTimeout(downloadIntoFrameContext, 100)
                    }

                    // performance tracking: we have reached stage 1 (building inner frame)
                    internalModule.P(1);

                    // use vars to refer to strings, this improves compression by
                    // allowing the compiler to treat repeated instances as one
                    var appendChild = "appendChild",
                    createElement = "createElement",
                    srcAttr = "src",
                    innerFrameWrapper = theDocument[createElement]("div"),
                    innerFrameContainer = innerFrameWrapper[appendChild](theDocument[createElement]("div")),
                    innerFrame = theDocument[createElement]("iframe"),
                    documentString = "document",
                    domain = "domain",
                    domainSrc,
                    contentWindow = "contentWindow";

                    // hide the iframe container and append it to the document
                    innerFrameWrapper.style.display = "none";
                    
                    var iframecontainer = documentBody.insertBefore(innerFrameWrapper, documentBody.firstChild);
                    // dont' know why but IE 9 returns "undefined" if 'insertBefore' is called with 'documentBody.firstChild'.
                    // http://stackoverflow.com/questions/5172202/does-ie7-not-fully-support-javascripts-insertbefore-method
                    // http://www.javascriptkit.com/domref/elementmethods.shtml
                    // "Important: Like many DOM methods that change the structure of the document, insertBefore() can only be called after the page has     fully loaded. Doing so before will return strange errors in most browsers!"
                    if(typeof iframecontainer == "undefined") { 
                        iframecontainer = documentBody.firstChild.insertBefore(innerFrameWrapper, null);
                    }      
                    iframecontainer.id = helpjsName + "-" + namespace;
                    innerFrame.frameBorder = "0";
                    innerFrame.id = helpjsName + "-frame-" + namespace;
                    if (/MSIE[ ]+6/.test(navigator.userAgent)) {
                        // in IE6, we make sure to load javascript:false to avoid
                        // about:blank security warnings under SSL
                        innerFrame[srcAttr] = "javascript:false"
                    }
                    innerFrame.allowTransparency = "true";
                    innerFrameContainer[appendChild](innerFrame);

                    // Try to start writing into the blank iframe. In IE, this will fail if document.domain has been set, 
                    // so fail back to using a javascript src for the frame. In IE > 6, these urls will normally prevent 
                    // the window from triggering onload, so we only use the javascript url to open the document and set 
                    // its document.domain
                    try {
                        innerFrame[contentWindow][documentString].open()
                    } catch(E) {
                        // keep track of the actual document.domain in the
                        // internal module in case it is useful in the future
                        internalModule[domain] = theDocument[domain];
                        domainSrc = "javascript:var d=" + documentString + ".open();d.domain='" + theDocument.domain + "';";
                        innerFrame[srcAttr] = domainSrc + "void(0);"
                    }

                    // Set the HTML of the iframe. In IE 6, the document.domain from the iframe src hasn't had time to 
                    // "settle", so trying to access the contentDocument will throw an error. Luckily, in IE 7 we can 
                    // finish writing the html with the iframe src without preventing the page from onloading
                    try {
                        var frameDocument = innerFrame[contentWindow][documentString];
                        frameDocument.write(buildInnerFrameHtml());
                        frameDocument.close()
                    } catch(D) {
                        innerFrame[srcAttr] = domainSrc + 'd.write("' + buildInnerFrameHtml().replace(/"/g, String.fromCharCode(92) + '"') + '");d.close();'
                    }

                    // performance tracking: this is the last bit of code for
                    // the loader to execute, we want to know how long it took
                    internalModule.P(2)

                };
                internalModule.l && downloadIntoFrameContext();
            })()
        })();

        // freeze the version identifier into this module
        modules[moduleName].lv = helpjsVersion;

        // return the module itself
        return modules[moduleName];
    }

    // load helpjs as a module itself, this has the side benefit
    // of making sure there is at least one module listening to window.onload
    var helpjs = window[helpjsName] = require(helpjsName);

    // export the public helpjs API
    helpjs.require = require;
    helpjs.modules = modules;

})({});