'use strict';

const request = require('request');

function requestAsync(options) {
  return new Promise((resolve, reject) => {
    request(options, (err, response, body) => {
      if (err) return reject(err);

      return resolve(body);
    });
  });
}

function ForbiddenError(message, userMessage, reason, meta, statusCode, code) {
    this.message = message || 'Forbidden';
    this.stack = new Error().stack;
    this.errorType = this.name;
    this.statusCode = statusCode || 403;
    this.code = code || 'Forbidden';
    this.userMessage = userMessage || message;
    this.meta = meta;
    this.reason = reason;
  }
  
  ForbiddenError.prototype = Object.create(Error.prototype);
  ForbiddenError.prototype.name = 'ForbiddenError';

  function BadRequestError(message, userMessage, reason, meta, statusCode, code) {
    this.message = message || 'Bad request';
    this.stack = new Error().stack;
    this.errorType = this.name;
    this.statusCode = statusCode || 400;
    this.code = code || 'BadRequest';
    this.userMessage = userMessage || message;
    this.meta = meta;
    this.reason = reason;
  }
  
  BadRequestError.prototype = Object.create(Error.prototype);
  BadRequestError.prototype.name = 'BadRequestError';

function respondErr(err) {
    return {
      error: err
    };
  }

/**
 * Returns true if site valid. Otherwise returns error
 *
 * @param  {Object}  sitesConfig
 * @param  {string}  site
 * @return {Boolean}
 */
function isSiteValid(sitesConfig, site) {
    if (!site || !sitesConfig[site]) {
      return respondErr('Invalid site');
    }
  
    return {
      ok: true
    };
  }

function parseAccessToken(authorization = '') {
    return authorization.split('AccessToken ')[1];
  }

class AuthenticateSiteService {
  constructor(hostConfig) {
    this.hostConfig = hostConfig;
  }

  async authenticate(site, headers) {
    const sitesConfig = this.hostConfig.getSitesConfig();
    const siteValid = isSiteValid(sitesConfig, site);
    if (!siteValid.ok) {
      throw new BadRequestError(siteValid.error);
    }

    const siteConfig = sitesConfig[site];
    const token = parseAccessToken(headers.authorization);
    const credentials = Buffer.from(`${siteConfig.client_id}:${siteConfig.client_secret}`).toString('base64');
    const result = await this.getTokenIntrospection(token, credentials);
    if (result.active !== true) {
      throw new ForbiddenError('Invalid request');
    }
  }

  /**
   * Sends a request to get token introspection
   *
   * @param  {string} token
   * @param  {string} credentials
   * @return {Promise.<Object>}
   */
  async getTokenIntrospection(token, credentials) {
    console.log('services/AuthenticateSite|getTokenIntrospection', { token, credentials });

    const options = {
      url: this.hostConfig.getAuthUrl(),
      method: 'POST',
      headers: {
        Authorization: `Basic ${credentials}`
      },
      form: {
        token: token
      },
      strictSSL: false
    };

    console.log(options)

    const result = await requestAsync(options);

    let parsed;
    try {
      parsed = JSON.parse(result);
    } catch (err) {
      parsed = {};
    }

    return parsed;
  }
}

module.exports = AuthenticateSiteService;