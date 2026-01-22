const fs = require("fs");
const path = require("path");

const repoRoot = path.resolve(__dirname, "..");
const productsDir = path.join(repoRoot, "products");
const outputFile = path.join(productsDir, "index.json");

function readProducts() {
  if (!fs.existsSync(productsDir)) {
    return [];
  }

  const entries = fs.readdirSync(productsDir, { withFileTypes: true });
  const productFiles = entries
    .filter((entry) => entry.isFile())
    .map((entry) => entry.name)
    .filter(
      (file) => file.endsWith(".json") && file.toLowerCase() !== "index.json"
    )
    .sort((a, b) => a.localeCompare(b));

  const products = [];
  for (const file of productFiles) {
    const filePath = path.join(productsDir, file);
    const raw = fs.readFileSync(filePath, "utf8");
    try {
      const data = JSON.parse(raw);
      products.push({
        id: file.replace(/\.json$/i, ""),
        ...data
      });
    } catch (error) {
      throw new Error(`Invalid JSON in ${filePath}: ${error.message}`);
    }
  }

  return products;
}

function writeIndex(products) {
  if (!fs.existsSync(productsDir)) {
    fs.mkdirSync(productsDir, { recursive: true });
  }

  const json = JSON.stringify(products, null, 2) + "\n";
  fs.writeFileSync(outputFile, json, "utf8");
}

const products = readProducts();
writeIndex(products);
