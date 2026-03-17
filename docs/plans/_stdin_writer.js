const fs = require("fs");
const lines = [];
process.stdin.setEncoding("utf8");
process.stdin.on("data", d => lines.push(d));
process.stdin.on("end", () => {
  fs.writeFileSync("C:/bescout-app/docs/plans/2026-03-15-fantasy-manager-persona.md", lines.join(""), "utf8");
  console.log("Written " + lines.join("").length + " chars");
});
