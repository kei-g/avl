import * as Avl from './avl'

const tree = new Avl.Tree<string, number>((lhs: string, rhs: string) => lhs < rhs ? -1 : lhs == rhs ? 0 : 1)

tree.add("foo", 123)
tree.add("bar", 456)
tree.add("baz", 111)

const foo = tree.get("foo")
console.log(`foo = ${foo}`)

const bar = tree.get("bar")
console.log(`bar = ${bar}`)

tree.update("foo", 999)

console.log(`foo => ${tree.get("foo")}`)

tree.delete("foo")
tree.add("abc", 123)
tree.add("pi", Math.PI)

console.log("tree = {")
for (const node of tree)
	console.log(`\t${node.key}: ${node.value}`)
console.log("}")

tree.clear()

console.log("tree = {")
for (const node of tree)
	console.log(`\t${node.key}: ${node.value}`)
console.log("}")
