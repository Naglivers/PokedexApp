// Route app text through the localization boundary, without altering API keys,
// URLs, input values, navigation parameters or third-party code.
module.exports = function ({ types: t }) {
  const path = require("node:path");
  const root = path.resolve(__dirname, "..");
  const boundary = path.join(root, "src/i18n/components");
  return { visitor: {
    CallExpression(nodePath, state) {
      const filename = state.filename;
      if (!filename || !filename.startsWith(root + path.sep) || /[\\/](node_modules|i18n)[\\/]/.test(filename)) return;
      const { callee, arguments: args } = nodePath.node;
      if (t.isMemberExpression(callee) && t.isIdentifier(callee.property, { name: "toLocaleString" }) &&
          t.isStringLiteral(args[0], { value: "pt-BR" })) {
        let relative = path.relative(path.dirname(filename), path.join(root, "src/i18n/locale")).replace(/\\/g, "/");
        if (!relative.startsWith(".")) relative = "./" + relative;
        args[0] = t.callExpression(t.memberExpression(t.callExpression(t.identifier("require"), [t.stringLiteral(relative)]), t.identifier("currentLocale")), []);
      }
    },
    ImportDeclaration(nodePath, state) {
      const filename = state.filename;
      if (!filename || !filename.startsWith(root + path.sep) || /[\\/](node_modules|i18n)[\\/]/.test(filename) || nodePath.node.source.value !== "react-native") return;
      const localized = nodePath.node.specifiers.filter((specifier) => t.isImportSpecifier(specifier) && ["Text", "TextInput", "Pressable"].includes(specifier.imported.name));
      if (!localized.length) return;
      nodePath.node.specifiers = nodePath.node.specifiers.filter((specifier) => !localized.includes(specifier));
      let relative = path.relative(path.dirname(filename), boundary).replace(/\\/g, "/");
      if (!relative.startsWith(".")) relative = "./" + relative;
      nodePath.insertAfter(t.importDeclaration(localized, t.stringLiteral(relative)));
    },
  } };
};
