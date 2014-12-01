define(["backbone", "models/client"], function(Backbone, Client) {
  return Backbone.Collection.extend({
    model: Client,
    url: "/clientlist"
  });
});
