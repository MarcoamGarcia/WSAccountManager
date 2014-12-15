
// create pool with active ajax request so they can be killed before changing page and in this way avoid errors showing up at the top of the page.
// http://stackoverflow.com/questions/1802936/stop-all-active-ajax-requests-in-jquery
$.xhrPool = [];
$.xhrPool.abortAll = function() {
    $(this).each(function(idx, jqXHR) {
        jqXHR.abort();
        //alert("abort request!");
    });
    $.xhrPool.length = 0;
};

$.ajaxSetup({
    beforeSend: function(jqXHR) {
        $.xhrPool.push(jqXHR);
    },
    complete: function(jqXHR) {
        var index = $.xhrPool.indexOf(jqXHR);
        if (index > -1) {
            $.xhrPool.splice(index, 1);
        }
    }
});

$(window).unload(function() {
    // abort all ajax request before changing web page.
    $.xhrPool.abortAll();
});

//backbone template settings.
try {    
_.templateSettings = {
    evaluate    : /\{\{(.+?)\}\}/g,
    interpolate : /\{\{(.+?)\}\}/g
  };

}catch(err) {}

(function( $ ) {
    $.widget( "ui.combobox", {
        _create: function() {
            var self = this,
                select = this.element.hide(),
                select_width = select.css("width"),
                selected = select.children( ":selected" ),
                value = selected.val() ? selected.text() : "";
                
            var input_id = "";
            var select_id = select.attr("id");
            if(select_id != "") {
                input_id = select_id + "_combo";
            }
            
            var input_class = "";
            var is_required = select.hasClass("required");
            if(is_required) {
                input_class = "required";
            }
            var input = this.input = $( "<input id='" + input_id + "' + type='text' class='combo " + input_class + "'>" )
                .insertAfter( select )
                .val( value )
                .css({ width: select_width})
                .keyup(function(event) {
                    self._trigger( "selected", event, {
                        select: self.element,
                        input: self.input
                    });
                })
                .autocomplete({
                    delay: 0,
                    minLength: 0,
                    source: function( request, response ) {
                        var matcher = new RegExp( $.ui.autocomplete.escapeRegex(request.term), "i" );
                        response( select.children( "option" ).map(function() {
                            var text = $( this ).text();
                            if ( this.value && ( !request.term || matcher.test(text) ) )
                                return {
                                    label: text.replace(
                                        new RegExp(
                                            "(?![^&;]+;)(?!<[^<>]*)(" +
                                            $.ui.autocomplete.escapeRegex(request.term) +
                                            ")(?![^<>]*>)(?![^&;]+;)", "gi"
                                        ), "<strong>$1</strong>" ),
                                    value: text,
                                    option: this
                                };
                        }) );
                    },
                    select: function( event, ui ) {
                        ui.item.option.selected = true;
                        self.input.val(self.element.find("option:selected").text());
                        self._trigger( "selected", event, {
                            select: self.element,
                            input: self.input
                        });
                    },
                    change: function( event, ui ) {
                        if ( !ui.item ) {
                            var matcher = new RegExp( "^" + $.ui.autocomplete.escapeRegex( $(this).val() ) + "$", "i" ),
                                valid = false;
                            select.children( "option" ).each(function() {
                                if ( $( this ).text().match( matcher ) ) {
                                    this.selected = valid = true;
                                    return false;
                                }
                            });
                            if ( !valid ) {
                                // remove invalid value, as it didn't match anything
                                //$( this ).val( "" );
                                //select.val( $(this).val() );
                                //input.data( "autocomplete" ).term = "";
                                return false;
                            }
                        }
                    }
                })
                .addClass( "ui-autocomplete-input" );

            var default_value = select.attr("default");
            if(default_value != "") {
                input.val(default_value);
            } else {
                input.val(select.find("option:first").text());
            }
            
            
            input.data( "autocomplete" )._renderItem = function( ul, item ) {
                return $( "<li></li>" )
                    .data( "item.autocomplete", item )
                    .append( "<a>" + item.label + "</a>" )
                    .appendTo( ul );
            };

            this.button = $( "<button type='button'>&nbsp;</button>" )
                .attr( "tabIndex", -1 )
                .attr( "title", "Show All Items" )
                .insertAfter( input )
                .button({
                    icons: {
                        primary: "ui-icon-triangle-1-s"
                    },
                    text: false
                })
                .removeClass("ui-corner-all")
                .addClass("ui-corner-left ui-button-icon")
                .css({ width: '20px', 'height': '20px'})
                .click(function() {
                    // close if already visible
                    if ( input.autocomplete( "widget" ).is( ":visible" ) ) {
                        input.autocomplete( "close" );
                        return;
                    }

                    // work around a bug (likely same cause as #5265)
                    $( this ).blur();

                    // pass empty string as value to search for, displaying all results
                    input.autocomplete( "search", "" );
                    input.focus();
                });
        },
        destroy: function() {
            this.input.remove();
            this.button.remove();
            this.element.show();
            $.Widget.prototype.destroy.call( this );
        }
    });
})( jQuery );


