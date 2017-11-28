////
/// @author Aaron Benton
/// @page app/cluster
////
const debug = require('debug')('couchbase-rest-sdk:Bucket');
import Base from './base';
import {
  concat,
  extend,
  findIndex,
  isString,
  reduce,
  pick,
} from 'lodash';

/// @name Bucket
/// @description Represents and Handles Server Group operations
/// @reference https://developer.couchbase.com/documentation/server/5.0/rest-api/rest-rza.html
/// @type {class}
export default class ServerGroup extends Base {
  ///# @name constructor
  ///# @arg {object}
  ///# ```js
  ///# {
  ///#   cluster_host: 'localhost', // the hostname / ip address of a node in the cluster
  ///#   cluster_port: 8091, // the port to use, defaults to 8091
  ///#   cluster_protocol: 'http', // the http protocol to use, defaults to http
  ///#   name: '', // the name of the server group
  ///#   password: '', // the cluster admin password
  ///#   username: '', // the cluster admin username
  ///# }
  ///# ```
  constructor({ name, ...options } = {}) {
    super(options);
    this.name = name;
  }

  ///# @name groups
  ///# @description Gets all of the available groups
  ///# @reference https://developer.couchbase.com/documentation/server/5.0/rest-api/rest-servergroup-get.html
  ///# @async
  groups() {
    debug('groups');
    return this.get(`/pools/${this.pool}/serverGroups`);
  }

  ///# @name groups
  ///# @description Creates a bucket in the cluster
  ///# @arg {string} name [''] - The name of the server group to create
  ///# @reference https://developer.couchbase.com/documentation/server/5.0/rest-api/rest-servergroup-post-create.html
  ///# @async
  async create(name = this.name) {
    debug('create');
    debug(`  name: ${name}`);
    await this.post(`/pools/${this.pool}/serverGroups`, {
      form: { name },
    });
    return this.details(name);
  }

  ///# @name details
  ///# @description Retrieves the uuid of a server group by the server group name
  ///# @arg {string} name [''] - The name of the server group to create
  ///# @reference https://developer.couchbase.com/documentation/server/5.0/rest-api/rest-servergroup-post-create.html
  ///# @async
  async details(name = this.name) {
    debug('details');
    debug(`  name: ${name}`);
    const results = await this.get(`/pools/${this.pool}/serverGroups`)
      .then(({ groups = [], uri: rev }) => {
        return groups.reduce((previous, current) => {
          if (current.name === name) {
            previous = current;
            previous.uuid = previous.uri.replace(/^\/([A-Za-z]+\/)+/, '');
            previous.rev = rev.replace(`/pools/${this.pool}/serverGroups?rev=`, '');
          }
          return previous;
        }, {});
      });
    return results;
  }

  ///# @name rename
  ///# @description Renames a server group by the server group name or uuid
  ///# @arg {string} new_name [''] - The name of the server group to rename
  ///# @arg {string} old_name [''] - The name of the server group to rename
  ///# @arg {string} uuid [''] - The uuid of the server group to rename
  ///# @reference https://developer.couchbase.com/documentation/server/5.0/rest-api/rest-servergroup-put.html
  ///# @async
  async rename(new_name = '', old_name = this.name, uuid = '') {
    debug('rename');
    debug(`  new_name: ${new_name}`);
    debug(`  old_name: ${old_name}`);
    if (!uuid) { // get the uuid by name if its not set
      uuid = await this.details(old_name).then(({ uuid: id }) => id);
    }
    debug(`  uuid: ${uuid}`);
    await this.put(`/pools/${this.pool}/serverGroups/${uuid}`, {
      form: {
        name: new_name,
      },
    });
    return this;
  }

  ///# @name remove
  ///# @description Removes a server group by the server group name or uuid
  ///# @arg {string} name [''] - The name of the server group to remove
  ///# @arg {string} uuid [''] - The uuid of the server group to remove
  ///# @reference https://developer.couchbase.com/documentation/server/5.0/rest-api/rest-servergroup-delete.html
  ///# @async
  async remove(name = this.name, uuid = '') {
    debug('remove');
    debug(`  name: ${name}`);
    if (!uuid) { // get the uuid by name if its not set
      uuid = await this.details(name).then(({ uuid: id }) => id);
    }
    debug(`  uuid: ${uuid}`);
    await this.delete(`/pools/${this.pool}/serverGroups/${uuid}`);
    return this;
  }

