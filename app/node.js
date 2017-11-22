////
/// @author Aaron Benton
/// @page app/cluster
////
const debug = require('debug')('couchbase-rest-sdk:Node');
import Base from './base';
import {
  get,
} from 'lodash';

/// @name Node
/// @description Represents and Handles Individual Node operations
/// @reference https://developer.couchbase.com/documentation/server/5.0/rest-api/rest-server-nodes.html
/// @type {class}
export default class Node extends Base {
  ///# @name constructor
  ///# @arg {object}
  ///# ```js
  ///# {
  ///#   node_host: 'localhost', // the hostname / ip address of a node in the cluster
  ///#   node_port: 8091, // the port to use, defaults to 8091
  ///#   node_protocol: 'http', // the http protocol to use, defaults to http
  ///#   password: '', // the cluster admin password
  ///#   name: '', // the name of a bucket
  ///# }
  ///# ```
  constructor({
    node_host = 'localhost',
    node_port = 8091,
    node_protocol = 'http',
    ...options
  } = {}) {
    super(options);
    this.node_host = node_host;
    this.node_port = node_port;
    this.node_protocol = node_protocol;
  }

  ///# @name cluster
  ///# @getter
  ///# @description Gets the current documents cas value
  ///# @returns {number}
  get cluster() {
    return this.cluster;
  }

  ///# @name cas
  ///# @getter
  ///# @description Gets the current documents cas value
  ///# @returns {number}
  set cluster(value) {
    Object.defineProperty(this, 'cluster', {
      value,
      writable: false,
    });
  }

  ///# @name configure
  ///# @description Wrapper method for paths, hostname and services
  ///# @arg {object}
  ///# ```js
  ///# {
  ///#   data_path: '', // the path to store data (documents)
  ///#   index_path: '', // the index path
  ///#   hostname: '' // The hostname of the node (must be set before joining the cluster)
  ///#   services: '' // A comma-delimited list of services, valid values are: kv, index, query, fts
  ///# }
  ///# ```
  ///# @reference https://developer.couchbase.com/documentation/server/5.0/rest-api/rest-node-provisioning.html
  ///# @async
  async configure({
    data_path,
    hostname,
    index_path,
    services,
  } = {}) {
    debug('configure');
    debug(`  data_path: ${data_path}`);
    debug(`  hostname: ${hostname}`);
    debug(`  index_path: ${index_path}`);
    debug(`  services: ${services}`);// if there are services set in options
    if (services) {
      await this.useServices(services);
    }
    // if there is a hostname in options
    if (hostname) {
      await this.hostname(hostname);
    }
    // if there are paths set in options
    if (data_path || index_path) {
      await this.paths({
        data_path,
        index_path,
      });
    }
    return this;
  }

  ///# @name paths
  ///# @description Sets the data and index paths on the node
  ///# @arg {object}
  ///# ```js
  ///# {
  ///#   data_path: '/opt/couchbase/var/lib/couchbase/data', // the path to store data (documents)
  ///#   index_path: '/opt/couchbase/var/lib/couchbase/data', // the index path
  ///# }
  ///# ```
  ///# @reference https://developer.couchbase.com/documentation/server/5.0/rest-api/rest-node-provisioning.html
  ///# @async
  paths({
    data_path = '/opt/couchbase/var/lib/couchbase/data',
    index_path = '/opt/couchbase/var/lib/couchbase/data',
  } = {}) {
    debug('paths');
    debug(`  data_path: ${data_path}`);
    debug(`  index_path: ${index_path}`);
    return this.post('/nodes/self/controller/settings', {
      path: data_path,
      index_path,
    });
  }

  ///# @name hostname
  ///# @description Sets the hostname
  ///# @arg {string} hostname [''] - the hostname of the node (must be set before joining the cluster)
  ///# @reference https://developer.couchbase.com/documentation/server/5.0/rest-api/rest-node-provisioning.html
  ///# @async
  hostname(hostname = this.cluster_host) {
    debug('hostname');
    debug(`  hostname: ${hostname}`);
    return this.post('/node/controller/rename', {
      hostname,
    });
  }

  ///# @name services
  ///# @description Sets the available services on the nodes
  ///# @arg {string} services [ 'kv' ] - A comma-delimited list of services, valid values are: kv, index, query, fts
  ///# @reference https://developer.couchbase.com/documentation/server/5.0/rest-api/rest-node-provisioning.html
  ///# @async
  useServices(services = 'kv') {
    debug('useServices');
    // replace data with kv and strip all spaces
    services = services.replace('data', 'kv').replace(/\s+/g, '');
    debug(`  services: ${services}`);
    return this.post('/node/controller/setupServices', {
      services,
    });
  }

