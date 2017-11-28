# Couchbase REST SDK

Promised based Couchbase SDK for the Couchbase Server REST API


## Classes 

1. [RestApi](#RestApi)
2. [Cluster](#Cluster)
3. [Node](#Node)
4. [Bucket](#Bucket)
5. [ServerGroups](#ServerGroups)

While each class an operate independently, it is recommended to start with the `RestApi` class.  

## Examples 

Configuring a single node cluster, with all services and no buckets.  

```js
import RestApi from './index';

const api = new RestApi({
  username: 'Administrator',
  password: 'password',
});

const cluster = api.cluster('172.31.0.2');

cluster
  .initialize({
    index_path: '/opt/couchbase/var/lib/couchbase/indexes',
    services: 'kv,n1ql,index,fts',
    kv_memory: 300,
    index_memory: 256,
    fts_memory: 256,
  })
    .then(() => { 
      console.log('finished')
    })
    .catch((err) => console.log(err));
```

Adding buckets to a cluster, with the default options.  

```js
cluster.addBuckets([
  'bucket1',
  'bucket2',
  'bucket3'
]);
```

Adding buckets to a cluster with customized options

```js
cluster.addBuckets([
  {
    bucket_priority: 'high',
    bucket_type: 'ephemeral',
    conflict_resolution_type: 'seqno',
    eviction_policy: 'nruEviction',
    flush_enabled: true,
    name: 'bucket1',
    ram_size: 100,
  }
]);
```

Add 2 additional nodes to the cluster, and rebalance automatically after they have been added. 

```js
cluster.addNodes({
  nodes: [
    api.node('172.31.0.3', {
      index_path: '/opt/couchbase/var/lib/couchbase/indexes',
      services: 'data'
    }),
    api.node('172.31.0.4', {
      index_path: '/opt/couchbase/var/lib/couchbase/indexes',
      services: 'data'
    })
  ],
  rebalance: true
});
```

Join an individual node to the cluster

```js
const node = cluster.node('172.31.0.4');
node
  .configure({
    index_path: '/opt/couchbase/var/lib/couchbase/indexes',
    services: 'data'
  })
  .then(() => node.join(cluster))
  .then(() => cluster.rebalance())
```
  
All of these examples can be done via the `initialize()` method as well.

```js
cluster.initialize({ // initialize the first node in the cluster
  buckets: [
    {
      bucket_priority: 'high',
      bucket_type: 'ephemeral',
      conflict_resolution_type: 'seqno',
      eviction_policy: 'nruEviction',
      flush_enabled: true,
      name: 'bucket1',
      ram_size: 100,
    },
    "bucket2",
    "bucket3",
  ],
  index_path: '/opt/couchbase/var/lib/couchbase/indexes',
  services: 'kv,n1ql,index,fts',
  kv_memory: 300,
  index_memory: 256,
  fts_memory: 256,
  nodes: [
    // api.node() will call configure and perform all calls async prior to joining the cluster
    api.node('172.31.0.3', { 
      index_path: '/opt/couchbase/var/lib/couchbase/indexes',
      services: 'data'
    }),
    api.node('172.31.0.4', {
      index_path: '/opt/couchbase/var/lib/couchbase/indexes',
      services: 'data'
    }),
  ]
})
  .then(() => console.log('finished'));
```

