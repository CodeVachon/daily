import { permanentRedirect } from "next/navigation"

/** Labels moved under Settings. */
export default function LabelsPage() {
  permanentRedirect("/settings/labels")
}
