define(["backbone", "handlebars", "jquery", "events"], function(Backbone, Handlebars, $, Events) {
  var ClientView = Backbone.View.extend({
    events: {
      "click .client_detail": "singleUserLink",
      "click .edit_client": "edit"
    },
    className: "client",
    render: function() {
      var self = this;
      var template = $("#clienttemplate").html();
      var compiled = Handlebars.compile(template);
      var html = compiled(self.model.attributes);
      self.$el.html(html);
      return self;
    },
    singleUserLink: function(e) {
      var self = this;
      e.preventDefault();
      var id = self.model.get("_id");
      var url = "user/" + id;
      Events.trigger("router:navigate", url);
    },
    edit: function(e) {
      var self = this;

      $(".client_table_header").hide();
      $(".client_add").hide();

      var template = $("#editclienttemplate").html();
      var compiled = Handlebars.compile(template);
      var html = compiled(self.model.attributes);
      self.$el.html(html);

      self.$el.find(".cancel").click(function(e) {
        $(".client_table_header").show();
        $(".client_add").show();
        var field = $(this).prev();
        var field_name = field.attr("id");
        var field_value = self.model.get(field_name);
        field.val(field_value);
        $(this).hide();
        $(this).find('form-horizontal');
        // stop event propagation to avoid scrolling to the top.
        e.preventDefault();
      });

      self.$el.find(".save").click(function(e) {
        var companyname = self.$el.find("#companyname")[0].value;
        var firstname = self.$el.find("#firstname")[0].value;
        var lastname = self.$el.find("#lastname")[0].value;
        var firstcontact = self.$el.find("#firstcontact")[0].value;
        var secondcontact = self.$el.find("#secondcontact")[0].value;

        self.model.save({ companyname: companyname, firstname: firstname, lastname: lastname, firstcontact: firstcontact
        , secondcontact: secondcontact }, {
          success: function () {
            console.log("sucesso!!!!!!!!!!!!!!!!!!!!!");
          },
          error: function(error, e) {
            console.log("======================= erro: " + error);
          }
        });
      });

      return self;
    }
  });

  return ClientView;
});