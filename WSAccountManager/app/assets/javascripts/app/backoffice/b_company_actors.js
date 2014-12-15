Backbone.Model.prototype.idAttribute = "_id";

//
// Models
//
var Actor = Backbone.Model.extend({
    defaults: {
      name: '',
      email: '',
      state: '',
      state_info: '',
      company_admin: false,
      updated_by: {id: "", name: ""},
      sites: []
    },
    url: function() {
      if (this.isNew()) {
          return '/company/' + company_id + '/user/';
      }
      return '/company/' + company_id + '/user/' + this.id;
    }
});  

//
//Actors
//
var Actors = Backbone.Collection.extend({
 model: Actor,
 url: '/company/' + company_id + '/users/'
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
         'click a.edit':  'edit',
         'click a.cancel':  'cancel',
         'submit form': 'save'
     }, this.constructor.__super__.events);
 },  
 initialize: function(options) {
   var self = this;
   self.constructor.__super__.initialize.apply(self, arguments);
   _.bindAll(self, 'enable', 'disable');
   options.vent.bind("edit", self.edit);
   options.vent.bind("show", self.show);
 },
 delete_message: function(e) {
     return "Are you sure you want to delete this user? <br/>";
 },
 render_show: function(e) {

     var self = this;
     // cache element.
     var self_el = $(self.el);
     
     var role = "Contributor";
     if(self.model.get("company_admin")) {
         role = "Admin";
     } else if(self.model.get("sites").length > 0) {
         role = "Official Contributor";
     }

     self_el.html(self.show_template({
         id: self.model.id,
         name: self.model.get('name'),
         email: self.model.get('email'),
         role: role,
         state: self.model.get('state_info')
     }));

     var updated_by = self.model.get('updated_by');
     if(updated_by["id"] != "") {
         var actor_link = "/profile/" + updated_by["id"];
         self_el.find("a.updated_by").eq(0).attr("href", actor_link).text(updated_by["name"]);
     } else {
         self_el.find("a.updated_by").eq(0).hide();
     }

     var sites = self.model.get("sites");
     var sites_td = $(self.el).find(".sites");
     _(sites).each(function(site){
         var site_name = site.name;
         if(site.id == company_id) {
             site_name = "All Sites";
         }
         sites_td.append("<div>" + site_name + "</div>");
     }, this); 
     
     // if its active show disable button.
     if(self.model.get('state') == "1") {
         self_el.find("a.disable").eq(0).show();
     // if its disabled show activate button.
     } else if(self.model.get('state') == "2") {
         self_el.find("a.enable").eq(0).show();
     }
     
 },
 render_edit: function() {
     
     var self = this;
     // cache element.
     var self_el = $(self.el);
     self_el.html(self.edit_template({
         id: self.model.id,
         name: self.model.get('name'),
         email: self.model.get('email'),
         state: self.model.get('state')
     }));
     
     // show name and email inputs only if its a new actor.
     if(self.model.isNew()) {
         self_el.find(".read_info").hide();
     } else {
         self_el.find(".write_info").hide();
     }
     
     // select checkboxes that are present in the model.
     var sites = self.model.get("sites");
     _(sites).each(function(site){
         var site_name = site.name;
         self_el.find("#" + site.id).prop("checked", true);
     }, this); 
     
     var company_admin_checkbox = self_el.find(".company_admin");
     if(self.model.get("company_admin")) {
         company_admin_checkbox.attr("checked", "checked");
     }
     // find company admin checkbox and disable other checkboxes if it is selected.
     if(company_admin_checkbox.is(":checked")) {
         self_el.find(".sites_selection").attr("disabled", true);
     } else {
         self_el.find(".sites_selection").removeAttr("disabled");
     }
     
     var company_checkbox = self_el.find("#" + company_id);
     
     // listen to clicks so we can enable/disable other checkboxes.
     company_admin_checkbox.click(function(e) {
         if($(this).is(":checked")) {
             self_el.find(".sites_selection").attr("disabled", true);
             company_checkbox.attr("checked", "checked");
         } else {
             self_el.find(".sites_selection").removeAttr("disabled");
             if(company_checkbox.is(":checked")) {
                 self_el.find(".sites_selection:not(#" + company_id + ")").attr("disabled", true);
             } else {
                 self_el.find(".sites_selection").removeAttr("disabled");
             }
         }
     });
     
     
     // find company checkbox and disable other checkboxes if it is selected.
     if(company_checkbox.is(":checked")) {
         self_el.find(".sites_selection:not(#" + company_id + ")").attr("disabled", true);
     }
     // listen to clicks so we can enable/disable other checkboxes.
     company_checkbox.click(function(e) {
         if($(this).is(":checked")) {
             self_el.find(".sites_selection:not(#" + company_id + ")").attr("disabled", true);
         } else {
             self_el.find(".sites_selection").removeAttr("disabled");
         }
     });
     
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
 change_state: function() {
     var self = this;
     self.model.save(
         { state: self.model.get("state") },
         {
             success: self.saved_success,
             error: self.saved_error
         }
      );
     return self;
 },
 disable: function(e) {
     var self = this;
     self.model.set("state", 2, {silent: true});
     self.change_state();
     return self;
 },
 enable: function() {
     var self = this;
     self.model.set("state", 1, {silent: true});
     self.change_state();
     return self;
 },
 send_data: function() {
     var self = this;
     // cache element.
     var self_el = $(self.el);
     var name_val = self_el.find('.name').val();
     var email_val = self_el.find('.email').val();
     var company_admin = self_el.find('.company_admin').is(":checked");
     
     var site_ids = [];
     // find company checkbox and if it is selected just add it.
     var company_checkbox = self_el.find("#" + company_id);
     if(company_checkbox.is(":checked")) {
         site_ids.push(company_id);
     // otherwise search for all other selected checkboxes and add them.
     } else {
         var sites_selection = self_el.find('.sites_selection:checked');
         var site_ids = [];
         _(sites_selection).each(function(site){
             site_ids.push($(site).attr("id"));
         }, this); 
     }
     
     var props = null;
     // send all information if its a new user.
     if(self.model.isNew()) {
         props = { name: name_val, email: email_val, sites: site_ids, company_admin: company_admin };
     } else {
         props = { sites: site_ids, company_admin: company_admin };
     }
     
     self.model.save(
         props,
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
