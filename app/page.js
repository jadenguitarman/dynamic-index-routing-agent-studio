import { readFileSync } from "node:fs";
import { join } from "node:path";

function pageBody() {
  const html = readFileSync(join(process.cwd(), "public", "index.html"), "utf8");
  return html.match(/<body[^>]*>([\s\S]*)<\/body>/i)?.[1] || "";
}

export default function Page() {
  return (
    <>
      <div dangerouslySetInnerHTML={{ __html: pageBody() }} />
      <script type="module" src="/app.js" />
    </>
  );
}
