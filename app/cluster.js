/* eslint-disable max-lines */
////
/// @author Aaron Benton
/// @page app/cluster
////
const debug = require('debug')('couchbase-rest-sdk:Cluster');
import Base from './base';
import Bucket from './bucket';
import Node from './node';
import {
  cloneDeep,
  extend,
  isObject,
  pick,
  pickBy,
} from 'lodash';

// hold node instances in a weak map
const nodes_map = new WeakMap();

/// @name Cluster
/// @description Handles Cluster operations
/// @reference https://developer.couchbase.com/documentation/server/5.0/rest-api/rest-cluster-intro.html
/// @type {class}
export default class Cluster extends Base {
  ///# @name constructor
  ///# @arg {object}
  ///# ```js
  ///# {
  ///#   cluster_host: 'localhost', // the hostname / ip address of a node in the cluster
  ///#   cluster_port: 8091, // the port to use, defaults to 8091
  ///#   cluster_protocol: 'http', // the http protocol to use, defaults to http
  ///#   password: '', // the cluster admin password
  ///#   username: '', // the cluster admin username
  ///# }
  ///# ```
  constructor({
    cluster_host = 'localhost',
    cluster_port = 8091,
    cluster_protocol = 'http',
    ...options
  } = {}) {
    super(options);
    this.cluster_host = cluster_host;
    this.cluster_port = cluster_port;
    this.cluster_protocol = cluster_protocol;
  }

  ///# @name initialize
  ///# @description Wrapper method for quotas and credentials
  ///# @arg {object}
  ///# ```js
  ///# {
  ///#   cluster_name: '', // The name of the cluster
  ///#   data_path: '', // The path to store data (documents)
  ///#   fts_memory: 256, // The amount of memory for the fts service
  ///#   hostname: '', // the hostname of the node (must be set before joining the cluster)
  ///#   index_memory: 256, // The amount of memory for the index service
  ///#   index_path: '', // the index path
  ///#   kv_memory: 100, // The amount of memory for the kv / data service
  ///#   nodes: [], // an array of nodes to add
  ///#   password: 'password', // The cluster password
  ///#   rebalance: true, // whether or not to rebalance the cluster when adding nodes
  ///#   services: '', // A comma-delimited list of services, valid values are: kv, index, query, fts
  ///#   username: 'Administrator', // The cluster username
  ///# }
  ///# ```
  ///# @async
  async initialize({
    cluster_name,
    data_path,
    fts_memory,
    hostname,
    index_path,
    index_memory,
    kv_memory,
    nodes,
    password = this.password,
    rebalance = true,
    services,
    username = this.username,
  }) {
    debug('initialize');
    debug(`  cluster_name: ${cluster_name}`);
    debug(`  data_path: ${data_path}`);
    debug(`  fts_memory: ${fts_memory}`);
    debug(`  hostname: ${hostname}`);
    debug(`  index_path: ${index_path}`);
    debug(`  index_memory: ${index_memory}`);
    debug(`  kv_memory: ${kv_memory}`);
    debug(`  password: ${password}`);
    debug(`  rebalance: ${rebalance}`);
    debug(`  services: ${services}`);
    debug(`  username: ${username}`);
    // if there are any of the memory quotas defined, set them first
    if (fts_memory || index_memory || kv_memory) {
      await this.memory({ fts_memory, index_memory, kv_memory });
    }
    // if there are node specific settings, create a new instance and configure it
    if (data_path || hostname || index_path || services) {
      const node = new Node(this);
      await node.configure({
        data_path,
        hostname,
        index_path,
        services,
      });
    }
    // if there is a username / password, set it last
    if (username && password) {
      await this.credentials({ username, password });
    }
    // if there is a cluster name, set it
    if (cluster_name) {
      await this.clusterName(cluster_name);
    }
    // if there are nodes to add
    if (nodes) {
      await this.addNodes(nodes, rebalance);
    }
    return this;
  }

  ///# @name credentials
  ///# @description Sets the Administrator Username and Password for the Cluster
  ///# @arg {string} hostname [''] - the hostname of the node (must be set before joining the cluster)
  ///# @reference https://developer.couchbase.com/documentation/server/5.0/rest-api/rest-node-provisioning.html
  ///# @async
  credentials({
    password = this.password,
    username = this.username,
  } = {}) {
    debug('credentials');
    debug(`  username: ${username}`);
    debug(`  password: ${password}`);
    // save the username and password on the instance
    this.username = username;
    this.password = password;
    return this.post('/settings/web', {
      username,
      password,
      port: 'SAME',
    });
  }

