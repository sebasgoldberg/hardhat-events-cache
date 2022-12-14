import { HardhatRuntimeEnvironment } from "hardhat/types";
import { HardhatPluginError } from 'hardhat/plugins';
import { Collection, Db } from "mongodb";
import { EventFilter, Event } from "ethers"

export interface IEvent {
    blockNumber: number,
    transactionIndex: number;
    logIndex: number;
}

interface IBlocknumberInterval {
    from: number,
    to: number
}

interface IQueryIntervals {
    cached: IBlocknumberInterval[],
    nonCached: IBlocknumberInterval[],
}

interface IQueryResult {
    events: Array<IEvent>,
    intervals: IQueryIntervals
}

export const COLLECTION_PREFIX = 'hardhat-events-cache-plugin:'

export class EventsCache{

    constructor(protected hre: HardhatRuntimeEnvironment){

    }

    protected async getDb(){
        return this.hre.mongodb.getDb()
    }

    protected getNetworkName(){
        return this.hre.network.name
    }

    protected getEventCollectionName(eventFilter: EventFilter): string{
        return `${COLLECTION_PREFIX}${this.getNetworkName()}:${eventFilter.address}:${eventFilter.topics?.flat().join('.')}`
    }

    /**
     * Retuns the block intervals for the saved events.
     */
     protected async getBlocksIntervalsCollection(eventFilter: EventFilter): Promise<Collection<IBlocknumberInterval>>{
        const blocksIntervalsCollectionName = `${COLLECTION_PREFIX}${this.getEventCollectionName(eventFilter)}.blocksIntervals`
        return (await this.getDb()).collection<IBlocknumberInterval>(blocksIntervalsCollectionName)
    }

    protected getIntervalsIntersection(a: IBlocknumberInterval, b: IBlocknumberInterval): IBlocknumberInterval|undefined{
        if ((a.to < b.from) || (b.to < a.from))
            return undefined
        return {
            from: Math.max(a.from, b.from),
            to: Math.min(a.to, b.to),
        }
    }

    /**
     * Retuns the block intervals for the saved events.
     */
     protected async getBlocksIntervals(eventFilter: EventFilter, fromBlock: number, toBlock: number): Promise<IQueryIntervals>{
        const result: IQueryIntervals = {
            cached: [],
            nonCached: []
        }
        const collection = await this.getBlocksIntervalsCollection(eventFilter)
        const blocksIntervals = await collection.find({ to: { $gte: fromBlock } }).toArray()

        if (blocksIntervals.length == 0){
            result.nonCached.push({ from: fromBlock, to: toBlock })
            return result
        }

        const blocksIntervalsOrderByFrom = blocksIntervals
            .sort( ({from: a}, {from: b}) => a < b ? -1 : b < a ? 1 : 0)

        let from = fromBlock

        for (const cachedInterval of blocksIntervalsOrderByFrom){

            const efectiveCachedInterval = this.getIntervalsIntersection({from, to: toBlock}, cachedInterval)

            if (!efectiveCachedInterval){
                break
            }

            result.cached.push(efectiveCachedInterval)

            if (from < efectiveCachedInterval.from){
                result.nonCached.push({from, to: efectiveCachedInterval.from-1})
            }

            from = efectiveCachedInterval.to+1

            if (from > toBlock)
                break
        }

        if (from <= toBlock){
            result.nonCached.push({from, to: toBlock})
        }

        return result
    
    }

    protected async getEventCollection(eventFilter: EventFilter): Promise<Collection<IEvent>>{
        return (await this.getDb()).collection<IEvent>(this.getEventCollectionName(eventFilter))
    }

    async query(eventFilter: EventFilter, fromBlock: number, toBlock: number): Promise<IQueryResult>{
        const collection = await this.getEventCollection(eventFilter)
        const intervals = await this.getBlocksIntervals(eventFilter, fromBlock, toBlock)
        const events = await collection.find({ 
            $and: [ 
                { blockNumber: { $gte: fromBlock } },
                { blockNumber: { $lte: toBlock } } 
            ] 
        }).toArray()
        return {
            events,
            intervals
        }
    }

    protected createUnionFromIntersections(intervals: IBlocknumberInterval[]): IBlocknumberInterval{
        const minFrom = Math.min(...intervals.map(i=>i.from))
        const maxTo = Math.max(...intervals.map(i=>i.to))
        return {
            from: minFrom,
            to: maxTo
        }
    }

    protected async addInterval(eventFilter: EventFilter, fromBlock: number, toBlock: number){

        const collection = await this.getBlocksIntervalsCollection(eventFilter)

        const intersections = await collection.find({ $or: [
            {
                $and: [
                    { from: { $lte: fromBlock } },
                    { to: { $gte: fromBlock } },
                ],
            },
            {
                $and: [
                    { from: { $lte: toBlock } },
                    { to: { $gte: toBlock } },
                ],
            },
            {
                $and: [
                    { from: { $gte: fromBlock } },
                    { from: { $lte: toBlock } },
                ],
            },
        ]}).toArray()

        const union: IBlocknumberInterval = this.createUnionFromIntersections([{from: fromBlock, to: toBlock}, ...intersections])

        await Promise.all([


            intersections.length > 0 ?
                collection.deleteMany({
                    $or: intersections.map( i => ({ _id: i._id })) 
                })
                : Promise.resolve(),

            collection.insertOne(union),
    
        ])

    }

    async save(eventFilter: EventFilter, fromBlock: number, toBlock: number, events: Array<IEvent>): Promise<void>{

        events.forEach( e => {
            if (e.blockNumber < fromBlock || e.blockNumber > toBlock)
                throw new HardhatPluginError('hardhat-events-cache', 
                    `Block number ${e.blockNumber} is outside the specified range [${fromBlock}, ${toBlock}]`)
        } )
        
        const collection = await this.getEventCollection(eventFilter)

        const client = this.hre.mongodb.getClient()

        const session = client.startSession()

        try {

            await session.withTransaction(() =>
                Promise.all([

                    events.length>0 ?
                        collection.bulkWrite(events.map( event => ({
                            updateOne: {
                                filter: { $and: [ 
                                    { blockNumber: event.blockNumber },
                                    { transactionIndex: event.transactionIndex },
                                    { logIndex: event.logIndex },
                                ] },
                                update: { $set: event },
                                upsert: true,
                            }
                        })))
                        : Promise.resolve(),
        
                    this.addInterval(eventFilter, fromBlock, toBlock)
        
                ])
            )

        } finally {
            
            await session.endSession()

        }

        
    
    }

    async clear(): Promise<void>{

        const db = await this.getDb()

        const collections = db.listCollections()

        for await (const c of collections){
            if (!c.name.includes(COLLECTION_PREFIX))
                continue
            await db.dropCollection(c.name)
        }

    }
   
}