//select box with auto complete validation.
function checkSelect(field, rules, i, options) {
  var select_box = field.prev();
  if (select_box.find("option:first").text() == field.val()) {
      return options.allrules.required.alertText;
   } 
}

//http://www.robsearles.com/2010/05/27/jquery-validate-url-adding-http/
// changed so it does not need http or https.
jQuery.validator.addMethod("url_without_protocol", function(val, elem) {
    
    // if no url, don't do anything
    if (val.length == 0) { return true; }
 
    // now check if valid url
    // http://docs.jquery.com/Plugins/Validation/Methods/url
    // contributed by Scott Gonzalez: http://projects.scottsplayground.com/iri/
    return /(((([a-z]|\d|-|\.|_|~|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])|(%[\da-f]{2})|[!\$&amp;'\(\)\*\+,;=]|:)*@)?(((\d|[1-9]\d|1\d\d|2[0-4]\d|25[0-5])\.(\d|[1-9]\d|1\d\d|2[0-4]\d|25[0-5])\.(\d|[1-9]\d|1\d\d|2[0-4]\d|25[0-5])\.(\d|[1-9]\d|1\d\d|2[0-4]\d|25[0-5]))|((([a-z]|\d|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])|(([a-z]|\d|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])([a-z]|\d|-|\.|_|~|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])*([a-z]|\d|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])))\.)+(([a-z]|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])|(([a-z]|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])([a-z]|\d|-|\.|_|~|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])*([a-z]|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])))\.?)(:\d*)?)(\/((([a-z]|\d|-|\.|_|~|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])|(%[\da-f]{2})|[!\$&amp;'\(\)\*\+,;=]|:|@)+(\/(([a-z]|\d|-|\.|_|~|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])|(%[\da-f]{2})|[!\$&amp;'\(\)\*\+,;=]|:|@)*)*)?)?(\?((([a-z]|\d|-|\.|_|~|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])|(%[\da-f]{2})|[!\$&amp;'\(\)\*\+,;=]|:|@)|[\uE000-\uF8FF]|\/|\?)*)?(\#((([a-z]|\d|-|\.|_|~|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])|(%[\da-f]{2})|[!\$&amp;'\(\)\*\+,;=]|:|@)|\/|\?)*)?$/i.test(val);
});
    
// check if email is valid.
// https://github.com/comfirm/Verimail.js
jQuery.validator.addMethod("invalid_email", function(val, elem) {
    
    var validator = this;
    var verimail = new Comfirm.AlphaMail.Verimail();
    verimail.verify(val, function(status, message, suggestion) {
        var error = false;
        // Incorrect syntax!
        if(status < 0){
            // But we might have a solution to this!
            if(suggestion){
                console.log("Did you mean " + suggestion + "?");
                error = "Did you mean " + suggestion + "?";
            } else {
                error = "Please enter a valid email address.";
            }
            
        } else {
            // Syntax looks great!
            if(suggestion){
                // But we're guessing that you've mispelled something here
                console.log("Did you mean " + suggestion + "?");
                error = "Did you mean " + suggestion + "?";
            } 
        }
        
        var previous = validator.previousValue(elem);
        var valid = !error;
        if ( valid ) {
            validator.prepareElement(elem);
            delete validator.invalid[elem.name];
            validator.successList.push(elem);
            validator.hideErrors();
        } else {
            var errors = {};
            errors[elem.name] = previous.message = error;
            validator.invalid[elem.name] = true;
            validator.showErrors(errors);
        }
        previous.valid = valid;
    });
    
    return "pending";
     
});

