/**
 * Module dependencies.
 */

var mongoose = require('mongoose')
  , Schema = mongoose.Schema
  , ObjectId = Schema.ObjectId;

// FAQ Entry.
var Metadata = new Schema({
    company_id: String 
    , page_id: String
    , helpset_id: String
});

// .
var ViewScoreSchema = new Schema({
    t: Date,
    d: [Metadata] 
}, {collection: 'view_events'});
mongoose.model('ViewScore', ViewScoreSchema);

// .
var UpScoreSchema = new Schema({
    t: Date,
    d: [Metadata] 
}, {collection: 'score_up_events'});
mongoose.model('UpScore', UpScoreSchema);

// .
var DownScoreSchema = new Schema({
    t: Date,
    d: [Metadata]
}, {collection: 'score_down_events'});
mongoose.model('DownScore', DownScoreSchema);