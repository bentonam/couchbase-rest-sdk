////
/// @author Aaron Benton
/// @page app/cluster
////
const debug = require('debug')('couchbase-rest-sdk:Bucket');
import Base from './base';
import {
  extend,
  pick,
  reduce,
} from 'lodash';

/// @name Bucket
/// @description Represents and Handles Bucket operations
/// @reference https://developer.couchbase.com/documentation/server/5.0/rest-api/rest-bucket-intro.html
/// @type {class}
export default class Bucket extends Base {
  ///# @name constructor
  ///# @arg {object}
  ///# ```js
  ///# {
  ///#   cluster: '', // the url to a node in the cluster
  ///#   username: '', // the cluster admin username
  ///#   password: '', // the cluster admin password
  ///#   name: '', // the name of a bucket
  ///# }
  ///# ```
  constructor({ name, ...options } = {}) {
    super(options);
    this.name = name;
  }

  ///# @name create
  ///# @description Creates a bucket in the cluster
  ///# @arg {object}
  ///# ```js
  ///# {
  ///#   abort_outside_allowed_time: false, // whether or not to allow compaction outside of the specfied compaction time or not
  ///#   allowed_time_period_start: '', // the allowed time period for compaction to start in HH:MM format
  ///#   allowed_time_period_stop: '', // the time period for compaction should stop in HH:MM format
  ///#   auth_type: null, // the auth type to use, can be: none, sasl
  ///#   auto_compaction_defined: false, // whether or not auto compaction override settings have been defined
  ///#   bucket_priority: 'high', // the bucket priority, can be default or high
  ///#   bucket_type: 'membase', // the bucket type, can be: membase, memcached, ephemeral
  ///#   conflict_resolution_type: 'seqno', // the conflict resolution to use, can be: seqno, timestamp
  ///#   database_fragmentation_percentage_threshold: null, // the fragmentation to use for database compaction
  ///#   database_fragmentation_size_threshold: null, // the database size in MB to use for database compaction
  ///#   document_replicas: 1, // the number of document replicas to use
  ///#   eviction_policy: 'valueOnly', // the eviction policy to use, can be: valueOnly, full
  ///#   flush_enabled: false, // whether or not the bucket can be flushed
  ///#   index_compaction_mode: 'circular', // the compaction mode to use for indexing, can be: circular or append
  ///#   index_replicas: 0, // the number of index replicas to use
  ///#   name: this.name, // the name of the bucket
  ///#   parallel_compaction: false, // whether or not database and view compaction can run in parallel
  ///#   ram_size: 100, // the size of the bucket in MB / node
  ///#   sasl_password: null, // the sasl password if authType = sasl
  ///#   threads_number: 3, // this is the bucket priority, default = 3, high = 8
  ///#   view_fragmentation_percentage_threshold: null, // the percentage threshold to use for view fragmentation
  ///#   view_fragmentation_size_threshold: null, // the view fragmentation threshold size in bytes
  ///# }
  ///# ```
  ///# @reference https://developer.couchbase.com/documentation/server/5.0/rest-api/rest-bucket-create.html
  ///# @async
  async create(options = {}) {
    debug('create');
    const params = this.normalizeParams(options);
    debug(`  name: ${params.name}`);
    debug(`  options: ${params}`);
    await this.post(`/pools/${this.pool}/buckets`, {
      form: params,
    });
    return this;
  }

