var mongoose = require('mongoose')
  , Schema = mongoose.Schema
  , ObjectId = Schema.ObjectId
  , ObjectIdSchema = Schema.ObjectIdSchema
  , _ = require('underscore');

function attributes_extension(schema, options) {
  
  // find attribute.
  schema.statics.attr = function attr(child_array, attr_name, attr_value) {
    for (var i = 0, l = child_array.length; i < l; i++) {
        if(typeof child_array[i].get(attr_name) !== "undefined") {
            if (attr_value.toString() == child_array[i].get(attr_name).toString())
                return child_array[i];
        }
    }
    return null;
  }
  
  // find attribute.
  schema.statics.attrs = function attr(child_array, attr_name, attr_value) {

    var attributes = [];
    for (var i = 0, l = child_array.length; i < l; i++) {
        if(typeof child_array[i].get(attr_name) !== "undefined") {
            if (attr_value.toString() == child_array[i].get(attr_name).toString())
                attributes.push(child_array[i]);
        }
    }
    return attributes;
  }
  
  // find two attributes
  schema.statics.two_attrs = function(child_array, first_attr_name, first_attr_value, second_attr_name, second_attr_value) {
    for (var i = 0, l = child_array.length; i < l; i++) {
        if(typeof child_array[i].get(first_attr_name) !== "undefined" && typeof child_array[i].get(second_attr_name) !== "undefined") {
            if (first_attr_value.toString() == child_array[i].get(first_attr_name).toString()
                    && second_attr_value.toString() == child_array[i].get(second_attr_name).toString())
                return child_array[i];
        }
    }
    return null;
  }
  
  
  // find number of attributes
  schema.statics.number_of_attr = function(child_array, attr_name, attr_value) {
    var size = 0;
    var isObjectId = false;
    try {
      var casted = ObjectIdSchema.prototype.cast.call(null, attr_value);
      isObjectId = true;
    } catch (e) {
    }

    if(isObjectId) {
        for (var i = 0, l = child_array.length; i < l; i++) {
            if (ObjectId.toString(casted) == ObjectId.toString(child_array[i].get(attr_name)))
                size++;
        }
    } else {
        for (var i = 0, l = this.length; i < l; i++) {
            if (attr_value == child_array[i].get(attr_name))
                size++;
        }
    }

    return size;
  }

}

module.exports = attributes_extension;