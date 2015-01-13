Backbone.Model.prototype.idAttribute = "_id";

//
// Models
//
var Client = Backbone.Model.extend({
    defaults: {
      company_name: '',
      first_contact: '',
      first_name: '',
      last_name: '',
      second_contact: ''
    },
    url: function() {
      if (this.isNew()) {
          return '/company/' + company_id + '/clients/';
      }
      return '/company/' + company_id + '/client/' + this.id;
    }
});  

//
//Clients
//
var Clients = Backbone.Collection.extend({
 model: Client,
 url: ''
});

//
//Views
//

//
//Client View
//
var ClientView = BaseView.extend({
 tagName: 'tr',
 
 show_client: _.template($('#show-client-template').find("tr").html()),
 edit_client: _.template($('#edit-client-template').find("tr").html()),
 
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
     return "Are you sure you want to delete this client and all its details?";
 },
 render_show: function(e) {
    var self = this;
    var self_el = $(self.el);

    var company_name = self.model.get("company_name");
    var first_name = self.model.get('first_name');
    var last_name = self.model.get('last_name');
    var first_contact = self.model.get('first_contact');
    var second_contact = self.model.get('second_contact');
    var nif = self.model.get('nif');
    var niss = self.model.get('niss');
    var default_task = self.model.get("default_task");

    if (default_task == 0) {
       default_task = "IVA1";
    } else if(default_task == 1) {
       default_task = "IVA3";
    }

    self_el.html(self.show_client({
        id: self.model.id,
        company_name: company_name,
        first_name: first_name,
        last_name: last_name,
        first_contact: first_contact,
        default_task: default_task,
        second_contact: second_contact,
        nif: nif,
        niss: niss
    }));
 },
 render_edit: function() {
     
    var self = this;
     
    var company_name = self.model.get('company_name');
    var first_name = self.model.get('first_name');
    var last_name = self.model.get('last_name');
    var first_contact = self.model.get('first_contact');
    var second_contact = self.model.get('second_contact');
    var nif = self.model.get('nif');
    var niss = self.model.get('niss');
    var default_task = self.model.get("default_task");

    var self_el = $(self.el);
    self_el.html(self.edit_client({
        id: self.model.id,
        company_name: company_name,
        first_name: first_name,
        last_name: last_name,
        first_contact: first_contact,
        default_task: default_task,
        second_contact: second_contact,
        nif: nif,
        niss: niss
    }));

    // remove value attribute when its empty otherwise in IE8 the type='text' is showed as the value.
    if(company_name.length == 0) {
      self_el.find("input#company_name").removeAttr("value");
    }
    if(first_name.length == 0) {
      self_el.find("input#first_name").removeAttr("value");
    }
    if(last_name.length == 0) {
      self_el.find("input#last_name").removeAttr("value");
    }
    if(first_contact.length == 0) {
      self_el.find("input#first_contact").removeAttr("value");
    }
    if(second_contact.length == 0) {
      self_el.find("input#second_contact").removeAttr("value");
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
     var company_name = self_el.find('#company_name').val();
     var first_name = self_el.find('#first_name').val();
     var last_name = self_el.find('#last_name').val();
     var first_contact = self_el.find('#first_contact').val();
     var second_contact = self_el.find('#second_contact').val();
     var nif = self_el.find('#nif').val();
     var niss = self_el.find('#niss').val();
     var sel_tasks = self_el.find('.sel_tasks option:selected').val();

     self.model.save(
         { company_name: company_name, first_name: first_name, last_name: last_name, first_contact: first_contact
         , second_contact: second_contact, default_task: sel_tasks, nif: nif, niss: niss },
         {
            wait: true,
            success: self.saved_success,
            error: self.saved_error
         }
      );
     return self;
 }
});

var ClientListView = Backbone.View.extend({   
 
 el: $('#clients_wrapper'),
 events: {
     'click a#new_client':  'addItem'
 },
 initialize: function(options) {
     var self = this;
     self.vent = options.vent;
     self.actor_type = options.type;
     _.bindAll(self, 'render', 'addItem', 'appendItem', 'refresh', 'removedItem');
     self.collection = new Clients();
     var clients = self.collection;
     options.vent.bind("show", self.show);
     clients.bind("refresh", function() {self.render();});
     clients.bind("reset", function() {self.render();});
     clients.bind("add", self.appendItem);
     clients.bind("remove", self.removedItem);
     clients.reset(options.json);
 },
 removedItem: function() {
     var self = this;
     return self;
 },
 render: function() {
     var self = this;
     $('#clients', this.el).html("");
     $('#clients', this.el).append("<div class='client_list top_margin'></div>");
     $('#clients', this.el).append("<div class='buttons'></div>");
     this.refresh(this.collection, {});
     return this;
 },
 refresh: function(collection, options){
     var self = this;
     this.collection = collection;
     _(this.collection.models).each(function(client){
         self.appendItem(client);
      }, this); 
     return self;
 },
 addItem: function(){
     this.counter++;
     var client = new Client();
     this.collection.add(client);
 },
 appendItem: function(item){
     var self = this;
     var itemView = new ClientView({
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