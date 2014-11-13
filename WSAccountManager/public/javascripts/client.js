var User = Backbone.Model.extend({
	idAttribute: "_id"
});

var UserCollection = Backbone.Collection.extend({
	model: User,
	url: "/userlist"
});