  ///# @name validate
  ///# @description Validates bucket settings
  ///# @arg {object}
  ///# ```js
  ///# {
  ///#   abort_outside_allowed_time: false, // whether or not to allow compaction outside of the specfied compaction time or not
  ///#   allowed_time_period_start: '', // the allowed time period for compaction to start in HH:MM format
  ///#   allowed_time_period_stop: '', // the time period for compaction should stop in HH:MM format
  ///#   auth_type: null, // the auth type to use, can be: none, sasl
  ///#   auto_compaction_defined: false, // whether or not auto compaction override settings have been defined
  ///#   bucket_priority: 'high', // the bucket priority, can be default or high
  ///#   bucket_type: 'membase', // the bucket type, can be: membase, memcached, ephemeral
  ///#   conflict_resolution_type: 'seqno', // the conflict resolution to use, can be: seqno, timestamp
  ///#   database_fragmentation_percentage_threshold: null, // the fragmentation to use for database compaction
  ///#   database_fragmentation_size_threshold: null, // the database size in MB to use for database compaction
  ///#   document_replicas: 1, // the number of document replicas to use
  ///#   eviction_policy: 'valueOnly', // the eviction policy to use, can be: valueOnly, full
  ///#   flush_enabled: false, // whether or not the bucket can be flushed
  ///#   index_compaction_mode: 'circular', // the compaction mode to use for indexing, can be: circular or append
  ///#   index_replicas: 0, // the number of index replicas to use
  ///#   name: this.name, // the name of the bucket
  ///#   parallel_compaction: false, // whether or not database and view compaction can run in parallel
  ///#   ram_size: 100, // the size of the bucket in MB / node
  ///#   sasl_password: null, // the sasl password if authType = sasl
  ///#   threads_number: 3, // this is the bucket priority, default = 3, high = 8
  ///#   view_fragmentation_percentage_threshold: null, // the percentage threshold to use for view fragmentation
  ///#   view_fragmentation_size_threshold: null, // the view fragmentation threshold size in bytes
  ///# }
  ///# ```
  ///# @reference https://developer.couchbase.com/documentation/server/5.0/rest-api/rest-bucket-create.html
  ///# @async
  async validate(options = {}) {
    debug('validate');
    const params = this.normalizeParams(options);
    debug(`  name: ${params.name}`);
    debug(`  options: ${params}`);
    await this.post('/pools/default/buckets', {
      form: params,
      query: {
        ignore_warnings: 0,
        just_validate: 1,
      },
    });
    return true;
  }

