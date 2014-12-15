//
// Models
//
var Contact = Backbone.Model.extend({
    defaults: {
      name: '',
      value: '',
      main_email: '',
      pending: '',
      security: 1 // set default security to 'internal'.
    },
    url: function() {
        if (this.isNew()) {
              return '/profile/' + profile_id + '/contacts/add';
        }
        return '/profile/' + profile_id + '/contacts/' + this.id;
    }
});  

//
// Collections
//
var Contacts = Backbone.Collection.extend({
    model: Contact,
    url: '/profile/' + profile_id + '/contacts/'
});

//
// Views
//

//
// Contact View
//
var ContactView = BaseView.extend({
    tagName: 'div',
    
    show_template: _.template($('#show-contact-template').html()),
    edit_template: _.template($('#edit-contact-template').html()),
    
    events: function() {
        return _.extend( {
            'click a.edit':  'edit',
            'click a.set':  'set_as_main',
            'submit form': 'save'
        }, this.constructor.__super__.events);
    },  
    initialize: function(options) {
      var self = this;
      self.constructor.__super__.initialize.apply(self, arguments);
      self.actor_type = options.actor_type;
      _.bindAll(self, 'set_as_main');
      options.vent.bind("edit", self.edit);
      options.vent.bind("show", self.show);
    },
    render_show: function(e) {
        var self = this;
        $(self.el).html(self.show_template({
            name: self.model.get('name'),
            value: self.model.get('value')
        }));
        if(self.model.get('pending') == true) {
            $(self.el).find(".value").append("<span class='tahoma_gray_8pt'> (pending) <span>");
        }
        if(self.model.get('main_email') != "") {
            $(self.el).find(".value").append("<span class='tahoma_gray_8pt'> (main) <span>");
        }
        // need to set href because the href in the template is not changed.
        // https://github.com/documentcloud/backbone/issues/523
        // this seems to occur only in firefox 3.6.
        $(self.el).find("a").eq(0).attr("href",self.model.get('value'));
        
        // add a ruler if its the main email and its in edit mode.
        if(self.model.get('main_email') != "" && self.mode == 'edit') {
            $(self.el).append("<hr/>");
        }
    },
    render_edit: function() {
        
        var self = this;
        
        $(self.el).html(self.edit_template({
            name: self.model.get('name'),
            value: self.model.get('value')
        }));
        
        var select_box = $(self.el).find("select").eq(0);
        
        if(self.model.get('main_email') != "") {
            $(self.el).prepend(self.show_template({
                name: self.model.get('name'),
                value: self.model.get('value')
            }));
            $(self.el).find(".value").append("<span class='tahoma_gray_8pt'> (main) <span>");
            // hide inputs so only the security can be changed.
            select_box.hide();
            $(self.el).find("input").hide();
            $(self.el).find(".delete").hide();
            $(self.el).find(".set").hide();
            return self;
        }
        
        // create auto complete combo box.
        select_box.attr("default", self.model.get('name'));
        select_box.combobox();
        
        select_box.change(function() {
            var selected_value = $(self.el).find("option:selected").val();
            if(selected_value != "") {
                if(selected_value == 'oth') {
                    $(self.el).hide();
                    $(self.el).find("#name").show();
                } else {
                    $(self.el).hide();
                    $(self.el).find("#name").show();
                }
                var option_text = $(self.el).find("option:selected").text() + ":";
                $(self.el).find("#name").val(option_text);
            } 
        });
        
        $(self.el).find(".cancel").click(function(e) {
            var field = $(this).prev();
            var field_name = field.attr("id");
            var field_value = self.model.get(field_name);
            field.val(field_value);
            $(this).hide();
            $(this).removeClass('dirty');
            // stop event propagation to avoid scrolling to the top.
            e.preventDefault();
        });
        
        return self;
        
    },
    show_buttons: function(show) {
        var self = this;
        // A 'super' method for backbone.js
        // https://gist.github.com/1542120
        ContactView.__super__.show_buttons.apply(self, [show]);
        if(show) {
            // check if its a valid email.
            if(self.actor_type == 0 && email_filter().test(self.model.get('value')) && self.model.get('main_email') == "" && self.model.get('pending') != true) {
                $(self.el).find(".set").show();
            }
            if(self.model.get('main_email') == "" && self.model.get('pending') != true) {
                $(self.el).find(".edit").show();
                $(self.el).find(".delete").show();
            } 
            if(self.model.get('pending') == true) {
                $(self.el).find(".delete").show();
            }
        }
        return self; 
    },
    send_data: function() {
        var self = this;
        var name = self.$('#name').next("input").val();
        self.model.save(
             { name: name, value: self.$('#value').val(), 
                 pending: self.model.get('pending'), main_email: self.model.get('main_email'), 
                 security: self.security},
             {
                 success: self.saved_success,
                 error: self.saved_error
             }
        );
        return self;
    },
    set_as_main: function(e) {
        var self = this;
        self.model.save(
            { name: self.model.get('name'), value: self.model.get('value'), pending: true, main_email: true, security: self.security},
            {
                success: function(model, response) {
                  self.model = model;
                  self.edit();
                  self.delegateEvents();
                  // show error if needed.
                  if(response.error) {
                      self.show_error(model, response);
                  } else {
                      notify('success', "Please check your inbox. An e-mail was sent to confirm this change.");
                  }
                },
                error: self.saved_error
            }
       );
       // prevent default form submission.
       e.preventDefault();
       return self;
    }
});

