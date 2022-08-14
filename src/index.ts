import "@sebasgoldberg/hardhat-mongodb"

import { extendConfig, extendEnvironment } from "hardhat/config";
import { lazyObject } from "hardhat/plugins";
import { HardhatConfig, HardhatUserConfig } from "hardhat/types";

// This import is needed to let the TypeScript compiler know that it should include your type
// extensions in your npm package's types file.
import "./type-extensions";
import { EventsCache } from "./EventsCache";
// import { Aave } from "./aave";

extendEnvironment((hre) => {
  // We add a field to the Hardhat Runtime Environment here.
  // We use lazyObject to avoid initializing things until they are actually
  // needed.
  hre.eventsCache = lazyObject(() => {
    return new EventsCache(hre)
  });
});

