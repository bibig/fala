var should        = require('should');
var request       = require('supertest');
var glory         = require('./fixtures/app');
var path          = require('path');
var fs            = require('fs');
var exec          = require('child_process').exec;
var uploadTmpPath = path.join(__dirname, '../tmp');


function clear (path, done) {
  var command = 'rm -rf ' + path;

  exec(command, function(err, stdout, stderr) {
    done();
  });
}

describe('basic test', function  () {
  var imageFile;
  var results;

  after(function (done) {
    clear(path.join(__dirname, './fixtures/public/uploads/*'), done);
  });


  it('upload images', function (done) {
    request(glory.app)
      .post('/upload')
      .attach('image', path.join(__dirname, './fixtures/images/small.jpg'))
      .end(function (e, res) {
        should.not.exist(e);
        // console.log(res.text);
        results = JSON.parse(res.text);
        // console.log(results);
        // console.log(typeof results);

        done();
      });
  });

  it('check image file after upload', function (done) {
    var image = results.data.image;
    var imageFile = glory.getImagePath(image);
    var thumbFile = glory.getThumbPath(image);

    fs.existsSync(imageFile).should.be.true;
    fs.existsSync(thumbFile).should.be.true;

    // console.log(imageFile);
    // console.log(thumbFile);
    done();
  });



  it('upload invalid image', function (done) {
    request(glory.app)
      .post('/upload')
      .attach('image', path.join(__dirname, './fixtures/images/test.txt'))
      .end(function (e, res) {
        should.not.exist(e);

        results = JSON.parse(res.text);
        console.log(results);

        results.should.have.property('errors');
        results.errors.should.have.property('image');

        done();
      });
  });


  it('upload invalid size image', function (done) {
    request(glory.app)
      .post('/upload')
      .attach('image', path.join(__dirname, './fixtures/images/big.png'))
      .end(function (e, res) {
        should.not.exist(e);

        results = JSON.parse(res.text);
        console.log(results);

        results.should.have.property('errors');
        results.errors.should.have.property('image');

        done();
      });
  });

  it('upload empty image', function (done) {
    request(glory.app)
      .post('/upload')
      .attach('image', path.join(__dirname, './fixtures/images/empty.jpg'))
      .end(function (e, res) {
        should.not.exist(e);
        results = JSON.parse(res.text);
        console.log(results);

        results.should.have.property('errors');
        results.errors.should.have.property('image');

        done();
      });
  });


  it('upload unrecognized image', function (done) {
    request(glory.app)
      .post('/upload')
      .attach('image', path.join(__dirname, './fixtures/images/unrecognized.jpg'))
      .end(function (e, res) {
        should.not.exist(e);
        results = JSON.parse(res.text);
        console.log(results);

        results.should.have.property('errors');
        results.errors.should.have.property('image');

        done();
      });
  });

});


describe('clear tmp', function  () {
  after(function (done) {
    clear(uploadTmpPath, done);
  });

});