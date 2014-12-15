//
// Models
//
var Link = Backbone.Model.extend({
    defaults: {
      name: '',
      value: '',
      security: 1 // set default security to 'internal'.
    },
    url: function() {
        if (this.isNew()) {
              return '/profile/' + profile_id + '/links/add';
        }
        return '/profile/' + profile_id + '/links/' + this.id;
    },
}); 

//
// Collections
//
var Links = Backbone.Collection.extend({
    model: Link,
    url: '/profile/' + profile_id + '/links/'
});

//
// Views
//

//
// Link View
//
var LinkView = BaseView.extend({
    tagName: 'span',
    show_template: _.template($('#show-link-template').html()),
    edit_template: _.template($('#edit-link-template').html()),
    events: function() {
        return _.extend( {
            'click a.edit':  'edit',
            'click a.cancel':  'cancel',
            'submit form': 'save'
        }, this.constructor.__super__.events);
    },
    initialize: function(options) {
      var self = this;
      self.constructor.__super__.initialize.apply(self, arguments);
      options.vent.bind("edit", self.edit);
      options.vent.bind("show", self.show);
    },
    render_show: function() {
        var self = this;
        
        var link_image = '';
        if(self.model.get('name') == "LinkedIn") {
            link_image = '/img/in.png';
        //} else if(self.model.get('name') == "Facebook") {
        //    link_image = '/img/fac.png';
        } else if(self.model.get('name') == "Google") {
            link_image = '/img/goo.png';
        //} else if(self.model.get('name') == "Twitter") {
        //    link_image = '/img/twi.png';
        } else {
            link_image = '/img/web.png';
        }
        
        $(self.el).html(self.show_template({
            image: link_image,
            name: self.model.get('name'),
            value: self.model.get('value')
        }));
        $(self.el).find(".tip").tipTip();
        // need to set href because the href in the template is not changed.
        // https://github.com/documentcloud/backbone/issues/523
        // this seems to occur only in firefox 3.6.
        $(self.el).find("a").eq(0).attr("href",self.model.get('value'));
        // need to set href because the href in the template is not changed.
        // https://github.com/documentcloud/backbone/issues/523
        // this seems to occur only in firefox 3.6.
        $(self.el).find("a").eq(0).html("<img class='tiny_left_margin' src='" + link_image + "' width='13' height='13'>");
        return self;
        
    },
    render_edit: function() {
        var self = this;
        var self_el = $(self.el);
        self_el.html(self.edit_template({
            name: self.model.get('name'),
            value: self.model.get('value')
        }));
        self_el.fadeIn('fast');
        // change select box to jquery widget.
        var select_box = self_el.find("select").eq(0);
        // create auto complete combo box.
        select_box.attr("default", self.model.get('name'));
        select_box.combobox();
        
        return self;
    },
    send_data: function() {
       var self = this;
       var name = self.$('#name').next("input").val();
       self.model.save(
            { name: name, value: self.$('#value').val(), security: self.security},
            {
                success: self.saved_success,
                error: self.saved_error
            }
       );
       return self;
    }
});

var LinkListView = Backbone.View.extend({   
    
    el: $('#links_wrapper'),
    
    events: {
        'click button.add': 'addItem',
         "click a.edit_link" : "edit"
    },
    initialize: function(options) {
        this.vent = options.vent;
        _.bindAll(this, 'render', 'show', 'edit', 'addItem', 'appendItem', 'refresh', 'removedItem');
        this.collection = new Links();
        var links = this.collection;
        options.vent.bind("edit", this.edit);
        options.vent.bind("show", this.show);
        var self = this;
        links.bind("refresh", function() {self.render();});
        links.bind("reset", function() {self.render();});
        links.bind("add", this.appendItem);
        links.bind("remove", this.removedItem);
        this.counter = 0; // total number of items added thus far
        this.edit_mode = false;
        links.reset(options.json);
        //links.fetch();
    },
    render: function() {
        var self = this;
        $('#links', self.el).html("");
        $('#links', self.el).append("<div class='links_list'></div>");
        $('#links', self.el).append("<div class='buttons' style='margin-top: 5px;'></div>");
        self.refresh(self.collection, {});
        return self;
    },
    show: function() {
        $(this.el).find(".buttons").html("");
        this.edit_mode = false;
        this.render();
        return this;
    },
    edit: function() {
        if(!this.edit_mode) {
            $(this.el).find(".buttons").html("");
            $(this.el).find(".buttons").append("<button class='btn add'>+ Link</button>");
            this.edit_mode = true;
        }
        return this;
    },
    refresh: function(collection, options) {
        var self = this;
        this.collection = collection;
        _(this.collection.models).each(function(link){
             self.appendItem(link);
          }, this);
        return self;
    },
    addItem: function() {
        this.counter++;
        var link = new Link();
        this.collection.add(link);
    },
    appendItem: function(item) {
        var self = this;
        var itemView = new LinkView({
            model: item,
            vent: self.vent
        });
        $('.links_list', this.el).append(itemView.render().el);
    },
    removedItem: function() {
        var self = this;
        return self;
    },
});
