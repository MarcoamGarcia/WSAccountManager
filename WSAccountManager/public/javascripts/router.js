define(["backbone", "events", "collections/user", "views/userCollection", "views/detailedUser"], function(Backbone, Events, UserCollection, UserCollectionView, DetailedUserView) {
  var Router = Backbone.Router.extend({
    initialize: function() {
      var self = this;
      Events.on("router:navigate", function(url) {
        self.navigate(url, { trigger: true });
      });
    },
    routes: {
      "": "index",
      "user/:id": "singleUser"
    },
    _setupCollection: function() {
      var self = this;
      if (self.collection) return;
      var data = $(".initialContent").html();
      self.collection = new UserCollection(JSON.parse(data));
    },
    _renderView: function(view) {
      $(".app").html(view.render().el);
    },
    index: function() {
      var self = this;
    },
    clients: function() {
      var self = this;
      // because we have access to data we don't need next line... but i think that with
      // data on the page through initialContent is very insecure (user ids on page)
      //collection.fetch({ reset: true });
      self._setupCollection();
      var view = new UserCollectionView({ collection: self.collection});
      self._renderView(view);
    },
    singleUser: function(id) {
      var self = this;
      var user = self.collection.get(id);
      var view = new DetailedUserView({ model: user });
      self._renderView(view);
    }
  });
  return Router;
});