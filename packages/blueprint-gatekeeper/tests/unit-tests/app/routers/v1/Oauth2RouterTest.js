'use strict';

const blueprint = require ('@onehilltech/blueprint')
  , expect      = require ('chai').expect
  , async       = require ('async')
  , getToken    = require ('../../../getToken')
  ;

describe ('Oauth2Router', function () {
  describe('#issueToken', function () {
    var TOKEN_URL = '/v1/oauth2/token';
    var accessToken;
    var refreshToken;

    describe ('password', function () {
      it ('should get a token for the username/password', function (done) {
        var data = {
          grant_type: 'password',
          username: blueprint.app.seeds.$default.accounts[1].username,
          password: blueprint.app.seeds.$default.accounts[1].username,
          client_id: blueprint.app.seeds.$default.clients[0].id
        };

        getToken (data, function (err, result) {
          if (err)
            return done (err);

          expect (result).to.have.all.keys (['token_type', 'access_token', 'refresh_token']);
          expect (result).to.have.property ('token_type', 'Bearer');

          accessToken = result;

          return done (null);
        });
      });

      it ('should return 400 for missing grant_type', function (done) {
        var data = {
          username: blueprint.app.seeds.$default.accounts[0].username,
          password: blueprint.app.seeds.$default.accounts[0].password,
          client_id: blueprint.app.seeds.$default.clients[0].id
        };


        blueprint.testing.request()
          .post (TOKEN_URL)
          .send (data)
          .expect (400, done);
      });

      it ('should not grant token because client is disabled', function (done) {
        var data = {
          grant_type: 'password',
          username: blueprint.app.seeds.$default.accounts[0].username,
          password: blueprint.app.seeds.$default.accounts[0].password,
          client_id: blueprint.app.seeds.$default.clients[2].id
        };

        blueprint.testing.request ()
          .post (TOKEN_URL)
          .send (data)
          .expect (403, {errors: {code: 'client_disabled', message: 'Client is disabled'}}, done);
      });

      it ('should not grant token because account is disabled', function (done) {
        var data = {
          grant_type: 'password',
          username: blueprint.app.seeds.$default.accounts[4].username,
          password: blueprint.app.seeds.$default.accounts[4].password,
          client_id: blueprint.app.seeds.$default.clients[0].id
        };

        blueprint.testing.request ()
          .post (TOKEN_URL)
          .send (data)
          .expect (403, {errors: {code: 'policy_failed', message: 'Account is disabled'}}, done);
      });

      it ('should not grant token because password is incorrect', function (done) {
        var data = {
          grant_type: 'password',
          username: blueprint.app.seeds.$default.accounts[1].username,
          password: 'incorrect_password',
          client_id: blueprint.app.seeds.$default.clients[0].id
        };

        blueprint.testing.request ()
          .post (TOKEN_URL)
          .send (data)
          .expect (400, {errors: {code: 'invalid_password', message: 'Incorrect password'}}, done);
      });
    });

    describe ('client_credentials', function () {
      it ('should get a token for client credentials', function (done) {
        var data = {
          grant_type: 'client_credentials',
          client_id: blueprint.app.seeds.$default.clients[0].id,
          client_secret: blueprint.app.seeds.$default.clients[0].secret
        };

        getToken (data, function (err, result) {
          if (err)
            return done(err);

          expect (result).to.have.all.keys (['token_type', 'access_token']);
          expect (result).to.have.property ('token_type', 'Bearer');

          return done (null);
        });
      });

      it ('should not grant token because client is disabled', function (done) {
        var data = {
          grant_type: 'client_credentials',
          client_id: blueprint.app.seeds.$default.clients[2].id,
          client_secret: blueprint.app.seeds.$default.clients[2].secret
        };

        blueprint.testing.request ()
          .post(TOKEN_URL).send(data)
          .expect (403, {errors: {code: 'client_disabled', message: 'Client is disabled'}}, done);
      });

      it ('should not grant token because invalid secret', function (done) {
        var data = {
          grant_type: 'client_credentials',
          client_id: blueprint.app.seeds.$default.clients[0].id,
          client_secret: 'bad_secret'
        };

        blueprint.testing.request ()
          .post(TOKEN_URL).send(data)
          .expect (400, {errors: {code: 'incorrect_secret', message: 'Client secret is incorrect'}}, done);
      });
    });

    describe ('refresh_token', function () {
      it ('should refresh the access and refresh token', function (done) {
        async.waterfall ([
          function (callback) {
            const data = {
              grant_type: 'password',
              username: blueprint.app.seeds.$default.accounts[1].username,
              password: blueprint.app.seeds.$default.accounts[1].username,
              client_id: blueprint.app.seeds.$default.clients[0].id
            };

            getToken (data, callback);
          },

          function (accessToken, callback) {
            async.waterfall ([
              function (callback) {
                const data = {
                  grant_type: 'refresh_token',
                  client_id: blueprint.app.seeds.$default.clients[0].id,
                  refresh_token: accessToken.refresh_token
                };

                getToken (data, callback);
              },

              function (refreshToken, callback) {
                expect (refreshToken).to.have.all.keys (['token_type', 'access_token', 'refresh_token']);
                expect (refreshToken).to.have.property ('token_type', 'Bearer');

                expect (refreshToken.access_token).to.not.equal (accessToken.access_token);
                expect (refreshToken.refresh_token).to.not.equal (accessToken.refresh_token);

                return callback (null);
              }
            ], callback);
          }
        ], done);
      });
    });
  });

  describe('#logoutUser (callback)', function () {
    var accessToken;

    it ('should logout the current user', function (done) {
      async.waterfall ([
        function (callback) {
          var data = {
            grant_type: 'password',
            username: blueprint.app.seeds.$default.accounts[1].username,
            password: blueprint.app.seeds.$default.accounts[1].username,
            client_id: blueprint.app.seeds.$default.clients[0].id
          };

          blueprint.testing.request ()
            .post ('/v1/oauth2/token').send (data)
            .expect (200, function (err, res) {
              return callback (err, res);
            });
        },

        function (res, callback) {
          accessToken = res.body.access_token;

          blueprint.testing.request ()
            .post ('/v1/oauth2/logout')
            .set ('Authorization', 'Bearer ' + accessToken)
            .expect (200, callback);
        }
      ], done);
    });
  });
});
