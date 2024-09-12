import { customRandom, random } from "nanoid"
import { BinaryHeap, keepBestK } from "./heap"

export type Distance = (u: number[], v: number[]) => number

const generateId = customRandom("abcdefghijklmnopqrstuvwxyz", 8, random)

type Branded<T, B> = T & { _brand: B }
export type LayerId = Branded<number, "LayerId">
export type NodeId = Branded<string, "NodeId">

export function layerId(index: number) {
    return index as LayerId
}

export function nodeId() {
    return generateId() as NodeId
}

export function nodeId2(s: string) {
    return s as NodeId
}

export type GraphLayer = Map<NodeId, NodeId[]>
export type GraphLayers = Map<LayerId, GraphLayer>
export type VectorStore = Map<NodeId, number[]>

export type NodeLocator = {
    layerId: LayerId,
    nodeId: NodeId,
}

export class StackOfGraphLayers {
    graphLayers: GraphLayers = new Map()
    numGraphLayers: number = 0
    vectorStore: VectorStore = new Map()
    globalEntryPoint?: NodeLocator

    get L() { return this.numGraphLayers }
    set L(l: number) { this.numGraphLayers = l }
    get M() { return this.numEdgesPerInsert }
    get M_max() { return this.maxEdgesPerElement }
    get M_max0() { return this.maxEdgesPerElementLayer0 }
    get ef_Construction() { return this.numSearchCandidates }
    get mL() { return this.normalizationFactor }
    
    // dist(u: number[], v: number[]) {
    //     return this.distanceFunction(u, v)
    // }
    
    constructor(
        public readonly vecDim: number,                   // stores vectors of this length
        public readonly numEdgesPerInsert: number,        // param M from paper, how many links to neighbors an inserted element establishes in a layer
        public readonly maxEdgesPerElement: number,       // M_max from paper, max number of edges an element has in a layer
        public readonly maxEdgesPerElementLayer0: number, // M_max0 from paper, max edges per elements in bottom layer 0
        public readonly numSearchCandidates: number,      // ef_Construction from paper, how many nearest neighbor candidates to collect when inserting
        public readonly normalizationFactor: number,      // mL from the paper, chooses max layer to insert at
        public readonly distanceFunction: Distance,
    ) { /* empty */ }

    // Algorithm 1 from paper
    insert(vec: number[]) {
        const dist = this.distanceFunction
        const vecs = this.vectorStore
        const vec_node_id = nodeId()

        if (vec.length !== this.vecDim)
            throw Error("inserted vec of wrong length")
        
        const l = this.pickInsertionLayer()

        // first insertion: create layers l..0 and insert first node into them, then return
        if (this.vectorStore.size === 0) {
            for (let layer = l; layer >= 0; layer--) {
                this.graphLayers.set(
                    layer,
                    new Map([[vec_node_id, []]]),
                )
            }
            this.globalEntryPoint = {
                layerId: l,
                nodeId: vec_node_id,
            }
            return
        }

        const L = this.globalEntryPoint!.layerId
        let ep = [this.globalEntryPoint!.nodeId]
        
        // case if insertion layer is greater than current highest level
        for (let layer = l; layer > L; layer--) {
            this.graphLayers.set(
                layer,
                new Map([[vec_node_id, []]]),
            )
        }
        
        let W: NodeId[] = []

        // case if insertion layer is lower than current highest level: navigate from L to l+1
        for (let layer = L; layer > l; layer--) {
            W = this.searchLayer(vec, ep, 1, layer)
            ep = keepBestK(
                W,
                1,
                (u: NodeId, v: NodeId) => dist(vecs.get(u)!, vec) > dist(vecs.get(v)!, vec),
            )
        }

        // in layers l..0, do the insertion and rewiring
        // if l > L, we have already created singleton layers and inserted q into them
        for (let layer = L > l ? l : L; layer >= 0; layer--) {
            const M = layer === 0 ? this.M_max0 : this.M_max
            const layerDict = this.graphLayers.get(layer)!
            
            W = this.searchLayer(vec, ep, this.ef_Construction, layer)
            const neighbors = this.selectNeighborsSimple(vec, W, this.M)
            
            const vec_neighbors: NodeId[] = []
            layerDict.set(vec_node_id, vec_neighbors)
            
            for (const n of neighbors) {
                const neighbor = layerDict.get(n)!
                neighbor.push(vec_node_id)
                vec_neighbors.push(n)
            
                if (neighbor.length > M) {
                    const newNeighbors = this.selectNeighborsSimple(
                        vecs.get(n)!,
                        neighbors,
                        M,
                    )
                    layerDict.set(n, newNeighbors)
                }
            }
        }

        if (l > L) {
            this.globalEntryPoint = { layerId: l, nodeId: vec_node_id }
            this.L = l
        }
    }

    pickInsertionLayer(): LayerId {
        const a = -Math.log(Math.random())
        const b = a * this.mL
        const c = Math.floor(b)
        return layerId(c)
    }