var ContactListView = Backbone.View.extend({   
    
    el: $('#contacts_wrapper'),
    
    events: {
        'click button.add': 'addItem',
        "click a.edit_link" : "edit"
    },
    initialize: function(options) {
        var self = this;
        self.vent = options.vent;
        self.actor_type = options.type;
        _.bindAll(self, 'render', 'show', 'edit', 'addItem', 'appendItem', 'refresh', 'updateInfo', 'removedItem');
        self.collection = new Contacts();
        var contacts = self.collection;
        options.vent.bind("show", self.show);
        contacts.bind("refresh", function() {self.render();});
        contacts.bind("reset", function() {self.render();});
        contacts.bind("add", self.appendItem);
        contacts.bind("remove", self.removedItem);
        //skills.fetch();
        self.counter = 0; // total number of items added thus far
        self.links_counter = 0; // total number of links added thus far
        self.edit_mode = false;
        contacts.reset(options.json);
        //contacts.fetch();
    },
    updateInfo: function(links_counter) {
        var self = this;
        if(links_counter == undefined) {
            links_counter = self.links_counter;
        } else {
            self.links_counter = links_counter;
        }
        // show info if there aren't any contacts (besides the email) and links.
        if((self.collection.models.length == 1 && links_counter == 0) && !self.edit_mode) {
            $('.info', self.el).show();
        } else {
            $('.info', self.el).hide();
        }
        return self;
    },
    removedItem: function() {
        var self = this;
        self.updateInfo();
        return self;
    },
    render: function() {
        var self = this;
        $('#contacts', this.el).html("");
        self.updateInfo();
        $('#contacts', this.el).append("<div class='contact_list top_margin'></div>");
        $('#contacts', this.el).append("<div class='buttons'></div>");
        this.refresh(this.collection, {});
        return this;
    },
    show: function(){
        var self = this;
        $(self.el).find(".buttons").html("");
        self.edit_mode = false;
        self.render();
        return self;
    },
    edit: function(e){
        
        var self = this;
        if(!self.edit_mode) {
            $('a.edit_link', self.el).find("img").eq(0).attr("title", "Finish");
            $('a.edit_link', self.el).find("img").eq(0).attr("src", "/img/finish.png");
            $(self.el).find(".buttons").html("");
            $(self.el).find(".buttons").append("<button class='btn add'><i class='icon-plus'></i><span class='tiny_left_margin'>Contact</span></button>"); 
            self.vent.trigger("edit", this.model);
            self.edit_mode = true;
            // hide information.
            $('.info', self.el).hide();
        } else {
            // check if there are changes that weren't saved.
            var new_models = [];
            _(self.collection.models).each(function(model){
                if(model.isNew()) {
                    new_models.push(model);
                }
             }, self); 
            if(new_models.length > 0 || $('.contact_list', self.el).find(".dirty").length > 0 || $('.links_list').find(".dirty").length > 0) {
                smoke.confirm('You have unsaved info. Are you sure you want to finish editing?',function(e) {
                    if (e){
                        self.edit_mode = false;
                        self.vent.trigger("show", null);
                        $('a.edit_link', self.el).find("img").eq(0).attr("title", "Edit");
                        $('a.edit_link', self.el).find("img").eq(0).attr("src", "/img/edit.png");
                        $(self.el).find(".buttons").html("");
                    }
                });
            } else {
                $('a.edit_link', self.el).find("img").eq(0).attr("title", "Edit");
                $('a.edit_link', self.el).find("img").eq(0).attr("src", "/img/edit.png");
                $(self.el).find(".buttons").html("");
                self.vent.trigger("show", null);
                self.edit_mode = false;
            }
        }
        if(e !== undefined) {
            // stop event propagation to avoid scrolling to the top.
            e.preventDefault();
        }
        return self;
    },
    refresh: function(collection, options){
        var self = this;
        this.collection = collection;
        _(this.collection.models).each(function(contact){
            self.appendItem(contact);
         }, this); 
        return self;
    },
    addItem: function(){
        this.counter++;
        var contact = new Contact();
        this.collection.add(contact);
    },
    appendItem: function(item){
        var self = this;
        var itemView = new ContactView({
            model: item,
            vent: self.vent,
            actor_type: self.actor_type
        });
        $('.contact_list', this.el).append(itemView.render().el);
        self.updateInfo();
        return self;
    }
});
