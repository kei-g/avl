import { ConcatenatedIterator, EmptyIterator, SingleIterator } from '@kei-g/iterators'

namespace Avl {
	/**
	 * Node of AVL Tree
	 */
	export class Node<K, V> implements Iterable<KeyValuePair<K, V>>, KeyValuePair<K, V> {
		/**
		 * child nodes of this node
		 */
		readonly children: Node<K, V>[] = [null, null]

		/**
		 * height of this node
		 */
		height: number = 0

		/**
		 * the next unused node
		 * this field takes effect only in chain from tree.unused
		 */
		next: Node<K, V> = null

		/**
		 * constructor
		 * @param key key of the node
		 * @param value value of the node
		 */
		constructor(public key: K, public value: V) {
		}

		/**
		 * append an iterator of key-value-pair
		 * @param another the iterator to be appended
		 * @returns concatenated iterator
		 */
		private concatenate(another: Iterator<KeyValuePair<K, V>>): Iterator<KeyValuePair<K, V>> {
			return new ConcatenatedIterator(this[Symbol.iterator](), another)
		}

		/**
		 * either left child node or right one which is not null
		 */
		get eitherChild(): Node<K, V> {
			return this.lhs ?? this.rhs
		}

		/**
		 * both left child node and right one are not null
		 */
		get hasTwoChildren(): boolean {
			return !this.children.some(node => !node)
		}

		/**
		 * the height of this node is taller than 1
		 */
		get isTall(): boolean {
			return Math.abs(this.height) > 1
		}

		/**
		 * left-hand-side child node
		 */
		get lhs(): Node<K, V> {
			return this.children[0]
		}

		/**
		 * left-hand-side child node
		 */
		set lhs(node: Node<K, V>) {
			this.children[0] = node
		}

		/**
		 * returns a reference to child node
		 * @param sign
		 * @param indexer
		 * @returns a reference to child node
		 */
		pointer(sign: SignNonZero, indexer: Indexer): NodePointer<K, V> {
			return new ChildNodePointer(this.children, indexer(sign))
		}

		/**
		 * the reference to left-hand-side child node
		 */
		get pointerLeft(): NodePointer<K, V> {
			return new ChildNodePointer(this.children, 0)
		}

		/**
		 * prepend an iterator of key-value-pair
		 * @param another the iterator to be prepended
		 * @returns concatenated iterator
		 */
		private prepend(another: Iterator<KeyValuePair<K, V>>): Iterator<KeyValuePair<K, V>> {
			return new ConcatenatedIterator(another, this[Symbol.iterator]())
		}

		/**
		 * reuse this node
		 * @param key new key
		 * @param value new value
		 */
		recycle(key: K, value: V): void {
			this.children.fill(null)
			this.height = 0
			this.key = key
			this.next = null
			this.value = value
		}

		/**
		 * right-hand-side child node
		 */
		get rhs(): Node<K, V> {
			return this.children[1]
		}

		/**
		 * rightmost descendant child node
		 */
		get rightmost(): Node<K, V> {
			return this.rhs?.rightmost ?? this
		}

		/**
		 * Replace value of the node by specified one
		 * @param newValue new value
		 * @returns previous value
		 */
		update(newValue: V): V {
			const previousValue: V = this.value
			this.value = newValue
			return previousValue
		}

		/**
		 * get an iterator for key-value-pairs of this node and all descendents
		 * @returns iterator object
		 */
		[Symbol.iterator](): Iterator<KeyValuePair<K, V>> {
			const self = new SingleIterator(this)
			const iterator = this.lhs?.concatenate(self) ?? self
			return this.rhs?.prepend(iterator) ?? iterator
		}
	}

	export abstract class NodePointer<K, V> {
		allocate(key: K, value: V): void {
			this.isNull ? this.node = new Node<K, V>(key, value) : this.node.recycle(key, value)
		}

		get isNull(): boolean {
			return !this.node
		}

		abstract get node(): Node<K, V>

		abstract set node(node: Node<K, V>)
	}

	export class ChildNodePointer<K, V> extends NodePointer<K, V> {
		constructor(private readonly children: Node<K, V>[], private readonly index: 0 | 1) {
			super()
		}

		get node(): Node<K, V> {
			return this.children[this.index]
		}

