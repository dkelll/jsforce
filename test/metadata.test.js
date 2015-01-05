/*global describe, it, before, after, __dirname */
var testUtils = require('./helper/test-utils'),
    assert = testUtils.assert;

var _      = require('underscore'),
    fs     = require('fs'),
    sf     = require('../lib/jsforce'),
    config = require('./config/salesforce');

/**
 *
 */
describe("metadata", function() {

  this.timeout(40000); // set timeout to 40 sec.

  var conn = testUtils.createConnection(config);

  /**
   *
   */
  before(function(done) {
    this.timeout(600000); // set timeout to 10 min.
    testUtils.establishConnection(conn, config, done);
  });

  /**
   * Synchronous CRUD call tests (create, read, update, upsert, rename, delete)
   */
  describe("synchronous metadata call sequence", function() {

    var metadata = [{
      fullName: 'TestObjectSync1__c',
      label: 'Test Object Sync 1',
      pluralLabel: 'Test Object Sync 1',
      nameField: {
        type: 'Text',
        label: 'Test Object Name'
      },
      deploymentStatus: 'Deployed',
      sharingModel: 'ReadWrite'
    }, {
      fullName: 'TestObjectSync2__c',
      label: 'Test Object Sync 2',
      pluralLabel: 'Test Object 2',
      nameField: {
        type: 'AutoNumber',
        label: 'Test Object #'
      },
      deploymentStatus: 'InDevelopment',
      sharingModel: 'Private'
    }];
    var fullNames = _.map(metadata, function(meta) { return meta.fullName; });
    var rmetadata = null;

    /**
     *
     */
    describe("create metadata synchronously", function() {
      it("should create custom objects", function(done) {
        conn.metadata.create('CustomObject', metadata, function(err, results) {
          if (err) { throw err; }
          assert.ok(_.isArray(results));
          assert.ok(results.length === metadata.length);
          _.forEach(results, function(result) {
            assert.ok(result.success === true);
            assert.ok(_.isString(result.fullName));
          });
        }.check(done));
      });
    });

    /**
     *
     */
    describe("read metadata synchronously", function() {
      it("should read created custom objects metadata", function(done) {
        conn.metadata.read('CustomObject', fullNames, function(err, results) {
          if (err) { throw err; }
          assert.ok(_.isArray(results));
          assert.ok(results.length === fullNames.length);
          _.forEach(results, function(result) {
            assert.ok(_.isString(result.fullName));
            assert.ok(result.nameField);
            assert.ok(_.isString(result.nameField.label));
          });
          rmetadata = results;
        }.check(done));
      });
    });

    /**
     *
     */
    describe("update metadata synchronously", function() {
      it("should update custom objects", function(done) {
        rmetadata[0].label = 'Updated Test Object Sync 2';
        rmetadata[1].deploymentStatus = 'Deployed';
        conn.metadata.update('CustomObject', rmetadata, function(err, results) {
          if (err) { throw err; }
          assert.ok(_.isArray(results));
          assert.ok(results.length === fullNames.length);
          _.forEach(results, function(result) {
            assert.ok(result.success === true);
            assert.ok(_.isString(result.fullName));
          });
          rmetadata = results;
        }.check(done));
      });
    });

    /**
     *
     */
    describe("upsert metadata synchronously", function() {
      it("should upsert custom objects", function(done) {
        var umetadata = [{
          fullName: 'TestObjectSync2__c',
          label: 'Upserted Object Sync 2',
          pluralLabel: 'Upserted Object Sync 2',
          nameField: {
            type: 'Text',
            label: 'Test Object Name'
          },
          deploymentStatus: 'Deployed',
          sharingModel: 'ReadWrite'
        }, {
          fullName: 'TestObjectSync3__c',
          label: 'Upserted Object Sync 3',
          pluralLabel: 'Upserted Object Sync 3',
          nameField: {
            type: 'Text',
            label: 'Test Object Name'
          },
          deploymentStatus: 'Deployed',
          sharingModel: 'ReadWrite'
        }];
        conn.metadata.upsert('CustomObject', umetadata, function(err, results) {
          if (err) { throw err; }
          assert.ok(_.isArray(results));
          assert.ok(results.length === umetadata.length);
          _.forEach(results, function(result, i) {
            assert.ok(result.success === true);
            assert.ok(result.created === (result.fullName === 'TestObjectSync3__c' ? true : false));
            assert.ok(result.fullName === umetadata[i].fullName);
          });
        }.check(done));
      });
    });

    /**
     *
     */
    describe("rename metadata synchronously", function() {
      it("should rename a custom object", function(done) {
        var oldName = fullNames[0], newName = 'Updated' + oldName;
        conn.metadata.rename('CustomObject', oldName, newName).then(function(result) {
          assert.ok(result.success === true);
          assert.ok(_.isString(result.fullName));
          assert.ok(result.fullName === oldName);
          return conn.metadata.read('CustomObject', newName);
        }).then(function(result) {
          assert.ok(_.isString(result.fullName));
          assert.ok(result.fullName === newName);
          fullNames[0] = result.fullName;
        }).then(done, done);
      });
    });

    /**
     *
     */
    describe("delete metadata synchronously", function() {
      it("should delete custom objects", function(done) {
        fullNames.push('TestObjectSync3__c');
        conn.metadata.delete('CustomObject', fullNames, function(err, results) {
          if (err) { throw err; }
          assert.ok(_.isArray(results));
          assert.ok(results.length === fullNames.length);
          _.forEach(results, function(result) {
            assert.ok(result.success === true);
            assert.ok(_.isString(result.fullName));
          });
        }.check(done));
      });
    });

  }); // end of synchronous call tests


if (testUtils.isNodeJS) {

  /**
   *
   */
  describe("deploy metadata in packaged file", function() {
    it("should deploy package", function(done) {
      var zipStream = fs.createReadStream(__dirname + "/data/MyPackage.zip");
      conn.metadata.deploy(zipStream, { runTests: [ 'MyApexTriggerTest' ] }).complete(function(err, result) {
        if (err) { throw err; }
        assert.ok(result.done === true);
        assert.ok(result.success === true);
        assert.ok(result.status === 'Succeeded');
        assert.ok(result.numberComponentErrors === 0);
        assert.ok(result.numberComponentsDeployed === result.numberComponentsTotal);
        assert.ok(result.numberTestsCompleted === 1);
      }.check(done));
    });
  });

}

  /**
   *
   */
  describe("retrieve metadata in packaged file", function() {
    it("should retrieve package", function(done) {
      var bufs = [];
      conn.metadata.retrieve({ packageNames: [ 'My Test Package' ] })
                   .stream()
                   .on('data', function(d) {
                     bufs.push(d);
                   })
                   .on('end', function() {
                     assert.ok(bufs.length > 0);
                     done();
                   })
                   .on('error', function(err) {
                     done(err);
                   });
    });
  });


  /**
   *
   */
  after(function(done) {
    testUtils.closeConnection(conn, done);
  });

});
