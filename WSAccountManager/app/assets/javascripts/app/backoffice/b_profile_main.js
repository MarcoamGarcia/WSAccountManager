Backbone.Model.prototype.idAttribute = "_id";

//
// Models
//
var Profile = Backbone.Model.extend({
    defaults: {
      name: '',
      name_security: 1, // set default security to 'registered'.
      about_me: '',
      about_me_security: 1, // set default security to 'registered'.
      email: '',
      email_security: 0, // set default security to 'private'.
      pending_email: '',
      birth_date: '',
      gender: ''
    },
    url: function() {
        return '/profile/' + profile_id + "/main";
    }
}); 

//
// Views
//

//
// Main info View
//
var ProfileMainView = BaseView.extend({
    el: $('#general_info'),
    show_template: _.template($('#show-main-template').html()),
    edit_template: _.template($('#edit-main-template').html()),
    events: function() {
        return _.extend( {
            'submit form': 'save',
            "click a.edit" : "edit",
            'click a.cancel':  'cancel'
        }, this.constructor.__super__.events);
    },
    initialize: function(options) {
      var self = this;
      self.constructor.__super__.initialize.apply(this, arguments);
      _.bindAll(self, 'change_selection_property');
      self.render();
    },
    render_show: function() {
        var self = this;
        var name = self.model.get('name');
        var about_me = self.model.get('about_me');
        var email = self.model.get('email');
        var pending_email = self.model.get('pending_email');
        //about_me = about_me.replace(/\n/g, "<br/>");

        $(self.el).html(self.show_template({
            name: self.model.get('name'),
            email: email,
            about_me: about_me
        }));
        
        // show pending email if it exists.
        if(pending_email != "") {
            $('.pending_email', this.el).text(" (" + pending_email + " pending...)");
        }
            
        // show empty information if about_me is empty.
        if(about_me == "") {
            $('.about_me', this.el).html("---");
        }
        
        // replace all line breaks.
        // this must be done after calling embebbed because it removes all markup.
        about_me = $('.about_me', this.el).html().replace(/\n/g, "<br/>");
        $('.about_me', this.el).html(about_me);
        // if its not the first time that the about_me area is showed we can condense the text.
        // we do this because all ".condense" elements are condensed after the page loads.
        /*if(!self.first_render) {
            $(self.el).find(".condense").condense(
                {  
                  moreText: 'show more',
                  lessText: 'show less',
                  condensedLength: 400
                }
            );
        }*/
          
        return self;
    },
    render_edit: function(e) {
        var self = this;
        $(self.el).html(self.edit_template({
            name: self.model.get('name'),
            email: self.model.get('email'),
            about_me: self.model.get('about_me')
        }));        
        
        return self;
    },
    // override security selection so we can change all the security elements in the edit area.
    security_selection: function() {
        var self = this;
        var self_el = $(self.el);
        
        self.change_selection_property(self_el.find(".name_security"), self.model.get("name_security"));
        self.change_selection_property(self_el.find(".email_security"), self.model.get("email_security"));
        self.change_selection_property(self_el.find(".about_me_security"), self.model.get("about_me_security"));
        
        self_el.find(".private").click(function (e) {
            self.change_selection_property($(this).parents(".security_chooser"), 0);
        });
        self_el.find(".registered").click(function (e) {
            self.change_selection_property($(this).parents(".security_chooser"), 1);
        });
        self_el.find(".public").click(function (e) {
            self.change_selection_property($(this).parents(".security_chooser"), 2);
        });
        return self;
    },
    change_selection_property: function(security_parent, value) {
        var self = this;
        
        var icon_class = "";
        if(value == 0) {
            icon_class = "icon-eye-close";
        } else if(value == 1) {
            icon_class = "icon-briefcase";
        } else if(value == 2) {
            icon_class = "icon-globe";
        } 
        
        if(security_parent.hasClass("name_security")) {
            security_parent.find(".selected_security").removeClass("icon-wrench icon-eye-close icon-briefcase icon-globe").addClass(icon_class);
            self.model.set("name_security", value, {silent: true});
        } else if(security_parent.hasClass("email_security")) {
            security_parent.find(".selected_security").removeClass("icon-wrench icon-eye-close icon-briefcase icon-globe").addClass(icon_class);
            self.model.set("email_security", value, {silent: true});
        } else if(security_parent.hasClass("about_me_security")) {
            security_parent.find(".selected_security").removeClass("icon-wrench icon-eye-close icon-briefcase icon-globe").addClass(icon_class);
            self.model.set("about_me_security", value, {silent: true});
        } 
        return self;
    },
    send_data: function() {
        var self = this;
        var self_el = $(self.el);
        self.model.save(
            { 
                name: self_el.find('#name').val(), name_security: self.model.get("name_security"),
                email: self_el.find('#email').val(), email_security: self.model.get("email_security"),
                about_me: self_el.find('#about_me').val(),
                about_me_security: self.model.get("about_me_security") 
            },
            {
                success: self.saved_success,
                error: self.saved_error
            }
       );
       return self;
    }
});