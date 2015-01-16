Backbone.Model.prototype.idAttribute = "_id";

//
// Models
//
var Credencial = Backbone.Model.extend({
    defaults: {
      credencial_name: '',
      credencial_description: '',
      credencial_username: '',
      credencial_password: ''
    },
    url: function() {
      if (this.isNew()) {
          return '/company/' + company_id + '/client/' + client_id + '/credencials';
      }
      return '/company/' + company_id + '/credencial/' + this.id;
    }
});  

//
//Credencials
//
var Credencials = Backbone.Collection.extend({
 model: Credencial,
 url: ''
});

//
//Views
//

//
//Credencial View
//
var CredencialView = BaseView.extend({
 tagName: 'tr',
 
 show_credencial: _.template($('#show-credencial-template').find("tr").html()),
 edit_credencial: _.template($('#edit-credencial-template').find("tr").html()),
 
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
     return "Are you sure you want to delete this credencial and all its details?";
 },
 render_show: function(e) {
    var self = this;
    var self_el = $(self.el);

    var credencial_name = self.model.get("credencial_name");
    var credencial_description = self.model.get('credencial_description');
    var credencial_username = self.model.get('credencial_username');
    var credencial_password = self.model.get('credencial_password');

    self_el.html(self.show_credencial({
        id: self.model.id,
        credencial_name: credencial_name,
        credencial_description: credencial_description,
        credencial_username: credencial_username,
        credencial_password: credencial_password
    }));
 },
 render_edit: function() {
     
    var self = this;

    var credencial_name = self.model.get("credencial_name");
    var credencial_description = self.model.get('credencial_description');
    var credencial_username = self.model.get('credencial_username');
    var credencial_password = self.model.get('credencial_password');

    var self_el = $(self.el);
    self_el.html(self.edit_credencial({
        id: self.model.id,
        credencial_name: credencial_name,
        credencial_description: credencial_description,
        credencial_username: credencial_username,
        credencial_password: credencial_password
    }));

    // remove value attribute when its empty otherwise in IE8 the type='text' is showed as the value.
    if(credencial_name.length == 0) {
      self_el.find("input#credencial_name").removeAttr("value");
    }
    if(credencial_description.length == 0) {
      self_el.find("input#credencial_description").removeAttr("value");
    }
    if(credencial_username.length == 0) {
      self_el.find("input#credencial_username").removeAttr("value");
    }
    if(credencial_password.length == 0) {
      self_el.find("input#credencial_password").removeAttr("value");
    }
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
     
    // show name and email inputs only if its a new actor.
     
    return self;
     
 },
 send_data: function() {
     var self = this;
     var self_el = $(self.el);
     var credencial_name = self_el.find('#credencial_name').val();
     var credencial_description = self_el.find('#credencial_description').val();
     var credencial_username = self_el.find('#credencial_username').val();
     var credencial_password = self_el.find('#credencial_password').val();

     self.model.save(
         { credencial_name: credencial_name, credencial_description: credencial_description
            , credencial_username: credencial_username, credencial_password: credencial_password },
         {
            wait: true,
            success: self.saved_success,
            error: self.saved_error
         }
      );
     return self;
 }
});

var CredencialListView = Backbone.View.extend({   
 
 el: $('#credencials_wrapper'),
 events: {
     'click a#new_credencial':  'addItem'
 },
 initialize: function(options) {
     var self = this;
     self.vent = options.vent;
     self.actor_type = options.type;
     _.bindAll(self, 'render', 'addItem', 'appendItem', 'refresh', 'removedItem');
     self.collection = new Credencials();
     var credencials = self.collection;
     options.vent.bind("show", self.show);
     credencials.bind("refresh", function() {self.render();});
     credencials.bind("reset", function() {self.render();});
     credencials.bind("add", self.appendItem);
     credencials.bind("remove", self.removedItem);
     credencials.reset(options.json);
 },
 removedItem: function() {
     var self = this;
     return self;
 },
 render: function() {
     var self = this;
     $('#credencials', this.el).html("");
     $('#credencials', this.el).append("<div class='credencial_list top_margin'></div>");
     $('#credencials', this.el).append("<div class='buttons'></div>");
     this.refresh(this.collection, {});
     return this;
 },
 refresh: function(collection, options){
     var self = this;
     this.collection = collection;
     _(this.collection.models).each(function(credencial){
         self.appendItem(credencial);
      }, this); 
     return self;
 },
 addItem: function(){
     this.counter++;
     var credencial = new Credencial();
     this.collection.add(credencial);
 },
 appendItem: function(item){
     var self = this;
     var itemView = new CredencialView({
         model: item,
         vent: self.vent
     });
     $('tbody .empty_table', self.el).remove();
     $('tbody', self.el).append(itemView.render().el);
     if(item.isNew()) {
         $("html, body").animate({ scrollTop: $(document).height() }, 1000);
     }
     return self;
 }
});