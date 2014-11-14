define(["backbone", "views/user"], function(Backbone, UserView) {
  var UserCollectionView = Backbone.View.extend({
    initialize: function() {
      var self = this;
      self.listenTo(self.collection, "reset", self.render);
    },

    tagName: "ul",
    className: "users",
    render: function() {
      var self = this;
      self.$el.html("");
      self.collection.each(function(user){
        var userView = new UserView({ model: user });
        self.$el.append(userView.render().el);
      }, self);
      return self;
    }
  });

  return UserCollectionView;
});