  ///# @name kvMemory
  ///# @description Sets the Memory Quota
  ///# @arg {number} quota [100] - The amount of memory for the kv / data service
  ///# @reference https://developer.couchbase.com/documentation/server/5.0/rest-api/rest-node-memory-quota.html
  ///# @async
  kvMemory(quota = 100) {
    // minimum of 100
    return this.setMemory({
      kv_memory: quota,
    });
  }

  ///# @name indexMemory
  ///# @description Sets the Index Memory Quota
  ///# @arg {number} quota [256] - The amount of memory for the index service
  ///# @reference https://developer.couchbase.com/documentation/server/5.0/rest-api/rest-node-memory-quota.html
  ///# @async
  indexMemory(quota = 256) {
    // minimum of 256
    return this.memory({
      index_memory: quota,
    });
  }

  ///# @name ftsMemory
  ///# @description Sets the Index Memory Quote
  ///# @arg {number} quota [256] - The amount of memory for the fts service
  ///# @reference https://developer.couchbase.com/documentation/server/5.0/rest-api/rest-node-memory-quota.html
  ///# @async
  ftsMemory(quota = 256) {
    // minimum of 256
    return this.memory({
      fts_memory: quota,
    });
  }

  ///# @name setMemory
  ///# @description Sets the Memory Quotas
  ///# @arg {object}
  ///# ```js
  ///# {
  ///#   kv_memory: 100, // The amount of memory for the kv / data service
  ///#   index_memory: 256, // The amount of memory for the index service
  ///#   fts_memory: 256, // The amount of memory for the fts service
  ///# }
  ///# ```
  ///# @reference https://developer.couchbase.com/documentation/server/5.0/rest-api/rest-node-memory-quota.html
  ///# @async
  memory({
    kv_memory = 100,
    index_memory = 256,
    fts_memory = 256,
  } = {}) {
    debug('memory');
    debug(`  kv_memory: ${kv_memory}`);
    debug(`  index_memory: ${index_memory}`);
    debug(`  fts_memory: ${fts_memory}`);
    return this.post('/pools/default', {
      memoryQuota: kv_memory,
      indexMemoryQuota: index_memory,
      ftsMemoryQuota: fts_memory,
    });
  }

  ///# @name clusterName
  ///# @description Sets the cluster name
  ///# @arg {string} hostname [''] - the hostname of the node (must be set before joining the cluster)
  ///# @reference https://developer.couchbase.com/documentation/server/5.0/rest-api/rest-node-provisioning.html
  ///# @async
  clusterName(cluster_name) {
    debug('clusterName');
    debug(`  name: ${name}`);
    return this.post('/pools/default', {
      clusterName: cluster_name,
    });
  }

  ///# @name info
  ///# @description Gets information about the cluster
  ///# @reference https://developer.couchbase.com/documentation/server/5.0/rest-api/rest-cluster-get.html
  ///# @async
  info() {
    debug('info');
    return this.get('/pools');
  }

  ///# @name details
  ///# @description Gets the details about the cluster
  ///# @reference https://developer.couchbase.com/documentation/server/5.0/rest-api/rest-cluster-get.html
  ///# @async
  details(pool = 'default') {
    debug('details');
    return this.get(`/pools/${pool}`);
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
    options = {
      node_port: 8091,
      node_protocol: 'http',
    },
  ) {
    debug('node');
    // if options is defined and node_host is an object
    if (isObject(node_host)) {
      options = cloneDeep(node_host);
      node_host = this.cluster_host;
    }
    options = extend(
      pick(this, [ 'password', 'username' ]),
      { options },
      { node_host },
    );
    debug(`  node_host: ${options.node_host}`);
    debug(`  node_port: ${options.node_port}`);
    debug(`  node_protocol: ${options.node_protocol}`);
    // try to get it from the map first
    let node = nodes_map[JSON.stringify(options)];
    // if it doesn't exist set it and save it in the map
    if (!node) {
      node = new Node(options);
      node.cluster = this;
      nodes_map[JSON.stringify(options)] = node;
    }
    return node;
  }

