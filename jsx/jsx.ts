// jsx/jsx.ts

export type Primitive = string | number | boolean | null | undefined;

export type Child = Primitive | VNode | Promise<VNode | Primitive> | Child[];

export type Props = Record<string, unknown> & {
  children?: Child[];
};

export type Component = (props: Props) => VNode | Promise<VNode>;

export type VNodeLike = VNode | Promise<VNode>;

declare global {
  namespace JSX {
    type Element = VNodeLike;
    interface IntrinsicElements {
      [tag: string]: any;
    }
  }
}

export type VNode = {
  type: string | Component;
  props: Props;
};

export function jsx(
  type: VNode["type"],
  props: Props | null,
  ...children: Child[]
): VNode {
  return {
    type,
    props: {
      ...(props ?? {}),
      children,
    },
  };
}
