////
/// @author Aaron Benton
/// @page app/base
////
const debug = require('debug')('couchbase-rest-sdk:RestApi');
import Base from './base';
import Cluster from './cluster';
import Node from './node';
import {
  cloneDeep,
  extend,
  isObject,
  pick,
} from 'lodash';

// hold cluster instances in a weak map
const clusters_map = new WeakMap();

/// @name RestApi
/// @description RestApi class
/// @type {class}
export default class RestApi extends Base {
  ///# @name cluster
  ///# @description Gets a new instance of the RestApi class
  ///# @arg {string} cluster_host ['' || {}] - The host / ip address of a node
  ///# @arg {object}
  ///# ```js
  ///# {
  ///#   cluster_host: 'localhost', // the cluster host
  ///#   cluster_port: 8091, // the cluster port
  ///#   cluster_protocol: 'http', // the cluster http protocol to use
  ///# }
  ///# ```
  ///# @async
  cluster(
    cluster_host,
    options = {},
  ) {
    debug('cluster');
    // if options is defined and node_host is an object
    if (isObject(cluster_host)) {
      options = pick(
        extend({}, { username: this.username, password: this.password }, cluster_host),
        [ 'cluster_host', 'cluster_port', 'cluster_protocol', 'username', 'password' ],
      );
    } else { // host and options were passed separately
      options = extend(options, { cluster_host });
    }
    debug(`  cluster_host: ${options.cluster_host}`);
    // try to get it from the map first
    let cluster = clusters_map[JSON.stringify(options)];
    // if it doesn't exist set it and save it in the map
    if (!cluster) {
      cluster = cluster = new Cluster(options);
      clusters_map[JSON.stringify(options)] = cluster;
    }
    return cluster;
  }

  ///# @name node
  ///# @description Gets a new instance of the Bucket class
  ///# @arg {string} node_host [''] - The host / ip address of a node
  ///# @arg {object}
  ///# ```js
  ///# {
  ///#   data_path: '/opt/couchbase/var/lib/couchbase/data', // the path to store data (documents)
  ///#   index_path: '/opt/couchbase/var/lib/couchbase/data', // the index path
  ///#   services: 'kv', // A comma-delimited list of services, valid values are: kv, index, query, fts
  ///#   hostname: '' // a hostname to set for the node
  ///# }
  ///# ```
  ///# @async
  node(
    node_host = this.cluster_host,
    options = {},
  ) {
    debug('node');
    // if options is defined and node_host is an object
    if (isObject(node_host)) {
      options = cloneDeep(node_host);
      node_host = this.cluster_host;
    }
    const {
      node_port = 8091,
      node_protocol = 'http',
      ...config
    } = options;
    debug(`  node_host: ${node_host}`);
    debug(`  node_port: ${node_port}`);
    debug(`  node_protocol: ${node_protocol}`);
    debug(`  options: ${options}`);
    const node = new Node({
      cluster_host: node_host,
      cluster_port: node_port,
      cluster_protocol: node_protocol,
      password: this.password,
      username: this.username,
    });
    return node.configure(config);
  }
}
