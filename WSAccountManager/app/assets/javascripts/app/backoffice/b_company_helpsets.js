Backbone.Model.prototype.idAttribute = "_id";

//
// Models
//
var HelpSet = Backbone.Model.extend({
    defaults: {
      name: '',
      description: '',
      is_page_default: false,
      is_flagged: false,
      set_flag: false,
      update_default: false,
      page: {id: "", name: ""},
      updated_by: {id: "", name: ""},
      site: {id: "", name: ""},
      official: false,
      can_update: false,
      view: 0,
      up: 0,
      down: 0,
      flags: []
    },
    url: function() {
        if (this.get("set_flag") == true) {
            if (this.get("is_flagged") == true) {
                return '/helpsets/' + this.id + '/flag';
            } else {
                return '/helpsets/' + this.id + '/unflag';
            }
        }
        return '/helpsets/' + this.id;
    }
});  

//
//HelpSets
//
var HelpSets = Backbone.Collection.extend({
 model: HelpSet,
 url: function() {
    if (typeof company_id !== "undefined") {
        if (typeof site_id !== "undefined") {
            return '/company/' + company_id + '/site/' + site_id + '/helps/';
        } else {
            return '/company/' + company_id + '/helps/';
        }
    }
    else {
        return '/profile/' + profile_id + '/helps/';
    }
 }
 
 
});

//
//Views
//

