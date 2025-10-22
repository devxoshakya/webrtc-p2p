import { redirect, RedirectType } from "next/navigation"

const Page = () => {
  
  return redirect('/sender' as any, RedirectType.replace);
}

export default Page
