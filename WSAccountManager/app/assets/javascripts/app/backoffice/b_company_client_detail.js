Backbone.Model.prototype.idAttribute = "_id";

//
// Models
//
var ClientDetail = Backbone.Model.extend({
    defaults: {
      company_name: '',
      title: '',
      description: '',
      alert: false,
      end_date: ''
    },
    url: function() {
      if (this.isNew()) {
          return '/company/' + company_id + '/client/' + client_id + '/details/';
      }
      return '/company/' + company_id + '/client/' + client_id + '/details/' + this.id;
    }
});  

//
//ClientDetails
//
var ClientDetails = Backbone.Collection.extend({
 model: ClientDetail,
 url: ''
});



  //-----------------------//
 //  Client Details Views //
//-----------------------//

var ClientDetailView = BaseView.extend({
 tagName: 'tr',
 
 show_clientDetail: _.template($('#show-clientDetail-template').find("tr").html()),
 edit_clientDetail: _.template($('#edit-clientDetail-template').find("tr").html()),
 
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
     return "Are you sure you want to delete this clientDetail?";
 },
 render_show: function(e) {
    var self = this;
    var self_el = $(self.el);

    var company_name = self.model.get("company_name");
    var title = self.model.get("title");
    var description = self.model.get('description');
    var end_date = self.model.get('end_date');
    var alert = self.model.get('alert');
    var created = self.model.get('created');
    var created_by_name = self.model.get('created_by_name');
    var updated_by_name = self.model.get('updated_by_name');

    self_el.html(self.show_clientDetail({
        id: self.model.id,
        company_name: company_name,
        title: title,
        description: description,
        end_date: end_date,
        alert: alert,
        created: created,
        created_by_name: created_by_name,
        updated_by_name: updated_by_name
    }));
 },
 render_edit: function() {
     
    var self = this;

    var title = self.model.get('title');
    var description = self.model.get('description');
    var end_date = self.model.get('end_date');
    var alert = self.model.get('alert');

    var self_el = $(self.el);
    self_el.html(self.edit_clientDetail({
        id: self.model.id,
        title: title,
        description: description,
        end_date: end_date,
        alert: alert
    }));

    // remove value attribute when its empty otherwise in IE8 the type='text' is showed as the value.
    if(title.length == 0) {
      self_el.find("input#title").removeAttr("value");
    }
    if(description.length == 0) {
      self_el.find("input#description").removeAttr("value");
    }
    if(end_date.length == 0) {
      self_el.find("input#end_date").removeAttr("value");
    }
    if(alert.length == 0) {
      self_el.find("input#alert").removeAttr("value");
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
     var title = self_el.find('#title').val();
     var description = self_el.find('#description').val();
     var end_date = self_el.find('#end_date').val();
     var alert = self_el.find('#alert').is(":checked");

     self.model.save(
         { title: title, description: description, end_date: end_date, alert: alert },
         {
            wait: true,
            success: self.saved_success,
            error: self.saved_error
         }
      );
     return self;
 }
});

var ClientDetailListView = Backbone.View.extend({   
 
 el: $('#clientDetails_wrapper'),
 events: {
     'click a#new_clientDetail':  'addItem'
 },
 initialize: function(options) {
     var self = this;
     self.vent = options.vent;
     self.actor_type = options.type;
     _.bindAll(self, 'render', 'addItem', 'appendItem', 'refresh', 'removedItem');
     self.collection = new ClientDetails();
     var clientDetails = self.collection;
     options.vent.bind("show", self.show);
     clientDetails.bind("refresh", function() {self.render();});
     clientDetails.bind("reset", function() {self.render();});
     clientDetails.bind("add", self.appendItem);
     clientDetails.bind("remove", self.removedItem);
     clientDetails.reset(options.json);
 },
 removedItem: function() {
     var self = this;
     return self;
 },
 render: function() {
     var self = this;
     $('#clientDetails', this.el).html("");
     $('#clientDetails', this.el).append("<div class='clientDetail_list top_margin'></div>");
     $('#clientDetails', this.el).append("<div class='buttons'></div>");
     this.refresh(this.collection, {});
     return this;
 },
 refresh: function(collection, options){
     var self = this;
     this.collection = collection;
     _(this.collection.models).each(function(clientDetail){
         self.appendItem(clientDetail);
      }, this); 
     return self;
 },
 addItem: function(){
     this.counter++;
     var clientDetail = new ClientDetail();
     this.collection.add(clientDetail);
     // add the datepicker
     $( "#end_date" ).datepicker({
        beforeShow: function(input, inst)
        {
            inst.dpDiv.css({marginTop: -input.offsetHeight + 'px', marginLeft: input.offsetWidth + 'px'});
        }
    });
 },
 appendItem: function(item){
     var self = this;
     var itemView = new ClientDetailView({
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