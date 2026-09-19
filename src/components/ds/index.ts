/**
 * WomanUP's design system: one import for the pieces new screens are built
 * from. See `components/README.md` for when to use which.
 */

export { Icon } from "./Icon";
export {
  Badge,
  CTA,
  EmptyState,
  Section,
  Segmented,
  Sheet,
  StepIndicator,
  TabPanel,
  Tabs,
} from "./Primitives";
// Already in the product; re-exported under the names the system uses.
export { Hint as Help, Meter as Progress } from "@/components/guide/Parts";
export { ConfirmDialog as Modal } from "@/components/org/ConfirmDialog";
export { Expandable, StateLine } from "@/components/org/Parts";
