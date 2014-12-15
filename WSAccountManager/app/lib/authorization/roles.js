////////////////////////////////////////////
//     Role permissions.                  //
////////////////////////////////////////////

var mongoose = require('mongoose')
  , Role = mongoose.model('Role')
  , authorization = require('./authorized');

var Role = mongoose.model('Role');

Role.findOne({ rtype: 0}, function(err, admin_role) {
   
   if(err) {
      utils.logger().error(err);
   }
   // profile permissions.
   authorization.role(admin_role._id, function(role) {
       role.hasPermissionOn('profile', ['view', 'update'], function(action, actor, active_actor) {
           // can see all profiles.
           if(action == 'view') {
               return true;
           }
           else if(action == 'update') {
               return true;//return actor._id.equals(active_actor._id);
           } 
           return false;
       });
   });
   //admin actor can view/add/update info in all company profiles.
   authorization.role(admin_role._id, function(role) {
       role.hasPermissionOn('company', ['view', 'update', 'delete'], function(action, company, active_actor) {
           return company._id.equals(company._id);
       });
   });
 
   // admin actor can see/add/edit/delete information in the admin area.
   // admin actor can also import data from sigarra.
   authorization.role(admin_role._id, function(role) {
        role.hasPermissionOn('admin', ['view', 'add', 'update', 'delete', 'import'], function(action, actor, active_actor) {
            return true;
        });
    });
 
});

Role.findOne({ rtype: 1}, function(err, normal_user_role) {
 if(err) {
    utils.logger().error(err);
 }
 // normal actor can view/add/update info in his/her actor profile
 // and any other profile where he/she is the owner.
 authorization.role(normal_user_role._id, function(role) {
     role.hasPermissionOn('profile', ['view', 'update'], function(action, actor, active_actor) {
      console.log("normal_user_role profile!!!!!!!!!!!!!!!!!!!!!!!");
         // can see all profiles.
	 if(action == 'view') {
	     return true;
	 }
	 else if(action == 'update') {
	     return actor._id.equals(active_actor._id);
	 } 
	 return false;
     });
 });
     
});