const fs = require("fs");
const path = require("path");

const repoRoot = path.resolve(__dirname, "..");
const productsDir = path.join(repoRoot, "products");
const outputFile = path.join(productsDir, "index.json");

function parsePrice(value) {
  if (value === null || value === undefined) return 0;
  const parsed = Number.parseFloat(String(value).trim().replace(",", "."));
  return Number.isFinite(parsed) ? parsed : 0;
}

function normalizeProduct(data, id) {
  const title = data.title || data.name || "";
  const description = data.description || "";
  const price = parsePrice(data.price);
  const images = Array.isArray(data.images)
    ? data.images.filter(Boolean)
    : data.image
    ? [data.image]
    : [];

  return {
    id,
    title,
    description,
    price,
    images
  };
}

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
    );

  const products = [];
  for (const file of productFiles) {
    const filePath = path.join(productsDir, file);
    const raw = fs.readFileSync(filePath, "utf8");
    try {
      const data = JSON.parse(raw);
      const id = file.replace(/\.json$/i, "");
      products.push(normalizeProduct(data, id));
    } catch (error) {
      throw new Error(`Invalid JSON in ${filePath}: ${error.message}`);
    }
  }

  return products.sort((a, b) =>
    a.title.localeCompare(b.title, "es", { sensitivity: "base" })
  );
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