//
//HelpSet View
//
var HelpSetView = BaseView.extend({
 tagName: 'tr',
 
 show_template: _.template($('#show-back-helpset-template').find("tr").html()),
 edit_template: _.template($('#edit-back-helpset-template').find("tr").html()),
 
 events: function() {
     return _.extend( {
         'click a.edit':  'edit',
         'click a.cancel':  'cancel',
         'click a.flag':  'flag',
         'click a.default':  'change_default',
         'submit form': 'save'
     }, this.constructor.__super__.events);
 },  
 initialize: function(options) {
   var self = this;
   self.constructor.__super__.initialize.apply(self, arguments);
   _.bindAll(self, 'change_default');
   self.actor_type = options.actor_type;
   options.vent.bind("edit", self.edit);
   options.vent.bind("show", self.show);
 },
 delete_message: function(e) {
     return "Are you sure you want to delete this help? <br/>";
 },
 render_show: function(e) {
     var self = this;
     var self_el = $(self.el);
     
     var site = self.model.get('site');
     var page = self.model.get('page');
     var updated_by = self.model.get('updated_by');
     
     self_el.html(self.show_template({
         id: self.model.id,
         name: self.model.escape('name'),
         description: self.model.escape('description'),
         view: self.model.escape('view'),
         up: self.model.escape('up'),
         down: self.model.escape('down'),
         page: page["name"],
         updated_by: updated_by["name"],
         site: site["name"]
     }));
     
     var flags_info = self_el.find(".flagged_info");
     if(self.model.get('is_flagged')) {
         self_el.find(".is_flagged").addClass("icon-flag");
         self_el.find(".flagged span.number_of_flags").text("(" + self.model.get("flags").length + ")");
         
         var show_flags_el = self_el.find(".show_flags");
         show_flags_el.show(true).click(function (e) {
             if(flags_info.is(":visible")) {
                 flags_info.hide(true);
                 show_flags_el.text("Show");
             } else {
                 flags_info.show(true);
                 show_flags_el.text("Hide");
             }
             e.preventDefault();
         });
     }
     _(self.model.get("flags")).each(function(flag){
         flags_info.append("<hr><div> - " + flag["name"] + " reported that this helpset " + flag["type"] + " (" + flag["reason"] + ") </div>");
     }, this); 
     
     flags_info.append("<hr><div> <a class='remove_all_flags' href='#'>Unflag</a></div>");
     
     self_el.find(".remove_all_flags").click(function (e) {
         bootbox.confirm("Are you sure? This will remove all existent flags.", function(confirmed) {
             if(confirmed) {
                 self.model.set("set_flag", true);
                 self.model.set("is_flagged", false);
                 self.model.save(
                 {  },
                 {
                     success: function(model, response) {
                         self.saved_success(model, response);
                     },
                     error: function(model, response) {
                         self.saved_error(model, response);
                     }
                 }
                 );
             }
         });
     });
     
     if(updated_by["id"] != "") {
         var actor_link = "/profile/" + updated_by["id"];
         self_el.find("a.updated_by").eq(0).attr("href", actor_link);
     } else {
         self_el.find("a.updated_by").eq(0).hide();
     }
     
     if(self.model.get("is_page_default")) {
         self_el.find("td.page").append("<span> (default)</span>");
     }
     
     if(self.model.get("can_update")) {
         self_el.find(".edit_buttons").show();
     } 
     
     if(self.model.get("official")) {
         self_el.find(".official").removeClass("icon-remove").addClass("icon-ok");
     }
     
 },
 flag: function(e) {
     var self = this;
     
     var flag_elem = $('.flag_dialog');
     flag_elem.find(".name").text(self.model.get('name'));
     flag_elem.find(".type").val("");
     flag_elem.find(".reason").val("");
     flag_elem.find(".control-group").removeClass("error");
     flag_elem.find("label.error").remove();
     
     var flag_form_elem = flag_elem.find("form");
     var flag_button_elem = flag_elem.find(".flag_button");
     var close_button_elem = flag_elem.find(".close_button");
     
     flag_button_elem.click(function(e) {
         var valid = flag_form_elem.valid();
         var flag_type = flag_form_elem.find(".type").eq(0).val();
         var flag_reason = flag_form_elem.find(".reason").eq(0).val();
         self.model.set("set_flag", true);
         self.model.set("is_flagged", true);
         if(valid) {
             self.model.save(
                 { type: flag_type, reason: flag_reason },
                 {
                     success: function(model, response) {
                         flag_elem.modal('hide');
                         self.saved_success(model, response);
                     },
                     error: function(model, response) {
                         flag_elem.modal('hide');
                         self.saved_error(model, response);
                     }
                 }
              );
         } else {
             flag_elem.find(".control-group").addClass("error");
         }
         if(e !== undefined) {
             // stop event propagation to avoid scrolling to the top.
             e.preventDefault();
         }
     });
     
     close_button_elem.click(function(e) {
         flag_elem.modal('hide');
     });
     
     flag_elem.modal();
     
     if(e !== undefined) {
         // stop event propagation to avoid scrolling to the top.
         e.preventDefault();
     }
     return self;
     
 },
 render_edit: function() {
     
     var self = this;
     var self_el = $(self.el);
     self_el.html(self.edit_template({
         id: self.model.id,
         name: self.model.get('name'),
         description: self.model.get('description')
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
     
     var site = self.model.get('site');
     if(site["id"] != "") {
         var select_page = self_el.find(".page");
         if(typeof pages_per_site[site["id"]] != "undefined") {
             var site_pages = pages_per_site[site["id"]].pages;
             _(site_pages).each(function(page){
                 select_page.append("<option value=" + page["id"] + ">" + page["name"] + "</option>");
              }, this); 
         } else {
             // remove select page if there aren't any pages (used in the my helpsets area).
             select_page.remove();
         }
         
     }
     
     var page = self.model.get('page');
     if(page["id"] != "") {
         self_el.find(".page").val(page["id"]);
     }
     
     return self;
     
 },
 change_default: function() {
     var self = this;
     self.model.save(
         { update_default: true, is_page_default: !self.model.get("is_page_default") },
         {
             success: self.saved_success,
             error: self.saved_error
         }
      );
     return self;
 },
 send_data: function() {
     var self = this;
     var name_val = $(self.el).find('.name').val();
     var description_val = $(self.el).find('.description').val();
     
     var props = null;
     if($(self.el).find('#page').length > 0) {
         var page_val = $(self.el).find('#page').val();
         props = { update_default: false, name: name_val, description: description_val, new_page: page_val };
     } else {
         props = { update_default: false, name: name_val, description: description_val };
     }
     
     self.model.save(props,
         {
             success: self.saved_success,
             error: self.saved_error
         }
      );
     return self;
 }
});

var HelpSetListView = Backbone.View.extend({   
 
 el: $('#helpsets_wrapper'),
 events: {
     'click a#new_helpset':  'addItem'
 },
 initialize: function(options) {
     var self = this;
     self.vent = options.vent;
     self.actor_type = options.type;
     _.bindAll(self, 'render', 'addItem', 'appendItem', 'refresh', 'removedItem');
     self.collection = new HelpSets();
     var helpsets = self.collection;
     options.vent.bind("show", self.show);
     helpsets.bind("refresh", function() {self.render();});
     helpsets.bind("reset", function() {self.render();});
     helpsets.bind("add", self.appendItem);
     helpsets.bind("remove", self.removedItem);
     helpsets.reset(options.json);
 },
 removedItem: function() {
     var self = this;
     return self;
 },
 render: function() {
     var self = this;
     $('#helpsets', this.el).html("");
     $('#helpsets', this.el).append("<div class='helpset_list top_margin'></div>");
     $('#helpsets', this.el).append("<div class='buttons'></div>");
     this.refresh(this.collection, {});
     return this;
 },
 refresh: function(collection, options){
     var self = this;
     this.collection = collection;
     _(this.collection.models).each(function(helpset){
         self.appendItem(helpset);
      }, this); 
     return self;
 },
 addItem: function(){
     this.counter++;
     var helpset = new HelpSet();
     this.collection.add(helpset);
 },
 appendItem: function(item){
     var self = this;
     var itemView = new HelpSetView({
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
