////
/// @author Aaron Benton
/// @page app/base
////

import rp from 'request-promise-native';
const debug = require('debug')('couchbase-rest-sdk:Base');
import {
  extend,
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
    password = 'password',
    username = 'Administrator',
  } = {}) {
    extend(this, { username, password });
  }

  ///# @name post
  ///# @arg {string} endpoint [''] - The endpoint to send the request to
  ///# @arg {object} data [''] - // Any form data to post
  post(endpoint, data = {}, query = {}, { protocol, host, port } = {}) {
    return this.send({
      method: 'POST',
      endpoint,
      form: data,
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
  get(endpoint, data = {}, { protocol, host, port } = {}) {
    return this.send({
      method: 'GET',
      endpoint,
      qs: data,
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
    headers,
    host = this.node_host || this.cluster_host,
    method = 'GET',
    protocol = this.node_protocol || this.cluster_protocol || 'http',
    port = this.node_port || this.cluster_port || 8091,
    query,
  }) {
    debug('send');
    debug(`  uri: ${this.cluster}${endpoint}`);
    debug(`  method: ${method}`);
    debug(`  endpoint: ${endpoint}`);
    debug(`  query: ${JSON.stringify(query, null, 2)}`);
    debug(`  form: ${JSON.stringify(form, null, 2)}`);
    debug(`  headers: ${JSON.stringify(headers, null, 2)}`);
    const options = {
      uri: `${protocol}://${host}:${port}/${endpoint.replace(/^\//, '')}`,
      method,
      form,
      qs: query,
      headers,
      json: true,
    };
    if (this.username && this.password) {
      options.auth = {
        user: this.username,
        pass: this.password,
        sendImmediately: true,
      };
    }
    return rp(options);
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
