// tslint:disable-next-line no-implicit-dependencies
import { assert } from "chai";
import { ethers } from "ethers";
import path from "path";
import { EventsCache } from "../src/EventsCache";


import { useEnvironment } from "./helpers";

describe("Integration tests examples", function () {
    describe("Hardhat Runtime Environment extension", function () {
        useEnvironment("hardhat-project");

        it("Should add the eventsCache field", function () {
            assert.instanceOf(
                this.hre.eventsCache,
                EventsCache
            );
        });

    });

    describe("HardhatConfig extension", function () {
        useEnvironment("hardhat-project");

        it("Should not get events, and return the queried interval as nonCached.", async function () {
            const result = await this.hre.eventsCache.query({address: ethers.constants.AddressZero, topics: [ ]}, 10, 20)
            assert.deepEqual(result, {
                events: [],
                intervals: {
                    cached: [],
                    nonCached: [{from: 10, to: 20}]
                }
            })
        });
    });

});
