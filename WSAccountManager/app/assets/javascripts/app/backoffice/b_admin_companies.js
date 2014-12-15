Backbone.Model.prototype.idAttribute = "_id";

//
// Models
//
var Company = Backbone.Model.extend({
    defaults: {
      name: '',
      state: '',
      state_info: '',
      action: '', // action to execute in serve
      created_by: {id: "", name: ""},
      updated_by: {id: "", name: ""}
    },
    url: function() {
      if (this.isNew()) {
          return '/admin/company/';
      }
      return '/admin/company/' + this.id;
    }
});  

//
//Companies
//
var Companies = Backbone.Collection.extend({
 model: Company,
 url: '/admin/companies/'
});

//
//Views
//

//
//Company View
//
var CompanyView = BaseView.extend({
 tagName: 'tr',
 
 show_template: _.template($('#show-company-template').find("tr").html()),
 edit_template: _.template($('#edit-company-template').find("tr").html()),
 
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
         state: self.model.get('state_info')
     }));
     
     var created_by = self.model.get('created_by');
     if(created_by["id"] != "") {
         var user_link = "/profile/" + created_by["id"];
         self_el.find("a.updated_by").eq(0).attr("href", user_link).text(created_by["name"]);
     } else {
         self_el.find("a.updated_by").eq(0).hide();
     }
     
     var updated_by = self.model.get('updated_by');
     if(updated_by["id"] != "") {
         var user_link = "/profile/" + updated_by["id"];
         self_el.find("a.updated_by").eq(0).attr("href", user_link).text(updated_by["name"]);
     } else {
         self_el.find("a.updated_by").eq(0).hide();
     }
     
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
 enable: function() {
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

var CompaniesListView = Backbone.View.extend({   
 
 el: $('#companies_wrapper'),
 events: {
     
 },
 initialize: function(options) {
     var self = this;
     self.vent = options.vent;
     _.bindAll(self, 'render', 'addItem', 'appendItem', 'refresh', 'removedItem');
     self.collection = new Companies();
     var companies = self.collection;
     options.vent.bind("show", self.show);
     companies.bind("refresh", function() {self.render();});
     companies.bind("reset", function() {self.render();});
     companies.bind("add", self.appendItem);
     companies.bind("remove", self.removedItem);
     companies.reset(options.json);
 },
 removedItem: function() {
     var self = this;
     return self;
 },
 render: function() {
     var self = this;
     $('#companies', this.el).html("");
     $('#companies', this.el).append("<div class='company_list top_margin'></div>");
     $('#companies', this.el).append("<div class='buttons'></div>");
     this.refresh(this.collection, {});
     return this;
 },
 refresh: function(collection, options){
     var self = this;
     this.collection = collection;
     _(this.collection.models).each(function(company){
         self.appendItem(company);
      }, this); 
     return self;
 },
 addItem: function(){
     this.counter++;
     var company = new Company();
     this.collection.add(company);
 },
 appendItem: function(item){
     var self = this;
     var itemView = new CompanyView({
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
