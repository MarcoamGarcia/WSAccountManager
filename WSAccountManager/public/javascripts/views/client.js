define(["backbone", "handlebars", "jquery", "events"], function(Backbone, Handlebars, $, Events) {
  var ClientView = Backbone.View.extend({
    events: {
      "click .client_detail": "singleUserLink"
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
    }
  });

  return ClientView;
});