  ///# @name addNodes
  ///# @description Adds a node to a cluster
  ///# @arg {array} nodes [] - An array of nodes to add to the cluster
  ///# @arg {boolean} rebalance [true] - Whether or not to rebalance automatically after all of the nodes have been added
  ///# @reference https://developer.couchbase.com/documentation/server/5.0/rest-api/rest-cluster-addnodes.html
  ///# @async
  async addNodes(nodes, rebalance = true) {
    debug('addNodes');
    nodes = await Promise.all(nodes);
    const add_nodes = [];
    for (const node of nodes) {
      // make sure the nodes cluster_protocol, cluster_host and cluster_port are not the same as the cluster instance
      // if it is skip it
      if (
        node.cluster_protocol === this.cluster_protocol &&
        node.cluster_host === this.cluster_host &&
        node.cluster_port === this.cluster_port
      ) {
        add_nodes.push(Promise.resolve(node));
      } else {
        // otherwise add the node to the cluster
        add_nodes.push(this.addNode(node));
      }
    }
    // wait for all adds to process
    await Promise.all(add_nodes);
    // should we rebalance now?
    if (rebalance) {
      await this.rebalance();
    }
    return nodes;
  }

  ///# @name addNode
  ///# @description Adds a node to a cluster
  ///# @arg {object}
  ///# ```js
  ///# {
  ///#   cluster_host: '', // the hostname or ip address of the node to add
  ///#   node_host: '', // the hostname or ip address of the node to add
  ///#   hostname: '', // the hostname or ip address of the node to add
  ///#   services: '', // a comma-delimited list of services to add, can be: kv, n1ql, index, fts
  ///# }
  ///# ```
  ///# @reference https://developer.couchbase.com/documentation/server/5.0/rest-api/rest-cluster-addnodes.html
  ///# @async
  addNode({ cluster_host, node_host, hostname, services } = {}) {
    debug('addNode');
    hostname = cluster_host || node_host || hostname;
    debug(`  hostname: ${hostname}`);
    debug(`  services: ${services}`);
    return this.post('/controller/addNode', {
      hostname,
      services,
      user: this.username,
      password: this.password,
    });
  }

  ///# @name ejectNode
  ///# @description Ejects a node from the cluster
  ///# @arg {string} hostname [] - The hostname to remove
  ///# @arg {string} node ['ns_1'] - The node to remove
  ///# @reference https://developer.couchbase.com/documentation/server/5.0/rest-api/rest-cluster-removenode.html
  ///# @async
  ejectNode(hostname, node = 'ns_1') {
    debug('ejectNode');
    debug(`  hostname: ${hostname}`);
    debug(`  node: ${node}`);
    return this.post('/controller/ejectNode', {
      otpNode: `${node}@${hostname}`,
    })
      .catch((err) => {
        throw new Error(err.message);
      });
  }

  ///# @name bucket
  ///# @description Gets a new instance of the Bucket class
  ///# @arg {string} name [''] - the name of the bucket
  ///# @async
  bucket(name = '') {
    debug('bucket');
    debug(`  name: ${name}`);
    return new Bucket(extend(
      pick(this, [ 'cluster_host', 'cluster_port', 'cluster_protocol', 'password', 'username' ]),
      { name },
    ));
  }

  ///# @name rebalance
  ///# @description Gets a new instance of the Bucket class
  ///# @arg {string} name [''] - the name of the bucket
  ///# @reference https://developer.couchbase.com/documentation/server/5.0/rest-api/rest-cluster-rebalance.html
  ///# @async
  async rebalance({ knownNodes, ejectedNodes } = { knownNodes: [], ejectedNodes: [] }) {
    debug('rebalance');
    // if there is not a length we need to first retrieve all of the nodes
    if (!knownNodes.length) {
      knownNodes = await this.details()
        .then(({ nodes }) => {
          return nodes.reduce((previous, node) => {
            // if the node isn't found in the ejectedNodes added it to the known nodes
            if (!ejectedNodes.includes(node.otpNode)) {
              previous.push(node.otpNode);
            }
            return previous;
          }, []);
        });
    }
    debug(`  knownNodes: ${knownNodes.join(', ')}`);
    debug(`  ejectedNodes: ${ejectedNodes.join(', ')}`);
    return this.post('/controller/rebalance', {
      knownNodes: knownNodes.join(','),
    });
  }

