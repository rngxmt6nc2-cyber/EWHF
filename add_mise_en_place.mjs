import fs from "node:fs";
import path from "node:path";

const root = path.dirname(new URL(import.meta.url).pathname);
const index = JSON.parse(fs.readFileSync(path.join(root, "index.json"), "utf8"));

function slugify(value) {
  return value
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "") || "ingredient";
}

function assignMissingIDs(recipe) {
  const used = new Set();
  for (const group of recipe.ingredientGroups) {
    for (const ingredient of group.items) {
      if (ingredient.id) used.add(ingredient.id.toLowerCase());
    }
  }

  for (const group of recipe.ingredientGroups) {
    for (const ingredient of group.items) {
      if (ingredient.id) continue;
      const base = slugify(ingredient.item);
      let id = base;
      let suffix = 2;
      while (used.has(id)) id = `${base}-${suffix++}`;
      ingredient.id = id;
      used.add(id);
    }
  }
}

const directPrep = [
  [/^very finely minced$/i, "Very finely mince"],
  [/^finely minced$/i, "Finely mince"],
  [/^minced$/i, "Mince"],
  [/^very finely chopped$/i, "Very finely chop"],
  [/^finely chopped$/i, "Finely chop"],
  [/^roughly chopped$/i, "Roughly chop"],
  [/^chopped$/i, "Chop"],
  [/^finely diced$/i, "Finely dice"],
  [/^diced$/i, "Dice"],
  [/^very thinly sliced$/i, "Very thinly slice"],
  [/^thinly sliced$/i, "Thinly slice"],
  [/^sliced$/i, "Slice"],
  [/^very finely grated$/i, "Very finely grate"],
  [/^finely grated$/i, "Finely grate"],
  [/^freshly grated$/i, "Freshly grate"],
  [/^grated$/i, "Grate"],
  [/^peeled$/i, "Peel"],
  [/^trimmed$/i, "Trim"],
  [/^crushed$/i, "Crush"],
  [/^lightly crushed$/i, "Lightly crush"],
  [/^torn$/i, "Tear"],
  [/^seeded$/i, "Seed"],
  [/^shredded$/i, "Shred"],
  [/^smashed$/i, "Smash"],
  [/^split$/i, "Split"],
  [/^thawed$/i, "Thaw"],
  [/^rinsed$/i, "Rinse"],
  [/^drained$/i, "Drain"],
  [/^drained and rinsed$/i, "Drain and rinse"],
  [/^rinsed and drained$/i, "Rinse and drain"],
  [/^picked over and rinsed$/i, "Pick over and rinse"],
  [/^rinsed and picked over$/i, "Rinse and pick over"],
  [/^washed and thoroughly dried$/i, "Wash and thoroughly dry"],
  [/^room temperature$/i, "Bring to room temperature"],
  [/^softened$/i, "Soften"],
  [/^melted$/i, "Melt"],
  [/^warmed$/i, "Warm"],
];

const actionable = /(chop|minc|dic|slic|grat|peel|trim|crush|torn|tear|seed|shred|smash|split|thaw|rins|drain|pick|wash|dry|soak|cut|remove|separat|scrape|squeez|pulse|zest|juice|quarter|halve|toast|roast|cook|warm|soften|melt)/i;
const stagingOnly = /^(to taste|plus more to taste|plus more as needed|as needed|divided|for serving|to finish|for brushing|for cooking|for soaking|for pasta water|reserved |hot$|warm$|packed$|up to$|pinch$)/i;

function prepInstruction(ingredient) {
  const prep = (ingredient.prep || "").trim();
  if (!prep || stagingOnly.test(prep) || !actionable.test(prep)) return null;
  for (const [pattern, verb] of directPrep) {
    if (pattern.test(prep)) return `${verb} {{ingredient:${ingredient.id}}}.`;
  }
  return `Prepare {{ingredient:${ingredient.id}}} as specified: ${prep}.`;
}

function joinTokens(tokens) {
  if (tokens.length === 1) return tokens[0];
  if (tokens.length === 2) return `${tokens[0]} and ${tokens[1]}`;
  return `${tokens.slice(0, -1).join(", ")}, and ${tokens.at(-1)}`;
}

function createMiseEnPlace(recipe) {
  const ingredients = recipe.ingredientGroups.flatMap(group => group.items);
  const prepSteps = [];
  const remaining = [];

  for (const ingredient of ingredients) {
    const instruction = prepInstruction(ingredient);
    if (instruction) prepSteps.push(instruction);
    else remaining.push(`{{ingredient:${ingredient.id}}}`);
  }

  for (let i = 0; i < remaining.length; i += 5) {
    prepSteps.push(`Measure and stage ${joinTokens(remaining.slice(i, i + 5))}.`);
  }

  return prepSteps;
}

for (const slug of index.recipes) {
  const file = path.join(root, "recipes", `${slug}.json`);
  const recipe = JSON.parse(fs.readFileSync(file, "utf8"));
  assignMissingIDs(recipe);

  if (!Array.isArray(recipe.miseEnPlace) || recipe.miseEnPlace.length === 0) {
    const miseEnPlace = createMiseEnPlace(recipe);
    const reordered = {};
    for (const [key, value] of Object.entries(recipe)) {
      if (key === "stepGroups") reordered.miseEnPlace = miseEnPlace;
      reordered[key] = value;
    }
    if (!("miseEnPlace" in reordered)) reordered.miseEnPlace = miseEnPlace;
    fs.writeFileSync(file, `${JSON.stringify(reordered, null, 2)}\n`);
  } else {
    fs.writeFileSync(file, `${JSON.stringify(recipe, null, 2)}\n`);
  }
}
