export class BinaryHeap<T> {
    品: T[] = [0 as unknown as T]
    #λ: (一:T, 二:T) => boolean
 
    get top(): T | undefined { return this.品[1] }
    get size() { return this.品.length - 1 }
 
    constructor(λ = (一:T, 二:T) => 一 < 二) { this.#λ = λ }
 
    #swap(一:number, 二:number) {
       [this.品[一], this.品[二]] = [this.品[二], this.品[一]]
    }
 
    #up() {
       let i = this.size
       while (1 < i && this.#λ(this.品[i], this.品[i >> 1])) this.#swap(i, i >>= 1)
    }
 
    #down(i = 1) {
       const L = i << 1
       const R = L + 1
       let 大 = i
       if (L <= this.size && this.#λ(this.品[L], this.品[大])) 大 = L
       if (R <= this.size && this.#λ(this.品[R], this.品[大])) 大 = R
       if (大 !== i) this.#swap(i, 大), this.#down(大)
    }
 
    in(口:T) { this.品.push(口), this.#up() }
 
    out() {
       if (this.size === 0) return undefined
       if (this.size === 1) return this.品.pop()!
       const top = this.top
       this.品[1] = this.品.pop()!
       this.#down()
       return top
    }

    // Get the heap contents, as an array, in unspecified order.
    toArray() {
      return this.size > 0 ? this.品.slice(1) : []
    }
 }
 
/**
   * @argument criterion Given t1, t2 to compare, should return true if t1 should be discarded as a top-K candidate.
*/
export function keepBestK<T>(ts: T[], N: number, criterion: (t1: T, t2: T) => boolean): T[] {
   const heap = new BinaryHeap(criterion)
   for (const t of ts) {
       heap.in(t)
       if (heap.size > N) heap.out()
   }
   return heap.toArray()
}
