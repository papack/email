// jsx/show.ts
import type { VNode, Child, Props } from "./jsx";

type ShowProps = Props & {
  when: boolean;
  children?: Child[];
};

export async function Show(props: ShowProps): Promise<VNode> {
  if (!props.when) {
    return {
      type: "__fragment__",
      props: { children: [] },
    };
  }

  return {
    type: "__fragment__",
    props: { children: props.children ?? [] },
  };
}