  ///# @name eject
  ///# @description Ejects the node from the cluster, this will only remove nodes that have been failed over
  ///# @arg {object}
  ///# ```js
  ///# {
  ///#   node: '['ns_1', // The node to eject
  ///#   hostname: '', // The host to eject
  ///# }
  ///# ```
  ///# @reference https://developer.couchbase.com/documentation/server/5.0/rest-api/rest-cluster-removenode.html
  ///# @async
  eject({
    node = 'ns_1',
    hostname = this.node_host,
  } = {}) {
    debug('eject');
    debug(`  node: ${node}`);
    debug(`  hostname: ${hostname}`);
    return this.post('/controller/ejectNode', {
      otpNode: `${node}@${hostname}`,
    }, {}, {
      host: this.cluster.cluster_host,
      protocol: this.cluster.cluster_protocol,
      port: this.cluster.cluster_port,
    })
      .catch((err) => {
        throw new Error(err.message);
      });
  }

  ///# @name failover
  ///# @description Ejects the node from the cluster
  ///# @arg {object}
  ///# ```js
  ///# {
  ///#   node: '['ns_1', // The node to eject
  ///#   hostname: '', // The host to eject
  ///# }
  ///# ```
  ///# @reference https://developer.couchbase.com/documentation/server/5.0/rest-api/rest-cluster-removenode.html
  ///# @async
  failover({
    graceful = true,
    node = 'ns_1',
    hostname = this.node_host,
  } = {}) {
    debug('failover');
    debug(`  node: ${node}`);
    debug(`  hostname: ${hostname}`);
    debug(`  graceful: ${graceful}`);
    let endpoint = '/controller/startGracefulFailover';
    if (!graceful) {
      endpoint = '/controller/failOver';
    }
    return this.post(endpoint, {
      otpNode: `${node}@${hostname}`,
    })
      .catch((err) => {
        throw new Error(err.message);
      });
  }

  ///# @name recover
  ///# @description Sets the recovery type of the node
  ///# @arg {object}
  ///# ```js
  ///# {
  ///#   recovery_type: 'full', // The recovery type to use, can be: full, delta
  ///#   node: '['ns_1', // The node to eject
  ///#   hostname: '', // The host to eject
  ///#   rebalance: false, // Whether or not to automatically rebalance after the recovery type has been set
  ///# }
  ///# ```
  ///# @reference https://developer.couchbase.com/documentation/server/5.0/rest-api/rest-cluster-removenode.html
  ///# @async
  async recover({
    recover_type = 'full',
    node = 'ns_1',
    hostname = this.node_host,
    rebalance = false,
  } = {}) {
    debug('recover');
    debug(`  node: ${node}`);
    debug(`  hostname: ${hostname}`);
    // post the recover_type
    await this.post('/controller/setRecoveryType', {
      otpNode: `${node}@${hostname}`,
      recoveryType: recover_type,
    })
      .catch((err) => {
        throw new Error(err.message);
      });
    // do we need to rebalance?
    if (rebalance) {
      await this.cluster.rebalance();
    }
    return this;
  }

  ///# @name join
  ///# @description Joins a node to a cluster
  ///# @arg {object}
  ///# ```js
  ///# {
  ///#   cluster_host: '', // the cluster hostname / ip
  ///#   cluster_protocol: '', // the cluster protocol to use
  ///#   cluster_port: 8091, // the cluster port to use
  ///#   password: 'password', // the cluster password
  ///#   rebalance: false, // whether or not to rebalance after joining the cluster
  ///#   username: 'Administrator', // the cluster username
  ///# }
  ///# ```
  ///# @reference https://developer.couchbase.com/documentation/server/5.0/rest-api/rest-cluster-joinnode.html
  ///# @async
  async join({
    cluster_host = get(this.cluster, 'cluster_host', 'localhost'),
    cluster_protocol = get(this.cluster, 'cluster_protocol', 'http'),
    cluster_port = get(this.cluster, 'cluster_port', 8091),
    password = get(this.cluster, 'password', 'password'),
    rebalance = false,
    username = get(this.cluster, 'username', 'Administrator'),
  } = {}) {
    debug('join');
    debug(`  cluster_protocol: ${cluster_protocol}`);
    debug(`  cluster_host: ${cluster_host}`);
    debug(`  cluster_port: ${cluster_port}`);
    debug(`  password: ${password}`);
    debug(`  username: ${username}`);
    // join the cluster
    await this.post('/node/controller/doJoinCluster', {
      clusterMemberHostIp: cluster_host,
      clusterMemberPort: cluster_port,
      user: username,
      password,
    })
      .catch((err) => {
        throw new Error(err.message);
      });
    // should we rebalance?
    if (rebalance) {
      await this.cluster.rebalance();
    }
    return this;
  }
}
