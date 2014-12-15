(function () {
    
    var profile = new Profile({
        id: profile_id
    });
    
    var profile_main = new Profile(profile_main_info);
    new ProfileMainView({model: profile_main});
    //var vent = _.extend({}, Backbone.Events);
    //var contact_list_view = new ContactListView({vent: vent, type: 0, json: profile_contacts});  
    //var vent = _.extend({}, Backbone.Events);
    //new LinkListView({vent: vent, json: profile_links});
    
})()