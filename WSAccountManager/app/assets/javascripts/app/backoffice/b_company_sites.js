Backbone.Model.prototype.idAttribute = "_id";

//
// Models
//
var Site = Backbone.Model.extend({
    defaults: {
      name: '',
      url: '',
      script: '',
      key: '',
      updated_by: {id: "", name: ""}
    },
    url: function() {
      if (this.isNew()) {
          return '/company/' + company_id + '/site/';
      }
      return '/site/' + this.id;
    }
});  

//
//Sites
//
var Sites = Backbone.Collection.extend({
 model: Site,
 url: ''
});

//
//Views
//

//
//Site View
//
var SiteView = BaseView.extend({
 tagName: 'tr',
 
 show_template: _.template($('#show-site-template').find("tr").html()),
 edit_template: _.template($('#edit-site-template').find("tr").html()),
 
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
     return "Are you sure you want to delete this site? <br/> All helps and pages related to this site will be also deleted.";
 },
 render_show: function(e) {
     var self = this;
     var self_el = $(self.el);
     
     //TODO: company_key shoul not come from view
     
     self_el.html(self.show_template({
         name: self.model.get('name'),
         id: self.model.id,
         url: self.model.get('url')
     }));
     
     var script_link_el = self_el.find(".script_link");
     var script_info_el = self_el.find(".script_info");
     script_link_el.show(true).click(function (e) {
         if(script_info_el.is(":visible")) {
             script_info_el.hide(true);
             script_link_el.text("Show");
         } else {
             script_info_el.show(true);
             script_link_el.text("Hide");
         }
     });

     var updated_by = self.model.get('updated_by');
     if(updated_by["id"] != "") {
         var actor_link = "/profile/" + updated_by["id"];
         self_el.find("a.updated_by").eq(0).attr("href", actor_link).text(updated_by["name"]);
     } else {
         self_el.find("a.updated_by").eq(0).hide();
     }
     
     var pages_link = "/site/" + self.model.id + "/pages/";
     self_el.find("a.pages").eq(0).attr("href", pages_link);
     
     var helpsets_link = "/site/" + self.model.id + "/helps/";
     self_el.find("a.helpsets").eq(0).attr("href", helpsets_link);
     
 },
 render_edit: function() {
     
     var self = this;
     
     var name = self.model.get('name');
     var url = self.model.get('url');
     
     var self_el = $(self.el);
     self_el.html(self.edit_template({
         id: self.model.id,
         name: name,
         url: url,
         script: self.model.get('script')
     }));
     
     // remove value attribute when its empty otherwise in IE8 the type='text' is showed as the value.
     if(name.length == 0) {
       self_el.find("input#name").removeAttr("value");
     }
     
     // remove value attribute when its empty otherwise in IE8 the type='text' is showed as the value.
     if(url.length == 0) {
       self_el.find("input#url").removeAttr("value");
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
     if(self.model.isNew()) {
         self_el.find(".read_info").hide();
     } else {
         self_el.find(".write_info").hide();
     }
     
     return self;
     
 },
 send_data: function() {
     var self = this;
     var self_el = $(self.el);
     var name_val = self_el.find('#name').val();
     var url_val = self_el.find('#url').val();
     var subdomains_val = self_el.find('.subdomains').is(":checked");
     self.model.save(
         { name: name_val, url: url_val, subdomains: subdomains_val },
         {
             success: self.saved_success,
             error: self.saved_error
         }
      );
     return self;
 }
});

var SiteListView = Backbone.View.extend({   
 
 el: $('#sites_wrapper'),
 events: {
     'click a#new_site':  'addItem'
 },
 initialize: function(options) {
     var self = this;
     self.vent = options.vent;
     self.actor_type = options.type;
     _.bindAll(self, 'render', 'addItem', 'appendItem', 'refresh', 'removedItem');
     self.collection = new Sites();
     var sites = self.collection;
     options.vent.bind("show", self.show);
     sites.bind("refresh", function() {self.render();});
     sites.bind("reset", function() {self.render();});
     sites.bind("add", self.appendItem);
     sites.bind("remove", self.removedItem);
     sites.reset(options.json);
 },
 removedItem: function() {
     var self = this;
     return self;
 },
 render: function() {
     var self = this;
     $('#sites', this.el).html("");
     $('#sites', this.el).append("<div class='site_list top_margin'></div>");
     $('#sites', this.el).append("<div class='buttons'></div>");
     this.refresh(this.collection, {});
     return this;
 },
 refresh: function(collection, options){
     var self = this;
     this.collection = collection;
     _(this.collection.models).each(function(site){
         self.appendItem(site);
      }, this); 
     return self;
 },
 addItem: function(){
     this.counter++;
     var site = new Site();
     this.collection.add(site);
 },
 appendItem: function(item){
     var self = this;
     var itemView = new SiteView({
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