function verimail_verify(val) {
   
    
    return function(val) {
        
    }
}
    
    
//email regex.
function email_filter() {
  var filter = /^((([a-z]|\d|[!#\$%&'\*\+\-\/=\?\^_`{\|}~]|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])+(\.([a-z]|\d|[!#\$%&'\*\+\-\/=\?\^_`{\|}~]|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])+)*)|((\x22)((((\x20|\x09)*(\x0d\x0a))?(\x20|\x09)+)?(([\x01-\x08\x0b\x0c\x0e-\x1f\x7f]|\x21|[\x23-\x5b]|[\x5d-\x7e]|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])|(\\([\x01-\x09\x0b\x0c\x0d-\x7f]|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF]))))*(((\x20|\x09)*(\x0d\x0a))?(\x20|\x09)+)?(\x22)))@((([a-z]|\d|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])|(([a-z]|\d|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])([a-z]|\d|-|\.|_|~|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])*([a-z]|\d|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])))\.)+(([a-z]|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])|(([a-z]|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])([a-z]|\d|-|\.|_|~|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])*([a-z]|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])))\.?$/i;
  return filter;
}

$(document).ready(function() { 

    //TODO: Set default text input value.
    var date_format = "yy-mm-dd";
    // Create date pickers.
    $(".date_field").datepicker({ 
		changeMonth: true,
		changeYear: true,
		yearRange: "-100:-18",
		defaultDate: new Date ("January 1, 1980")
	});
	$(".date_field").datepicker("option", "dateFormat", date_format);
	
});

var BaseView = Backbone.View.extend({
    events: { 
        'click a.delete': 'remove'
    },    
    initialize: function(options) {
        var self = this;
        self.vent = options.vent;
        _.bindAll(self, 'show_error', 'cancel', 'remove', 'render', 'edit', 'show'
                , 'unrender', 'save', 'saved_success', 'saved_error', 'show_buttons', 'security_selection');
        self.model.bind('remove', self.unrender);
        self.model.bind('error', self.show_error);
        self.model.bind('change', self.render);
        self.model.bind("refresh", function() {self.render();});
        self.model.bind("reset", function() {self.render();});
        self.mode = '';
        self.start_edit = typeof options.start_edit == "undefined" ? true : options.start_edit;
        if(self.model.isNew() && self.start_edit) {
            self.mode = 'edit';
            $(self.el).addClass('dirty');
        }
        self.first_render = true;
    },
    show: function(e) {
        var self = this;
        self.mode = '';
        if(self.model.isNew()) {
            self.model.destroy();
        } else {
            self.render();
            if(e !== undefined && e != null) {
                // stop event propagation to avoid scrolling to the top.
                e.preventDefault();
            }
        }
    },
    edit: function(e) {
        var self = this;
        self.mode = 'edit';
        self.render();
        if(e !== undefined && e != null) {
            // stop event propagation to avoid scrolling to the top.
            e.preventDefault();
        }
    },
    render: function() {
        var self = this;
        var self_el = $(self.el);
        
        if(self.first_render) {
            self.first_render = false;
        }
        self_el.fadeOut('fast', function() {
            if(self.mode == '') {
                self.render_show();
                self_el.fadeIn('fast');
            }
            else if(self.mode == 'edit') {
                self.render_edit();
                
                // don't use change event because it does not work at the first time in a textarea.
                self_el.find("input").css("background-color", "#eee").keyup(function() {
                    var input = $(this);
                    // ignore inputs in combo.
                    if(input.hasClass('combo')) {
                        return;
                    }
                    var input_id = input.attr("id");
                    var model_value = self.model.get(input_id);
                    self.changed(self, input, model_value);
                }).change(function() {
                    var input = $(this);
                    // ignore inputs in combo.
                    if(input.hasClass('combo')) {
                        return;
                    }
                    var input_id = input.attr("id");
                    var model_value = self.model.get(input_id);
                    self.changed(self, input, model_value);
                });
                
                self_el.find("select").css("background-color", "#eee").change(function() {
                    var input = $(this);
                    var input_id = input.attr("id");
                    var model_value = self.model.get(input_id);
                    self.changed(self, input, model_value);
                });
                
                self_el.find("textarea").css("background-color", "#eee").keyup(function() {
                    var input = $(this);
                    // ignore inputs in combo.
                    if(input.hasClass('combo')) {
                        return;
                    }
                    var input_id = input.attr("id");
                    var model_value = self.model.get(input_id);
                    self.changed(self, input, model_value);
                })
                
                // find combobox in e
                self_el.find("select").bind("comboboxselected", function(event, obj) {
                    var select = obj.select;
                    var input = obj.input;
                    var select_id = select.attr("id");
                    var current_value = input.val();
                    var model_value = self.model.get(select_id);
                    self.changed(self, input, model_value);
                });
                
                
                $(".area", self.el).hover(
                    function() {
                        $(this).addClass("active");
                        self.show_buttons(true);
                    },
                    function() {
                        $(this).removeClass("active");
                        self.show_buttons(false);
                    }
                );
                
                self_el.find(".buttons").css({ 'opacity' : 0.3 });
                
                self.security_selection();
                
                self_el.fadeIn('fast', function () {
                    self.after_render_edit();
                });
            }
        }); 
        return this;
    },
    changed: function(self, input, model_value) {
        
        var self_el = $(self.el);
        var current_value = input.val();
        // check if new value is different from the one in the model.
        if(model_value != current_value) {
            if(!input.hasClass('dirty')) {
                input.addClass('dirty');
                input.addClass('unsaved');
                self_el.find(".save").eq(0).addClass('unsaved').addClass("bold");
            }
        } else {
            input.removeClass('dirty');
            input.removeClass('unsaved');
            // if there aren't any other 'dirty' inputs remove unsaved information from save button.
            if(self_el.find(".dirty").length == 0) {
                self_el.find(".save").eq(0).removeClass('unsaved').removeClass("bold");
            }
        }
    },
    render_show: function() {
        // must be overrided by child.
    },
    render_edit: function() {
        // must be overrided by child.
    },
    after_render_edit: function() {
        // can be overrided by child.
        // Note: used for instance to resize textareas.
    },
    delete_message: function() {
        // can be overrided by child to show a specific message.
        return "Are you sure you want to delete?";
    },
    security_selection: function() {
        var self = this;
        var self_el = $(self.el);
        var model = self.model;
        if(typeof model.get("security") != "undefined") {
            if(model.get("security") == 0) {
                self_el.find(".security_type img").eq(0).attr("src", "/images/only_you.png").attr("title", "Private");
            } else if(model.get("security") == 1) {
                self_el.find(".security_type img").eq(0).attr("src", "/images/logged_in.png").attr("title", "Registered");
            } else if(model.get("security") == 2) {
                self_el.find(".security_type img").eq(0).attr("src", "/images/anyone.png").attr("title", "Public");
            }
            self.security = model.get("security");
        }
        
        // show/hide dropdown.
        self_el.find(".security_link").click(function (e) {
            self_el.find(".select_security_type").slideToggle("fast", function() {
                if(self_el.find(".select_security_type").is(":visible")) {
                    self_el.find(".security_link").removeClass("ui-icon-triangle-1-s").addClass("ui-icon-triangle-1-n");
                } else {
                    self_el.find(".security_link").removeClass("ui-icon-triangle-1-n").addClass("ui-icon-triangle-1-s");
                }
            });
            // prevent default link action.
            e.preventDefault();
        });
        
        // change security level.
        // note: don't change model security directly, because it updates all the interface and other changes are lost.
        self_el.find(".select_security_type a").click(function (e) {
            var link_id = $(this).attr("id");
            if(link_id == 'only_me') {
                //model.set({security: 0});
                self.security = 0;
                self_el.find(".security_type img").eq(0).attr("src", "/images/only_you.png").attr("title", "Private");
            } else if(link_id == 'internal') {
                //model.set({security: 1});
                self.security = 1;
                self_el.find(".security_type img").eq(0).attr("src", "/images/logged_in.png").attr("title", "Registered");
            } else {
                //model.set({security: 2});
                self.security = 2;
                self_el.find(".security_type img").eq(0).attr("src", "/images/anyone.png").attr("title", "Public");
            }
            // hide dropdown.
            self_el.find(".select_security_type").hide();
            self_el.find(".security_link").removeClass("ui-icon-triangle-1-n").addClass("ui-icon-triangle-1-s");
            // prevent default link action.
            e.preventDefault();
        });
    },
    show_buttons: function(show) {
        var self = this;
        if(show) {
            $(self.el).find(":input").css("background-color", "white");
            $(self.el).find(".buttons").css({ 'opacity' : 1 });
            $(self.el).find(".save").css({ 'opacity' : 1 });
        } else {
            $(self.el).find(":input").css("background-color", "#eee");
            $(self.el).find(".buttons").css({ 'opacity' : 0.3 });
            if(!$(self.el).hasClass(".dirty") && $(self.el).find(".dirty").length == 0) {
                $(self.el).find(".save").css({ 'opacity' : 0.3 });
            }
            // hide security selector.
            $(self.el).find(".security_link").removeClass("ui-icon-triangle-1-n").addClass("ui-icon-triangle-1-s");
            $(self.el).find(".select_security_type").hide();
        }
    },
    save: function(e) {
        
        var self = this;
        
        // don't allow double submissions.
        var save_button = $(self.el).find('.save');
        if(save_button.hasClass('disabled')) {
            return;
        }
        
        var form_elem = $(self.el).find("form");
        form_elem.validate({
            rules: {
                url: "url_without_protocol",
                // TODO: make validate plugin work with Verimail.js
                //email: "invalid_email",
                email: "email"
            },
            messages: {
                url: "Please enter a valid URL."
            },
            errorClass:'help-inline',
            errorElement:'span',
            highlight: function (element, errorClass, validClass) {
                $(element).parents(".control-group").addClass('error').removeClass('success');
            },
            unhighlight: function (element, errorClass, validClass) {
                $(element).parents(".error").removeClass('error').addClass('success');
            }
        });
        
        var valid = form_elem.valid();
        if(valid) {
            save_button.state('loading');
            // http://jsfiddle.net/brennan/mcYKE/2/
            //https://github.com/twitter/bootstrap/issues/1065
            save_button.toggleClass('btn-striped disabled');
            //$.removeData(form_elem,'validator');
            self.isNew = self.model.isNew();
            self.send_data();
        }
        // prevent default form submission.
        e.preventDefault();
    },
    saved_success: function(model, response) {
        var self = this;
        $(self.el).removeClass('dirty');
        self.model = model;
        self.delegateEvents();
        
        if(_.isObject(response)) {
            var errors = response.errors;
            if(_.isObject(errors)) {
                self.show_error(model, response);
            } else {
                var save_button = $(self.el).find('.save');
                save_button.state('complete');
                // http://jsfiddle.net/brennan/mcYKE/2/
                //https://github.com/twitter/bootstrap/issues/1065
                save_button.toggleClass('btn-striped');
                if(self.vent) {
                    self.vent.trigger("after save", self.model.id);
                }
                self.isNew = false;
                self.show();
            }
        } else {
            self.show_error(model, response);
        }
        return self;
    },
    saved_error: function(model, response) {
        var self = this;
        self.show_error(model, response);
        return self;
    },
    show_error: function(model, response) {
        
        var self = this;
        var save_button = $(self.el).find('.save');
        save_button.state('active');
        // http://jsfiddle.net/brennan/mcYKE/2/
        //https://github.com/twitter/bootstrap/issues/1065
        save_button.toggleClass('btn-striped');
        show_error($(self.el), model, response);
        return self;
    },
    unrender: function() {
        var self = this;
        $(self.el).fadeOut(1000, function () {
            $(this).remove();
        });
        return self;
    },
    remove: function(e){
        var self = this;
        bootbox.confirm(self.delete_message(), function(confirmed) {
            if(confirmed) {
                // don't allow double submissions.
                var delete_button = $(self.el).find('.delete');
                if(delete_button.hasClass('disabled')) {
                    return;
                }
                
                delete_button.state('loading');
                // http://jsfiddle.net/brennan/mcYKE/2/
                //https://github.com/twitter/bootstrap/issues/1065
                delete_button.toggleClass('btn-striped disabled');
                
                self.model.destroy({wait: true, 
                    success: function(model, response) {
                        delete_button.state('complete');
                        // http://jsfiddle.net/brennan/mcYKE/2/
                        //https://github.com/twitter/bootstrap/issues/1065
                        delete_button.toggleClass('btn-striped');
                        self.saved_success(model, response);
                    },
                    error: function(model, response) {
                        delete_button.state('complete');
                        // http://jsfiddle.net/brennan/mcYKE/2/
                        //https://github.com/twitter/bootstrap/issues/1065
                        delete_button.toggleClass('btn-striped');
                        self.saved_error(model, response);
                    }
                });
            }
        });
        if(e !== undefined) {
            // stop event propagation to avoid scrolling to the top.
            e.preventDefault();
        }
        return self;
    },
    cancel: function(e) {
        var self = this;
        self.show();
        // stop event propagation to avoid scrolling to the top.
        e.preventDefault();
        return self;
    }
});

function show_error(elem, model, response) {
    var self = this;

    if(_.isObject(response)) {
        var errors = response.errors;
        if(_.isObject(errors)) {
            show_server_errors(errors, elem);
        }  else if(response.responseText) {
            var errors = JSON.parse(response.responseText).errors;
            if(_.isObject(errors)) {
                show_server_errors(errors, elem);
            } else {
                show_general_error(elem);
            }
        } else {
            show_general_error(elem);
        }
    } else {
        show_general_error(elem);
    }
}

function show_server_errors(errors, elem) {
    _.each(errors, function(value, key){
        if(key == 'general') {
            var model_form = elem.find("form");
            if(model_form.length > 0) {
                model_form = model_form.eq(0); 
                if(model_form.find(".alert-error").length > 0) {
                    model_form.find(".alert-error").html(value);
                } else {
                    var general_error = '<div class="alert alert-error">' + value + '</div>';
                    model_form.prepend(general_error);
                }
            } else {
                var error_div = $('body').find("#top-alert");
                var alert_box = error_div.find(".alert");
                if(alert_box.length == 0) {
                    error_div.find(".center").append("<div class='alert alert-error'><button class='close', data-dismiss='alert'> &times;</button><strong></strong></div>");
                }
                error_div.show().fadeIn('slow').find(".alert strong").html(value);
            }
        } else {
            var control_group = elem.find("[name="+key+"]").parents(".control-group").addClass('error').removeClass('success');
            if(control_group.find(".help-inline").length > 0) {
                control_group.find(".help-inline").html(value).show();
            } else {
                var error_span = '<span for="' + key + '" generated="true" class="help-inline" style="display: inline-block;">' + value + '</span>';
                control_group.append(error_span).find(".help-inline").show();
            }
        }
        
    });
}

function show_general_error(elem) {
    var general_error_info = "Oops. Something went wrong. Please try again.";
    var model_form = elem.find("form");
    if(model_form.length > 0) {
        model_form = model_form.eq(0); 
        if(model_form.find(".alert-error").length > 0) {
            model_form.find(".alert-error").html(general_error_info);
        } else {
            var general_error = '<div class="alert alert-error">' + general_error_info + '</div>';
            model_form.prepend(general_error);
        }
    } else {
        var error_div = $('body').find("#top-alert");
        var alert_box = error_div.find(".alert");
        if(alert_box.length == 0) {
            error_div.find(".center").append("<div class='alert alert-error'><button class='close', data-dismiss='alert'> &times;</button><strong></strong></div>");
        }
        error_div.show().fadeIn('slow').find(".alert strong").html(general_error_info);
    }
}

// http://jsfiddle.net/brennan/SmU9R/
// https://github.com/twitter/bootstrap/issues/471
$.fn.state = function(state) {
    var d = 'disabled';
    return this.each(function () {
      var $this = $(this);
      $this[0].className = $this[0].className.replace(/\bstate-.*?\b/g, '');
      $this.html( $this.data()[state] );
      state == 'loading' ? $this.addClass(d+' state-'+state).attr(d,d) : $this.removeClass(d).removeAttr(d);
    });
}

/* alias away the sync method */
Backbone._sync = Backbone.sync;
// override original sync method to make header request contain csrf token
Backbone.sync = function(method, model, options, error){
    options.beforeSend = function(xhr){
	xhr.setRequestHeader('X-CSRF-Token', $("meta[name='_csrf']").attr('content'));
    };
    options = _.extend(options, {
	url: url_mount + (_.isFunction(model.url) ? model.url() : model.url)
    });
    /* proxy the call to the old sync method */
    return Backbone._sync(method, model, options, error);
};