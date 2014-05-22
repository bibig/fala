module.exports = create;

var yi     = require('yi');
var Upload = require('./libs/upload');
var config = require('./config');

function create (settings) {
  var upload;

  yi.merge(config, settings);

  return function (req, res, next) {

    if (req.method == 'GET') { return next(); }

    // console.log(req.files);
   
    upload = Upload.create(config, req.files);
    
    if (upload.validate()) {
      upload.save(function (e) {
        
        if (e) {
          next(e);
        } else {
          req.upload = {data: upload.data};
          next();
        }
      });
    } else { // failed validate
      req.upload = {errors: yi.clone(upload.errors)};
      upload.clear(next);
    } // end of if (upload.validate())
    
  };
}