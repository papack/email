// jsx/fragment.ts
import type { VNode, Props, Child } from "./jsx";

type FragmentProps = Props & {
  children?: Child[];
};

export async function fragment(props: FragmentProps): Promise<VNode> {
  const { children = [] } = props;

  return {
    type: "__fragment__",
    props: { children },
  };
}
