# hardhat-events-cache

This plug-in it is used to add an events cache to hardhat.

[Hardhat](https://hardhat.org) events cache plugin. 

## What

This plugin will help you with:
- If you query events and you want to cache this results.

## Installation

```bash
npm install @sebasgoldberg/hardhat-events-cache
```

Import the plugin in your `hardhat.config.js`:

```js
require("@sebasgoldberg/hardhat-events-cache");
```

Or if you are using TypeScript, in your `hardhat.config.ts`:

```ts
import "@sebasgoldberg/hardhat-events-cache";
```

## Environment extensions

This plugin extends the Hardhat Runtime Environment by adding an `eventsCache` field.

This `eventsCache` field has a `query` and `save` methods.

`query` it is used to query the cached events.

`save` it is used to save events to cache.

## Configuration

This plugin does not define own configuration, but uses [@sebasgoldberg/hardhat-mongodb](https://github.com/sebasgoldberg/hardhat-mongodb) plugin to obtain a mongodb db instance.

