import { expect, test } from "bun:test"
import { BinaryHeap, keepBestK } from "./heap"

const testOpts = {
    repeats: 20,
}

/*
    KEEP BEST K TESTS
*/

test(
    "keep best: k = 1 with choose max",
    () => {
        const k = 1
        const data = Array.from({length: 250}, _ => Math.random())
        const observed = keepBestK(data, k, (a, b) => a < b)
        expect(observed).toBeArrayOfSize(k)
        expect(observed[0]).toBe(Math.max(...data))
    },
    testOpts,
)

test(
    "keep best: k = 10 with choose min",
    () => {
        const k = 10
        const data = Array.from({length: 250}, _ => Math.random())
        const observed = keepBestK(data, k, (a, b) => a > b)
        data.sort((a, b) => a - b)
        observed.sort((a, b) => a - b) // best K returned in unspecified order, we sort to compare
        expect(observed).toBeArrayOfSize(k)
        expect(observed).toEqual(data.slice(0, k))
    },
    testOpts,
)

test(
    "keep best: k > N",
    () => {
        const data = Array.from({length: 25}, _ => Math.random())
        const observed = keepBestK(data, 50, (a, b) => a > b)
        data.sort((a, b) => a - b)
        observed.sort((a, b) => a - b) // best K returned in unspecified order, we sort to compare
        expect(observed).toBeArrayOfSize(25)
        expect(observed).toEqual(data)
    },
    testOpts,
)

/*
    HEAP TESTS
*/

test(
    "binary heap: empty",
    () => {
        const heap = new BinaryHeap<number>()
        expect(heap.size).toBe(0)
        expect(heap.toArray()).toEqual([])
        expect(heap.top).toBeUndefined()
        expect(heap.out()).toBeUndefined()
    },
    testOpts,
)

test(
    "binary heap: minimal",
    () => {
        const heap = new BinaryHeap<number>()
        const data = [5, 1, 4, 3, 2]
        data.forEach(n => heap.in(n))
        expect(heap.size).toBe(5)
        expect(heap.top).toBe(1)
        expect(heap.out()).toBe(1)
        expect(heap.out()).toBe(2)
        expect(heap.out()).toBe(3)
        expect(heap.out()).toBe(4)
        expect(heap.out()).toBe(5)
        expect(heap.out()).toBeUndefined()
        expect(heap.out()).toBeUndefined()
    },
    testOpts,
)

test(
    "binary heap: custom comparison",
    () => {
        const heap = new BinaryHeap(
            (a: [number, number], b: [number, number]) => a[0] + a[1] < b[0] + b[1]
        )
        const data: [number, number][] = [
            [1, 9], [2, 7], [0, 11], [3, 3], [4, 1], [3, 5], [2, 2]
        ]
        data.forEach(d => heap.in(d))
        
        expect(heap.size).toBe(7)
        expect(heap.top).toEqual([2, 2])
        expect(heap.out()).toEqual([2, 2])
        expect(heap.out()).toEqual([4, 1])
        expect(heap.out()).toEqual([3, 3])
        expect(heap.out()).toEqual([3, 5])
        expect(heap.out()).toEqual([2, 7])
        expect(heap.out()).toEqual([1, 9])
        expect(heap.out()).toEqual([0, 11])
        expect(heap.out()).toBeUndefined()
    },
    testOpts,
)

test(
    "binary heap: random test",
    () => {
        const heap = new BinaryHeap((a: number, b: number) => b < a)
        const data = Array.from({length: 250}, _ => Math.random())
        const data2 = Array.from(data)
        data2.sort((a, b) => b - a)
        data.forEach(n => heap.in(n))
        const arr = []
        while (heap.size > 0) arr.push(heap.out())
        expect(arr).toEqual(data2)
    },
    testOpts,
)

test(
    "binary heap: to array",
    () => {
        const heap = new BinaryHeap<number>()
        const data = Array.from({length: 250}, _ => Math.random())
        data.forEach(n => heap.in(n))
        data.sort((a, b) => b - a)
        const arr = heap.toArray()
        arr.sort((a, b) => b - a)
        expect(arr).toEqual(data)
    },
    testOpts,
)
