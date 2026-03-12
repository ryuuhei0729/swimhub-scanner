import { redirect } from "next/navigation";

const defaultLocale = "ja";

export default function RootPage() {
  redirect(`/${defaultLocale}`);
}
