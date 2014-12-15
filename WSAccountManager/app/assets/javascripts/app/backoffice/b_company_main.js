Backbone.Model.prototype.idAttribute = "_id";

//
// Models
//
var Company = Backbone.Model.extend({
    defaults: {
      name: '',
      about_me: '',
      email: '',
      pending_email: '',
      birth_date: '',
      gender: '',
      security: 1 // set default security to 'internal'.
    },
    url: function() {
        return '/company/' + company_id;
    }
}); 

//
// Views
//

//
// Main info View
//
var CompanyMainView = BaseView.extend({
    el: $('#general_info'),
    show_template: _.template($('#show-main-template').html()),
    edit_template: _.template($('#edit-main-template').html()),
    events: function() {
        return _.extend( {
            'submit form': 'save',
            "click a.edit" : "edit",
            'click a.cancel':  'cancel'
        }, this.constructor.__super__.events);
    },
    initialize: function(options) {
      var self = this;
      self.constructor.__super__.initialize.apply(this, arguments);
      self.render();
    },
    render_show: function() {
        var self = this;
        var name = self.model.get('name');
        var url = self.model.get('url');
        var email = self.model.get('email');
        var address = self.model.get('address');

        $(self.el).html(self.show_template({
            name: name,
            url: url,
            email: email,
            address: address
        }));
        
        // show empty information if address is empty.
        if(address == "") {
            $('.address', this.el).html("---");
        }
        // show empty information if url is empty.
        if(url == "") {
            $('.url', this.el).html("---");
        }
        // show empty information if email is empty.
        if(email == "") {
            $('.email', this.el).html("---");
        }
          
        return self;
    },
    render_edit: function(e) {
        var self = this;

        var name = self.model.get('name');
        var url = self.model.get('url');
        var email = self.model.get('email');
        var address = self.model.get('address');

        $(self.el).html(self.edit_template({
            name: name,
            url: url,
            email: email,
            address: address
        }));        
        
        return self;
    },
    send_data: function() {
        var self = this;
        var self_el = $(self.el);
        self.model.save(
            { name: self_el.find('#name').val(), email: self_el.find('#email').val(), 
                url: self_el.find('#url').val(), address: self_el.find('#address').val(),
                security: self.model.get("security")},
            {
                success: self.saved_success,
                error: self.saved_error
            }
       );
       return self;
    }
});