  ///# @name normalizeParams
  ///# @description Normalizes parameters for bucket operations
  ///# @arg {object}
  ///# ```js
  ///# {
  ///#   abort_outside_allowed_time: false, // whether or not to allow compaction outside of the specfied compaction time or not
  ///#   allowed_time_period_start: '', // the allowed time period for compaction to start in HH:MM format
  ///#   allowed_time_period_stop: '', // the time period for compaction should stop in HH:MM format
  ///#   auth_type: null, // the auth type to use, can be: none, sasl
  ///#   auto_compaction_defined: false, // whether or not auto compaction override settings have been defined
  ///#   bucket_priority: 'high', // the bucket priority, can be default or high
  ///#   bucket_type: 'membase', // the bucket type, can be: membase, memcached, ephemeral
  ///#   conflict_resolution_type: 'seqno', // the conflict resolution to use, can be: seqno, timestamp
  ///#   database_fragmentation_percentage_threshold: null, // the fragmentation to use for database compaction
  ///#   database_fragmentation_size_threshold: null, // the database size in MB to use for database compaction
  ///#   document_replicas: 1, // the number of document replicas to use
  ///#   eviction_policy: 'valueOnly', // the eviction policy to use, can be: valueOnly, full
  ///#   flush_enabled: false, // whether or not the bucket can be flushed
  ///#   index_compaction_mode: 'circular', // the compaction mode to use for indexing, can be: circular or append
  ///#   index_replicas: 0, // the number of index replicas to use
  ///#   name: this.name, // the name of the bucket
  ///#   parallel_compaction: false, // whether or not database and view compaction can run in parallel
  ///#   ram_size: 100, // the size of the bucket in MB / node
  ///#   sasl_password: null, // the sasl password if authType = sasl
  ///#   threads_number: 3, // this is the bucket priority, default = 3, high = 8
  ///#   view_fragmentation_percentage_threshold: null, // the percentage threshold to use for view fragmentation
  ///#   view_fragmentation_size_threshold: null, // the view fragmentation threshold size in bytes
  ///# }
  ///# ```
  normalizeParams(options = {}) {
    const defaults = {
      abort_outside_allowed_time: false, // whether or not to allow compaction outside of the specfied compaction time or not
      allowed_time_period_start: '', // the allowed time period for compaction to start in HH:MM format
      allowed_time_period_stop: '', // the time period for compaction should stop in HH:MM format
      auth_type: null, // the auth type to use, can be: none, sasl
      auto_compaction_defined: false, // whether or not auto compaction override settings have been defined
      bucket_priority: 'high', // the bucket priority, can be default or high
      bucket_type: 'membase', // the bucket type, can be: membase, memcached, ephemeral
      conflict_resolution_type: 'seqno', // the conflict resolution to use, can be: seqno, timestamp
      database_fragmentation_percentage_threshold: null, // the fragmentation to use for database compaction
      database_fragmentation_size_threshold: null, // the database size in MB to use for database compaction
      document_replicas: 0, // the number of document replicas to use
      eviction_policy: 'valueOnly', // the eviction policy to use, can be: valueOnly, full
      flush_enabled: false, // whether or not the bucket can be flushed
      index_compaction_mode: 'circular', // the compaction mode to use for indexing, can be: circular or append
      index_replicas: 0, // the number of index replicas to use
      name: this.name, // the name of the bucket
      parallel_compaction: false, // whether or not database and view compaction can run in parallel
      ram_size: 100, // the size of the bucket in MB / node
      sasl_password: null, // the sasl password if authType = sasl
      threads_number: 3, // this is the bucket priority, default = 3, high = 8
      view_fragmentation_percentage_threshold: null, // the percentage threshold to use for view fragmentation
      view_fragmentation_size_threshold: null, // the view fragmentation threshold size in bytes
    };
    const key_map = {
      abort_outside_allowed_time: 'allowedTimePeriod[abortOutside]',
      auth_type: 'authType',
      conflict_resolution_type: 'conflictResolutionType',
      database_fragmentation_percentage_threshold: 'databaseFragmentationThreshold[percentage]',
      document_replicas: 'replicaNumber',
      eviction_policy: 'evictionPolicy',
      flush_enabled: 'flushEnabled',
      index_compaction_mode: 'indexCompactionMode',
      index_replicas: 'replicaIndex',
      parallel_compaction: 'parallelDBAndViewCompaction',
      ram_size: 'ramQuotaMB',
      name: 'name',
      sasl_password: 'saslPassword',
      threads_number: 'threadsNumber',
      view_fragmentation_percentage_threshold: 'viewFragmentationThreshold[percentage]',
    };
    // merge the options w/ the defaults, and map the necessary keys to the proper form values
    /* eslint-disable complexity */
    let params = reduce(extend({}, defaults, pick(options, Object.keys(defaults))), (result, value, key) => {
      if (value !== null) { // if there is a value
        switch (key) {
          case 'allowed_time_period_start':
            result['allowedTimePeriod[fromHour]'] = value.split(':')[0];
            result['allowedTimePeriod[fromMinute]'] = value.split(':')[1];
            break;
          case 'allowed_time_period_stop':
            result['allowedTimePeriod[toHour]'] = value.split(':')[0];
            result['allowedTimePeriod[toMinute]'] = value.split(':')[1];
            break;
          case 'bucket_type':
            result.bucketType = value === 'couchbase' ? 'membase' : value;
            break;
          case 'database_fragmentation_size_threshold':
            result['databaseFragmentationThreshold[size]'] = value * 1024 * 1024; // convert from MB to bytes
            break;
          case 'view_fragmentation_size_threshold':
            result['viewFragmentationThreshold[size]'] = value * 1024 * 1024; // convert from MB to bytes
            break;
          case 'bucket_priority':
            result.threadsNumber = value === 'high' ? 8 : 3;
            break;
          case 'flush_enabled':
            result.flushEnabled = value ? 1 : 0;
            break;
          default:
            if (key_map.hasOwnProperty(key)) {
              result[key_map[key]] = value;
            }
        }
      }
      return result;
    }, {});
    params.autoCompactionDefined = options.database_fragmentation_percentage_threshold ||
      options.database_fragmentation_size_threshold ||
      options.view_fragmentation_percentage_threshold ||
      options.view_fragmentation_size_threshold ? true : false; // eslint-disable-line no-unneeded-ternary
    // filter out keys not supported by ephemeral buckets
    if (options.bucket_type === 'ephemeral') {
      params = reduce(params, (previous, value, key) => {
        if (![ 'autoCompactionDefined', 'replicaIndex' ].includes(key)) {
          previous[key] = value;
        }
        return previous;
      }, {});
    }
    return params;
  }
}
