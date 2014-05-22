exports.create = create;

var fs      = require('fs');
var rander  = require('rander');
var path    = require('path');
var async   = require('async');
var yi      = require('yi');
var Myna    = require('myna');
var gm      = require('gm').subClass({ imageMagick: true });
var whether = require('whether').create();

function create (config, files) {
  return new Upload(config, files);
}

function checkFilePath (path, callback) {
  fs.exists(path, function (exists) {

    if (!exists) {
      fs.mkdir(path, function (e) {
    
        if (e) {
          callback(e);
        } else {
          callback();
        }

      });
    } else {
      callback();
    }

  });
}

function fileExt (filename) {
  var info = filename.split('.');
  return info[info.length - 1];
}
  
function toRandomFile (source) {
  return [rander.string(6), fileExt(source)].join('.');
}

//@isEditAction: 修改记录时，应该允许不上传文件，因为有可能只是修改其它字段
function getThumbPath (field) {
  return field.thumbPath ? field.thumbPath : path.join(field.path, 'thumbs');
}

/////////////////////////
// upload class define //
/////////////////////////

function Upload (config, files) {
  this.myna       = Myna(config.errors);
  this.files      = files || {};
  this.fields     = config.fields;
  this.data       = {};
  this.errors     = {};
}

Upload.prototype.forEachFile = function (callback) {
  yi.forEach(this.files, callback);
};
// waterfall steps:  validate -> save -> crop -> thumb

Upload.prototype.validate = function () {
  var self = this;

  this.forEachFile(function (name) {
    self.checkFile(name);
  });
  
  return Object.keys(this.errors).length === 0;
};

Upload.prototype.clear = function (callback) {
  var self = this;
  // console.log(files);

  async.each(Object.keys(this.files || {}), function(name, next) {
    var file = self.files[name];
    // console.log('ready to delete: %s', file.path);
    fs.unlink(file.path, next);
  }, callback);

};

// should be used after validate()
Upload.prototype.save = function (callback) {
  var self = this;
  var filenames = Object.keys(this.files);
  
  // console.log(filenames);
  async.each(filenames, function(name, callback) {
    
    async.series([
      function (callback) {
        var field = self.fields[name];

        checkFilePath(field.path, callback);
      },
      function (callback) {
        self.moveImage(name, callback);
      },
      function (callback) {
        self.trimImage(name, callback);
      },
      function (callback) {
        self.thumbImage(name, callback);
      }
    ], callback); // end of async.series
      
  }, callback); // end of async.each
};

Upload.prototype.moveImage = function (name, callback) {
  var file           = this.files[name];
  var field          = this.fields[name];
  var targetFileName = toRandomFile(file.path);
  var targetFile     = path.join(field.path, targetFileName);
  var self          = this;
  
  fs.rename(file.path, targetFile, function (e) {

    if (e) {
      callback(e);
    } else {
      self.data[name] = targetFileName;

      if (field.sizeField) {
        self.data[field.sizeField] = file.size;
      }

      callback();
    }
  });
};

Upload.prototype.trimImage = function (name, callback) {
  var field       = this.fields[name];
  var targetImage = path.join(field.path, this.data[name]);
  var imageSize   = field.imageSize;
  var gravities , gravity, imgObj;
  
  if (typeof imageSize == 'number') {
    imageSize = [imageSize];
  }
  
  if (Array.isArray(imageSize)) {
    imgObj = gm(targetImage);

    if (field.cropImage) {
      gravities = ['NorthWest', 'North', 'NorthEast', 'West', 'Center', 'East', 'SouthWest', 'South', 'SouthEast'];
      gravity = gravities.indexOf(field.cropImage) > -1 ? field.cropImage : 'North';
      imgObj = imgObj.gravity(gravity).crop(imageSize[0], imageSize[1]);
    } else {

      if (field.isFixedSize) {
        imgObj = imgObj.resize(imageSize[0], imageSize[1], '!');
      } else {

        if (imageSize.length == 2) {
          imgObj = imgObj.resize(imageSize[0], imageSize[1]);
        } else {
          imgObj = imgObj.resize(imageSize[0]);
        }

      }
    }
    
    imgObj.write(targetImage, callback);

  } else {
    callback();
  }
};

Upload.prototype.thumbImage = function (name, callback) {
  var field = this.fields[name];
  var targetImage, thumbPath, thumbImageObj, thumbSize;
  
  if (field.hasThumb) {
    targetImage   = path.join(field.path, this.data[name]);
    thumbPath     = getThumbPath(field);
    thumbImageObj = path.join(thumbPath, this.data[name]);
    thumbSize     = field.thumbSize;
   
    if (typeof thumbSize == 'number') {
      thumbSize = [thumbSize];
    }
  
    if (Array.isArray(thumbSize)) {
      checkFilePath(thumbPath, function (e) {

        if (e) {
          callback(e);
        } else {
          gm(targetImage)
          .resize(thumbSize[0], thumbSize[1])
          .write(thumbImageObj, callback);  
        }

      });
    } else {
      callback();
    }
  } else {
    callback();
  }
};


//@isEditAction: 修改记录时，应该允许不上传文件，因为有可能只是修改其它字段
Upload.prototype.checkFile = function (name) {
  var field = this.fields[name];
  var file, ext;

  if (! field) {
    throw this.myna.speak(99, name);
  }

  file = this.files[name];

  if (file.originalFilename === '') {

    if (field.required || field.isRequired) {
      this.errors[name] = this.myna.message(100);
    }
    return;
  }

  if (file.size == 0 ) {

    if (field.required || field.isRequired) {
      this.errors[name] = this.myna.message(106);
    }
    return;
  }

  if (file.originalFilename.indexOf('.') == -1) {
    this.errors[name] = this.myna.message(105);
    return;
  }

  ext = fileExt(file.path);
  
  if ((field.exts || []).indexOf(ext) == -1) {
    this.errors[name] = this.myna.message(102, ext);
    return;
  }
  
  if ( field.isImage && file.type.split('/')[0] != 'image') {
    this.errors[name] = this.myna.message(101, file.originalFilename);
    return;
  }

  if ( field.isImage && ! whether(file.path).isMatched()) {
    this.errors[name] = this.myna.message(101, file.originalFilename);
    return;
  }
  
  if (field.minFileSize && field.minFileSize > file.size) {
    this.errors[name] = this.myna.message(104, yi.humanSize(field.minFileSize));
    return;
  }

  if (field.maxFileSize && field.maxFileSize < file.size) {
    this.errors[name] = this.myna.message(103, yi.humanSize(field.maxFileSize));
    return;
  }
};