Backbone.Model.prototype.idAttribute = "_id";

//
// Models
//
var Credential = Backbone.Model.extend({
    defaults: {
      credential_name: '',
      credential_description: '',
      credential_username: '',
      credential_password: ''
    },
    url: function() {
      if (this.isNew()) {
          return '/company/' + company_id + '/client/' + client_id + '/credentials';
      }
      return '/company/' + company_id + "/client/" + client_id + '/credential/' + this.id;
    }
});  

//
//Credentials
//
var Credentials = Backbone.Collection.extend({
 model: Credential,
 url: ''
});

//
//Views
//

//
//Credential View
//
var CredentialView = BaseView.extend({
 tagName: 'tr',
 
 show_credential: _.template($('#show-credential-template').find("tr").html()),
 edit_credential: _.template($('#edit-credential-template').find("tr").html()),
 
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
     return "Are you sure you want to delete this credential and all its details?";
 },
 render_show: function(e) {
    var self = this;
    var self_el = $(self.el);

    var credential_name = self.model.get("credential_name");
    var credential_description = self.model.get('credential_description');
    var credential_username = self.model.get('credential_username');
    var credential_password = self.model.get('credential_password');
    var created_by_name = self.model.get('created_by_name');
    var updated_by_name = self.model.get('updated_by_name');

    self_el.html(self.show_credential({
        id: self.model.id,
        credential_name: credential_name,
        credential_description: credential_description,
        credential_username: credential_username,
        credential_password: credential_password,
        created_by_name: created_by_name,
        updated_by_name: updated_by_name
    }));
 },
 render_edit: function() {
     
    var self = this;

    var credential_name = self.model.get("credential_name");
    var credential_description = self.model.get('credential_description');
    var credential_username = self.model.get('credential_username');
    var credential_password = self.model.get('credential_password');

    var self_el = $(self.el);
    self_el.html(self.edit_credential({
        id: self.model.id,
        credential_name: credential_name,
        credential_description: credential_description,
        credential_username: credential_username,
        credential_password: credential_password
    }));

    // remove value attribute when its empty otherwise in IE8 the type='text' is showed as the value.
    if(credential_name.length == 0) {
      self_el.find("input#credential_name").removeAttr("value");
    }
    if(credential_description.length == 0) {
      self_el.find("input#credential_description").removeAttr("value");
    }
    if(credential_username.length == 0) {
      self_el.find("input#credential_username").removeAttr("value");
    }
    if(credential_password.length == 0) {
      self_el.find("input#credential_password").removeAttr("value");
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
     var credential_name = self_el.find('#credential_name').val();
     var credential_description = self_el.find('#credential_description').val();
     var credential_username = self_el.find('#credential_username').val();
     var credential_password = self_el.find('#credential_password').val();

     self.model.save(
         { credential_name: credential_name, credential_description: credential_description
            , credential_username: credential_username, credential_password: credential_password },
         {
            wait: true,
            success: self.saved_success,
            error: self.saved_error
         }
      );
     return self;
 }
});

var CredentialListView = Backbone.View.extend({   
 
 el: $('#credentials_wrapper'),
 events: {
     'click a#new_credential':  'addItem'
 },
 initialize: function(options) {
     var self = this;
     self.vent = options.vent;
     self.actor_type = options.type;
     _.bindAll(self, 'render', 'addItem', 'appendItem', 'refresh', 'removedItem');
     self.collection = new Credentials();
     var credentials = self.collection;
     options.vent.bind("show", self.show);
     credentials.bind("refresh", function() {self.render();});
     credentials.bind("reset", function() {self.render();});
     credentials.bind("add", self.appendItem);
     credentials.bind("remove", self.removedItem);
     credentials.reset(options.json);
 },
 removedItem: function() {
     var self = this;
     return self;
 },
 render: function() {
     var self = this;
     $('#credentials', this.el).html("");
     $('#credentials', this.el).append("<div class='credential_list top_margin'></div>");
     $('#credentials', this.el).append("<div class='buttons'></div>");
     this.refresh(this.collection, {});
     return this;
 },
 refresh: function(collection, options){
     var self = this;
     this.collection = collection;
     _(this.collection.models).each(function(credential){
         self.appendItem(credential);
      }, this); 
     return self;
 },
 addItem: function(){
     this.counter++;
     var credential = new Credential();
     this.collection.add(credential);
 },
 appendItem: function(item){
     var self = this;
     var itemView = new CredentialView({
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