  ///# @name addBuckets
  ///# @description Adds buckets to the cluster
  ///# @arg {array} buckets [] - An array of buckets to add to the cluster
  ///# @async
  async addBuckets(buckets) {
    debug('addBuckets');
    const add_buckets = [];
    for (const bucket of buckets) {
      add_buckets.push(this.addBucket(bucket));
    }
    // wait for all adds to process
    await Promise.all(add_buckets);
    return add_buckets;
  }

  ///# @name addBucket
  ///# @description Adds a bucket to the cluster
  ///# @arg {object}
  ///# ```js
  ///# {
  ///#   cluster_host: '', // the hostname or ip address of the node to add
  ///#   node_host: '', // the hostname or ip address of the node to add
  ///#   hostname: '', // the hostname or ip address of the node to add
  ///#   services: '', // a comma-delimited list of services to add, can be: kv, n1ql, index, fts
  ///# }
  ///# ```
  ///# @async
  async addBucket(name, options) {
    debug('addBucket');
    let bucket;
    if (name.constructor.name === 'Bucket') { // if a bucket instance was passed as the first argument
      bucket = name;
    } else if (isObject(name)) { // if name was passed as an object, break it apart
      options = pickBy(name, (value, key) => key !== 'name');
      bucket = new Bucket(extend(
        pick(this, [ 'cluster_host', 'cluster_port', 'cluster_protocol', 'password', 'username' ]),
        pick(name, [ 'name' ]),
      ));
    } else { // name is just a string
      bucket = new Bucket(extend(
        pick(this, [ 'cluster_host', 'cluster_port', 'cluster_protocol', 'password', 'username' ]),
        { name },
      ));
    }
    await bucket.create(options);
    return bucket;
  }

  ///# @name buckets
  ///# @description Gets information about all of the buckets in the cluster
  ///# @reference https://developer.couchbase.com/documentation/server/5.0/rest-api/rest-buckets-summary.html
  ///# @async
  buckets() {
    debug('buckets');
    return this.get('/pools/default/buckets');
  }

  ///# @name getInternalSettings
  ///# @description Retrieves Couchbase internal settings.
  ///# @reference https://developer.couchbase.com/documentation/server/5.0/rest-api/rest-get-internal-setting.html
  ///# @async
  getInternalSettings() {
    debug('internalSettings');
    return this.get('/internalSettings');
  }

  ///# @name setInternalSettings
  ///# @description Retrieves Couchbase internal settings.
  ///# @arg {object}
  ///# ```js
  ///# {
  ///#   indexAwareRebalanceDisabled: false,
  ///#   rebalanceIndexWaitingDisabled: false,
  ///#   rebalanceIndexPausingDisabled: false, // whether or not indexing should be paused during rebalance operations
  ///#   rebalanceIgnoreViewCompactions: false, // whether or not view compaction should be ignored during rebalance operations
  ///#   rebalanceMovesPerNode: 1, // the number of vBucket moves to migrate simultaneiously in parallel between different nodes
  ///#   rebalanceMovesBeforeCompaction: 64, // the number of moves before compaction happens during a rebalance operation
  ///#   maxParallelIndexers: 4, // the number of indexes to run in parallel
  ///#   maxParallelReplicaIndexers: 2, // the number of replica indexers to run in parallel
  ///#   maxBucketCount: 10, // the maximum # of allowed buckets in the cluster
  ///#   gotraceback: 'crash',
  ///#   indexAutoFailoverDisabled: true,
  ///#   certUseSha1: false,
  ///#   dropRequestMemoryThresholdMiB:, // value in MB for the maximum amount of memory that is used by Erlang VM. If the amount is exceeded, the server starts dropping incoming connections
  ///#   capiRequestLimit: 50, // maximum number of simultaneous connections each server node accepts on a CAPI port, this port is used for XDCR and views connections
  ///#   restRequestLimit: 50, // maximum number of simultaneous connections each server node accepts on a REST port
  ///# }
  ///# ```
  ///# @reference https://developer.couchbase.com/documentation/server/5.0/rest-api/rest-get-internal-setting.html
  ///# @async
  setInternalSettings({
    indexAwareRebalanceDisabled,
    rebalanceIndexWaitingDisabled,
    rebalanceIndexPausingDisabled,
    rebalanceIgnoreViewCompactions,
    rebalanceMovesPerNode,
    rebalanceMovesBeforeCompaction,
    maxParallelIndexers,
    maxParallelReplicaIndexers,
    maxBucketCount,
    gotraceback,
    indexAutoFailoverDisabled,
    certUseSha1,
    capiRequestLimit,
    restRequestLimit,
  }) {
    debug('internalSettings');
    return this.post('/internalSettings', {
      indexAwareRebalanceDisabled,
      rebalanceIndexWaitingDisabled,
      rebalanceIndexPausingDisabled,
      rebalanceIgnoreViewCompactions,
      rebalanceMovesPerNode,
      rebalanceMovesBeforeCompaction,
      maxParallelIndexers,
      maxParallelReplicaIndexers,
      maxBucketCount,
      gotraceback,
      indexAutoFailoverDisabled,
      certUseSha1,
      capiRequestLimit,
      restRequestLimit,
    });
  }

