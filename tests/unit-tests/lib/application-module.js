const ApplicationModule = require ('../../../lib/application-module');
const path = require ('path');
const {expect} = require ('chai');

describe ('lib | ApplicationModule', function () {
  describe ('constructor', function () {
    it ('should create a new ApplicationModule', function () {
      let appPath = path.resolve (__dirname, '../../fixtures/app-module');
      let appModule = new ApplicationModule ({appPath});

      expect (appModule).to.deep.include ({appPath, _resources: {}});
    });
  });

  describe ('configure', function () {
    it ('should load an application module into memory', function (done) {
      let appPath = path.resolve (__dirname, '../../fixtures/app-module');
      let appModule = new ApplicationModule ({appPath});

      appModule.configure ().then (result => {
        expect (appModule).to.equal (result);

        expect (result._resources).to.have.nested.property ('models.person');
        expect (result._resources).to.have.nested.property ('models.logger');
        expect (result._resources).to.not.have.nested.property ('models.monitor');

        expect (result._resources).to.have.nested.property ('controllers.module-test');

        expect (result._resources).to.have.property ('listeners').to.have.property ('blueprint.module.init');

        done (null);
      }).catch (err => done (err));
    });
  });
});