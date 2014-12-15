/**
 * Dependencies.
 */
    
var mongoose = require('mongoose');

var Actor = mongoose.model('Actor');

var authorizationRules = {
/*
role: {
	aScope: {
		anAction: [
			// At least one should return true
			fn1, fn2
  		]
	}
}
*/
};

var truthy = function() {
	return true;
};

var authorization = module.exports = {
	rolesForUser: function(user) {
	    var roles_ids = []; 
	    user.roles.forEach(function(user_role) {
            roles_ids.push(user_role.role_id);
        });
        
		return roles_ids;
	},
	// Tied to passportjs. 
	userForRequest: function(req) {
	    return req.user;
	},
	role: function(role, builder) {
		builder({
			hasPermissionOn: function(scope, actions, fn) {
				authorizationRules[role] = authorizationRules[role] || {};
				authorizationRules[role][scope] = authorizationRules[role][scope] || {};
				actions.forEach(function(action) {
					if (fn === undefined) {
						fn = truthy;
					}
					authorizationRules[role][scope][action] = authorizationRules[role][scope][action] || [];
					authorizationRules[role][scope][action].push(fn);
				});
			}
		});
	},
	role_authorized: function(req) {
		return {
			to: function(action, scope) {
			    // check permissions using logged user.
			    var user = authorization.userForRequest(req);
				var roles = authorization.rolesForUser(user);
				return function(context) {
					return roles && roles.some(function(role) {
						if (authorizationRules[role] && authorizationRules[role][scope] && authorizationRules[role][scope][action]) {
							return authorizationRules[role][scope][action].some(function(fn) {
								var result = fn(action, context, user);
								return result;
							});
						}
						return false;
					});
				};
			}
		};
	},
	// checks is the user has permissions to do the action.
	// this method checks not just the role the user has but also the extra permissions that he/she might have.
	authorized: function(req, action, scope, context) {
		// check if the user role allows him/her to do the scope/action in the context.
		var result = authorization.role_authorized(req, true).to(action, scope)(context);
		// if the user role does not allow the user to execute the action
		// check if the user permissions allow it.
		if(!result) {
		    var user = authorization.userForRequest(req);
		    // try to find permission only if user and context are not null.
		    if(user == null || context == null || context == '') {
			return false;
		    } else {
			var permission = Actor.attr(user.permissions, "obj_id", context.id);
			if(permission != null) {
			    return true;
			} else {
			    return false;
			}
		    }
		} 
		return true;
	    }
};

require("./roles");
