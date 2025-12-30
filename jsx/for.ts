// jsx/for.ts
import type { VNode, Child, Props } from "./jsx";

type ForProps<T> = Props & {
  each: readonly T[];
  children?: ((item: T, index: number) => Child | Promise<Child>)[];
};

export async function For<T>(props: ForProps<T>): Promise<VNode> {
  const { each, children } = props;

  if (!Array.isArray(each) || each.length === 0) {
    return {
      type: "__fragment__",
      props: { children: [] },
    };
  }

  const render = children?.[0];
  if (typeof render !== "function") {
    throw new Error("<For> expects a single function child");
  }

  const out: Child[] = [];

  for (let i = 0; i < each.length; i++) {
    out.push(await render(each[i], i));
  }

  return {
    type: "__fragment__",
    props: { children: out },
  };
}
