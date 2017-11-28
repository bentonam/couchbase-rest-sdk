////
/// @author Aaron Benton
/// @page app/base
////

import rp from 'request-promise-native';
const debug = require('debug')('couchbase-rest-sdk:Base');
import {
  extend,
  get,
  isEmpty,
  isObject,
  reduce,
} from 'lodash';

/// @name Base
/// @description Base class
/// @type {class}
export default class Base {
  ///# @name constructor
  ///# @arg {object}
  ///# ```js
  ///# {
  ///#   password: '', // the cluster admin password
  ///#   username: '', // the cluster admin username
  ///# }
  ///# ```
  constructor({
    cluster_host = 'localhost',
    cluster_port = 8091,
    cluster_protocol = 'http',
    password = 'password',
    pool = 'default',
    username = 'Administrator',
  } = {}) {
    extend(this, { cluster_host, cluster_port, cluster_protocol, password, pool, username });
  }

  ///# @name post
  ///# @arg {string} endpoint [''] - The endpoint to send the request to
  ///# @arg {object} data [''] - // Any form data to send
  ///# @arg {object} query [''] - // Any query string data to send
  post(endpoint, { form, body, query, protocol, host, port } = {}) {
    return this.send({
      method: 'POST',
      endpoint,
      form,
      body,
      query,
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      protocol,
      host,
      port,
    });
  }

  ///# @name get
  ///# @arg {string} endpoint [''] - The endpoint to send the request to
  ///# @arg {object} data [{}] - // any query string parameters to add
  get(endpoint, { data = {}, protocol, host, port } = {}) {
    return this.send({
      method: 'GET',
      endpoint,
      qs: data,
      protocol,
      host,
      port,
    });
  }

  ///# @name delete
  ///# @arg {string} endpoint [''] - The endpoint to send the request to
  ///# @arg {object} data [''] - // Any form data to send
  ///# @arg {object} query [''] - // Any query string data to send
  delete(endpoint, { data = {}, query = {}, protocol, host, port } = {}) {
    return this.send({
      method: 'DELETE',
      endpoint,
      form: data,
      query,
      protocol,
      host,
      port,
    });
  }

  ///# @name put
  ///# @arg {string} endpoint [''] - The endpoint to send the request to
  ///# @arg {object} data [''] - // Any form data to send
  ///# @arg {object} query [''] - // Any query string data to send
  put(endpoint, { data, body, query, protocol, host, port } = {}) {
    return this.send({
      method: 'PUT',
      endpoint,
      body,
      form: data,
      query,
      protocol,
      host,
      port,
    });
  }

  ///# @name send
  /// @arg {object}
  ///# ```js
  ///# {
  ///#   method: '', // the http method to use
  ///#   endpoint: '', // the endpoint to send the request to
  ///#   qs: {}, // an object of query string parameters for the request
  ///#   formData: {}, // an object of form data to post for the request
  ///#   headers: {}, // an object of headers to add to the request
  ///# }
  ///# ```
  send({
    endpoint,
    form,
    body,
    headers,
    host = this.node_host || this.cluster_host,
    method = 'GET',
    protocol = this.node_protocol || this.cluster_protocol || 'http',
    port = this.node_port || this.cluster_port || 8091,
    query,
  }) {
    debug('send');
    const options = {
      uri: `${protocol}://${host}:${port}/${endpoint.replace(/^\//, '')}`,
      method,
      form,
      body,
      qs: query,
      headers,
      json: true,
    };
    debug(`  uri: ${options.uri}`);
    debug(`  method: ${method}`);
    debug(`  endpoint: ${endpoint}`);
    debug(`  query: ${JSON.stringify(query, null, 2)}`);
    debug(`  form: ${JSON.stringify(form, null, 2)}`);
    debug(`  body: ${JSON.stringify(body, null, 2)}`);
    debug(`  headers: ${JSON.stringify(headers, null, 2)}`);
    if (this.username && this.password) {
      options.auth = {
        user: this.username,
        pass: this.password,
        sendImmediately: true,
      };
    }
    return rp(options)
      .catch((err) => {
        console.log(err);
        let errors;
        if (err.error) {
          errors = get(err, 'error.errors', {});
          errors = isEmpty(errors) ? get(err, 'error', {}) : errors;
          if (isObject(errors)) {
            errors = reduce(errors, (previous, value) => {
              previous.push(value);
              return previous;
            }, []);
            if (err.statusCode !== 404) {
              errors = errors.length ? errors : [ 'Unknown Error ¯\_(ツ)_/¯' ]; // eslint-disable-line no-useless-escape
            }
          }
        } else {
          errors = get(err, 'message', '');
          errors = errors ? [ errors ] : err;
        }
        if (!errors.length && err.statusCode === 404) {
          errors = [ 'Not Found' ];
        }
        throw errors;
      });
  }
}

// function isJSON(value) {
//   if (typeof value !== 'string') {
//     value = JSON.stringify(value);
//   }
//   try {
//     JSON.parse(value);
//     return true;
//   } catch (e) {
//     return false;
//   }
// }
