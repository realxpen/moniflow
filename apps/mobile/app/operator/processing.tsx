import { PlaceholderScreen } from "@/components/ui";

export default function ProcessingScreen() {
  return (
    <PlaceholderScreen
      description="A future deterministic parser will normalize the instruction. This placeholder does not parse or execute anything."
      eyebrow="PROCESSING · PREVIEW"
      nextHref="/operator/plan"
      nextLabel="View plan placeholder"
      title="Understanding your instruction."
    />
  );
}
