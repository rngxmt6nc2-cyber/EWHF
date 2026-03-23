
const fs = require("fs");
const path = require("path");

const recipesDir = path.join(__dirname, "..", "recipes");
const outputFile = path.join(__dirname, "..", "index.json");

const files = fs
  .readdirSync(recipesDir)
  .filter((file) => file.endsWith(".json"))
  .sort();

const data = {
  recipes: files.map((file) => path.basename(file, ".json"))
};

fs.writeFileSync(outputFile, JSON.stringify(data, null, 2) + "\n");
console.log(`Built index.json with ${data.recipes.length} recipes`);