  ///# @name group
  ///# @description Adds one or more nodes to a server group
  ///# @arg {string|array} nodes [''] - A string or an array of hostnames, ip addresses or Node instances to add to the group
  ///# @arg {string} name [''] - The name of the server group to add the nodes to
  ///# @reference https://developer.couchbase.com/documentation/server/5.0/rest-api/rest-servergroup-put-membership.html
  ///# @async
  async addMembers(nodes = [], name = this.name) {
    debug('group');
    debug(`  nodes: ${nodes}`);
    debug(`  name: ${name}`);
    // if nodes is a string, convert it to an array
    if (isString(nodes)) {
      nodes = nodes.split(',');
    }
    // ensure that that each value in the nodes array is just a string for the host / ip
    nodes = nodes.map((item) => {
      if (isString(item)) {
        return item;
      }
      return reduce(pick(item, [ 'hostname', 'node_host', 'ip', 'ip_address' ]), (previous, value) => {
        if (!previous && value) {
          previous = value;
        }
        return previous;
      }, '');
    });
    // get all of the groups so we can build something to post back
    const server_groups = await this.groups()
      .then(({ groups, uri }) => {
        return {
          rev: uri.replace(`/pools/${this.pool}/serverGroups?rev=`, ''),
          groups: groups.map((group) => {
            // filter out any of the nodes to add from the given groups
            group.nodes = group.nodes.reduce((previous, { hostname, otpNode }) => {
              // strip the ports
              hostname = hostname.replace(/:[0-9]+$/, '');
              // if the array of nodes to add to the group does not contain the hostname keep it in place
              if (!nodes.includes(hostname)) {
                previous.push({ otpNode });
              }
              return previous;
            }, []);
            return group;
          }),
        };
      });
    // get the group index that we need to add the nodes to
    const index = findIndex(server_groups.groups, { name });
    // add all of the nodes onto the correct group
    server_groups.groups[index].nodes = concat(
      server_groups.groups[index].nodes,
      nodes.map((item) => {
        return { otpNode: `ns_1@${item}` };
      }),
    );
    await this.put(
      `/pools/${this.pool}/serverGroups`,
      {
        body: { groups: server_groups.groups },
        query: { rev: server_groups.rev },
      },
    );
    return this;
  }

  ///# @name addNodes
  ///# @description Adds multiple nodes to a cluster in a server group and optionally rebalances
  ///# @arg {array} nodes [] - An array of nodes to add to the cluster
  ///# @arg {boolean} rebalance [true] - Whether or not to rebalance automatically after all of the nodes have been added
  ///# @reference https://developer.couchbase.com/documentation/server/5.0/rest-api/rest-servergroup-post-add.html
  ///# @async
  async addNodes({ name = this.name, uuid, nodes, rebalance = true } = {}) {
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
        add_nodes.push(this.addNode(
          extend(
            pick(node, [ 'hostname', 'cluster_host', 'node_host', 'services' ]),
            { name, uuid },
          ),
        ));
      }
    }
    // wait for all adds to process
    await Promise.all(add_nodes);
    // should we rebalance now?
    if (rebalance && this.cluster) {
      await this.cluster.rebalance();
    }
    return nodes;
  }

  ///# @name addNode
  ///# @description Adds a node to a cluster in a given server group
  ///# @arg {object}
  ///# ```js
  ///# {
  ///#   cluster_host: '', // the hostname or ip address of the node to add
  ///#   node_host: '', // the hostname or ip address of the node to add
  ///#   hostname: '', // the hostname or ip address of the node to add
  ///#   services: '', // a comma-delimited list of services to add, can be: kv, n1ql, index, fts
  ///# }
  ///# ```
  ///# @reference https://developer.couchbase.com/documentation/server/5.0/rest-api/rest-servergroup-post-add.html
  ///# @async
  async addNode({ name = this.name, uuid, cluster_host, node_host, hostname, services } = {}) {
    debug('addNode');
    hostname = node_host || hostname || cluster_host;
    if (!uuid) { // get the uuid by name if its not set
      uuid = await this.details(name).then(({ uuid: id }) => id);
    }
    debug(`  name: ${name}`);
    debug(`  hostname: ${hostname}`);
    debug(`  services: ${services}`);
    return this.post(`/pools/${this.pool}/serverGroups/${uuid}/addNode`, {
      form: {
        hostname,
        services,
        user: this.username,
        password: this.password,
      },
    });
  }
}