  ///# @name getReplicationSettings
  ///# @description Retrieves replication settings.
  ///# @reference https://developer.couchbase.com/documentation/server/5.0/rest-api/rest-get-internal-setting.html
  ///# @async
  getReplicationSettings() {
    debug('getReplicationSettings');
    return this.get('/settings/replications');
  }

  ///# @name setReplicationSettings
  ///# @description Retrieves Couchbase internal settings.
  ///# @arg {object}
  ///# ```js
  ///# {
  ///#   indexAwareRebalanceDisabled: false,
  ///#   rebalanceIndexWaitingDisabled: false,
  ///#   rebalanceIndexPausingDisabled: false, // whether or not indexing should be paused during rebalance operations
  ///#   rebalanceIgnoreViewCompactions: false, // whether or not view compaction should be ignored during rebalance operations
  ///#   rebalanceMovesPerNode: 1, // the number of vBucket moves to migrate simultaneiously in parallel between different nodes
  ///#   rebalanceMovesBeforeCompaction: 64, // the number of moves before compaction happens during a rebalance operation
  ///#   maxParallelIndexers: 4, // the number of indexes to run in parallel
  ///#   maxParallelReplicaIndexers: 2, // the number of replica indexers to run in parallel
  ///#   maxBucketCount: 10, // the maximum # of allowed buckets in the cluster
  ///#   gotraceback: 'crash',
  ///#   indexAutoFailoverDisabled: true,
  ///#   certUseSha1: false,
  ///#   dropRequestMemoryThresholdMiB:, // value in MB for the maximum amount of memory that is used by Erlang VM. If the amount is exceeded, the server starts dropping incoming connections
  ///#   capiRequestLimit: 50, // maximum number of simultaneous connections each server node accepts on a CAPI port, this port is used for XDCR and views connections
  ///#   restRequestLimit: 50, // maximum number of simultaneous connections each server node accepts on a REST port
  ///# }
  ///# ```
  ///# @reference https://developer.couchbase.com/documentation/server/5.0/rest-api/rest-get-internal-setting.html
  ///# @async
  setReplicationSettings({
    indexAwareRebalanceDisabled,
    rebalanceIndexWaitingDisabled,
    rebalanceIndexPausingDisabled,
    rebalanceIgnoreViewCompactions,
    rebalanceMovesPerNode,
    rebalanceMovesBeforeCompaction,
    maxParallelIndexers,
    maxParallelReplicaIndexers,
    maxBucketCount,
    gotraceback,
    indexAutoFailoverDisabled,
    certUseSha1,
    capiRequestLimit,
    restRequestLimit,
  }) {
    debug('internalSettings');
    return this.post('/internalSettings', {
      indexAwareRebalanceDisabled,
      rebalanceIndexWaitingDisabled,
      rebalanceIndexPausingDisabled,
      rebalanceIgnoreViewCompactions,
      rebalanceMovesPerNode,
      rebalanceMovesBeforeCompaction,
      maxParallelIndexers,
      maxParallelReplicaIndexers,
      maxBucketCount,
      gotraceback,
      indexAutoFailoverDisabled,
      certUseSha1,
      capiRequestLimit,
      restRequestLimit,
    });
  }

  ///# @name getAutoFailover
  ///# @description Retrieves the autoFailover settings
  ///# @reference https://developer.couchbase.com/documentation/server/5.0/rest-api/rest-cluster-autofailover-intro.html
  ///# @async
  getAutoFailover() {
    debug('getAutoFailover');
    return this.get('/settings/autoFailover');
  }

