import { expect, test } from "bun:test"
import { layerId, StackOfGraphLayers, type Distance, type GraphLayer, type NodeId, type VectorStore } from "./hnsw" 

const testOpts = {
    repeats: 20,
}

// just a mock
function nodeId(s: string) {
    return s as NodeId
}

const handmadeLayerGraph = new Map([
    ["a", { point: [-4, -3], neighbors: ["c"] }],
    ["b", { point: [-3, -4], neighbors: ["c"] }],
    ["c", { point: [-3, -3], neighbors: ["a", "b", "f", "d"] }],
    ["d", { point: [-1, -3], neighbors: ["c", "e"] }],
    ["e", { point: [-2, -2], neighbors: ["d", "f", "i"] }],
    ["f", { point: [-3, -1], neighbors: ["c", "e", "j"] }],
    ["g", { point: [0.5, 0.5], neighbors: [] }], // no edges
    ["h", { point: [0.5, -0.5], neighbors: [] }], // no edges
    ["i", { point: [-1, -1], neighbors: ["e", "j", "k", "y"] }],
    ["j", { point: [-3, -1], neighbors: ["f", "i", "k", "l"] }],
    ["k", { point: [-1, 1], neighbors: ["i", "j", "l", "p", "r", "x"] }],
    ["l", { point: [-2, 2], neighbors: ["j", "m", "p", "k"] }],
    ["m", { point: [-3, 3], neighbors: ["l", "n", "o"] }],
    ["n", { point: [-3, 4], neighbors: ["m"] }],
    ["o", { point: [-4, 3], neighbors: ["m"] }],
    ["p", { point: [-1, 3], neighbors: ["k", "l", "q"] }],
    ["q", { point: [1, 3], neighbors: ["p", "s", "u"] }],
    ["r", { point: [1, 1], neighbors: ["k", "s", "y"] }],
    ["s", { point: [2, 2], neighbors: ["q", "r", "w"] }],
    ["t", { point: [3, 4], neighbors: ["u"] }],
    ["u", { point: [3, 3], neighbors: ["q", "t", "v", "w"] }],
    ["v", { point: [4, 3], neighbors: ["u"] }],
    ["w", { point: [3, 1], neighbors: ["s", "u"] }],
    ["x", { point: [0, 0], neighbors: ["k", "y"] }],
    ["y", { point: [1, -1], neighbors: ["i", "r", "x", "z", "aa", "ab"] }],
    ["z", { point: [3, -1], neighbors: ["y", "ac"] }],
    ["aa", { point: [1, -3], neighbors: ["y", "ac"] }],
    ["ab", { point: [2, -2], neighbors: ["y", "ac"] }],
    ["ac", { point: [3, -3], neighbors: ["z", "aa", "ab"] }],
    ["ad", { point: [4, -3], neighbors: ["ac"] }],
    ["ae", { point: [3, -4], neighbors: ["ac"] }],          
])

test(
    "hnsw: search layer",
    () => {
        const dist: Distance = (u: number[], v: number[]) =>
            Math.sqrt((u[0] - v[0])**2 + (u[1] - v[1])**2)
        const vecs: VectorStore = new Map()
        const layer: GraphLayer = new Map()
        
        for (const x of handmadeLayerGraph.entries()) {
            vecs.set(nodeId(x[0]), x[1].point)
            layer.set(nodeId(x[0]), x[1].neighbors.map(x => nodeId(x)))
        }
        
        const hnsw = new StackOfGraphLayers(2, 0, 0, 0, 0, 0, dist)
        hnsw.graphLayers.set(layerId(0), layer)
        hnsw.vectorStore = vecs
        
        const results: string[] = hnsw.searchLayer([4, 0], [nodeId("a")], 6, layerId(0))
        results.sort()
        console.log(results)

        expect(results).toEqual(["ab", "r", "s", "w", "y", "z"])
    },
    testOpts,
)