    // Algorithm 2: greedy search over the graph of a single layer.
    // At each iteration, explore the neighbors of the closest candidate node so far.
    // Don't revisit nodes, only keep up to `ef` best finds.
    // Stop when out of candidates, or when best candidate is worse than worst found so far.
    searchLayer(q: number[], ep: NodeId[], ef: number, lc: LayerId): NodeId[] {
        const layer = this.graphLayers.get(lc)!
        const dist = this.distanceFunction
        const vecs = this.vectorStore

        const v = new Set(ep)
        const C = new BinaryHeap(
            // sorted by *shortest* distance to query vec
            (u: NodeId, v: NodeId) => {
                const u_vec = vecs.get(u)!
                const v_vec = vecs.get(v)!
                return dist(u_vec, q) < dist(v_vec, q)
            }
        )
        const W = new BinaryHeap(
            // sorted by *longest* distance to query vec
            (u: NodeId, v: NodeId) => {
                const u_vec = vecs.get(u)!
                const v_vec = vecs.get(v)!
                return dist(u_vec, q) > dist(v_vec, q)
            }
        )
        
        for (const entryPoint of ep) {
            C.in(entryPoint)
            W.in(entryPoint)
        }

        while (C.size > 0) {
            const c = C.out()! // remove element
            const f = W.top!   // look up element
            
            const c_vec = vecs.get(c)!
            const f_vec = vecs.get(f)!
            if (dist(c_vec, q) > dist(f_vec, q)) break
            
            const neighborhood = layer.get(c)!
            
            for (const e of neighborhood) {
                if (!v.has(e)) {
                    v.add(e)
                    const f = W.top!
                    const e_vec = vecs.get(e)!
                    const f_vec = vecs.get(f)!
                    if ((dist(e_vec, q) < dist(f_vec, q)) || W.size < ef) {
                        C.in(e)
                        W.in(e)
                        if (W.size > ef) W.out() // discard farthest
                    }
                }
            }
        }

        return W.toArray()
    }

    // Algorithm 3: return up to M elements in C that are closest to q.
    // Just iterate over C with a max-heap of size up to M, discarding unpromising elements.
    selectNeighborsSimple(q: number[], C: NodeId[], M: number) {
        const vecs = this.vectorStore
        const dist = this.distanceFunction
        const sortFarthestOnTop = (u: NodeId, v: NodeId) => dist(vecs.get(u)!, q) > dist(vecs.get(v)!, q)
        return keepBestK(C, M, sortFarthestOnTop)
    }

    // Algorithm 4
    selectNeighborsHeuristic(q: number[], C: NodeId[], M: number, l_c: LayerId, extendCandidates: boolean, keepPrunedConnections: boolean) {
        const dist = this.distanceFunction
        const vecs = this.vectorStore
        const layer = this.graphLayers.get(l_c)!
        const sortFarthestOnTop = (u: NodeId, v: NodeId) => dist(vecs.get(u)!, q) > dist(vecs.get(v)!, q)
        
        const R: NodeId[] = []

        // work-state heap
        const W = new BinaryHeap(sortFarthestOnTop)

        // work-state heap for discarded nodes
        const W_d = new BinaryHeap(sortFarthestOnTop)

        const startingPoints = new Set<NodeId>()
        if (extendCandidates) {
            for (const c of C) {
                startingPoints.add(c)
                for (const neighbor of layer.get(c)!) startingPoints.add(neighbor)
            }
        } else {
            for (const c of C) startingPoints.add(c)
        }
        startingPoints.forEach(x => W.in(x))

        while (W.size > 0 && R.length < M) {
            const e = W.out()!
            const e_vec = vecs.get(e)!
            const e_to_q = dist(e_vec, q)
            // const ds = R.map(r => dist(e_vec, vecs.get(r)!))
            let closer_to_q_than_R = true
            for (const r of R) {
                const r_vec = vecs.get(r)!
                const e_to_r = dist(e_vec, r_vec)
                if (e_to_r < e_to_q) {
                    closer_to_q_than_R = false
                    break
                }
            }
            if (closer_to_q_than_R)
                R.push(e)
            else
                W_d.in(e)
        }

        // add some least-bad discarded candidates back in
        if (keepPrunedConnections) {
            while (W_d.size > 0 && R.length < M)
                R.push(W_d.out()!)
        }

        return R
    }

    // Algorithm 5
    kNNSearch(q: number[], K: number, ef: number) {
        let { layerId: L, nodeId: ep } = this.globalEntryPoint!
        let dist = this.distanceFunction
        let vecs = this.vectorStore
        let layers = this.graphLayers

        let W: NodeId[] = []
        const sortFarthestOnTop = (u: NodeId, v: NodeId) => dist(vecs.get(u)!, q) > dist(vecs.get(v)!, q)

        for (let l_c = L; l_c > 0; l_c--) {
            const layer = layers.get(l_c)!
            W = this.searchLayer(q, [ep], 1, l_c)
            ep = keepBestK(W, 1, sortFarthestOnTop).pop()!
        }
        
        W = this.searchLayer(q, [ep], ef, layerId(0))
        
        return keepBestK(W, K, sortFarthestOnTop)
    }

}
