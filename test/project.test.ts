// tslint:disable-next-line no-implicit-dependencies
import { assert } from "chai";
import { ethers } from "ethers";
import { HardhatPluginError } from "hardhat/plugins";
import path from "path";
import { EventsCache, IEvent } from "../src/EventsCache";


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

        it("Should not save events that do not aaply for the specified interval.", async function () {

            const events = [
                {blockNumber: 1, transactionIndex: 1, logIndex: 1},
                {blockNumber: 16, transactionIndex: 1, logIndex: 2},
            ]

            try {
                await this.hre.eventsCache.save({address: ethers.constants.AddressZero, topics: [ ]}, 10, 20, events)
                assert.fail('HardhatPluginError not thrown during save')
            } catch (error) {
                const e = error as HardhatPluginError
                assert.equal(e.pluginName, 'hardhat-events-cache')
                assert.equal(e.message, 'Block number 1 is outside the specified range [10, 20]')
            }
            
            const result = await this.hre.eventsCache.query({address: ethers.constants.AddressZero, topics: [ ]}, 10, 20)

            assert.deepEqual(result, {
                events: [],
                intervals: {
                    cached: [],
                    nonCached: [{from: 10, to: 20}]
                }
            })

        });

        it("Should not get events that do not correspond to the requested interval.", async function () {

            const events = [
                {blockNumber: 11, transactionIndex: 1, logIndex: 1},
                {blockNumber: 17, transactionIndex: 2, logIndex: 2},
            ]

            await this.hre.eventsCache.save({address: ethers.constants.AddressZero, topics: [ ]}, 10, 20, events)

            const result = await this.hre.eventsCache.query({address: ethers.constants.AddressZero, topics: [ ]}, 15, 25)

            assert.notStrictEqual(result, {
                events: [
                    {blockNumber: 17, transactionIndex: 2, logIndex: 2}
                ],
                intervals: {
                    cached: [{from: 15, to: 20}],
                    nonCached: [{from: 21, to: 25}]
                }
            })

        });

        it("Should get events from different intervals.", async function () {

            const events10to20 = [
                {blockNumber: 11, transactionIndex: 1, logIndex: 1},
                {blockNumber: 17, transactionIndex: 2, logIndex: 2},
            ]

            const events30to40 = [
                {blockNumber: 32, transactionIndex: 5, logIndex: 3},
                {blockNumber: 37, transactionIndex: 7, logIndex: 2},
            ]

            await this.hre.eventsCache.save({address: ethers.constants.AddressZero, topics: [ ]}, 10, 20, events10to20)

            await this.hre.eventsCache.save({address: ethers.constants.AddressZero, topics: [ ]}, 30, 40, events30to40)

            const result = await this.hre.eventsCache.query({address: ethers.constants.AddressZero, topics: [ ]}, 15, 35)

            assert.notStrictEqual(result, {
                events: [
                    {blockNumber: 17, transactionIndex: 2, logIndex: 2},
                    {blockNumber: 32, transactionIndex: 5, logIndex: 3},
                ],
                intervals: {
                    cached: [{from: 15, to: 20}, {from: 30, to: 35}],
                    nonCached: [{from: 21, to: 29}]
                }
            })

        });

        it("Should get events from different intervals when non cached interval is the last one.", async function () {

            const events10to20 = [
                {blockNumber: 11, transactionIndex: 1, logIndex: 1},
                {blockNumber: 17, transactionIndex: 2, logIndex: 2},
            ]

            const events30to40 = [
                {blockNumber: 32, transactionIndex: 5, logIndex: 3},
                {blockNumber: 37, transactionIndex: 7, logIndex: 2},
            ]

            await this.hre.eventsCache.save({address: ethers.constants.AddressZero, topics: [ ]}, 10, 20, events10to20)

            await this.hre.eventsCache.save({address: ethers.constants.AddressZero, topics: [ ]}, 30, 40, events30to40)

            const result = await this.hre.eventsCache.query({address: ethers.constants.AddressZero, topics: [ ]}, 15, 50)

            assert.notStrictEqual(result, {
                events: [
                    {blockNumber: 17, transactionIndex: 2, logIndex: 2},
                    ...events30to40
                ],
                intervals: {
                    cached: [{from: 15, to: 20}, {from: 30, to: 40}],
                    nonCached: [{from: 21, to: 29}, {from: 41, to: 50}]
                }
            })

        });

        it("Should get events from different intervals when non cached interval is the first one.", async function () {

            const events10to20 = [
                {blockNumber: 11, transactionIndex: 1, logIndex: 1},
                {blockNumber: 17, transactionIndex: 2, logIndex: 2},
            ]

            const events30to40 = [
                {blockNumber: 32, transactionIndex: 5, logIndex: 3},
                {blockNumber: 37, transactionIndex: 7, logIndex: 2},
            ]

            await this.hre.eventsCache.save({address: ethers.constants.AddressZero, topics: [ ]}, 10, 20, events10to20)

            await this.hre.eventsCache.save({address: ethers.constants.AddressZero, topics: [ ]}, 30, 40, events30to40)

            const result = await this.hre.eventsCache.query({address: ethers.constants.AddressZero, topics: [ ]}, 5, 35)

            assert.notStrictEqual(result, {
                events: [
                    ...events10to20,
                    {blockNumber: 32, transactionIndex: 5, logIndex: 3},
                ],
                intervals: {
                    cached: [{from: 10, to: 20}, {from: 30, to: 35}],
                    nonCached: [{from: 5, to: 9}, {from: 21, to: 29}]
                }
            })

        });

        it("Should not get events from cached intervals that do not have events.", async function () {

            const events10to20: Array<IEvent> = [
            ]

            const events30to40 = [
                {blockNumber: 32, transactionIndex: 5, logIndex: 3},
                {blockNumber: 37, transactionIndex: 7, logIndex: 2},
            ]

            await this.hre.eventsCache.save({address: ethers.constants.AddressZero, topics: [ ]}, 10, 20, events10to20)

            await this.hre.eventsCache.save({address: ethers.constants.AddressZero, topics: [ ]}, 30, 40, events30to40)

            const result = await this.hre.eventsCache.query({address: ethers.constants.AddressZero, topics: [ ]}, 0, 28)

            assert.notStrictEqual(result, {
                events: [ ],
                intervals: {
                    cached: [{from: 10, to: 20}],
                    nonCached: [{from: 0, to: 9}, {from: 21, to: 28}]
                }
            })

        });

        it("Should not have cached information after clear.", async function () {

            const events10to20: Array<IEvent> = [
            ]

            const events30to40 = [
                {blockNumber: 32, transactionIndex: 5, logIndex: 3},
                {blockNumber: 37, transactionIndex: 7, logIndex: 2},
            ]

            await this.hre.eventsCache.save({address: ethers.constants.AddressZero, topics: [ ]}, 10, 20, events10to20)

            await this.hre.eventsCache.save({address: ethers.constants.AddressZero, topics: [ ]}, 30, 40, events30to40)

            await this.hre.eventsCache.clear()

            const result = await this.hre.eventsCache.query({address: ethers.constants.AddressZero, topics: [ ]}, 0, 40)

            assert.notStrictEqual(result, {
                events: [ ],
                intervals: {
                    cached: [],
                    nonCached: [{from: 0, to: 40}]
                }
            })

        });

        it("Should get events for the specified filter.", async function () {

            const filter1 = {address: ethers.constants.AddressZero, topics: [ ]}

            const filter2 = {address: '0x1', topics: [ '123' ]}

            const events1 = [
                {blockNumber: 32, transactionIndex: 5, logIndex: 3},
                {blockNumber: 37, transactionIndex: 7, logIndex: 2},
            ]

            const events2 = [
                {blockNumber: 36, transactionIndex: 4, logIndex: 4},
            ]

            await this.hre.eventsCache.save(filter1, 30, 40, events1)

            await this.hre.eventsCache.save(filter2, 31, 41, events2)

            const result1 = await this.hre.eventsCache.query(filter1, 25, 45)

            assert.notStrictEqual(result1, {
                events: events1,
                intervals: {
                    cached: [{from: 30, to: 40}],
                    nonCached: [{from: 25, to: 29}, {from: 41, to: 45}]
                }
            })

            const result2 = await this.hre.eventsCache.query(filter1, 25, 45)

            assert.notStrictEqual(result2, {
                events: events2,
                intervals: {
                    cached: [{from: 31, to: 41}],
                    nonCached: [{from: 25, to: 30}, {from: 42, to: 45}]
                }
            })

        });


    });

});