  ///# @name setAutoFailover
  ///# @description Sets the autoFailover configuration
  ///# @arg {object}
  ///# ```js
  ///# {
  ///#   enabled: false, // Whether or not autoFailover should be enabled
  ///#   timeout: 120, // The number of seconds before an auto failover should occur
  ///# }
  ///# @reference https://developer.couchbase.com/documentation/server/5.0/rest-api/rest-cluster-autofailover-intro.html
  ///# @async
  setAutoFailover({
    enabled = false,
    timeout = 120,
  }) {
    debug('setAutoFailover');
    debug(`  enabled: ${enabled}`);
    return this.post('/settings/autoFailover', {
      enabled,
      timeout,
    });
  }

  ///# @name resetAutoFailoverCount
  ///# @description Resets the autoFailover count
  ///# @arg {object}
  ///# ```js
  ///# {
  ///#   enabled: false, // Whether or not autoFailover should be enabled
  ///#   timeout: 120, // The number of seconds before an auto failover should occur
  ///# }
  ///# @reference https://developer.couchbase.com/documentation/server/5.0/rest-api/rest-cluster-autofailover-intro.html
  ///# @async
  resetAutoFailoverCount() {
    debug('resetAutoFailoverCount');
    return this.post('/settings/autoFailover/resetCount');
  }

  ///# @name getEmailSettings
  ///# @description Retrieves the email settings
  ///# @reference https://developer.couchbase.com/documentation/server/5.0/rest-api/rest-cluster-email-notifications.html
  ///# @async
  getEmailSettings() {
    debug('getEmailSettings');
    return this.get('/settings/alerts');
  }

  ///# @name setEmailSettings
  ///# @description Sets the email configuration
  ///# @arg {object}
  ///# ```js
  ///# {
  ///#   alerts: '', // A comma-delimited list of alerts, values can be: auto_failover_node,auto_failover_maximum_reached,
  ///#     auto_failover_other_nodes_down,auto_failover_cluster_too_small,auto_failover_disabled,ip,disk,overhead,
  ///#     ep_oom_errors,ep_item_commit_failed,audit_dropped_events,indexer_ram_max_usage,
  ///#     ep_clock_cas_drift_threshold_exceeded,communication_issue
  ///#   email_encrypt: false, // Whether or not to send emails securely
  ///#   email_host: '', // The hostname or ip address of the email server
  ///#   email_port: 25, // The email server port
  ///#   email_pass: '' // The email server password
  ///#   email_user: '', // The email server username
  ///#   enabled: false, // Whether or not email notifications should be enabled
  ///#   recipients: '', // A comma or space delimited list of email addresses to send the notifications to
  ///#   sender: '', // The email address the notifications should come from
  ///# }
  ///# @reference https://developer.couchbase.com/documentation/server/5.0/rest-api/rest-cluster-autofailover-intro.html
  ///# @async
  setEmailSettings({
    alerts = 'auto_failover_node,auto_failover_maximum_reached,auto_failover_other_nodes_down,auto_failover_cluster_too_small,auto_failover_disabled,ip,disk,overhead,ep_oom_errors,ep_item_commit_failed,audit_dropped_events,indexer_ram_max_usage,ep_clock_cas_drift_threshold_exceeded,communication_issue', // eslint-disable-line max-len
    email_encrypt = false,
    email_host = '',
    email_port = 25,
    email_pass = '',
    email_user = '',
    enabled = false,
    recipients = 'root@localhost',
    sender = 'couchbase@localhost',
  }) {
    debug('setEmailSettings');
    debug(`  alerts: ${alerts}`);
    debug(`  email_encrypt: ${email_encrypt}`);
    debug(`  email_host: ${email_host}`);
    debug(`  email_port: ${email_port}`);
    debug(`  email_pass: ${email_pass}`);
    debug(`  email_user: ${email_user}`);
    debug(`  enabled: ${enabled}`);
    debug(`  recipients: ${recipients}`);
    debug(`  sender: ${sender}`);
    return this.post('/settings/alerts', {
      alerts,
      emailEncrypt: email_encrypt,
      emailHost: email_host,
      emailPort: email_port,
      emailPass: email_pass,
      emailUser: email_user,
      enabled,
      recipients,
      sender,
    });
  }
}
