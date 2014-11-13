var User = Backbone.Model.extend({
	idAttribute: "_id"
});

var UserCollection = Backbone.Collection.extend({
	model: User,
	url: "/userlist"
});

var UserView = Backbone.View.extend({
	events: {
		"click .name": "singleUserLink"
	},
	tagName: "li",
	className: "user",
	render: function() {
		var self = this;
		var template = $("#usertemplate").html();
		var compiled = Handlebars.compile(template);
		var html = compiled(self.model.attributes);
		self.$el.html(html);
		return self;
	},
	singleUserLink: function(e) {
		var self = this;
		e.preventDefault();
		var id = self.model.get("_id");
		router.navigate("user/" + id, {trigger: true});
	}
});

var DetailedUserView = Backbone.View.extend({
	render: function() {
		var self = this;
		var template = $("#detailedUsertemplate").html();
		var compiled = Handlebars.compile(template);
		var html = compiled(self.model.attributes);
		self.$el.html(html);
		return self;
	},
	singleUserLink: function(e) {
		var self = this;
		e.preventDefault();
		var id = self.model.get("_id");
		router.navigate("user/" + id, {trigger: true});
	}
});

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

var AppRouter = Backbone.Router.extend({
	initialize: function() {
		var self = this;
		self._setupCollection();
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
		// because we have access to data we don't need next line... but i think that with
		// data on the page through initialContent is very insecure (user ids on page)
		//collection.fetch({ reset: true });
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