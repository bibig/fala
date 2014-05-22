var path  = require('path');
var glory = require('glory')({
  path      : __dirname,
  cookie    : false,
  session   : false,
  csrf      : false,
  multipart : {
    uploadDir: path.join(__dirname, '../../tmp')
  }
});
var imagePath = path.join(__dirname, './public/uploads');

var upload = require('../../index')({
  fields: {
    image: {
      text: '图片',
      required: true,
      isImage: true,
      path: imagePath, 
      url: '/uploads/',
      maxFileSize: 70000,
      exts: ['jpg', 'jpeg', 'gif', 'png'],
      sizeField: 'size',
      // cropImage: 'Center',
      // isFixedSize: true,
      imageSize: [600, 400],
      thumbSize: [100],
      hasThumb: true,
      thumbPath: false // use default
    } 
  }

});

glory.getImagePath = function (file) {
  return path.join(imagePath, file);
};

glory.getThumbPath = function (file) {
  return path.join(imagePath, 'thumbs', file);
};


glory.app.all('/upload', upload, function (req, res, next) {
  
  res.json(req.upload);

});

module.exports = glory;