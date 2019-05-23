
module.exports = function(args, finished) { 
  console.log('api/initialise|invoke');

  var authenticated = false;

  if (args.req.headers.authorization) {
    var fin = function(obj) {
      // dummy function to allow us to validate the JWT without finishing
      //  the replacement function simply logs any JWT errors to the console / log
      console.log('JWT Authorization header error:');
      console.log(JSON.stringify(obj));
    };

    authenticated = this.jwt.handlers.validateRestRequest.call(this, args.req, fin, true, true);
    
    if (!authenticated) {

      console.log('api/initialise|invoke|err|jwtError');

      return finished({ error :"Invalid JWT: Error: Token expired", status: {code:403, text: "Forbidden"}})
    }
  }

  console.log('api/initialise|invoke|complete');

  return finished({ ok: true, authenticated });
}
