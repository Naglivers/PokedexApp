const fs = require("node:fs/promises");
const path = require("node:path");
const sharp = require("sharp");

async function main() {
  const directory = path.resolve(__dirname, "../assets/brand");
  const source = await fs.readFile(path.join(directory, "icon.svg"), "utf8");
  const foreground = source.replace(
    '<rect width="1024" height="1024" fill="#E95B54"/>',
    "",
  );
  const favicon = source.replace(
    '<rect width="1024" height="1024" fill="#E95B54"/>',
    '<rect width="1024" height="1024" rx="230" fill="#E95B54"/>',
  );
  await Promise.all([
    sharp(Buffer.from(source))
      .resize(1024, 1024)
      .flatten({ background: "#E95B54" })
      .removeAlpha()
      .png()
      .toFile(path.join(directory, "icon.png")),
    sharp(Buffer.from(foreground))
      .resize(1024, 1024)
      .png()
      .toFile(path.join(directory, "adaptive-icon.png")),
    sharp(Buffer.from(favicon))
      .resize(256, 256)
      .png()
      .toFile(path.join(directory, "favicon.png")),
    sharp(Buffer.from(favicon))
      .resize(180, 180)
      .flatten({ background: "#E95B54" })
      .png()
      .toFile(path.join(directory, "apple-touch-icon.png")),
    sharp(Buffer.from(favicon))
      .resize(32, 32)
      .png()
      .toFile(path.join(directory, "favicon-32.png")),
    sharp(Buffer.from(favicon))
      .resize(16, 16)
      .png()
      .toFile(path.join(directory, "favicon-16.png")),
  ]);
  const webDirectory = path.resolve(__dirname, "../public");
  await fs.mkdir(webDirectory, { recursive: true });
  await Promise.all(
    ["apple-touch-icon.png", "favicon-32.png", "favicon-16.png"].map((name) =>
      fs.copyFile(path.join(directory, name), path.join(webDirectory, name)),
    ),
  );
  console.log("Ícones do Pokéatlas gerados em assets/brand.");
}
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
