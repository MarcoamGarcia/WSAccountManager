Backbone.Model.prototype.idAttribute = "_id";


//
// Models
//
var Actor = Backbone.Model.extend({
    defaults: {
      name: '',
      email: '',
      state: '',
      source: '',
      type: '',
      role: '',
      state_info: '',
      action: '', // action to execute in serve
      company: {id: "", name: ""},
      created_by: {id: "", name: ""},
      updated_by: {id: "", name: ""}
    },
    url: function() {
      if (this.isNew()) {
          return '/admin/user/';
      }
      return '/admin/user/' + this.id;
    }
});  

//
//Actors
//
var Actors = Backbone.Collection.extend({
 model: Actor,
 url: '/admin/users/'
});

//
//Views
//

//
//Actor View
//
var ActorView = BaseView.extend({
 tagName: 'tr',
 
 show_template: _.template($('#show-actor-template').find("tr").html()),
 edit_template: _.template($('#edit-actor-template').find("tr").html()),
 
 events: function() {
     return _.extend( {
         'click a.enable':  'enable',
         'click a.disable':  'disable',
         'click a.approve':  'approve',
         'click a.reject':  'reject',
         'click a.cancel':  'cancel',
         'submit form': 'save'
     }, this.constructor.__super__.events);
 },  
 initialize: function(options) {
   var self = this;
   self.constructor.__super__.initialize.apply(self, arguments);
   _.bindAll(self, 'enable', 'disable', 'approve', 'reject');
   options.vent.bind("edit", self.edit);
   options.vent.bind("show", self.show);
 },
 delete_message: function(e) {
     return "Are you sure you want to delete this user? <br/>";
 },
 render_show: function(e) {
     var self = this;
     var self_el = $(self.el);
     
     var company = self.model.get('company');
     self_el.html(self.show_template({
         id: self.model.id,
         name: self.model.get('name'),
         source: self.model.get('source'),
         type: self.model.get('type'),
         email: self.model.get('email'),
         state: self.model.get('state_info'),
         role: self.model.get('role')
     }));
     
     var created_by = self.model.get('created_by');
     if(created_by["id"] != "") {
         var actor_link = "/profile/" + created_by["id"];
         self_el.find("a.updated_by").eq(0).attr("href", actor_link).text(created_by["name"]);
     } else {
         self_el.find("a.updated_by").eq(0).hide();
     }
     
     var updated_by = self.model.get('updated_by');
     if(updated_by["id"] != "") {
         var actor_link = "/profile/" + updated_by["id"];
         self_el.find("a.updated_by").eq(0).attr("href", actor_link).text(updated_by["name"]);
     } else {
         self_el.find("a.updated_by").eq(0).hide();
     }
     
     if(company["id"] != "") {
         var company_link = "/company/" + company["id"];
         self_el.find("a.company").eq(0).attr("href", company_link).text(company["name"]);
     } else {
         self_el.find("a.company").eq(0).hide();
     }
     
     // if its active show disable button.
     if(self.model.get('state') == "1") {
         self_el.find("a.disable").eq(0).show();
     // if its disabled show activate button.
     } else if(self.model.get('state') == "2") {
         self_el.find("a.enable").eq(0).show();
     // if its registered show aprove and reject button.
     } else if(self.model.get('state') == "3") {
         self_el.find("a.approve").eq(0).show();
         self_el.find("a.reject").eq(0).show();
     } 
     
 },
 render_edit: function() {
     
     var self = this;
     
     $(self.el).html(self.edit_template({
         id: self.model.id,
         name: self.model.get('name'),
         email: self.model.get('email'),
         state: self.model.get('state')
     }));
     
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
 approve: function(e) {
     var self = this;
     self.model.save(
         { action: 'approve' },
         {
             success: self.saved_success,
             error: self.saved_error
         }
      );
     // stop event propagation to avoid scrolling to the top.
     e.preventDefault();
     return self;
 },
 reject: function(e) {
     var self = this;
     self.model.save(
         { action: 'reject' },
         {
             success: self.saved_success,
             error: self.saved_error
         }
     );
     // stop event propagation to avoid scrolling to the top.
     e.preventDefault();
     return self;
 },
 disable: function(e) {
     var self = this;
     self.model.save(
         { action: 'disable' },
         {
             success: self.saved_success,
             error: self.saved_error
         }
      );
     // stop event propagation to avoid scrolling to the top.
     e.preventDefault();
     return self;
 },
 enable: function(e) {
     var self = this;
     self.model.save(
         { action: 'enable' },
         {
             success: self.saved_success,
             error: self.saved_error
         }
      );
     // stop event propagation to avoid scrolling to the top.
     e.preventDefault();
     return self;
 },
 send_data: function() {
     var self = this;
     var name_val = $(self.el).find('.name').val();
     var email_val = $(self.el).find('.email').val();
     self.model.save(
         { name: name_val, email: email_val },
         {
             success: self.saved_success,
             error: self.saved_error
         }
      );
     return self;
 }
});

var ActorListView = Backbone.View.extend({   
 
 el: $('#actors_wrapper'),
 events: {
     'click a#new_actor':  'addItem'
 },
 initialize: function(options) {
     var self = this;
     self.vent = options.vent;
     _.bindAll(self, 'render', 'addItem', 'appendItem', 'refresh', 'removedItem');
     self.collection = new Actors();
     var actors = self.collection;
     options.vent.bind("show", self.show);
     actors.bind("refresh", function() {self.render();});
     actors.bind("reset", function() {self.render();});
     actors.bind("add", self.appendItem);
     actors.bind("remove", self.removedItem);
     actors.reset(options.json);
 },
 removedItem: function() {
     var self = this;
     return self;
 },
 render: function() {
     var self = this;
     $('#actors', this.el).html("");
     $('#actors', this.el).append("<div class='actor_list top_margin'></div>");
     $('#actors', this.el).append("<div class='buttons'></div>");
     this.refresh(this.collection, {});
     return this;
 },
 refresh: function(collection, options){
     var self = this;
     this.collection = collection;
     _(this.collection.models).each(function(actor){
         self.appendItem(actor);
      }, this); 
     return self;
 },
 addItem: function(){
     this.counter++;
     var actor = new Actor();
     this.collection.add(actor);
 },
 appendItem: function(item){
     var self = this;
     var itemView = new ActorView({
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
