# Javascript SDK for FeatureGuards (Node + Browser)

The official [FeatureGuards][featureguards] Javascript client library.

# NodeJS

[![Version](https://img.shields.io/npm/v/featureguards-node)](https://www.npmjs.org/package/featureguards-node)

[![Downloads](https://img.shields.io/npm/dm/featureguards-node)](https://www.npmjs.com/package/featureguards-node)

The FeatureGuards Node library provides convenient access to the FeatureGuards API from applications
written in server-side JavaScript.

For using FeatureGuards in the browser, use [featureguards-web][featureguards-web].

## Requirements

Node 8, 10 or higher.

## Installation

Install the package with:

```sh
npm install featureguards-node --save
# or
yarn add featureguards-node
```

## Usage

The package needs to be configured with your API key, which is available in the [Featureguards
Dashboard][api-keys]. Require it with the key's value:

### Usage with modules and `async`/`await`:

```js
import featureguards from 'featureguards-node';
const featureGuards = await featureguards({
  apiKey: 'MY API KEY'
})(async () => {
  const isOn = await featureguards.isOn('MY_FEATURE_GUARD');
  console.log(isOn);
})();
```

### Usage with Promises

Every method returns a chainable promise which can be used instead of a regular callback:

```js
// Check a feature flag is on or not:
featureGuards.isOn('MY_FEATURE')
  .then((isOn) => {
    // Deal with whether the feature is on or off.
    })
    .catch((err) => {
    // Deal with an error
    });
  });
```

### Usage with TypeScript

Import featureguards as a default import passing it the API key and use it.

```ts
import featureguards from 'featureguards-node';

const featureGuards = await featureguards({
  apiKey: 'MY API KEY'
});
const isOn = await featureguards.isOn('MY_FEATURE_GUARD');
console.log(isOn);
```

You can find a full TS server example in
[featureguards-js](https://github.com/featureguards/featureguards-js/tree/main/examples/node/src/index.ts).

### Configuring default values

FeatureGuards does no I/O for `isOn` because it keeps a fresh copy for all features defined in the
dashboard. In the event the initial fetch doesn't succeed, the library can use default values passed
by the caller. This is useful for features that have graduated and no longer need to be guarded by a
feature flag, but may want to keep an emergency toggle to turn off the feature in case something bad
happens, hence not removing them completely from FeatureGuards. This concept is referred to as 'kill
switch'. Here is an example of how to do so.

_Javascript_

```js
import featureguards from 'featureguards-web';
const featureGuards = await featureguards({
  apiKey: 'MY API KEY',
  defaults: {
    MY_FEATURE_GUARD: true
  }
})(async () => {
  const isOn = await featureguards.isOn('MY_FEATURE_GUARD');
  console.log(isOn);
})();
```

_Typescript_

```ts
import featureguards from 'featureguards-web';
const featureGuards = await featureguards({
  apiKey: 'MY API KEY',
  defaults: {
    MY_FEATURE_GUARD: true
  }
})(async () => {
  const isOn = await featureguards.isOn('MY_FEATURE_GUARD');
  console.log(isOn);
})();
```

# Browser

[![Version](https://img.shields.io/npm/v/featureguards-web)](https://www.npmjs.org/package/featureguards-web)

[![Downloads](https://img.shields.io/npm/dm/featureguards-web)](https://www.npmjs.com/package/featureguards-web)

The FeatureGuards Javascript library provides convenient access to the FeatureGuards API from
applications running in the browser with Typescript/JavaScript.

For using FeatureGuards in NodeJS, use [featureguards-node][featureguards-node].

## Installation

Install the package with:

```sh
npm install featureguards-web --save
# or
yarn add featureguards-web
```

## Usage

Since this library runs in the browser and we want to limit the APIs to expose browser related
feature toggles only. Therefore, you need to use the API key used for the browser for
authentication. _NEVER_ use server-side API keys since they can be used to retrieve feature toggles
used on the server.

### Usage with ES modules and `async`/`await`:

```js
import featureguards from 'featureguards-web';

const featureGuards = await featureguards({
  apiKey: 'MY_API_KEY'
});

const isOn = await featureguards.isOn('MY_FEATURE_GUARD');
console.log(isOn);
```

### Usage with Promises

Every method returns a chainable promise which can be used instead of a regular callback:

```js
// Check a feature flag is on or not:
featureGuards.isOn('MY_FEATURE')
  .then((isOn) => {
    // Deal with whether the feature is on or off.
    })
    .catch((err) => {
    // Deal with an error
    });
  });
```

### Usage with TypeScript

FeatureGuards maintains types for the latest [API version][node-api-versions].

```ts
import featureguards from 'featureguards-web;
const featureGuards = await featureguards({
  apiKey: 'MY_API_KEY'
})
```

You can find a full TS server example in
[featureguards-js-samples](https://github.com/featureguards/featureguards-js/tree/main/examples/web/src/index.ts).

### Configuring default values

FeatureGuards does no I/O for `isOn` because it keeps a fresh copy for all features defined in the
dashboard. In the event the initial fetch doesn't succeed, the library can use default values passed
by the caller. This is useful for features that have graduated and no longer need to be guarded by a
feature flag, but may want to keep an emergency toggle to turn off the feature in case something bad
happens, hence not removing them completely from FeatureGuards. This concept is referred to as 'kill
switch'. Here is an example of how to do so.

_Javascript_

```js
import featureguards from 'featureguards-web';
const featureGuards = await featureguards({
  apiKey: 'MY API KEY',
  defaults: {
    MY_FEATURE_GUARD: true
  }
})(async () => {
  const isOn = await featureguards.isOn('MY_FEATURE_GUARD');
  console.log(isOn);
})();
```

_Typescript_

```ts
import featureguards from 'featureguards-web';
const featureGuards = await featureguards({
  apiKey: 'MY API KEY',
  defaults: {
    MY_FEATURE_GUARD: true
  }
});
const isOn = await featureguards.isOn('MY_FEATURE_GUARD');
console.log(isOn);
```

# Development

Run all tests:

```bash
$ yarn install
$ yarn test
```

If you do not have `yarn` installed, you can get it with `npm install --global yarn`.

Run prettier:

Add an [editor integration](https://prettier.io/docs/en/editors.html) or:

```bash
$ yarn fix
```

[api-keys]: https://app.featureguards.com/project/settings
[featureguards-js]: https://docs.featureguards.com/js
[featureguards]: https://www.featureguards.com