		set node(node: Node<K, V>) {
			this.children[this.index] = node
		}
	}

	export class RootNodePointer<K, V> extends NodePointer<K, V> {
		constructor(private root: Node<K, V>, private readonly setRoot: (node: Node<K, V>) => void) {
			super()
		}

		get node(): Node<K, V> {
			return this.root
		}

		set node(node: Node<K, V>) {
			this.setRoot(this.root = node)
		}
	}

	export enum Operation {
		Add,
		Delete,
	}

	export class Request<K, V> {
		balance: number = undefined
		result: boolean = undefined
		sign: Sign = undefined

		constructor(readonly nodep: NodePointer<K, V>, readonly operation: Operation, readonly key: K, readonly value?: V) {
		}

		get node(): Node<K, V> {
			return this.nodep.node
		}

		set node(node: Node<K, V>) {
			this.nodep.node = node
		}

		subrequest(nodep: NodePointer<K, V>, param: { key: K, value?: V }): Request<K, V> {
			return new Request(nodep, this.operation, param.key, param.value)
		}
	}

	type Indexer = (sign: SignNonZero) => 0 | 1
	export type Callback<K, V, U> = (node: Node<K, V>) => U
	export type Comparator<K> = (lhs: K, rhs: K) => number
	export type Destructor<K, V> = (key: K, value: V) => void
	export type Sign = 0 | SignNonZero
	export type SignNonZero = -1 | 1

	// -1 => 0, +1 => 1
	export const lhs = ((sign: SignNonZero) => (1 + sign) / 2) as Indexer

	export function negate(value: SignNonZero): SignNonZero {
		return -value as SignNonZero
	}

	// -1 => 1, +1 => 0
	export const rhs = ((sign: SignNonZero) => (1 - sign) / 2) as Indexer

	export function sign(value: number): Sign {
		return Math.sign(value) as Sign
	}
}

interface KeyValuePair<K, V> {
	readonly key: K
	readonly value: V
}

/**
 * AVL Tree
 */
export class Tree<K, V> implements Iterable<KeyValuePair<K, V>> {
	/**
	 * root node of the tree
	 */
	private root: Avl.Node<K, V> = null

	/**
	 * head of unused nodes, they are going to be recycled
	 */
	private unused: Avl.Node<K, V> = null

	/**
	 * constructor
	 * @param compare comparator for keys
	 * @param destructor destructor for keys and values (optional)
	 */
	constructor(private readonly compare: Avl.Comparator<K>, private readonly destructor?: Avl.Destructor<K, V>) {
	}

	/**
	 * add an element
	 * @param key a key which indicates the new value
	 * @param value new value to be added
	 * @returns true if success, false if the key is duplicated
	 */
	add(key: K, value: V): boolean {
		const request = new Avl.Request(this.rootNodePointer, Avl.Operation.Add, key, value)
		this.process(request)
		return request.result
	}

	/**
	 * delete all elements
	 * @see purge
	 */
	clear(): void {
		for (const pair of this) {
			const node = pair as Avl.Node<K, V>
			this.destructor?.(node.key, node.value)
			node.next = this.unused;
			this.unused = node
		}
		this.root = null
	}

	private compareAndProcess(request: Avl.Request<K, V>): number {
		request.sign = Avl.sign(this.compare(request.key, request.node.key))
		return request.sign == 0 ? this.processMatchedNode(request) : this.processUnmatchedNode(request)
	}

	/**
	 * delete an element
	 * @param key a key to specify which element to be deleted
	 * @returns true if success, false if the key doesn't exist
	 */
	delete(key: K): boolean {
		const request = new Avl.Request<K, V>(this.rootNodePointer, Avl.Operation.Delete, key)
		this.process(request)
		return request.result
	}

	private fail(request: Avl.Request<K, V>): number {
		request.result = false
		return request.balance = 0
	}

	private find<U>(key: K, callback: Avl.Callback<K, V, U>): U {
		for (let node = this.root; node;) {
			const sign = Avl.sign(this.compare(key, node.key))
			if (sign == 0)
				return callback(node)
			node = node.children[Avl.lhs(sign)]
		}
	}

