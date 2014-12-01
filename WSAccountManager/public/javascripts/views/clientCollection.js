define(["backbone", "views/client"], function(Backbone, ClientView) {
  var ClientCollectionView = Backbone.View.extend({
    initialize: function() {
      var self = this;
      self.listenTo(self.collection, "reset", self.render);
    },
    className: "clients",
    render: function() {
      var self = this;
      self.$el.html("");
      var index = 1;
      self.collection.each(function(client){
        client.attributes.index = index++;
        var clientView = new ClientView({ model: client });
        self.$el.append(clientView.render().el);
      }, self);
      return self;
    }
  });

  return ClientCollectionView;
});