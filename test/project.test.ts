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

    describe("Events Cache", function () {

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

        it("Should get events that are cached and return the corresponding intervals.", async function () {

            const events = [
                {blockNumber: 16, transactionIndex: 1, logIndex: 1},
                {blockNumber: 16, transactionIndex: 1, logIndex: 2},
            ]

            await this.hre.eventsCache.save({address: ethers.constants.AddressZero, topics: [ ]}, 10, 20, events)

            const result = await this.hre.eventsCache.query({address: ethers.constants.AddressZero, topics: [ ]}, 15, 25)

            assert.notStrictEqual(result, {
                events,
                intervals: {
                    cached: [{from: 15, to: 20}],
                    nonCached: [{from: 21, to: 25}]
                }
            })

        });

    });

});
