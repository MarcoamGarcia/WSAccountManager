define(["backbone", "handlebars"], function(Backbone, Handlebars) {
  var DetailedUserView = Backbone.View.extend({
    render: function() {
      var self = this;
      var template = $("#detailedUsertemplate").html();
      var compiled = Handlebars.compile(template);
      var html = compiled(self.model.attributes);
      self.$el.html(html);
      return self;
    }
  });

  return DetailedUserView;
});