	/**
	 * get a value of element specified by the key
	 * @param key the key
	 * @returns a value of the element
	 */
	get(key: K): V {
		return this.find(key, (node: Avl.Node<K, V>) => node.value)
	}

	private process(request: Avl.Request<K, V>): number {
		return request.nodep.isNull ? this.processNullNode(request) : this.processNode(request)
	}

	private processAddRequest(request: Avl.Request<K, V>): number {
		request.result = true
		request.node = this.unused
		this.unused = this.unused?.next
		request.nodep.allocate(request.key, request.value)
		return request.balance = 1
	}

	private processDeleteRequest(request: Avl.Request<K, V>): number {
		request.result = true
		const node = request.node
		if (!node.hasTwoChildren) {
			this.destructor?.(node.key, node.value)
			node.next = this.unused
			this.unused = node
			request.node = node.eitherChild
			return request.balance = -1
		}
		const next = node.lhs.rightmost
		this.destructor?.(node.key, node.value)
		node.key = next.key
		node.value = next.value
		request.balance = this.process(request.subrequest(node.pointerLeft, next))
		request.sign = 1
	}

	private processForRotation(request: Avl.Request<K, V>): number {
		return request.balance == 0 ? 0 : this.rotateIfNecessary(request)
	}

	private processMatchedNode(request: Avl.Request<K, V>): number {
		return request.operation == Avl.Operation.Add ? this.fail(request) : this.processDeleteRequest(request)
	}

	private processNode(request: Avl.Request<K, V>): number {
		return this.compareAndProcess(request) ?? this.processForRotation(request)
	}

	private processNullNode(request: Avl.Request<K, V>): number {
		return request.operation == Avl.Operation.Add ? this.processAddRequest(request) : this.fail(request)
	}

	private processUnmatchedNode(request: Avl.Request<K, V>): number {
		const sign = request.sign as Avl.SignNonZero
		request.balance = this.process(request.subrequest(request.node.pointer(sign, Avl.lhs), request))
		request.sign = Avl.negate(sign)
		return undefined
	}

	/**
	 * delete all elements and purge all resources
	 * @see clear
	 */
	purge(): void {
		this.clear()
		this.unused = null
	}

	private get rootNodePointer(): Avl.NodePointer<K, V> {
		return new Avl.RootNodePointer(this.root, node => this.root = node)
	}

	private rotate(nodep0: Avl.NodePointer<K, V>, sign: Avl.SignNonZero): void {
		const node0 = nodep0.node
		const nodep1 = node0.pointer(sign, Avl.rhs)
		const node1 = nodep1.node
		const nodep2 = node1.pointer(sign, Avl.lhs)
		const [d0, d1] = [node0, node1].map(node => node.height * sign)
		const d1sign = Avl.sign(d1) as Avl.SignNonZero
		const D = [0, d1]
		const n = d0 - 1 - D[Avl.lhs(d1sign)]
		node0.height = n * sign
		node1.height = [d0 - 2 + D[Avl.rhs(d1sign)], d1 - 1][Avl.lhs(Avl.sign(n) as Avl.SignNonZero)] * sign
		nodep1.node = nodep2.node
		nodep2.node = node0
		nodep0.node = node1
	}

	private rotateIfNecessary(request: Avl.Request<K, V>): Avl.Sign {
		const difference = request.node.height
		if (request.node.isTall) {
			const sign = Avl.sign(difference) as Avl.SignNonZero
			const childp = request.node.pointer(sign, Avl.rhs)
			if (sign != Avl.sign(childp.node.height))
				this.rotate(childp, Avl.negate(sign))
			this.rotate(request.nodep, sign)
		}
		const sign = Avl.sign(request.balance)
		return ((+(difference == 0) * 2 - 1) * sign + 1) * sign / 2 as Avl.Sign
	}

	/**
	 * update value of element specified by the key
	 * @param key the key
	 * @param value new value
	 * @returns old value
	 */
	update(key: K, value: V): V {
		return this.find(key, (node: Avl.Node<K, V>) => node.update(value))
	}

	/**
	 * get an iterator which can enumerate all elements in this tree
	 * @returns iterator object
	 */
	[Symbol.iterator](): Iterator<KeyValuePair<K, V>> {
		return this.root?.[Symbol.iterator]() ?? new EmptyIterator()
	}
}
