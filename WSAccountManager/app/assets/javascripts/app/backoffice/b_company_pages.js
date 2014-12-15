Backbone.Model.prototype.idAttribute = "_id";

//
// Models
//
var Page = Backbone.Model.extend({
    defaults: {
      name: '',
      description: '',
      url_regex: '',
      key: '',
      site: {id: "", name: ""},
      updated_by: {id: "", name: ""}
    },
    url: function() {
        if (this.isNew()) {
            return '/company/' + company_id + '/site/' + this.get("site")["id"] + '/pages/';
        }
        return '/page/' + this.id;
    }
});  

//
//Pages
//
var Pages = Backbone.Collection.extend({
 model: Page,
 url: function() {
     return '';
 }
 
 
});

//
//Views
//

//
//Page View
//
var PageView = BaseView.extend({
 tagName: 'tr',
 
 show_template: _.template($('#show-page-template').find("tr").html()),
 edit_template: _.template($('#edit-page-template').find("tr").html()),
 
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
     return "Are you sure you want to delete this page?<br/> All helps related to this page will be also deleted.<br/>";
 },
 render_show: function(e) {
     var self = this;
     
     var site = self.model.get('site');
     var page = self.model.get('page');
     var updated_by = self.model.get('updated_by');
     $(self.el).html(self.show_template({
         id: self.model.id,
         name: self.model.get('name'),
         description: self.model.get('description'),
         url_regex: self.model.get('url_regex'),
         key: self.model.get('key'),
         updated_by: updated_by["name"],
         site: site["name"]
     }));
     
     if(updated_by["id"] != "") {
         var actor_link = "/profile/" + updated_by["id"];
         $(self.el).find("a.updated_by").eq(0).attr("href", actor_link);
     } else {
         $(self.el).find("a.updated_by").eq(0).hide();
     }
     
     var helpsets_link = "/page/" + self.model.id + "/helps/";
     $(self.el).find("a.helpsets").eq(0).attr("href", helpsets_link);
     
 },
 render_edit: function() {
     
     var self = this;
     var self_el = $(self.el);
     var site = self.model.get('site');
     
     var name = self.model.get('name');
     var url_regex = self.model.get('url_regex');
     var key = self.model.get('key');
     
     self_el.html(self.edit_template({
         id: self.model.id,
         name: name,
         description: self.model.get('description'),
         url_regex: url_regex,
         key: key,
         site: site["name"]
     }));
     
     
     // remove value attribute when its empty otherwise in IE8 the type='text' is showed as the value.
     if(name.length == 0) {
       self_el.find("input#name").removeAttr("value");
     }
     
     // remove value attribute when its empty otherwise in IE8 the type='text' is showed as the value.
     if(url_regex.length == 0) {
       self_el.find("input#url_regex").removeAttr("value");
     }
     
     // remove value attribute when its empty otherwise in IE8 the type='text' is showed as the value.
     if(key.length == 0) {
       self_el.find("input#key").removeAttr("value");
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
     
     var select_site = self_el.find(".site");
     // show site selection only if its a new model and its site has not added.
     if(self.model.isNew() && self.model.get("site")["id"] == "") {
         var site = self.model.get('site');
         if(site["id"] != "") {
             site_pages.val(site["id"]);
         }
         // change site in model.
         select_site.change(function (e) {
             var site = select_site.val();
             self.model.set("site", {id: site, name: ""}, {silent: true});
         });
         self_el.find(".write_info").show();
         self_el.find(".read_info").hide();
     } else {
         self_el.find(".write_info").hide();
         if(self.model.get("site")["name"] != "") {
             self_el.find(".read_info").show();
         }
     }
     
     if(self.model.get('key') != "") {
         $(self.el).find("#key_selection").attr("checked", "checked");
         $(self.el).find("#url_regex").prop('disabled', true);
      } else {
         $(self.el).find("#url_regex_selection").attr("checked", "checked");
         $(self.el).find("#key").prop('disabled', true);
      }
      
      $(self.el).find("#url_regex_selection").click(function (e) {
         $(self.el).find("#url_regex").prop('disabled', false).focus();
         $(self.el).find("#key_selection").removeAttr("checked");
         $(self.el).find("#key").prop('disabled', true);
      });
      
      $(self.el).find("#key_selection").click(function (e) {
         $(self.el).find("#url_regex_selection").removeAttr("checked");
         $(self.el).find("#key").prop('disabled', false).focus();
         $(self.el).find("#url_regex").prop('disabled', true);
      });
     
     return self;
     
 },
 send_data: function() {
     var self = this;
     var name_val = $(self.el).find('.name').val();
     var description_val = $(self.el).find('.description').val();
     var url_regex = self.$('.url_regex').val();
     var key = self.$('.key').val();
     self.model.save(
         { 
             name: name_val, description: description_val
             , url_regex: url_regex, key: key
         },
         {
             success: self.saved_success,
             error: self.saved_error
         }
      );
     return self;
 }
});

var PageListView = Backbone.View.extend({   
 
 el: $('#pages_wrapper'),
 events: {
     'click a#new_page':  'addItem'
 },
 initialize: function(options) {
     var self = this;
     self.vent = options.vent;
     self.actor_type = options.type;
     _.bindAll(self, 'render', 'addItem', 'appendItem', 'refresh', 'removedItem');
     self.collection = new Pages();
     var pages = self.collection;
     options.vent.bind("show", self.show);
     pages.bind("refresh", function() {self.render();});
     pages.bind("reset", function() {self.render();});
     pages.bind("add", self.appendItem);
     pages.bind("remove", self.removedItem);
     pages.reset(options.json);
 },
 removedItem: function() {
     var self = this;
     return self;
 },
 render: function() {
     var self = this;
     $('#pages', this.el).html("");
     $('#pages', this.el).append("<div class='help_page_list top_margin'></div>");
     $('#pages', this.el).append("<div class='buttons'></div>");
     this.refresh(this.collection, {});
     return this;
 },
 refresh: function(collection, options){
     var self = this;
     this.collection = collection;
     _(this.collection.models).each(function(page){
         self.appendItem(page);
      }, this); 
     return self;
 },
 addItem: function(){
     this.counter++;
     var page = new Page();
     // add site id if it exists.
     if(site_id != "") {
         page.set("site", {id: site_id, name: ""}, {silent: true});
     }
     this.collection.add(page);
 },
 appendItem: function(item){
     var self = this;
     var itemView = new PageView({
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