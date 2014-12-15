Backbone.Model.prototype.idAttribute = "_id";

//
// Models
//
var FAQEntry = Backbone.Model.extend({
    defaults: {
      name: '',
      description_val: ''
    },
    url: function() {
        return '/';
    },
    local: true
});  

//
//FAQEntries
//
var FAQEntries = Backbone.Collection.extend({
 model: FAQEntry,
 url: '',
 local: true  // always fetched and saved only locally, never saves on remote
});

//
//Views
//

//
//FAQEntry View
//
var FAQEntryView = BaseView.extend({
 tagName: 'tr',
 
 show_template: _.template($('#show-faqentry-template').find("tr").html()),
 edit_template: _.template($('#edit-faqentry-template').find("tr").html()),
 
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
   self.actor_type = options.actor_type;
   options.vent.bind("edit", self.edit);
   options.vent.bind("show", self.show);
 },
 delete_message: function(e) {
     return "Are you sure you want to delete this entry?";
 },
 render_show: function(e) {
     var self = this;
     var self_el = $(self.el);
     
     var name = self.model.get('name');
     var description = self.model.get('description');
     self_el.html(self.show_template({
         name: name,
         description: description
     }));
     
     // remove value attribute when its empty otherwise in IE8 the type='text' is showed as the value.
     if(name.length == 0) {
       self_el.find("input#name").removeAttr("value");
     }
     
 },
 render_edit: function() {
     
     var self = this;
     
     var self_el = $(self.el);
     var name = self.model.get('name');
     var description = self.model.get('description');
     self_el.html(self.edit_template({
         name: name,
         description: description
     }));
     
     self_el.find(".cancel").click(function(e) {
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
 send_data: function() {
     var self = this;
     var self_el = $(self.el);
     var name_val = self_el.find('.name').val();
     var description_val = self_el.find('.description').val();
     self.model.set(
         { name: name_val, description: description_val }
      );
     self.mode = '';
     self.render();
     $(".empty_table").hide();
     return self;
 },
 // override remove so the 
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
 }
});

var FAQEntriesListView = Backbone.View.extend({   
 
 el: $('#entries_wrapper'),
 events: {
     'click a#new_entry':  'addItem'
 },
 initialize: function(options) {
     var self = this;
     self.vent = options.vent;
     self.actor_type = options.type;
     _.bindAll(self, 'render', 'addItem', 'appendItem', 'refresh', 'removedItem');
     self.collection = new FAQEntries();
     var faqentries = self.collection;
     options.vent.bind("show", self.show);
     faqentries.bind("refresh", function() {self.render();});
     faqentries.bind("reset", function() {self.render();});
     faqentries.bind("add", self.appendItem);
     faqentries.bind("remove", self.removedItem);
     faqentries.reset(options.json);
 },
 removedItem: function() {
     var self = this;
     return self;
 },
 render: function() {
     var self = this;
     $('#entries', this.el).html("");
     $('#entries', this.el).append("<div class='rule_list top_margin'></div>");
     $('#entries', this.el).append("<div class='buttons'></div>");
     this.refresh(this.collection, {});
     return this;
 },
 refresh: function(collection, options){
     var self = this;
     this.collection = collection;
     _(this.collection.models).each(function(faqentry){
         self.appendItem(faqentry);
      }, this); 
     return self;
 },
 addItem: function(){
     this.counter++;
     var faqentry = new FAQEntry();
     this.collection.add(faqentry);
 },
 appendItem: function(item){
     var self = this;
     var itemView = new FAQEntryView({
         model: item,
         vent: self.vent
     });
     $('tbody', this.el).append(itemView.render().el);
     if(item.isNew()) {
         $("html, body").animate({ scrollTop: $(document).height() }, 1000);
     }
     return self;
 }
});
