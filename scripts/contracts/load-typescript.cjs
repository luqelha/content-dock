const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const { createRequire } = require("node:module");
const ts = require("typescript");

// Execute production boundary code with explicit I/O stubs, without a Next server.
exports.loadTypescript = function loadTypescript(filename, overrides = {}) {
  const modules = new Map();
  function load(file) {
    file = path.resolve(file);
    if (modules.has(file)) return modules.get(file).exports;
    const module = { exports: {} };
    modules.set(file, module);
    const localRequire = createRequire(file);
    const context = {
      module,
      exports: module.exports,
      Response,
      Headers,
      FormData,
      URL,
      process,
      console,
      setTimeout,
      clearTimeout,
      ...overrides.globals,
      require(name) {
        if (Object.hasOwn(overrides.modules || {}, name))
          return overrides.modules[name];
        const base = name.startsWith("@/")
          ? path.resolve(__dirname, "../../apps/web-admin/src", name.slice(2))
          : name.startsWith(".")
            ? path.resolve(path.dirname(file), name)
            : undefined;
        if (base && fs.existsSync(base + ".ts")) return load(base + ".ts");
        return localRequire(name);
      },
    };
    const code = ts.transpileModule(fs.readFileSync(file, "utf8"), {
      compilerOptions: {
        module: ts.ModuleKind.CommonJS,
        target: ts.ScriptTarget.ES2022,
      },
      fileName: file,
    }).outputText;
    vm.runInNewContext(code, context, { filename: file });
    return module.exports;
  }
  return load(filename);
};
