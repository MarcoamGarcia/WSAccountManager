exports.index = function(req, res, next) {
    res.render('testapp/index', {
        title:'Welcome'
    });
}
exports.projects = function(req, res, next) {
    res.render('testapp/projects', {
        title:'Projects'
    });
}

exports.tasks = function(req, res, next) {
    res.render('testapp/tasks', {
        title:'Tasks'
    });
}

exports.messages = function(req, res, next) {
    res.render('testapp/messages', {
        title:'Messages'
    });
}

exports.ajax_call = function(req, res, next) {
    res.writeHead(200, {'content-type': 'text/json' });
    var demo_hash = { html: "<div>Added by ajax!</div>"};
    res.write(JSON.stringify(demo_hash));
    res.end('\n');
}
